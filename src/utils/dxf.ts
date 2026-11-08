/**
 * Surveyor Everyday - AutoCAD DXF R12 / R2000 Importer & Exporter
 * Supports layer selection and exact color preservation matching AutoCAD ACI colors
 */

import { SurveyPoint, SurveyLine, SurveyPolygon, DxfLayerInfo } from '../types/survey';

// AutoCAD ACI color mapping to high-visibility hex colors
export const ACI_COLOR_MAP: Record<number, string> = {
  1: '#ef4444', // Red
  2: '#eab308', // Yellow
  3: '#22c55e', // Green
  4: '#06b6d4', // Cyan
  5: '#3b82f6', // Blue
  6: '#d946ef', // Magenta
  7: '#ffffff', // White
  8: '#94a3b8', // Gray
  9: '#cbd5e1', // Light gray
  10: '#f87171',
  30: '#fb923c',
  50: '#facc15',
  70: '#a3e635',
  90: '#4ade80',
  110: '#2dd4bf',
  130: '#38bdf8',
  150: '#60a5fa',
  170: '#818cf8',
  190: '#c084fc',
  210: '#f472b6',
  230: '#fb7185',
};

export function getAciColorHex(colorCode: number, defaultHex = '#38bdf8'): string {
  if (ACI_COLOR_MAP[colorCode]) return ACI_COLOR_MAP[colorCode];
  // Basic modulo fallback
  const mapped = (Math.abs(colorCode) % 7) + 1;
  return ACI_COLOR_MAP[mapped] || defaultHex;
}

/**
 * Generate standard AutoCAD ASCII DXF format text
 */
export function exportToDxf(
  points: SurveyPoint[],
  lines: SurveyLine[],
  polygons: SurveyPolygon[],
  elevationOffset = 0
): string {
  const linesOut: string[] = [];

  // DXF Header
  linesOut.push('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '0', 'ENDSEC');

  // TABLES Section (Layers definition)
  linesOut.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '4');

  const layerDefs = [
    { name: 'SURVEY_POINTS', color: 2 },
    { name: 'SURVEY_LINES', color: 4 },
    { name: 'SURVEY_POLYGONS', color: 1 },
    { name: 'SURVEY_TEXT', color: 7 },
  ];

  for (const layer of layerDefs) {
    linesOut.push(
      '0',
      'LAYER',
      '2',
      layer.name,
      '70',
      '0',
      '62',
      layer.color.toString(),
      '6',
      'CONTINUOUS'
    );
  }

  linesOut.push('0', 'ENDTAB', '0', 'ENDSEC');

  // ENTITIES Section
  linesOut.push('0', 'SECTION', '2', 'ENTITIES');

  // Export Survey Points
  for (const pt of points) {
    const layerName = pt.code ? `PT_${pt.code.toUpperCase()}` : 'SURVEY_POINTS';
    const x = pt.utm.easting.toFixed(4);
    const y = pt.utm.northing.toFixed(4);
    const z = (pt.utm.elevation + elevationOffset).toFixed(4);

    linesOut.push('0', 'POINT', '8', layerName, '10', x, '20', y, '30', z);

    linesOut.push(
      '0',
      'TEXT',
      '8',
      'SURVEY_TEXT',
      '10',
      (pt.utm.easting + 1.0).toFixed(4),
      '20',
      (pt.utm.northing + 1.0).toFixed(4),
      '30',
      z,
      '40',
      '2.0',
      '1',
      `${pt.name} (${pt.code}) Z:${z}`
    );
  }

  // Export Survey Lines
  for (const line of lines) {
    const layerName = line.code ? `LN_${line.code.toUpperCase()}` : 'SURVEY_LINES';

    linesOut.push('0', 'POLYLINE', '8', layerName, '66', '1', '70', '0');

    for (const v of line.utmVertices) {
      linesOut.push(
        '0',
        'VERTEX',
        '8',
        layerName,
        '10',
        v.easting.toFixed(4),
        '20',
        v.northing.toFixed(4),
        '30',
        (v.elevation + elevationOffset).toFixed(4)
      );
    }

    linesOut.push('0', 'SEQEND', '8', layerName);
  }

  // Export Survey Polygons
  for (const poly of polygons) {
    const layerName = poly.code ? `PG_${poly.code.toUpperCase()}` : 'SURVEY_POLYGONS';

    linesOut.push('0', 'POLYLINE', '8', layerName, '66', '1', '70', '1');

    for (const v of poly.utmVertices) {
      linesOut.push(
        '0',
        'VERTEX',
        '8',
        layerName,
        '10',
        v.easting.toFixed(4),
        '20',
        v.northing.toFixed(4),
        '30',
        (v.elevation + elevationOffset).toFixed(4)
      );
    }

    linesOut.push('0', 'SEQEND', '8', layerName);
  }

  linesOut.push('0', 'ENDSEC', '0', 'EOF');

  return linesOut.join('\r\n');
}

export interface ParsedDxfEntityPoint {
  name: string;
  easting: number;
  northing: number;
  elevation: number;
  layer: string;
  colorHex: string;
}

export interface ParsedDxfEntityLine {
  name: string;
  layer: string;
  colorHex: string;
  isClosed: boolean;
  vertices: Array<{ easting: number; northing: number; elevation: number }>;
}

export interface ParsedDxfFullResult {
  layers: DxfLayerInfo[];
  points: ParsedDxfEntityPoint[];
  lines: ParsedDxfEntityLine[];
}

/**
 * Enhanced client-side ASCII DXF Parser
 * Extracts layer table, colors, and coordinates
 */
export function parseDxfWithLayers(dxfContent: string): ParsedDxfFullResult {
  const lines = dxfContent.split(/\r?\n/).map((l) => l.trim());
  const points: ParsedDxfEntityPoint[] = [];
  const polyEntities: ParsedDxfEntityLine[] = [];
  const layerColorMap = new Map<string, string>();
  const layerStats = new Map<string, { points: number; lines: number; colorHex: string }>();

  let i = 0;
  // Step 1: Scan for LAYER table definition to grab layer colors
  while (i < lines.length) {
    if (lines[i] === '0' && lines[i + 1]?.toUpperCase() === 'LAYER') {
      let layerName = '0';
      let layerColor = 7;
      i += 2;
      while (i < lines.length && lines[i] !== '0') {
        if (lines[i] === '2') layerName = lines[i + 1];
        if (lines[i] === '62') layerColor = parseInt(lines[i + 1]) || 7;
        i += 2;
      }
      const hex = getAciColorHex(layerColor);
      layerColorMap.set(layerName.toUpperCase(), hex);
      continue;
    }
    i += 2;
  }

  // Step 2: Scan for ENTITIES
  i = 0;
  while (i < lines.length) {
    const code = lines[i];
    const val = lines[i + 1];

    if (code === '0') {
      const entityType = val?.toUpperCase();

      if (entityType === 'POINT') {
        let layer = '0';
        let x = 0;
        let y = 0;
        let z = 0;
        let colorNum: number | null = null;

        i += 2;
        while (i < lines.length && lines[i] !== '0') {
          const subCode = lines[i];
          const subVal = lines[i + 1];
          if (subCode === '8') layer = subVal;
          else if (subCode === '10') x = parseFloat(subVal);
          else if (subCode === '20') y = parseFloat(subVal);
          else if (subCode === '30') z = parseFloat(subVal) || 0;
          else if (subCode === '62') colorNum = parseInt(subVal);
          i += 2;
        }

        if (!isNaN(x) && !isNaN(y)) {
          const normalizedLayer = layer.toUpperCase();
          const colorHex = colorNum !== null ? getAciColorHex(colorNum) : layerColorMap.get(normalizedLayer) || '#facc15';

          points.push({
            name: `DXF_${layer}_P${points.length + 1}`,
            easting: x,
            northing: y,
            elevation: z,
            layer,
            colorHex,
          });

          const stat = layerStats.get(layer) || { points: 0, lines: 0, colorHex };
          stat.points += 1;
          layerStats.set(layer, stat);
        }
        continue;
      } else if (entityType === 'LINE') {
        let layer = '0';
        let x1 = 0, y1 = 0, z1 = 0, x2 = 0, y2 = 0, z2 = 0;
        let colorNum: number | null = null;

        i += 2;
        while (i < lines.length && lines[i] !== '0') {
          const subCode = lines[i];
          const subVal = lines[i + 1];
          if (subCode === '8') layer = subVal;
          else if (subCode === '10') x1 = parseFloat(subVal);
          else if (subCode === '20') y1 = parseFloat(subVal);
          else if (subCode === '30') z1 = parseFloat(subVal) || 0;
          else if (subCode === '11') x2 = parseFloat(subVal);
          else if (subCode === '21') y2 = parseFloat(subVal);
          else if (subCode === '31') z2 = parseFloat(subVal) || 0;
          else if (subCode === '62') colorNum = parseInt(subVal);
          i += 2;
        }

        if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
          const normalizedLayer = layer.toUpperCase();
          const colorHex = colorNum !== null ? getAciColorHex(colorNum) : layerColorMap.get(normalizedLayer) || '#06b6d4';

          polyEntities.push({
            name: `DXF_${layer}_L${polyEntities.length + 1}`,
            layer,
            colorHex,
            isClosed: false,
            vertices: [
              { easting: x1, northing: y1, elevation: z1 },
              { easting: x2, northing: y2, elevation: z2 },
            ],
          });

          const stat = layerStats.get(layer) || { points: 0, lines: 0, colorHex };
          stat.lines += 1;
          layerStats.set(layer, stat);
        }
        continue;
      } else if (entityType === 'LWPOLYLINE' || entityType === 'POLYLINE') {
        let layer = '0';
        let isClosed = false;
        let colorNum: number | null = null;
        const vertices: Array<{ easting: number; northing: number; elevation: number }> = [];
        let currentX = NaN;

        i += 2;
        while (i < lines.length && lines[i] !== '0') {
          const subCode = lines[i];
          const subVal = lines[i + 1];
          if (subCode === '8') layer = subVal;
          else if (subCode === '70') {
            const flag = parseInt(subVal) || 0;
            if (flag & 1) isClosed = true;
          } else if (subCode === '62') {
            colorNum = parseInt(subVal);
          } else if (subCode === '10') {
            currentX = parseFloat(subVal);
          } else if (subCode === '20') {
            const currentY = parseFloat(subVal);
            if (!isNaN(currentX) && !isNaN(currentY)) {
              vertices.push({ easting: currentX, northing: currentY, elevation: 0 });
            }
            currentX = NaN;
          }
          i += 2;
        }

        if (vertices.length >= 2) {
          const normalizedLayer = layer.toUpperCase();
          const colorHex = colorNum !== null ? getAciColorHex(colorNum) : layerColorMap.get(normalizedLayer) || '#38bdf8';

          polyEntities.push({
            name: `DXF_${layer}_PL${polyEntities.length + 1}`,
            layer,
            colorHex,
            isClosed,
            vertices,
          });

          const stat = layerStats.get(layer) || { points: 0, lines: 0, colorHex };
          stat.lines += 1;
          layerStats.set(layer, stat);
        }
        continue;
      }
    }

    i += 2;
  }

  const layersList: DxfLayerInfo[] = Array.from(layerStats.entries()).map(([name, stat]) => ({
    name,
    colorHex: stat.colorHex,
    pointCount: stat.points,
    lineCount: stat.lines,
    selected: true,
  }));

  return {
    layers: layersList,
    points,
    lines: polyEntities,
  };
}
