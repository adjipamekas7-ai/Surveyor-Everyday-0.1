/**
 * Surveyor Everyday - Sistem koordinat (CRS) untuk raster/GeoPDF.
 * Transverse Mercator (deret Krüger) + Web Mercator + geografis. Tanpa dependensi.
 */

const A = 6378137;
const F = 1 / 298.257223563;
const N_ = F / (2 - F);
const D2R = Math.PI / 180;

export interface Crs {
  kind: 'geographic' | 'tm' | 'webmerc';
  name: string;
  lon0?: number; // derajat
  lat0?: number; // derajat
  k0?: number;
  fe?: number;
  fn?: number;
  utmZone?: number;
  south?: boolean;
  assumed?: boolean; // true bila CRS ditebak/dipilih user, bukan dari file
}

const n = N_;
const n2 = n * n;
const n3 = n2 * n;
const n4 = n3 * n;
const AA = (A / (1 + n)) * (1 + n2 / 4 + n4 / 64);
const alpha = [
  n / 2 - (2 * n2) / 3 + (5 * n3) / 16,
  (13 * n2) / 48 - (3 * n3) / 5,
  (61 * n3) / 240,
];
const beta = [
  n / 2 - (2 * n2) / 3 + (37 * n3) / 96,
  n2 / 48 + n3 / 15,
  (17 * n3) / 480,
];
const delta = [2 * n - (2 * n2) / 3 - 2 * n3, (7 * n2) / 3 - (8 * n3) / 5, (56 * n3) / 15];

function tmXiEta(latDeg: number, dLonRad: number) {
  const phi = latDeg * D2R;
  const sp = Math.sin(phi);
  const c = (2 * Math.sqrt(n)) / (1 + n);
  const t = Math.sinh(Math.atanh(sp) - c * Math.atanh(c * sp));
  const xi = Math.atan2(t, Math.cos(dLonRad));
  const eta = Math.atanh(Math.sin(dLonRad) / Math.sqrt(1 + t * t));
  return { xi, eta };
}

function tmN0(lat0: number, k0: number): number {
  if (!lat0) return 0;
  const { xi } = tmXiEta(lat0, 0);
  let s = xi;
  for (let j = 1; j <= 3; j++) s += alpha[j - 1] * Math.sin(2 * j * xi);
  return k0 * AA * s;
}

export function utmCrs(zone: number, south: boolean, assumed = false): Crs {
  return {
    kind: 'tm',
    name: `WGS 84 / UTM zona ${zone}${south ? 'S' : 'N'}`,
    lon0: (zone - 1) * 6 - 180 + 3,
    lat0: 0,
    k0: 0.9996,
    fe: 500000,
    fn: south ? 10000000 : 0,
    utmZone: zone,
    south,
    assumed,
  };
}

export const WGS84_GEOGRAPHIC: Crs = { kind: 'geographic', name: 'WGS 84 (lat/lon)' };

export function crsFromEpsg(code: number): Crs | null {
  if (code >= 32601 && code <= 32660) return utmCrs(code - 32600, false);
  if (code >= 32701 && code <= 32760) return utmCrs(code - 32700, true);
  if (code === 3857 || code === 900913 || code === 3785) {
    return { kind: 'webmerc', name: 'WGS 84 / Web Mercator' };
  }
  // Sistem geografis umum (WGS84, NAD83, DGN95, ID74 - selisih datum diabaikan, < ~2 m)
  if ([4326, 4269, 4283, 4756, 4755, 4238].includes(code)) {
    return { kind: 'geographic', name: `Geografis (EPSG:${code})` };
  }
  return null;
}

export function toLatLng(crs: Crs, x: number, y: number): { lat: number; lng: number } {
  if (crs.kind === 'geographic') return { lat: y, lng: x };
  if (crs.kind === 'webmerc') {
    return {
      lng: (x / A) / D2R,
      lat: (2 * Math.atan(Math.exp(y / A)) - Math.PI / 2) / D2R,
    };
  }
  const k0 = crs.k0 ?? 0.9996;
  const E = (x - (crs.fe ?? 0)) / (k0 * AA);
  const Nn = (y - (crs.fn ?? 0) + tmN0(crs.lat0 ?? 0, k0)) / (k0 * AA);
  let xi1 = Nn;
  let eta1 = E;
  for (let j = 1; j <= 3; j++) {
    xi1 -= beta[j - 1] * Math.sin(2 * j * Nn) * Math.cosh(2 * j * E);
    eta1 -= beta[j - 1] * Math.cos(2 * j * Nn) * Math.sinh(2 * j * E);
  }
  const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
  let phi = chi;
  for (let j = 1; j <= 3; j++) phi += delta[j - 1] * Math.sin(2 * j * chi);
  const lam = (crs.lon0 ?? 0) * D2R + Math.atan2(Math.sinh(eta1), Math.cos(xi1));
  return { lat: phi / D2R, lng: lam / D2R };
}

export function fromLatLng(crs: Crs, lat: number, lng: number): { x: number; y: number } {
  if (crs.kind === 'geographic') return { x: lng, y: lat };
  if (crs.kind === 'webmerc') {
    const la = Math.max(-85.05112878, Math.min(85.05112878, lat));
    return { x: A * lng * D2R, y: A * Math.log(Math.tan(Math.PI / 4 + (la * D2R) / 2)) };
  }
  const k0 = crs.k0 ?? 0.9996;
  let dl = (lng - (crs.lon0 ?? 0)) * D2R;
  while (dl > Math.PI) dl -= 2 * Math.PI;
  while (dl < -Math.PI) dl += 2 * Math.PI;
  const { xi, eta } = tmXiEta(lat, dl);
  let E = eta;
  let Nn = xi;
  for (let j = 1; j <= 3; j++) {
    E += alpha[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
    Nn += alpha[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
  }
  return {
    x: (crs.fe ?? 0) + k0 * AA * E,
    y: (crs.fn ?? 0) + k0 * AA * Nn - tmN0(crs.lat0 ?? 0, k0),
  };
}

/** Mercator Y (bola) dipakai Leaflet untuk menempatkan gambar. */
export function mercY(lat: number): number {
  const la = Math.max(-85.05112878, Math.min(85.05112878, lat));
  return Math.log(Math.tan(Math.PI / 4 + (la * D2R) / 2));
}
export function invMercY(m: number): number {
  return (2 * Math.atan(Math.exp(m)) - Math.PI / 2) / D2R;
}

/** Zona UTM terdekat dari lat/lng. */
export function utmCrsFor(lat: number, lng: number): Crs {
  const zone = Math.min(60, Math.max(1, Math.floor((lng + 180) / 6) + 1));
  return utmCrs(zone, lat < 0);
}

/** Cari CRS dari teks WKT / .prj (UTM zone, EPSG). */
export function crsFromWkt(text: string): Crs | null {
  const z = text.match(/UTM[\s_]*zone[\s_]*(\d{1,2})\s*([NSns])?/i);
  if (z) {
    const zone = parseInt(z[1], 10);
    let south = false;
    if (z[2]) south = z[2].toUpperCase() === 'S';
    else {
      const fn = text.match(/False_Northing["']?\s*,\s*(-?[\d.]+)/i);
      south = !!fn && parseFloat(fn[1]) > 1e6;
    }
    if (zone >= 1 && zone <= 60) return utmCrs(zone, south);
  }
  const e = text.match(/(?:EPSG["']?\s*,\s*["']?|AUTHORITY\["EPSG","|ID\["EPSG",|EPSG:)(\d{4,6})/gi);
  if (e) {
    // ambil kode terakhir (biasanya milik CRS terluar/PROJCS ada di akhir pada WKT1)
    for (let i = e.length - 1; i >= 0; i--) {
      const m = e[i].match(/(\d{4,6})$/);
      if (m) {
        const c = crsFromEpsg(parseInt(m[1], 10));
        if (c && c.kind !== 'geographic') return c;
      }
    }
  }
  if (/PROJCS/i.test(text) === false && /GEOGCS/i.test(text)) return WGS84_GEOGRAPHIC;
  return null;
}
