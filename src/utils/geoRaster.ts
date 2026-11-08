/**
 * Surveyor Everyday - Inti georeferensi raster.
 * Dipakai bersama oleh GeoPDF, GeoTIFF, dan gambar + world file.
 *
 * Alur: raster sumber (RGBA) + transformasi affine piksel -> koordinat tanah
 * di-warp ke proyeksi Web Mercator (sama dengan peta Leaflet), sehingga hasilnya
 * menempel presisi di peta (rotasi/konvergensi UTM ikut dikoreksi).
 */

import { latLngToUtm, utmToLatLng } from './utm';

export type GroundCrs =
  | { kind: 'utm'; zone: number; hemi: 'N' | 'S' }
  | { kind: 'geo' }
  | { kind: 'merc' };

/** X = a*col + b*row + c ;  Y = d*col + e*row + f  (col,row = sudut kiri-atas piksel kiri-atas = 0,0) */
export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface RasterSource {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  affine: Affine;
  crs: GroundCrs;
}

export interface WarpResult {
  blob: Blob;
  width: number;
  height: number;
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  utmBounds: { minE: number; minN: number; maxE: number; maxN: number; zone: string };
  metersPerPixel: number;
}

const R_MERC = 6378137;
const DEG = Math.PI / 180;

export function crsLabel(crs: GroundCrs): string {
  if (crs.kind === 'utm') return `WGS 84 / UTM zona ${crs.zone}${crs.hemi}`;
  if (crs.kind === 'merc') return 'WGS 84 / Web Mercator (EPSG:3857)';
  return 'WGS 84 geografis (lat/lon)';
}

export function utmZoneFromLng(lng: number): number {
  return Math.min(60, Math.max(1, Math.floor((lng + 180) / 6) + 1));
}

// ---------- konversi koordinat ----------

export function groundToLatLng(crs: GroundCrs, X: number, Y: number): { lat: number; lng: number } {
  if (crs.kind === 'utm') return utmToLatLng(X, Y, crs.zone, crs.hemi);
  if (crs.kind === 'merc') {
    return {
      lng: (X / R_MERC) / DEG,
      lat: (2 * Math.atan(Math.exp(Y / R_MERC)) - Math.PI / 2) / DEG,
    };
  }
  return { lat: Y, lng: X };
}

export function latLngToGround(crs: GroundCrs, lat: number, lng: number): { X: number; Y: number } {
  if (crs.kind === 'utm') {
    const u = latLngToUtm(lat, lng, 0, crs.zone, crs.hemi);
    return { X: u.easting, Y: u.northing };
  }
  if (crs.kind === 'merc') {
    const clamped = Math.max(-85.05, Math.min(85.05, lat));
    return {
      X: R_MERC * lng * DEG,
      Y: R_MERC * Math.log(Math.tan(Math.PI / 4 + (clamped * DEG) / 2)),
    };
  }
  return { X: lng, Y: lat };
}

// ---------- affine ----------

export function applyAffine(t: Affine, col: number, row: number): { X: number; Y: number } {
  return { X: t.a * col + t.b * row + t.c, Y: t.d * col + t.e * row + t.f };
}

export function invertAffine(t: Affine): Affine | null {
  const det = t.a * t.e - t.b * t.d;
  if (!isFinite(det) || Math.abs(det) < 1e-18) return null;
  const a = t.e / det;
  const b = -t.b / det;
  const d = -t.d / det;
  const e = t.a / det;
  return {
    a,
    b,
    c: -(a * t.c + b * t.f),
    d,
    e,
    f: -(d * t.c + e * t.f),
  };
}

/** Skala piksel (mis. saat raster di-downsample): sx = lebarAsli/lebarBaru */
export function scaleAffine(t: Affine, sx: number, sy: number): Affine {
  return { a: t.a * sx, b: t.b * sy, c: t.c, d: t.d * sx, e: t.e * sy, f: t.f };
}

/** Selesaikan sistem 3x3 (Cramer) */
function solve3(m: number[][], v: number[]): number[] | null {
  const det = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const D = det(m);
  if (!isFinite(D) || Math.abs(D) < 1e-18) return null;
  const out: number[] = [];
  for (let k = 0; k < 3; k++) {
    const mk = m.map((row, i) => row.map((val, j) => (j === k ? v[i] : val)));
    out.push(det(mk) / D);
  }
  return out;
}

export interface ControlPair {
  col: number;
  row: number;
  X: number;
  Y: number;
}

/** Fit affine (kuadrat terkecil) dari >= 3 titik kontrol. */
export function fitAffine(pairs: ControlPair[]): { affine: Affine; rmsGround: number } | null {
  if (pairs.length < 3) return null;
  // Pusatkan data supaya stabil secara numerik (koordinat UTM besar)
  const n = pairs.length;
  const mc = pairs.reduce((s, p) => s + p.col, 0) / n;
  const mr = pairs.reduce((s, p) => s + p.row, 0) / n;
  const mX = pairs.reduce((s, p) => s + p.X, 0) / n;
  const mY = pairs.reduce((s, p) => s + p.Y, 0) / n;

  let sCC = 0, sCR = 0, sRR = 0, sC = 0, sR = 0;
  let bX0 = 0, bX1 = 0, bX2 = 0, bY0 = 0, bY1 = 0, bY2 = 0;
  for (const p of pairs) {
    const c = p.col - mc;
    const r = p.row - mr;
    const X = p.X - mX;
    const Y = p.Y - mY;
    sCC += c * c; sCR += c * r; sRR += r * r; sC += c; sR += r;
    bX0 += c * X; bX1 += r * X; bX2 += X;
    bY0 += c * Y; bY1 += r * Y; bY2 += Y;
  }
  const M = [
    [sCC, sCR, sC],
    [sCR, sRR, sR],
    [sC, sR, n],
  ];
  const sx = solve3(M, [bX0, bX1, bX2]);
  const sy = solve3(M, [bY0, bY1, bY2]);
  if (!sx || !sy) return null;

  const affine: Affine = {
    a: sx[0],
    b: sx[1],
    c: sx[2] + mX - sx[0] * mc - sx[1] * mr,
    d: sy[0],
    e: sy[1],
    f: sy[2] + mY - sy[0] * mc - sy[1] * mr,
  };

  let sq = 0;
  for (const p of pairs) {
    const q = applyAffine(affine, p.col, p.row);
    sq += (q.X - p.X) ** 2 + (q.Y - p.Y) ** 2;
  }
  return { affine, rmsGround: Math.sqrt(sq / n) };
}

// ---------- world file / prj / ers ----------

/** World file (.jgw/.pgw/.tfw/.wld/.eww): 6 baris A D B E C F; (C,F) = pusat piksel kiri-atas */
export function parseWorldFile(text: string): Affine | null {
  const nums = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => parseFloat(l.replace(',', '.')));
  if (nums.length < 6 || nums.slice(0, 6).some((n) => !isFinite(n))) return null;
  const [A, D, B, E, C, F] = nums;
  // pindahkan acuan dari pusat piksel ke sudut kiri-atas
  return {
    a: A,
    b: B,
    c: C - 0.5 * A - 0.5 * B,
    d: D,
    e: E,
    f: F - 0.5 * D - 0.5 * E,
  };
}

/** Tebak CRS dari teks WKT/.prj. Mengembalikan null bila tidak dikenali. */
export function crsFromWktText(text: string): GroundCrs | null {
  if (!text) return null;
  const utm = text.match(/UTM[\s_]*zone[\s_]*(\d{1,2})\s*([NSns])?/i);
  if (utm) {
    const zone = parseInt(utm[1], 10);
    let hemi: 'N' | 'S' = 'N';
    if (utm[2]) hemi = utm[2].toUpperCase() as 'N' | 'S';
    else if (/false_northing["',\s\]]*,?\s*10000000/i.test(text)) hemi = 'S';
    if (zone >= 1 && zone <= 60) return { kind: 'utm', zone, hemi };
  }
  const epsgAll = [...text.matchAll(/(?:EPSG|AUTHORITY\["EPSG"|ID\["EPSG")[\s":,]*(\d{4,6})/gi)];
  for (const m of epsgAll.reverse()) {
    const c = crsFromEpsg(parseInt(m[1], 10));
    if (c) return c;
  }
  if (/Mercator_Auxiliary_Sphere|Pseudo-Mercator|WGS_1984_Web_Mercator/i.test(text)) return { kind: 'merc' };
  if (/^\s*(GEOGCS|GEOGCRS)\[/i.test(text) && !/PROJCS|PROJCRS/i.test(text)) return { kind: 'geo' };
  return null;
}

export function crsFromEpsg(epsg: number): GroundCrs | null {
  if (epsg >= 32601 && epsg <= 32660) return { kind: 'utm', zone: epsg - 32600, hemi: 'N' };
  if (epsg >= 32701 && epsg <= 32760) return { kind: 'utm', zone: epsg - 32700, hemi: 'S' };
  if (epsg === 3857 || epsg === 900913 || epsg === 3785) return { kind: 'merc' };
  if (epsg === 4326 || epsg === 4979 || epsg === 4978) return { kind: 'geo' };
  return null;
}

export interface ErsInfo {
  affine: Affine | null;
  crs: GroundCrs | null;
  width?: number;
  height?: number;
}

/** Header ER Mapper (.ers), pendamping file .ecw */
export function parseErs(text: string): ErsInfo {
  const num = (re: RegExp): number | undefined => {
    const m = text.match(re);
    if (!m) return undefined;
    const v = parseFloat(m[1]);
    return isFinite(v) ? v : undefined;
  };
  const width = num(/NrOfCellsPerLine\s*=\s*(\d+)/i);
  const height = num(/NrOfLines\s*=\s*(\d+)/i);
  const E0 = num(/Eastings\s*=\s*([-0-9.eE+]+)/i);
  const N0 = num(/Northings\s*=\s*([-0-9.eE+]+)/i);
  const xd = num(/Xdimension\s*=\s*([-0-9.eE+]+)/i);
  const yd = num(/Ydimension\s*=\s*([-0-9.eE+]+)/i);
  const cellX = num(/RegistrationCellX\s*=\s*([-0-9.eE+]+)/i) ?? 0;
  const cellY = num(/RegistrationCellY\s*=\s*([-0-9.eE+]+)/i) ?? 0;

  let affine: Affine | null = null;
  if (E0 !== undefined && N0 !== undefined && xd && yd) {
    const px = Math.abs(xd);
    const py = Math.abs(yd);
    affine = { a: px, b: 0, c: E0 - cellX * px, d: 0, e: -py, f: N0 + cellY * py };
  }

  let crs: GroundCrs | null = null;
  const proj = text.match(/Projection\s*=\s*"([^"]+)"/i)?.[1] ?? '';
  const um = proj.match(/^([NS])?UTM(\d{1,2})$/i);
  if (um) {
    const zone = parseInt(um[2], 10);
    // ER Mapper: NUTM50 = utara, SUTM50 = selatan. "UTM50S" juga didukung.
    const hemi = (um[1] ? um[1].toUpperCase() : 'S') as 'N' | 'S';
    crs = { kind: 'utm', zone, hemi };
  } else {
    const um2 = proj.match(/^UTM[_\s]?(\d{1,2})([NS])$/i);
    if (um2) crs = { kind: 'utm', zone: parseInt(um2[1], 10), hemi: um2[2].toUpperCase() as 'N' | 'S' };
    else if (/GEODETIC/i.test(proj)) crs = { kind: 'geo' };
  }
  return { affine, crs, width, height };
}

// ---------- warp ke Web Mercator ----------

function mercFromLatLng(lat: number, lng: number): { mx: number; my: number } {
  const c = Math.max(-85.05, Math.min(85.05, lat));
  return { mx: R_MERC * lng * DEG, my: R_MERC * Math.log(Math.tan(Math.PI / 4 + (c * DEG) / 2)) };
}

function latLngFromMerc(mx: number, my: number): { lat: number; lng: number } {
  return { lng: mx / R_MERC / DEG, lat: (2 * Math.atan(Math.exp(my / R_MERC)) - Math.PI / 2) / DEG };
}

export interface WarpOptions {
  /** sisi terpanjang gambar hasil (piksel). Default 4096 */
  maxDim?: number;
  /** zona UTM untuk laporan batas UTM (default: dari pusat gambar) */
  reportZone?: { zone: number; hemi: 'N' | 'S' };
}

export async function warpToMercator(src: RasterSource, opts: WarpOptions = {}): Promise<WarpResult> {
  const maxDim = opts.maxDim ?? 4096;
  const inv = invertAffine(src.affine);
  if (!inv) throw new Error('Transformasi georeferensi tidak valid (determinan nol).');

  const W = src.width;
  const H = src.height;

  // 1. Batas lat/lng dari tepi gambar (disampel agar akurat walau berotasi)
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  const SAMPLES = 24;
  const edgePts: Array<[number, number]> = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    edgePts.push([t * W, 0], [t * W, H], [0, t * H], [W, t * H]);
  }
  for (const [c, r] of edgePts) {
    const g = applyAffine(src.affine, c, r);
    const ll = groundToLatLng(src.crs, g.X, g.Y);
    if (!isFinite(ll.lat) || !isFinite(ll.lng)) throw new Error('Koordinat di luar jangkauan proyeksi.');
    minLat = Math.min(minLat, ll.lat);
    maxLat = Math.max(maxLat, ll.lat);
    minLng = Math.min(minLng, ll.lng);
    maxLng = Math.max(maxLng, ll.lng);
  }
  if (maxLat > 85 || minLat < -85 || maxLng > 180.0001 || minLng < -180.0001) {
    throw new Error('Koordinat tidak masuk akal untuk WGS84. Periksa zona UTM / sistem koordinat file.');
  }

  const sw = mercFromLatLng(minLat, minLng);
  const ne = mercFromLatLng(maxLat, maxLng);
  const mxSpan = ne.mx - sw.mx;
  const mySpan = ne.my - sw.my;

  // 2. Resolusi tanah per piksel sumber (meter) -> ukuran keluaran
  const gx = Math.hypot(src.affine.a, src.affine.d);
  const gy = Math.hypot(src.affine.b, src.affine.e);
  let metersPerPixel = (gx + gy) / 2;
  const midLat = (minLat + maxLat) / 2;
  if (src.crs.kind === 'geo') metersPerPixel *= 111320 * Math.cos(midLat * DEG);
  else if (src.crs.kind === 'merc') metersPerPixel *= Math.cos(midLat * DEG);
  // piksel keluaran dalam meter-mercator = meter tanah / cos(lat)
  const mercPixel = metersPerPixel / Math.cos(midLat * DEG);

  let outW = Math.max(2, Math.round(mxSpan / mercPixel));
  let outH = Math.max(2, Math.round(mySpan / mercPixel));
  const big = Math.max(outW, outH);
  if (big > maxDim) {
    const k = maxDim / big;
    outW = Math.max(2, Math.round(outW * k));
    outH = Math.max(2, Math.round(outH * k));
  }

  // 3. Mesh koordinat sumber (interpolasi bilinear antar node)
  const STEP = 16;
  const gw = Math.ceil(outW / STEP) + 1;
  const gh = Math.ceil(outH / STEP) + 1;
  const meshX = new Float32Array(gw * gh);
  const meshY = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const oy = Math.min(outH, j * STEP);
    const my = ne.my - (oy / outH) * mySpan;
    for (let i = 0; i < gw; i++) {
      const ox = Math.min(outW, i * STEP);
      const mx = sw.mx + (ox / outW) * mxSpan;
      const ll = latLngFromMerc(mx, my);
      const g = latLngToGround(src.crs, ll.lat, ll.lng);
      const p = applyAffine(inv, g.X, g.Y);
      meshX[j * gw + i] = p.X;
      meshY[j * gw + i] = p.Y;
    }
  }

  // 4. Resampling bilinear (alpha ter-premultiply)
  const out = new Uint8ClampedArray(outW * outH * 4);
  const s = src.rgba;
  for (let oy = 0; oy < outH; oy++) {
    const gj = Math.min(gh - 2, Math.floor(oy / STEP));
    const fy = (oy - gj * STEP) / STEP;
    for (let ox = 0; ox < outW; ox++) {
      const gi = Math.min(gw - 2, Math.floor(ox / STEP));
      const fx = (ox - gi * STEP) / STEP;
      const i00 = gj * gw + gi;
      const i10 = i00 + 1;
      const i01 = i00 + gw;
      const i11 = i01 + 1;
      const sx =
        meshX[i00] * (1 - fx) * (1 - fy) + meshX[i10] * fx * (1 - fy) + meshX[i01] * (1 - fx) * fy + meshX[i11] * fx * fy;
      const sy =
        meshY[i00] * (1 - fx) * (1 - fy) + meshY[i10] * fx * (1 - fy) + meshY[i01] * (1 - fx) * fy + meshY[i11] * fx * fy;

      // di luar gambar -> transparan
      if (sx < 0 || sy < 0 || sx > W || sy > H) continue;

      const px = sx - 0.5;
      const py = sy - 0.5;
      let x0 = Math.floor(px);
      let y0 = Math.floor(py);
      const tx = px - x0;
      const ty = py - y0;
      let x1 = x0 + 1;
      let y1 = y0 + 1;
      if (x0 < 0) x0 = 0;
      if (y0 < 0) y0 = 0;
      if (x1 > W - 1) x1 = W - 1;
      if (y1 > H - 1) y1 = H - 1;
      if (x0 > W - 1) x0 = W - 1;
      if (y0 > H - 1) y0 = H - 1;

      const o00 = (y0 * W + x0) * 4;
      const o10 = (y0 * W + x1) * 4;
      const o01 = (y1 * W + x0) * 4;
      const o11 = (y1 * W + x1) * 4;
      const w00 = (1 - tx) * (1 - ty);
      const w10 = tx * (1 - ty);
      const w01 = (1 - tx) * ty;
      const w11 = tx * ty;

      const a00 = s[o00 + 3] * w00;
      const a10 = s[o10 + 3] * w10;
      const a01 = s[o01 + 3] * w01;
      const a11 = s[o11 + 3] * w11;
      const A = a00 + a10 + a01 + a11;
      const oo = (oy * outW + ox) * 4;
      if (A < 0.5) continue;
      out[oo] = (s[o00] * a00 + s[o10] * a10 + s[o01] * a01 + s[o11] * a11) / A;
      out[oo + 1] = (s[o00 + 1] * a00 + s[o10 + 1] * a10 + s[o01 + 1] * a01 + s[o11 + 1] * a11) / A;
      out[oo + 2] = (s[o00 + 2] * a00 + s[o10 + 2] * a10 + s[o01 + 2] * a01 + s[o11 + 2] * a11) / A;
      out[oo + 3] = A;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia.');
  ctx.putImageData(new ImageData(out, outW, outH), 0, 0);
  const blob = await canvasToBlob(canvas);

  // 5. Batas UTM (laporan untuk pengguna)
  const rz =
    opts.reportZone ??
    (src.crs.kind === 'utm'
      ? { zone: src.crs.zone, hemi: src.crs.hemi }
      : { zone: utmZoneFromLng((minLng + maxLng) / 2), hemi: (midLat >= 0 ? 'N' : 'S') as 'N' | 'S' });
  const uSW = latLngToUtm(minLat, minLng, 0, rz.zone, rz.hemi);
  const uNE = latLngToUtm(maxLat, maxLng, 0, rz.zone, rz.hemi);

  return {
    blob,
    width: outW,
    height: outH,
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
    utmBounds: {
      minE: Math.min(uSW.easting, uNE.easting),
      minN: Math.min(uSW.northing, uNE.northing),
      maxE: Math.max(uSW.easting, uNE.easting),
      maxN: Math.max(uSW.northing, uNE.northing),
      zone: `${rz.zone}${rz.hemi}`,
    },
    metersPerPixel,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const px = canvas.width * canvas.height;
  return new Promise((resolve, reject) => {
    const usePng = px <= 2_000_000;
    canvas.toBlob(
      (b) => {
        if (b && (usePng || b.type === 'image/webp')) return resolve(b);
        // WebP tidak didukung -> PNG
        canvas.toBlob(
          (p) => (p ? resolve(p) : reject(new Error('Gagal membuat gambar hasil.'))),
          'image/png'
        );
      },
      usePng ? 'image/png' : 'image/webp',
      0.92
    );
  });
}

/** Ubah ukuran raster RGBA ke sisi terpanjang <= maxDim (box filter sederhana). */
export function downscaleRgba(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  maxDim: number
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const big = Math.max(w, h);
  if (big <= maxDim) return { rgba, width: w, height: h };
  const k = maxDim / big;
  const tw = Math.max(1, Math.round(w * k));
  const th = Math.max(1, Math.round(h * k));
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const sy0 = Math.floor((y * h) / th);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * h) / th));
    for (let x = 0; x < tw; x++) {
      const sx0 = Math.floor((x * w) / tw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * w) / tw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = sy0; yy < sy1; yy++) {
        for (let xx = sx0; xx < sx1; xx++) {
          const o = (yy * w + xx) * 4;
          const al = rgba[o + 3];
          r += rgba[o] * al;
          g += rgba[o + 1] * al;
          b += rgba[o + 2] * al;
          a += al;
          n++;
        }
      }
      const oo = (y * tw + x) * 4;
      if (a > 0) {
        out[oo] = r / a;
        out[oo + 1] = g / a;
        out[oo + 2] = b / a;
        out[oo + 3] = a / n;
      }
    }
  }
  return { rgba: out, width: tw, height: th };
}
