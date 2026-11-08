/**
 * Surveyor Everyday - Mining Standard CSV Importer & Exporter
 * Fully compliant with ID, Name, Code, X, Y, Z, and timestamp export
 */

import { SurveyPoint, SurveyLine, SurveyPolygon } from '../types/survey';

/**
 * Comprehensive 'Export Data' function:
 * Converts points, lines, and polygons into a downloadable CSV with columns:
 * ID, Name, Code, X, Y, Z, Timestamp, FeatureType, VertexIndex
 */
export function exportAllSurveyDataToCsv(
  points: SurveyPoint[],
  lines: SurveyLine[],
  polygons: SurveyPolygon[],
  elevationOffset = 0,
  decimalPlaces = 3
): string {
  const headers = [
    'ID',
    'Name',
    'Code',
    'X_Easting',
    'Y_Northing',
    'Z_Elevation',
    'Timestamp',
    'FeatureType',
    'VertexIndex',
    'UTM_Zone',
    'Latitude',
    'Longitude',
    'Remarks',
  ];

  const rows: string[][] = [];

  // 1. Export Points
  for (const pt of points) {
    const z = (pt.utm.elevation + elevationOffset).toFixed(decimalPlaces);
    rows.push([
      pt.id,
      escapeCsv(pt.name),
      escapeCsv(pt.code),
      pt.utm.easting.toFixed(decimalPlaces),
      pt.utm.northing.toFixed(decimalPlaces),
      z,
      new Date(pt.timestamp).toISOString(),
      'POINT',
      '1',
      pt.utm.zoneString,
      pt.lat.toFixed(7),
      pt.lng.toFixed(7),
      escapeCsv(pt.description || ''),
    ]);
  }

  // 2. Export Line Vertices
  for (const line of lines) {
    line.utmVertices.forEach((v, idx) => {
      const z = (v.elevation + elevationOffset).toFixed(decimalPlaces);
      const originalVertex = line.vertices[idx];
      rows.push([
        `${line.id}_V${idx + 1}`,
        escapeCsv(`${line.name}_#${idx + 1}`),
        escapeCsv(line.code),
        v.easting.toFixed(decimalPlaces),
        v.northing.toFixed(decimalPlaces),
        z,
        new Date(line.timestamp).toISOString(),
        'LINE',
        (idx + 1).toString(),
        v.zoneString,
        (originalVertex?.lat || 0).toFixed(7),
        (originalVertex?.lng || 0).toFixed(7),
        escapeCsv(line.description || `Line vertex #${idx + 1}`),
      ]);
    });
  }

  // 3. Export Polygon Vertices
  for (const poly of polygons) {
    poly.utmVertices.forEach((v, idx) => {
      const z = (v.elevation + elevationOffset).toFixed(decimalPlaces);
      const originalVertex = poly.vertices[idx];
      rows.push([
        `${poly.id}_V${idx + 1}`,
        escapeCsv(`${poly.name}_#${idx + 1}`),
        escapeCsv(poly.code),
        v.easting.toFixed(decimalPlaces),
        v.northing.toFixed(decimalPlaces),
        z,
        new Date(poly.timestamp).toISOString(),
        'POLYGON',
        (idx + 1).toString(),
        v.zoneString,
        (originalVertex?.lat || 0).toFixed(7),
        (originalVertex?.lng || 0).toFixed(7),
        escapeCsv(poly.description || `Area vertex #${idx + 1}`),
      ]);
    });
  }

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Standard simple point-only CSV export
 */
export function exportToCsv(
  points: SurveyPoint[],
  elevationOffset = 0,
  decimalPlaces = 3
): string {
  const headers = [
    'ID',
    'Name',
    'Code',
    'X',
    'Y',
    'Z',
    'Timestamp',
    'UTM_Zone',
    'Latitude',
    'Longitude',
    'Description',
  ];

  const rows = points.map((p) => [
    p.id,
    escapeCsv(p.name),
    escapeCsv(p.code),
    p.utm.easting.toFixed(decimalPlaces),
    p.utm.northing.toFixed(decimalPlaces),
    (p.utm.elevation + elevationOffset).toFixed(decimalPlaces),
    new Date(p.timestamp).toISOString(),
    p.utm.zoneString,
    p.lat.toFixed(7),
    p.lng.toFixed(7),
    escapeCsv(p.description || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export interface ParsedCsvPoint {
  name: string;
  easting: number;
  northing: number;
  elevation: number;
  code: string;
  description?: string;
  utmZone?: string;
  lat?: number;
  lng?: number;
}

export function parseCsvString(csvContent: string): ParsedCsvPoint[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const idIdx = headers.findIndex((h) => h === 'id' || h.includes('name') || h.includes('pt') || h.includes('point'));
  const eastIdx = headers.findIndex((h) => h === 'x' || h.includes('east') || h.includes('x_'));
  const northIdx = headers.findIndex((h) => h === 'y' || h.includes('north') || h.includes('y_'));
  const elevIdx = headers.findIndex((h) => h === 'z' || h.includes('elev') || h.includes('rl') || h.includes('height') || h.includes('z_'));
  const codeIdx = headers.findIndex((h) => h.includes('code') || h.includes('desc') || h.includes('remark') || h.includes('layer'));
  const latIdx = headers.findIndex((h) => h.includes('lat'));
  const lngIdx = headers.findIndex((h) => h.includes('lon') || h.includes('lng'));

  const results: ParsedCsvPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',');
    if (rawCols.length < 3) continue;

    const name = idIdx >= 0 ? rawCols[idIdx]?.trim() : `PT_${i}`;
    const easting = eastIdx >= 0 ? parseFloat(rawCols[eastIdx]) : NaN;
    const northing = northIdx >= 0 ? parseFloat(rawCols[northIdx]) : NaN;
    const elevation = elevIdx >= 0 ? parseFloat(rawCols[elevIdx]) || 0 : 0;
    const code = codeIdx >= 0 ? rawCols[codeIdx]?.trim() : 'PNT';
    const lat = latIdx >= 0 ? parseFloat(rawCols[latIdx]) : undefined;
    const lng = lngIdx >= 0 ? parseFloat(rawCols[lngIdx]) : undefined;

    if (!isNaN(easting) && !isNaN(northing)) {
      results.push({
        name,
        easting,
        northing,
        elevation,
        code,
        lat,
        lng,
      });
    }
  }

  return results;
}
