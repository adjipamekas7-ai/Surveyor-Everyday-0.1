/**
 * Surveyor Everyday - Gambar (JPG/PNG/WebP) + world file / .ers, termasuk
 * pendamping untuk ECW (ECW dirender dari gambar hasil ekspor + header .ers/.eww).
 */

import {
  Affine,
  GroundCrs,
  RasterSource,
  crsFromWktText,
  downscaleRgba,
  parseErs,
  parseWorldFile,
  scaleAffine,
} from './geoRaster';

export interface SidecarFiles {
  world?: File;
  prj?: File;
  ers?: File;
}

const WORLD_EXT = ['wld', 'jgw', 'jpgw', 'jpegw', 'pgw', 'pngw', 'tfw', 'tifw', 'tiffw', 'eww', 'bpw', 'gfw', 'webpw'];

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function baseOf(name: string): string {
  const i = name.lastIndexOf('.');
  return (i >= 0 ? name.slice(0, i) : name).toLowerCase();
}

/** Pilih file pendamping (world/prj/ers). Utamakan nama dasar yang sama. */
export function pickSidecars(main: File, all: File[]): SidecarFiles {
  const base = baseOf(main.name);
  const pick = (exts: string[]): File | undefined => {
    const cands = all.filter((f) => f !== main && exts.includes(extOf(f.name)));
    return cands.find((f) => baseOf(f.name) === base) ?? (cands.length === 1 ? cands[0] : undefined);
  };
  return { world: pick(WORLD_EXT), prj: pick(['prj']), ers: pick(['ers']) };
}

export interface ImageGeoref {
  affine: Affine;
  crs: GroundCrs;
  crsAssumed: boolean;
  crsNote?: string;
}

/** Susun georeferensi dari file pendamping. Mengembalikan null bila tak ada. */
export async function georefFromSidecars(
  sidecars: SidecarFiles,
  imgW: number,
  imgH: number,
  fallback: { zone: number; hemi: 'N' | 'S' }
): Promise<ImageGeoref | null> {
  let affine: Affine | null = null;
  let crs: GroundCrs | null = null;

  if (sidecars.ers) {
    const ers = parseErs(await sidecars.ers.text());
    if (ers.affine) {
      affine = ers.affine;
      // Gambar hasil ekspor bisa berukuran beda dari ECW asli -> sesuaikan skala
      if (ers.width && ers.height && (ers.width !== imgW || ers.height !== imgH)) {
        affine = scaleAffine(affine, ers.width / imgW, ers.height / imgH);
      }
    }
    if (ers.crs) crs = ers.crs;
  }
  if (!affine && sidecars.world) {
    affine = parseWorldFile(await sidecars.world.text());
  }
  if (!affine) return null;

  if (sidecars.prj) {
    const c = crsFromWktText(await sidecars.prj.text());
    if (c) crs = c;
  }

  if (crs) return { affine, crs, crsAssumed: false };

  // tebak dari angka koordinat
  if (Math.abs(affine.c) <= 180 && Math.abs(affine.f) <= 90 && Math.abs(affine.a) < 1) {
    return {
      affine,
      crs: { kind: 'geo' },
      crsAssumed: true,
      crsNote: 'Tanpa file .prj; koordinat terlihat berupa derajat (lat/lon WGS84).',
    };
  }
  return {
    affine,
    crs: { kind: 'utm', zone: fallback.zone, hemi: fallback.hemi },
    crsAssumed: true,
    crsNote: `Tanpa file .prj; dipakai UTM zona ${fallback.zone}${fallback.hemi}. Pastikan zona ini benar.`,
  };
}

export async function decodeImageToRgba(
  file: Blob,
  maxDim: number
): Promise<{ rgba: Uint8ClampedArray; width: number; height: number; fullWidth: number; fullHeight: number }> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error('Gambar tidak bisa dibuka (format tidak didukung atau terlalu besar untuk memori HP).');
  }
  const fullWidth = bmp.width;
  const fullHeight = bmp.height;
  const canvas = document.createElement('canvas');
  canvas.width = fullWidth;
  canvas.height = fullHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D tidak tersedia.');
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const data = ctx.getImageData(0, 0, fullWidth, fullHeight);
  const ds = downscaleRgba(data.data, fullWidth, fullHeight, maxDim);
  return { rgba: ds.rgba, width: ds.width, height: ds.height, fullWidth, fullHeight };
}

export async function loadGeorefImage(
  image: Blob,
  georef: ImageGeoref,
  maxDim: number
): Promise<RasterSource> {
  const d = await decodeImageToRgba(image, maxDim);
  return {
    rgba: d.rgba,
    width: d.width,
    height: d.height,
    affine: scaleAffine(georef.affine, d.fullWidth / d.width, d.fullHeight / d.height),
    crs: georef.crs,
  };
}

/** Ukuran gambar tanpa membaca pikselnya berlebihan */
export async function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const r = { width: bmp.width, height: bmp.height };
  bmp.close();
  return r;
}
