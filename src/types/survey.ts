/**
 * Surveyor Everyday - Mining & Geospatial Types
 */

export type BasemapType = 'satelit' | 'kontur' | 'road' | 'geopdf';
export type CoordinateSystemType = 'utm' | 'geographic' | 'dms';
export type UnitSystem = 'metric' | 'imperial';
export type AppTheme = 'light' | 'dark';
export type SnapMode = 'free' | 'point' | 'line';

export interface AppSettings {
  unitSystem: UnitSystem; // 'metric' or 'imperial'
  decimalPlaces: number; // 2, 3, or 4
  coordinateSystem: CoordinateSystemType; // 'utm' | 'geographic' | 'dms'
  theme: AppTheme; // 'light' | 'dark'
  elevationOffset: number; // in meters (+ or - offset for pole height or geoid)
  customPointCodes: string[];
  customLineCodes: string[];
  customAreaCodes: string[];
}

export interface UTMCoordinate {
  zone: number;
  hemisphere: 'N' | 'S';
  zoneString: string; // e.g. "50S"
  easting: number; // Meters
  northing: number; // Meters
  elevation: number; // Meters above sea level (MDPL)
  eastingFormatted: string; // "307284.030 E"
  northingFormatted: string; // "9649781.950 N"
  elevationFormatted: string; // "142.500 MDPL"
}

export interface LatLngElevation {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface SurveyPoint {
  id: string;
  name: string;
  code: string;
  color: string;
  lat: number;
  lng: number;
  utm: UTMCoordinate;
  timestamp: number;
  description?: string;
  layerId?: string;
}

export interface SurveyLineSegment {
  fromIndex: number;
  toIndex: number;
  lengthMeters: number;
  midpoint: [number, number]; // [lat, lng]
}

export interface SurveyLine {
  id: string;
  name: string;
  code: string;
  color: string;
  strokeWidth: number;
  vertices: LatLngElevation[];
  utmVertices: UTMCoordinate[];
  totalLengthMeters: number;
  segments: SurveyLineSegment[];
  timestamp: number;
  description?: string;
  layerId?: string;
}

export interface SurveyPolygon {
  id: string;
  name: string;
  code: string;
  color: string;
  fillColor: string;
  fillOpacity: number;
  vertices: LatLngElevation[];
  utmVertices: UTMCoordinate[];
  areaSquareMeters: number;
  areaHectares: number;
  perimeterMeters: number;
  centroid: [number, number]; // [lat, lng]
  segments: SurveyLineSegment[];
  timestamp: number;
  description?: string;
  layerId?: string;
}

export interface GeoOverlay {
  id: string;
  name: string;
  type: 'pdf' | 'tiff' | 'ecw' | 'image' | 'dxf' | 'kml';
  url: string;
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  opacity: number;
  visible: boolean;
  filename: string;
  originalUtmBounds?: {
    minE: number;
    minN: number;
    maxE: number;
    maxN: number;
    zone: string;
  };
}

export interface SurveyProject {
  id: string;
  name: string;
  siteName: string;
  defaultUtmZone: string;
  datum: string;
  updatedAt: number;
  points: SurveyPoint[];
  lines: SurveyLine[];
  polygons: SurveyPolygon[];
  overlays: GeoOverlay[];
}

export interface DxfLayerInfo {
  name: string;
  colorHex: string;
  pointCount: number;
  lineCount: number;
  selected: boolean;
}

export interface SnapTarget {
  type: 'point' | 'line';
  lat: number;
  lng: number;
  utm: UTMCoordinate;
  label: string;
  color?: string;
}
