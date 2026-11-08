/**
 * Pembacaan georeferensi GeoPDF (tanpa merender):
 *  - ISO 32000-2 / Adobe Supplement: /VP -> /Measure (/Subtype /GEO, GPTS, LPTS, GCS)
 *    (dipakai QGIS/GDAL, ArcGIS, Global Mapper, Avenza, Surpac, dll)
 *  - TerraGo (OGC best practice): /LGIDict (CTM + Projection UT/GEOGRAPHIC)
 */
import { PdfDoc, PdfDict, PdfValue } from './pdfScan';
import { Affine, fitAffine, applyAffine } from './affine';
import { Crs, crsFromEpsg, crsFromWkt, fromLatLng, toLatLng, utmCrs, utmCrsFor, WGS84_GEOGRAPHIC } from './crs';

export interface GeoPdfPageInfo {
  pageIndex: number; // 0-based
  pageCount: number;
  bbox: [number, number, number, number]; // area peta di ruang user PDF (x0,y0,x1,y1)
  /** (u,v) -> (x,y) pada crs; u,v 0..1 dari kiri-bawah BBox */
  uvToCrs: Affine;
  crs: Crs;
  standard: string;
  rmse: number; // galat fit (satuan CRS, meter bila proyeksi)
  warning?: string;
}

export class GeoPdfError extends Error {
  constructor(msg: string, public code: 'NOT_PDF' | 'NOT_GEOREFERENCED' | 'UNSUPPORTED') {
    super(msg);
  }
}

interface PageRec {
  dict: PdfDict;
  mediaBox?: number[];
}

function collectPages(doc: PdfDoc, root: PdfValue, limit = 2000): PageRec[] {
  const out: PageRec[] = [];
  const seen = new Set<number>();
  const walk = (node: PdfValue, inh: { mediaBox?: number[] }, depth: number) => {
    if (out.length >= limit || depth > 30) return;
    if (node && typeof node === 'object' && 'ref' in node) {
      const r = (node as { ref: number }).ref;
      if (seen.has(r)) return;
      seen.add(r);
    }
    const d = doc.dict(node);
    if (!d) return;
    const mb = doc.numArray(d['MediaBox']) ?? inh.mediaBox;
    const kids = doc.array(d['Kids']);
    if (kids && doc.name(d['Type']) !== 'Page') {
      for (const k of kids) walk(k, { mediaBox: mb }, depth + 1);
    } else {
      out.push({ dict: d, mediaBox: mb });
    }
  };
  walk(root, {}, 0);
  return out;
}

function normBox(b: number[] | undefined): [number, number, number, number] | undefined {
  if (!b || b.length < 4) return undefined;
  return [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])];
}

function crsForGcs(doc: PdfDoc, gcs: PdfDict | undefined): Crs | null {
  if (!gcs) return null;
  const wkt = doc.str(gcs['WKT']);
  if (wkt) {
    const c = crsFromWkt(wkt);
    if (c && c.kind !== 'geographic') return c;
  }
  const epsg = doc.num(gcs['EPSG']);
  if (epsg) {
    const c = crsFromEpsg(epsg);
    if (c && c.kind !== 'geographic') return c;
  }
  return null;
}

function fromViewport(doc: PdfDoc, page: PageRec, vp: PdfDict): Omit<GeoPdfPageInfo, 'pageIndex' | 'pageCount'> | null {
  const measure = doc.dict(vp['Measure']);
  if (!measure) return null;
  const sub = doc.name(measure['Subtype']);
  if (sub && sub !== 'GEO') return null;
  const gpts = doc.numArray(measure['GPTS']);
  if (!gpts || gpts.length < 6) return null;
  const bbox = normBox(doc.numArray(vp['BBox'])) ?? normBox(page.mediaBox);
  if (!bbox) return null;
  const nGp = Math.floor(gpts.length / 2);
  let lpts = doc.numArray(measure['LPTS']);
  if (!lpts || lpts.length < 6) lpts = [0, 0, 0, 1, 1, 1, 1, 0];
  const n = Math.min(nGp, Math.floor(lpts.length / 2));
  if (n < 3) return null;

  const ll: Array<{ lat: number; lng: number }> = [];
  const uv: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const lat = gpts[2 * i];
    const lng = gpts[2 * i + 1];
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 360) return null;
    ll.push({ lat, lng: lng > 180 ? lng - 360 : lng });
    uv.push([lpts[2 * i], lpts[2 * i + 1]]);
  }
  const cLat = ll.reduce((s, p) => s + p.lat, 0) / n;
  const cLng = ll.reduce((s, p) => s + p.lng, 0) / n;
  const gcs = doc.dict(measure['GCS']);
  let crs = crsForGcs(doc, gcs) ?? utmCrsFor(cLat, cLng);
  const dst = ll.map((p) => {
    const q = fromLatLng(crs, p.lat, p.lng);
    return [q.x, q.y] as [number, number];
  });
  const { m, rmse } = fitAffine(uv, dst);
  // ukuran peta dalam satuan CRS, untuk menilai galat fit
  const w = Math.hypot(m[0], m[3]);
  const h = Math.hypot(m[1], m[4]);
  const ext = Math.max(w, h) || 1;
  let warning: string | undefined;
  if (rmse > ext * 0.01) warning = 'Titik kontrol GeoPDF tidak konsisten (galat fit tinggi); posisi peta mungkin kurang akurat.';
  if (crs.kind === 'geographic') crs = WGS84_GEOGRAPHIC;
  return { bbox, uvToCrs: m, crs, standard: 'GeoPDF ISO 32000 (Measure/GEO)', rmse, warning };
}

function fromLgi(doc: PdfDoc, page: PageRec, lgi: PdfDict): Omit<GeoPdfPageInfo, 'pageIndex' | 'pageCount'> | null {
  const ctm = doc.numArray(lgi['CTM']);
  if (!ctm || ctm.length < 6) return null;
  const proj = doc.dict(lgi['Projection']);
  const type = (doc.str(proj?.['ProjectionType']) ?? doc.name(proj?.['ProjectionType']) ?? '').toUpperCase();
  let crs: Crs;
  if (type === 'UT') {
    const zone = doc.num(proj?.['Zone']);
    const hemi = (doc.str(proj?.['Hemisphere']) ?? doc.name(proj?.['Hemisphere']) ?? 'N').toUpperCase();
    if (!zone) throw new GeoPdfError('LGIDict UTM tidak memuat nomor zona.', 'UNSUPPORTED');
    crs = utmCrs(zone, hemi.startsWith('S'));
  } else if (type === 'GEOGRAPHIC' || type === 'GE') {
    crs = WGS84_GEOGRAPHIC;
  } else {
    throw new GeoPdfError(
      `Proyeksi TerraGo "${type || '?'}" belum didukung. Ekspor ulang GeoPDF dalam UTM atau lat/lon.`,
      'UNSUPPORTED'
    );
  }
  // bbox dari Neatline bila ada
  let bbox = normBox(page.mediaBox);
  const nl = doc.numArray(lgi['Neatline']);
  if (nl && nl.length >= 6) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let i = 0; i + 1 < nl.length; i += 2) {
      x0 = Math.min(x0, nl[i]);
      x1 = Math.max(x1, nl[i]);
      y0 = Math.min(y0, nl[i + 1]);
      y1 = Math.max(y1, nl[i + 1]);
    }
    if (isFinite(x0) && x1 > x0 && y1 > y0) bbox = [x0, y0, x1, y1];
  }
  if (!bbox) return null;
  const [a, b, c, d, e, f] = ctm;
  const bw = bbox[2] - bbox[0];
  const bh = bbox[3] - bbox[1];
  const m: Affine = [a * bw, c * bh, a * bbox[0] + c * bbox[1] + e, b * bw, d * bh, b * bbox[0] + d * bbox[1] + f];
  return { bbox, uvToCrs: m, crs, standard: 'GeoPDF TerraGo (LGIDict)', rmse: 0 };
}

export async function readGeoPdf(buffer: ArrayBuffer | Uint8Array): Promise<GeoPdfPageInfo[]> {
  let doc: PdfDoc;
  try {
    doc = await PdfDoc.open(buffer);
  } catch (e) {
    throw new GeoPdfError(e instanceof Error ? e.message : 'File PDF tidak dapat dibaca.', 'NOT_PDF');
  }
  // Catalog
  let pagesRoot: PdfValue | undefined;
  for (const num of doc.objectNumbers()) {
    const d = doc.dict({ ref: num });
    if (d && doc.name(d['Type']) === 'Catalog' && d['Pages']) {
      pagesRoot = d['Pages'];
    }
  }
  if (!pagesRoot) throw new GeoPdfError('Struktur PDF rusak: katalog halaman tidak ditemukan.', 'NOT_PDF');
  const pages = collectPages(doc, pagesRoot);
  if (!pages.length) throw new GeoPdfError('PDF tidak memiliki halaman.', 'NOT_PDF');

  const results: GeoPdfPageInfo[] = [];
  let unsupported: GeoPdfError | null = null;
  for (let i = 0; i < pages.length && i < 100; i++) {
    const page = pages[i];
    try {
      let best: Omit<GeoPdfPageInfo, 'pageIndex' | 'pageCount'> | null = null;
      let bestArea = -1;
      const vpRaw = doc.resolve(page.dict['VP']);
      const vps: PdfValue[] = Array.isArray(vpRaw) ? vpRaw : vpRaw ? [vpRaw] : [];
      for (const v of vps) {
        const vd = doc.dict(v);
        if (!vd) continue;
        const r = fromViewport(doc, page, vd);
        if (r) {
          const area = (r.bbox[2] - r.bbox[0]) * (r.bbox[3] - r.bbox[1]);
          if (area > bestArea) {
            best = r;
            bestArea = area;
          }
        }
      }
      if (!best) {
        const lraw = doc.resolve(page.dict['LGIDict']);
        const lgis: PdfValue[] = Array.isArray(lraw) ? lraw : lraw ? [lraw] : [];
        for (const l of lgis) {
          const ld = doc.dict(l);
          if (!ld) continue;
          const r = fromLgi(doc, page, ld);
          if (r) {
            const area = (r.bbox[2] - r.bbox[0]) * (r.bbox[3] - r.bbox[1]);
            if (area > bestArea) {
              best = r;
              bestArea = area;
            }
          }
        }
      }
      if (best) results.push({ ...best, pageIndex: i, pageCount: pages.length });
    } catch (e) {
      if (e instanceof GeoPdfError) unsupported = e;
    }
  }
  if (!results.length) {
    if (unsupported) throw unsupported;
    throw new GeoPdfError(
      'PDF ini tidak memiliki data georeferensi (bukan GeoPDF). Ekspor dari QGIS / ArcGIS / Global Mapper / Avenza dengan opsi "Geospatial PDF", atau gunakan GeoTIFF.',
      'NOT_GEOREFERENCED'
    );
  }
  return results;
}

/** Helper uji/tampilan: sudut peta (lat/lng) dari info GeoPDF. */
export function geoPdfCorners(info: GeoPdfPageInfo) {
  return [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].map(([u, v]) => {
    const p = applyAffine(info.uvToCrs, u, v);
    return toLatLng(info.crs, p.x, p.y);
  });
}
