/**
 * Surveyor Everyday - High Precision WGS84 UTM Projection Math
 * Standard for Indonesian & International Mining Operations
 */

import { UTMCoordinate, LatLngElevation, SurveyLineSegment } from '../types/survey';

// WGS84 Ellipsoid constants
const A = 6378137.0; // semi-major axis
const F = 1 / 298.257223563; // flattening
const E2 = 2 * F - F * F; // first eccentricity squared
const E_PRIME2 = E2 / (1 - E2); // second eccentricity squared
const K0 = 0.9996; // scale factor at central meridian
const FALSE_EASTING = 500000.0;
const FALSE_NORTHING_SOUTH = 10000000.0;

const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

/**
 * Determine UTM Zone number (1 to 60) from longitude
 */
export function getUtmZoneNumber(lng: number): number {
  let zone = Math.floor((lng + 180) / 6) + 1;
  if (zone < 1) zone = 1;
  if (zone > 60) zone = 60;
  return zone;
}

/**
 * Determine Hemisphere ('N' or 'S') from latitude
 */
export function getUtmHemisphere(lat: number): 'N' | 'S' {
  return lat >= 0 ? 'N' : 'S';
}

/**
 * Convert Latitude & Longitude to UTM WGS84 coordinates
 * Returns NEZ format with millimeter precision (3 decimal places)
 */
export function latLngToUtm(
  lat: number,
  lng: number,
  elevation = 0,
  forcedZone?: number,
  forcedHemisphere?: 'N' | 'S'
): UTMCoordinate {
  const zone = forcedZone ?? getUtmZoneNumber(lng);
  const hemisphere = forcedHemisphere ?? getUtmHemisphere(lat);

  const phi = lat * DEG_TO_RAD;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  // Central meridian of the zone
  const lambda0 = ((zone - 1) * 6 - 180 + 3) * DEG_TO_RAD;
  const lambda = lng * DEG_TO_RAD;
  const deltaLambda = lambda - lambda0;

  // Radius of curvature in the prime vertical
  const N = A / Math.sqrt(1 - E2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = E_PRIME2 * cosPhi * cosPhi;
  const A_coeff = cosPhi * deltaLambda;

  // Meridional distance calculation
  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256) * phi -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 * E2 * E2) / 1024) * Math.sin(2 * phi) +
      ((15 * E2 * E2) / 256 + (45 * E2 * E2 * E2) / 1024) * Math.sin(4 * phi) -
      ((35 * E2 * E2 * E2) / 3072) * Math.sin(6 * phi));

  // Easting calculation
  const A3 = Math.pow(A_coeff, 3);
  const A5 = Math.pow(A_coeff, 5);
  let easting =
    K0 *
      N *
      (A_coeff +
        ((1 - T + C) * A3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * E_PRIME2) * A5) / 120) +
    FALSE_EASTING;

  // Northing calculation
  const A2 = Math.pow(A_coeff, 2);
  const A4 = Math.pow(A_coeff, 4);
  const A6 = Math.pow(A_coeff, 6);
  let northing =
    K0 *
    (M +
      N *
        tanPhi *
        (A2 / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * E_PRIME2) * A6) / 720));

  if (hemisphere === 'S') {
    northing += FALSE_NORTHING_SOUTH;
  }

  // Format to 3 decimal places (millimeter precision) with letters in front
  const zoneString = `${zone}${hemisphere}`;
  const eastingFormatted = `E ${easting.toFixed(3)}`;
  const northingFormatted = `N ${northing.toFixed(3)}`;
  const elevationFormatted = `Z ${elevation.toFixed(3)} MDPL`;

  return {
    zone,
    hemisphere,
    zoneString,
    easting,
    northing,
    elevation,
    eastingFormatted,
    northingFormatted,
    elevationFormatted,
  };
}

/**
 * Inverse UTM conversion: Converts Easting & Northing to Lat/Lon
 * Used for importing AutoCAD DXF files that are stored in UTM coordinates
 */
export function utmToLatLng(
  easting: number,
  northing: number,
  zone: number,
  hemisphere: 'N' | 'S'
): { lat: number; lng: number } {
  const x = easting - FALSE_EASTING;
  let y = northing;
  if (hemisphere === 'S') {
    y -= FALSE_NORTHING_SOUTH;
  }

  // Footpoint latitude calculation
  const M = y / K0;
  const mu =
    M /
    (A *
      (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256));

  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const J1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
  const J2 = (21 * Math.pow(e1, 2)) / 16 - (55 * Math.pow(e1, 4)) / 32;
  const J3 = (151 * Math.pow(e1, 3)) / 96;
  const J4 = (1097 * Math.pow(e1, 4)) / 512;

  const phi1 =
    mu +
    J1 * Math.sin(2 * mu) +
    J2 * Math.sin(4 * mu) +
    J3 * Math.sin(6 * mu) +
    J4 * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = A / Math.sqrt(1 - E2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = E_PRIME2 * cosPhi1 * cosPhi1;
  const R1 = (A * (1 - E2)) / Math.pow(1 - E2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * K0);

  const D2 = Math.pow(D, 2);
  const D3 = Math.pow(D, 3);
  const D4 = Math.pow(D, 4);
  const D5 = Math.pow(D, 5);
  const D6 = Math.pow(D, 6);

  const latRad =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      (D2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * E_PRIME2) * D4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * E_PRIME2 - 3 * C1 * C1) * D6) /
          720);

  const lambda0 = ((zone - 1) * 6 - 180 + 3) * DEG_TO_RAD;
  const lngRad =
    lambda0 +
    (D -
      ((1 + 2 * T1 + C1) * D3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * E_PRIME2 + 24 * T1 * T1) * D5) / 120) /
      cosPhi1;

  return {
    lat: latRad * RAD_TO_DEG,
    lng: lngRad * RAD_TO_DEG,
  };
}

/**
 * Calculates geodesic distance between two points in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371000 * c; // Earth radius in meters
}

/**
 * Compute line segments with individual distances and midpoints for labeling
 */
export function computeLineSegments(vertices: LatLngElevation[]): {
  segments: SurveyLineSegment[];
  totalLengthMeters: number;
} {
  if (vertices.length < 2) {
    return { segments: [], totalLengthMeters: 0 };
  }

  const segments: SurveyLineSegment[] = [];
  let totalLengthMeters = 0;

  for (let i = 0; i < vertices.length - 1; i++) {
    const p1 = vertices[i];
    const p2 = vertices[i + 1];
    const len = calculateDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng);
    totalLengthMeters += len;

    segments.push({
      fromIndex: i,
      toIndex: i + 1,
      lengthMeters: len,
      midpoint: [(p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2],
    });
  }

  return { segments, totalLengthMeters };
}

/**
 * Compute polygon perimeter, segments (including closing edge), area (m² and Ha), and centroid
 */
export function computePolygonMetrics(vertices: LatLngElevation[]): {
  segments: SurveyLineSegment[];
  perimeterMeters: number;
  areaSquareMeters: number;
  areaHectares: number;
  centroid: [number, number];
} {
  if (vertices.length < 3) {
    return {
      segments: [],
      perimeterMeters: 0,
      areaSquareMeters: 0,
      areaHectares: 0,
      centroid: [0, 0],
    };
  }

  const segments: SurveyLineSegment[] = [];
  let perimeterMeters = 0;
  let latSum = 0;
  let lngSum = 0;

  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];
    const len = calculateDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng);
    perimeterMeters += len;
    latSum += p1.lat;
    lngSum += p1.lng;

    segments.push({
      fromIndex: i,
      toIndex: (i + 1) % n,
      lengthMeters: len,
      midpoint: [(p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2],
    });
  }

  // Centroid
  const centroid: [number, number] = [latSum / n, lngSum / n];

  // Geodesic / UTM Projected Shoelace polygon area (accurate in square meters)
  // Convert all vertices to local UTM coordinates for accurate planar surveying area
  const utmVertices = vertices.map((v) => latLngToUtm(v.lat, v.lng));
  let shoelaceSum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    shoelaceSum += utmVertices[i].easting * utmVertices[j].northing;
    shoelaceSum -= utmVertices[j].easting * utmVertices[i].northing;
  }
  const areaSquareMeters = Math.abs(shoelaceSum) / 2.0;
  const areaHectares = areaSquareMeters / 10000.0;

  return {
    segments,
    perimeterMeters,
    areaSquareMeters,
    areaHectares,
    centroid,
  };
}

/**
 * Format distance in meters with friendly display (e.g. "124.50 m" or "1.25 km")
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(2)} m`;
}

/**
 * Format area in square meters and hectares
 */
export function formatArea(squareMeters: number): {
  sqMetersStr: string;
  hectaresStr: string;
  combined: string;
} {
  const ha = squareMeters / 10000;
  const sqMetersStr = `${squareMeters.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
  const hectaresStr = `${ha.toFixed(2)} Ha`;
  return {
    sqMetersStr,
    hectaresStr,
    combined: `${sqMetersStr} · ${hectaresStr}`,
  };
}
