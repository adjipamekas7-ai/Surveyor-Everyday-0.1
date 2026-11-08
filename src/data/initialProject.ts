/**
 * Initial Mining Survey Project Dataset
 * Matches the user's screenshot coordinate location (UTM 50S East Kalimantan / Kalsel)
 */

import { SurveyProject } from '../types/survey';
import { latLngToUtm, computeLineSegments, computePolygonMetrics } from '../utils/utm';

// Center coordinate from user's screenshot: 50S 307284.03 E 9649781.95 N
// Lat: ~ -3.1654, Lng: ~ 115.2635
export const DEFAULT_MINE_CENTER = {
  lat: -3.16542,
  lng: 115.26351,
  zoom: 14,
  zone: 50,
  hemisphere: 'S' as const,
};

// Initial realistic mine features around this center
const pt1Utm = latLngToUtm(-3.16380, 115.26250, 145.25, 50, 'S');
const pt2Utm = latLngToUtm(-3.16450, 115.26380, 138.80, 50, 'S');
const pt3Utm = latLngToUtm(-3.16580, 115.26420, 130.15, 50, 'S');
const pt4Utm = latLngToUtm(-3.16690, 115.26290, 122.50, 50, 'S');

const samplePoints = [
  {
    id: 'p-bm01',
    name: 'BM-01',
    code: 'BM',
    color: '#ef4444',
    lat: -3.16380,
    lng: 115.26250,
    utm: pt1Utm,
    timestamp: Date.now() - 3600000 * 24,
    description: 'Bench Mark Utama GPS Geodetic Titik Ikat Pit',
  },
  {
    id: 'p-crest01',
    name: 'CR-101',
    code: 'CREST',
    color: '#fbbf24',
    lat: -3.16450,
    lng: 115.26380,
    utm: pt2Utm,
    timestamp: Date.now() - 3600000 * 18,
    description: 'Crest Bench RL 140',
  },
  {
    id: 'p-toe01',
    name: 'TO-101',
    code: 'TOE',
    color: '#38bdf8',
    lat: -3.16580,
    lng: 115.26420,
    utm: pt3Utm,
    timestamp: Date.now() - 3600000 * 12,
    description: 'Toe Bench RL 130',
  },
  {
    id: 'p-blast01',
    name: 'BH-01',
    code: 'BLAST',
    color: '#ec4899',
    lat: -3.16690,
    lng: 115.26290,
    utm: pt4Utm,
    timestamp: Date.now() - 3600000 * 4,
    description: 'Blast Hole Pattering Row 1',
  },
];

// Sample Crest Line
const lineVertices = [
  { lat: -3.1632, lng: 115.2618, elevation: 145.0 },
  { lat: -3.1641, lng: 115.2632, elevation: 143.5 },
  { lat: -3.1649, lng: 115.2647, elevation: 142.0 },
  { lat: -3.1662, lng: 115.2655, elevation: 140.2 },
];
const lineUtmVertices = lineVertices.map((v) => latLngToUtm(v.lat, v.lng, v.elevation, 50, 'S'));
const lineMetrics = computeLineSegments(lineVertices);

const sampleLines = [
  {
    id: 'ln-crest-west',
    name: 'CREST_WEST_B14',
    code: 'CREST',
    color: '#fbbf24',
    strokeWidth: 3,
    vertices: lineVertices,
    utmVertices: lineUtmVertices,
    totalLengthMeters: lineMetrics.totalLengthMeters,
    segments: lineMetrics.segments,
    timestamp: Date.now() - 3600000 * 8,
    description: 'Garis Crest Barat Pit Aktif',
  },
];

// Sample Blast Block Area (Polygon)
const polyVertices = [
  { lat: -3.1650, lng: 115.2610, elevation: 135.0 },
  { lat: -3.1652, lng: 115.2630, elevation: 134.5 },
  { lat: -3.1668, lng: 115.2635, elevation: 133.0 },
  { lat: -3.1672, lng: 115.2614, elevation: 134.0 },
];
const polyUtmVertices = polyVertices.map((v) => latLngToUtm(v.lat, v.lng, v.elevation, 50, 'S'));
const polyMetrics = computePolygonMetrics(polyVertices);

const samplePolygons = [
  {
    id: 'pg-blast-blk03',
    name: 'BLAST_BLOCK_03',
    code: 'BLAST_AREA',
    color: '#06b6d4',
    fillColor: '#06b6d4',
    fillOpacity: 0.25,
    vertices: polyVertices,
    utmVertices: polyUtmVertices,
    areaSquareMeters: polyMetrics.areaSquareMeters,
    areaHectares: polyMetrics.areaHectares,
    perimeterMeters: polyMetrics.perimeterMeters,
    centroid: polyMetrics.centroid,
    segments: polyMetrics.segments,
    timestamp: Date.now() - 3600000 * 6,
    description: 'Area Blasting Siap Ledak Shift Siang',
  },
];

export const INITIAL_PROJECT: SurveyProject = {
  id: 'prj-pit-east-01',
  name: 'Pit Tutupan Utama - Blok 03',
  siteName: 'Tambang Batubara Site Sangatta / Tapin',
  defaultUtmZone: '50S',
  datum: 'WGS84',
  updatedAt: Date.now(),
  points: samplePoints,
  lines: sampleLines,
  polygons: samplePolygons,
  overlays: [],
};
