/**
 * Surveyor Everyday - Pembaca metadata GeoPDF (tanpa rendering).
 *
 * Memakai pdf-lib sehingga struktur PDF dibaca dengan benar, termasuk
 * object stream & xref stream terkompresi (PDF 1.5+) yang gagal dibaca oleh
 * pencarian teks biasa. Mendukung:
 *  - ISO 32000 / Adobe Geospatial PDF (/VP -> /Measure /GEO: GPTS, LPTS, GCS) -
 *    hasil export QGIS/GDAL, ArcGIS, Global Mapper, Avenza, AutoCAD Map 3D.
 *  - TerraGo (/LGIDict) bentuk dasar UTM (CTM + Neatline).
 */

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFString,
  ParseSpeeds,
  decodePDFRawStream,
} from 'pdf-lib';
import {
  GroundCrs,
  crsFromEpsg,
  crsFromWktText,
  crsLabel,
  latLngToGround,
  utmZoneFromLng,
} from './geoRaster';

export interface GeoControl {
  /** koordinat halaman PDF (poin) */
  x: number;
  y: number;
  /** koordinat tanah pada CRS `crs` */
  X: number;
  Y: number;
}

export interface GeoPdfParsed {
  standard: string;
  pageIndex: number; // 0-based
  pageCount: number;
  bbox: [number, number, number, number]; // x0,y0,x1,y1 ruang halaman PDF (area peta / neatline)
  controls: GeoControl[];
  crs: GroundCrs;
  crsAssumed: boolean;
  crsNote?: string;
  viewportName?: string;
}

export class GeoPdfError extends Error {}

function nums(o: unknown): number[] {
  if (!(o instanceof PDFArray)) return [];
  const out: number[] = [];
  for (let i = 0; i < o.size(); i++) {
    const v = o.lookup(i);
    if (v instanceof PDFNumber) out.push(v.asNumber());
  }
  return out;
}

function text(o: unknown): string | undefined {
  try {
    if (o instanceof PDFString || o instanceof PDFHexString) return o.decodeText();
    if (o instanceof PDFName) return o.decodeText();
    if (o instanceof PDFRawStream) {
      return new TextDecoder('latin1').decode(decodePDFRawStream(o).decode());
    }
  } catch {
    // abaikan
  }
  return undefined;
}

function asDictList(o: unknown): PDFDict[] {
  if (o instanceof PDFDict) return [o];
  if (o instanceof PDFArray) {
    const out: PDFDict[] = [];
    for (let i = 0; i < o.size(); i++) {
      const d = o.lookup(i);
      if (d instanceof PDFDict) out.push(d);
    }
    return out;
  }
  return [];
}

function normBox(b: number[]): [number, number, number, number] | null {
  if (b.length < 4) return null;
  const x0 = Math.min(b[0], b[2]);
  const x1 = Math.max(b[0], b[2]);
  const y0 = Math.min(b[1], b[3]);
  const y1 = Math.max(b[1], b[3]);
  if (!(x1 > x0 && y1 > y0)) return null;
  return [x0, y0, x1, y1];
}

export async function parseGeoPdf(
  bytes: Uint8Array,
  fallback: { zone: number; hemi: 'N' | 'S' }
): Promise<GeoPdfParsed> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
      parseSpeed: ParseSpeeds.Fastest,
    });
  } catch {
    throw new GeoPdfError('File PDF rusak atau tidak bisa dibaca.');
  }

  const pages = doc.getPages();
  if (pages.length === 0) throw new GeoPdfError('PDF tidak punya halaman.');

  for (let pi = 0; pi < pages.length; pi++) {
    const node = pages[pi].node;
    const mediaBox = pages[pi].getMediaBox();
    const mediaArr: [number, number, number, number] = [
      mediaBox.x,
      mediaBox.y,
      mediaBox.x + mediaBox.width,
      mediaBox.y + mediaBox.height,
    ];

    // ---------- ISO 32000 / Adobe Geospatial PDF ----------
    const viewports = asDictList(node.lookup(PDFName.of('VP')));
    let best: { vp: PDFDict; measure: PDFDict; bbox: [number, number, number, number]; area: number } | null = null;
    for (const vp of viewports) {
      const measure = vp.lookup(PDFName.of('Measure'));
      if (!(measure instanceof PDFDict)) continue;
      if (!(measure.lookup(PDFName.of('GPTS')) instanceof PDFArray)) continue;
      const bbox = normBox(nums(vp.lookup(PDFName.of('BBox')))) ?? mediaArr;
      const area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
      if (!best || area > best.area) best = { vp, measure, bbox, area };
    }
    if (best) {
      return buildFromIso(best.vp, best.measure, best.bbox, pi, pages.length, fallback);
    }

    // ---------- TerraGo LGIDict ----------
    const lgis = asDictList(node.lookup(PDFName.of('LGIDict')));
    for (const lgi of lgis) {
      const parsed = buildFromLgi(lgi, pi, pages.length, mediaArr);
      if (parsed) return parsed;
    }
  }

  throw new GeoPdfError(
    'Ini bukan GeoPDF: tidak ada data koordinat (georeferensi) di dalam PDF. ' +
      'PDF biasa (hasil cetak/Save as PDF) tidak punya koordinat. Gunakan PDF dari export ' +
      '"Geospatial PDF" (QGIS, ArcGIS, Global Mapper, Avenza, AutoCAD Map 3D, Surpac).'
  );
}

function buildFromIso(
  vp: PDFDict,
  measure: PDFDict,
  bbox: [number, number, number, number],
  pageIndex: number,
  pageCount: number,
  fallback: { zone: number; hemi: 'N' | 'S' }
): GeoPdfParsed {
  const gpts = nums(measure.lookup(PDFName.of('GPTS')));
  let lpts = nums(measure.lookup(PDFName.of('LPTS')));
  if (gpts.length < 6 || gpts.length % 2 !== 0) {
    throw new GeoPdfError('Data GPTS di GeoPDF tidak lengkap (minimal 3 titik kontrol).');
  }
  const nPts = gpts.length / 2;
  if (lpts.length < nPts * 2) {
    // default ISO: sudut neatline berurutan
    lpts = [0, 0, 0, 1, 1, 1, 1, 0].slice(0, nPts * 2);
    if (lpts.length < nPts * 2) {
      throw new GeoPdfError('Data LPTS di GeoPDF tidak lengkap.');
    }
  }

  // --- CRS ---
  let crs: GroundCrs | null = null;
  let wktText: string | undefined;
  let epsg: number | undefined;
  const gcs = measure.lookup(PDFName.of('GCS'));
  if (gcs instanceof PDFDict) {
    const e = gcs.lookup(PDFName.of('EPSG'));
    if (e instanceof PDFNumber) epsg = e.asNumber();
    wktText = text(gcs.lookup(PDFName.of('WKT'))) ?? text(gcs.lookup(PDFName.of('WKT2')));
  }
  if (epsg) crs = crsFromEpsg(epsg);
  if (!crs && wktText) crs = crsFromWktText(wktText);

  const geoPairs: Array<{ lat: number; lng: number }> = [];
  let projectedValues = false;
  const allAbs = gpts.map((v) => Math.abs(v));
  if (Math.max(...allAbs) > 360) projectedValues = true;

  let crsAssumed = false;
  let crsNote: string | undefined;

  const controls: GeoControl[] = [];

  if (!projectedValues) {
    for (let i = 0; i < nPts; i++) {
      let lat = gpts[i * 2];
      let lng = gpts[i * 2 + 1];
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const t = lat;
        lat = lng;
        lng = t;
      }
      geoPairs.push({ lat, lng });
    }
    if (!crs) {
      // CRS bukan UTM (mis. TM-3 / lokal): GPTS tetap derajat, hitung dalam UTM lokal
      const cLng = geoPairs.reduce((s, p) => s + p.lng, 0) / nPts;
      const cLat = geoPairs.reduce((s, p) => s + p.lat, 0) / nPts;
      crs = { kind: 'utm', zone: utmZoneFromLng(cLng), hemi: cLat >= 0 ? 'N' : 'S' };
      crsAssumed = true;
      crsNote =
        'Sistem koordinat asli file bukan UTM WGS84' +
        (wktText ? ` (${(wktText.match(/\[\s*"([^"]+)"/) || [])[1] ?? 'lain'})` : '') +
        `; posisi dihitung dari titik kontrol dan ditampilkan di ${crsLabel(crs)}.`;
    }
    for (let i = 0; i < nPts; i++) {
      const g = latLngToGround(crs, geoPairs[i].lat, geoPairs[i].lng);
      controls.push({
        x: bbox[0] + lpts[i * 2] * (bbox[2] - bbox[0]),
        y: bbox[1] + lpts[i * 2 + 1] * (bbox[3] - bbox[1]),
        X: g.X,
        Y: g.Y,
      });
    }
  } else {
    // GPTS berisi meter (tidak standar, tapi ada di beberapa software)
    if (!crs || crs.kind !== 'utm') {
      crs = { kind: 'utm', zone: fallback.zone, hemi: fallback.hemi };
      crsAssumed = true;
      crsNote = `Zona tidak tertulis di file; dipakai zona proyek ${crsLabel(crs)}.`;
    }
    for (let i = 0; i < nPts; i++) {
      const v1 = gpts[i * 2];
      const v2 = gpts[i * 2 + 1];
      // Easting UTM selalu < 1.000.000; Northing bisa lebih besar (belahan selatan ~ 9.xxx.xxx)
      let E: number;
      let N: number;
      if (Math.abs(v1) > 1_000_000 && Math.abs(v2) <= 1_000_000) {
        N = v1;
        E = v2;
      } else if (Math.abs(v2) > 1_000_000 && Math.abs(v1) <= 1_000_000) {
        E = v1;
        N = v2;
      } else {
        // urutan GPTS standar: lat(≈Northing), lon(≈Easting)
        N = v1;
        E = v2;
      }
      controls.push({
        x: bbox[0] + lpts[i * 2] * (bbox[2] - bbox[0]),
        y: bbox[1] + lpts[i * 2 + 1] * (bbox[3] - bbox[1]),
        X: E,
        Y: N,
      });
    }
  }

  const name = text(vp.lookup(PDFName.of('Name')));
  return {
    standard: 'Geospatial PDF (ISO 32000)',
    pageIndex,
    pageCount,
    bbox,
    controls,
    crs: crs as GroundCrs,
    crsAssumed,
    crsNote,
    viewportName: name,
  };
}

function buildFromLgi(
  lgi: PDFDict,
  pageIndex: number,
  pageCount: number,
  mediaArr: [number, number, number, number]
): GeoPdfParsed | null {
  const ctm = nums(lgi.lookup(PDFName.of('CTM')));
  const neat = nums(lgi.lookup(PDFName.of('Neatline')));
  const proj = lgi.lookup(PDFName.of('Projection'));
  if (ctm.length < 6 || !(proj instanceof PDFDict)) return null;

  const type = (text(proj.lookup(PDFName.of('ProjectionType'))) ?? '').toUpperCase();
  if (type !== 'UT') return null; // hanya UTM yang didukung

  const zoneObj = proj.lookup(PDFName.of('Zone'));
  const zone = zoneObj instanceof PDFNumber ? zoneObj.asNumber() : NaN;
  const hemiText = (text(proj.lookup(PDFName.of('Hemisphere'))) ?? 'N').toUpperCase();
  if (!(zone >= 1 && zone <= 60)) return null;
  const hemi: 'N' | 'S' = hemiText.startsWith('S') ? 'S' : 'N';

  let bbox = mediaArr;
  if (neat.length >= 4) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i + 1 < neat.length; i += 2) {
      xs.push(neat[i]);
      ys.push(neat[i + 1]);
    }
    const nb = normBox([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
    if (nb) bbox = nb;
  }

  const [a, b, c, d, e, f] = ctm;
  const corners: Array<[number, number]> = [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]],
  ];
  const controls: GeoControl[] = corners.map(([x, y]) => ({
    x,
    y,
    X: a * x + c * y + e,
    Y: b * x + d * y + f,
  }));

  return {
    standard: 'TerraGo GeoPDF (LGIDict)',
    pageIndex,
    pageCount,
    bbox,
    controls,
    crs: { kind: 'utm', zone, hemi },
    crsAssumed: false,
  };
}
