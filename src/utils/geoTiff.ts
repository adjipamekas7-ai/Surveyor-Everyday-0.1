/**
 * Surveyor Everyday - Pembaca GeoTIFF (orthomosaic drone, DEM, peta raster).
 *
 * - Dibaca per bagian (tidak memuat seluruh file ke memori) memakai Blob.
 * - Memakai overview internal bila ada -> cepat untuk file besar.
 * - Mendukung RGB/RGBA, grayscale 8/16-bit, float (DEM), palette, nodata.
 * - Georeferensi: ModelPixelScale+Tiepoint, ModelTransformation, banyak tiepoint,
 *   PixelIsPoint, atau world file pendamping (.tfw/.wld).
 */

import { fromBlob } from 'geotiff';
import type { GeoTIFFImage } from 'geotiff';
import {
  Affine,
  GroundCrs,
  RasterSource,
  ControlPair,
  crsFromEpsg,
  fitAffine,
  parseWorldFile,
  scaleAffine,
} from './geoRaster';

export interface GeoTiffLoadOptions {
  maxDim?: number;
  fallback: { zone: number; hemi: 'N' | 'S' };
  worldFileText?: string;
  prjCrs?: GroundCrs | null;
}

export interface GeoTiffLoaded {
  source: RasterSource;
  fullWidth: number;
  fullHeight: number;
  crsAssumed: boolean;
  crsNote?: string;
  bands: number;
  bitsPerSample: number;
}

type NumArray = ArrayLike<number>;

function toNumberArray(v: unknown): number[] {
  if (!v) return [];
  const a = v as NumArray;
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) out.push(Number(a[i]));
  return out;
}

export async function loadGeoTiff(file: Blob, opts: GeoTiffLoadOptions): Promise<GeoTiffLoaded> {
  const maxDim = opts.maxDim ?? 4096;
  const tiff = await fromBlob(file);
  const first = await tiff.getImage(0);
  const W = first.getWidth();
  const H = first.getHeight();
  const fd = first.getFileDirectory() as unknown as Record<string, unknown>;
  const gk = (first.getGeoKeys() ?? {}) as unknown as Record<string, number>;

  // ---------- georeferensi ----------
  let affine: Affine | null = null;
  const tp = toNumberArray(fd.ModelTiepoint);
  const ps = toNumberArray(fd.ModelPixelScale);
  const mt = toNumberArray(fd.ModelTransformation);

  if (mt.length >= 16) {
    affine = { a: mt[0], b: mt[1], c: mt[3], d: mt[4], e: mt[5], f: mt[7] };
  } else if (tp.length >= 24) {
    // >= 4 tiepoint (GCP) -> fit affine
    const pairs: ControlPair[] = [];
    for (let i = 0; i + 5 < tp.length; i += 6) {
      pairs.push({ col: tp[i], row: tp[i + 1], X: tp[i + 3], Y: tp[i + 4] });
    }
    affine = fitAffine(pairs)?.affine ?? null;
  } else if (tp.length >= 6 && ps.length >= 2) {
    affine = {
      a: ps[0],
      b: 0,
      c: tp[3] - tp[0] * ps[0],
      d: 0,
      e: -ps[1],
      f: tp[4] + tp[1] * ps[1],
    };
  }
  if (affine && gk.GTRasterTypeGeoKey === 2) {
    // PixelIsPoint -> acuan di pusat piksel, geser setengah piksel ke sudut
    affine = {
      ...affine,
      c: affine.c - 0.5 * affine.a - 0.5 * affine.b,
      f: affine.f - 0.5 * affine.d - 0.5 * affine.e,
    };
  }
  if (!affine && opts.worldFileText) affine = parseWorldFile(opts.worldFileText);
  if (!affine) {
    throw new Error(
      'GeoTIFF ini tidak punya georeferensi (hanya gambar biasa). Sertakan file world file (.tfw / .wld) dan .prj bersamanya, atau gunakan GeoTIFF yang benar.'
    );
  }

  // ---------- CRS ----------
  let crs: GroundCrs | null = null;
  let crsAssumed = false;
  let crsNote: string | undefined;

  const projCode = gk.ProjectedCSTypeGeoKey;
  const geogCode = gk.GeographicTypeGeoKey;
  if (projCode && projCode !== 32767) crs = crsFromEpsg(projCode);
  if (!crs && projCode === 32767 && gk.ProjCoordTransGeoKey === 1) {
    // TM kustom yang menyerupai UTM (ditulis GDAL/Pix4D/Metashape)
    const cm = gk.ProjNatOriginLongGeoKey ?? gk.ProjCenterLongGeoKey;
    const k0 = gk.ProjScaleAtNatOriginGeoKey ?? gk.ProjScaleAtCenterGeoKey;
    const fe = gk.ProjFalseEastingGeoKey ?? 0;
    const fn = gk.ProjFalseNorthingGeoKey ?? 0;
    if (cm !== undefined && Math.abs((k0 ?? 0.9996) - 0.9996) < 1e-6 && Math.abs(fe - 500000) < 1) {
      const zone = Math.round((cm + 183) / 6);
      if (zone >= 1 && zone <= 60) crs = { kind: 'utm', zone, hemi: Math.abs(fn - 10000000) < 1 ? 'S' : 'N' };
    }
  }
  if (!crs && !projCode && geogCode) crs = crsFromEpsg(geogCode) ?? (geogCode === 4326 ? { kind: 'geo' } : null);
  if (!crs && opts.prjCrs) crs = opts.prjCrs;

  if (!crs) {
    // tebak dari besaran angka koordinat
    const p0 = affine.c;
    const p1 = affine.f;
    if (Math.abs(p0) <= 180 && Math.abs(p1) <= 90 && Math.abs(affine.a) < 1) {
      crs = { kind: 'geo' };
      crsAssumed = true;
      crsNote = 'Sistem koordinat tidak tertulis; koordinat terlihat berupa derajat (lat/lon WGS84).';
    } else {
      crs = { kind: 'utm', zone: opts.fallback.zone, hemi: opts.fallback.hemi };
      crsAssumed = true;
      const code = projCode ? ` (kode EPSG:${projCode})` : '';
      crsNote = `Sistem koordinat file tidak dikenali${code}; dipakai UTM zona ${opts.fallback.zone}${opts.fallback.hemi}. Pastikan zona ini benar.`;
    }
  }

  // ---------- baca raster (downsample) ----------
  const samplesPerPixel = Number(fd.SamplesPerPixel ?? 1);
  const bits = toNumberArray(fd.BitsPerSample)[0] ?? 8;
  const photometric = Number(fd.PhotometricInterpretation ?? (samplesPerPixel >= 3 ? 2 : 1));
  const extra = toNumberArray(fd.ExtraSamples);
  const nodataRaw = fd.GDAL_NODATA;
  const nodata = nodataRaw !== undefined && nodataRaw !== null ? parseFloat(String(nodataRaw).replace(/\0/g, '')) : NaN;

  // target ukuran
  const scaleAll = Math.min(1, maxDim / Math.max(W, H));
  const tw = Math.max(1, Math.round(W * scaleAll));
  const th = Math.max(1, Math.round(H * scaleAll));

  // pilih overview terkecil yang masih >= target
  const count = await tiff.getImageCount();
  let chosen: GeoTIFFImage = first;
  if (count > 1 && scaleAll < 1) {
    for (let i = 1; i < count; i++) {
      const im = await tiff.getImage(i);
      const iw = im.getWidth();
      const ih = im.getHeight();
      const sameShape = Math.abs(iw / ih - W / H) < 0.02;
      if (sameShape && iw >= tw && iw < chosen.getWidth()) chosen = im;
    }
  }
  const cw = chosen.getWidth();
  const ch = chosen.getHeight();

  const rgba = new Uint8ClampedArray(tw * th * 4);

  // peregangan nilai (non 8-bit): hitung dari pratinjau kecil
  const needStretch = bits !== 8 && photometric !== 3;
  let stretch: { lo: number[]; hi: number[] } | null = null;
  const useRgbPath = samplesPerPixel >= 3 && photometric === 2;
  const usePalette = photometric === 3 && !!fd.ColorMap;
  const bandCount = useRgbPath ? Math.min(samplesPerPixel, 4) : 1;
  const alphaIdx = useRgbPath && samplesPerPixel >= 4 && (extra.includes(1) || extra.includes(2)) ? 3 : -1;

  if (photometric === 5 || photometric === 6) {
    // CMYK / YCbCr -> konversi RGB oleh geotiff.js
    await readChunks(chosen, cw, ch, tw, th, async (win, ow, oh) => {
      const data = (await chosen.readRGB({
        window: win,
        width: ow,
        height: oh,
        interleave: true,
      })) as unknown as Uint8Array;
      return { interleaved: data, channels: 3 };
    }, rgba);
  } else {
    if (needStretch) {
      const pw = Math.min(512, cw);
      const ph = Math.max(1, Math.round((ch * pw) / cw));
      const prev = (await chosen.readRasters({
        width: pw,
        height: ph,
        samples: Array.from({ length: bandCount }, (_, i) => i),
        interleave: false,
      })) as unknown as NumArray[];
      stretch = computeStretch(prev, bandCount, nodata);
    }

    await readChunks(chosen, cw, ch, tw, th, async (win, ow, oh) => {
      const bands = (await chosen.readRasters({
        window: win,
        width: ow,
        height: oh,
        samples: Array.from({ length: bandCount }, (_, i) => i),
        interleave: false,
        resampleMethod: 'bilinear',
      })) as unknown as NumArray[];
      return { bands };
    }, rgba, {
      bandCount,
      alphaIdx,
      stretch,
      nodata,
      palette: usePalette ? (fd.ColorMap as NumArray) : undefined,
      bits,
      useRgbPath,
    });
  }

  const sx = W / tw;
  const sy = H / th;
  return {
    source: {
      rgba,
      width: tw,
      height: th,
      affine: scaleAffine(affine, sx, sy),
      crs,
    },
    fullWidth: W,
    fullHeight: H,
    crsAssumed,
    crsNote,
    bands: samplesPerPixel,
    bitsPerSample: bits,
  };
}

function computeStretch(
  bands: NumArray[],
  n: number,
  nodata: number
): { lo: number[]; hi: number[] } {
  const lo: number[] = [];
  const hi: number[] = [];
  for (let b = 0; b < n; b++) {
    const arr = bands[b];
    const vals: number[] = [];
    const step = Math.max(1, Math.floor(arr.length / 50000));
    for (let i = 0; i < arr.length; i += step) {
      const v = arr[i];
      if (!isFinite(v) || v === nodata) continue;
      vals.push(v);
    }
    if (vals.length === 0) {
      lo.push(0);
      hi.push(1);
      continue;
    }
    vals.sort((p, q) => p - q);
    const l = vals[Math.floor(vals.length * 0.02)];
    const h = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.98))];
    lo.push(l);
    hi.push(h > l ? h : l + 1);
  }
  return { lo, hi };
}

interface ChunkResult {
  bands?: NumArray[];
  interleaved?: Uint8Array;
  channels?: number;
}

interface ConvertOptions {
  bandCount: number;
  alphaIdx: number;
  stretch: { lo: number[]; hi: number[] } | null;
  nodata: number;
  palette?: NumArray;
  bits: number;
  useRgbPath: boolean;
}

/** Baca per potongan baris agar memori tetap kecil, lalu isi ke rgba hasil. */
async function readChunks(
  image: GeoTIFFImage,
  cw: number,
  ch: number,
  tw: number,
  th: number,
  reader: (win: [number, number, number, number], ow: number, oh: number) => Promise<ChunkResult>,
  rgba: Uint8ClampedArray,
  conv?: ConvertOptions
): Promise<void> {
  void image;
  // jumlah baris sumber per potongan (batasi ~16 juta sampel)
  const rowsPerChunk = Math.max(16, Math.floor(16_000_000 / (cw * 4)));
  for (let y0 = 0; y0 < ch; y0 += rowsPerChunk) {
    const y1 = Math.min(ch, y0 + rowsPerChunk);
    const ty0 = Math.round((y0 * th) / ch);
    const ty1 = Math.round((y1 * th) / ch);
    const oh = ty1 - ty0;
    if (oh <= 0) continue;
    const res = await reader([0, y0, cw, y1], tw, oh);
    const n = tw * oh;

    if (res.interleaved) {
      const c = res.channels ?? 3;
      for (let i = 0; i < n; i++) {
        const o = (ty0 * tw + i) * 4;
        rgba[o] = res.interleaved[i * c];
        rgba[o + 1] = res.interleaved[i * c + 1];
        rgba[o + 2] = res.interleaved[i * c + 2];
        rgba[o + 3] = 255;
      }
      continue;
    }

    const bands = res.bands as NumArray[];
    const cv = conv as ConvertOptions;
    const { stretch, nodata, palette, alphaIdx, useRgbPath } = cv;
    const hasNodata = isFinite(nodata);

    for (let i = 0; i < n; i++) {
      const o = (ty0 * tw + i) * 4;
      if (useRgbPath) {
        let r = bands[0][i];
        let g = bands[1][i];
        let b = bands[2][i];
        if (hasNodata && r === nodata && g === nodata && b === nodata) {
          rgba[o + 3] = 0;
          continue;
        }
        if (stretch) {
          r = ((r - stretch.lo[0]) / (stretch.hi[0] - stretch.lo[0])) * 255;
          g = ((g - stretch.lo[1]) / (stretch.hi[1] - stretch.lo[1])) * 255;
          b = ((b - stretch.lo[2]) / (stretch.hi[2] - stretch.lo[2])) * 255;
        }
        rgba[o] = r;
        rgba[o + 1] = g;
        rgba[o + 2] = b;
        if (alphaIdx >= 0) {
          let a = bands[alphaIdx][i];
          if (cv.bits > 8) a = a / (2 ** cv.bits - 1) * 255;
          rgba[o + 3] = a;
        } else {
          rgba[o + 3] = 255;
        }
      } else if (palette) {
        const idx = bands[0][i];
        const size = palette.length / 3;
        rgba[o] = Number(palette[idx]) >> 8;
        rgba[o + 1] = Number(palette[size + idx]) >> 8;
        rgba[o + 2] = Number(palette[2 * size + idx]) >> 8;
        rgba[o + 3] = hasNodata && idx === nodata ? 0 : 255;
      } else {
        const v = bands[0][i];
        if (!isFinite(v) || (hasNodata && v === nodata)) {
          rgba[o + 3] = 0;
          continue;
        }
        let g = v;
        if (stretch) g = ((v - stretch.lo[0]) / (stretch.hi[0] - stretch.lo[0])) * 255;
        rgba[o] = g;
        rgba[o + 1] = g;
        rgba[o + 2] = g;
        rgba[o + 3] = 255;
      }
    }
  }
}

