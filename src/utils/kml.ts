/**
 * Surveyor Everyday - Google Earth KML Importer & Exporter
 */

import { SurveyPoint, SurveyLine, SurveyPolygon } from '../types/survey';

/**
 * Generate standard Google Earth KML XML text
 */
export function exportToKml(
  points: SurveyPoint[],
  lines: SurveyLine[],
  polygons: SurveyPolygon[],
  docName = 'Surveyor Everyday Mining Export'
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(docName)}</name>
    <description>Exported from Surveyor Everyday Field App</description>
    
    <!-- Style definitions -->
    <Style id="surveyPointStyle">
      <IconStyle>
        <color>ff00ffff</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ffffffff</color>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>

    <Style id="surveyLineStyle">
      <LineStyle>
        <color>ffffff00</color>
        <width>3</width>
      </LineStyle>
    </Style>

    <Style id="surveyPolyStyle">
      <LineStyle>
        <color>ff00aaff</color>
        <width>2.5</width>
      </LineStyle>
      <PolyStyle>
        <color>4d00aaff</color>
      </PolyStyle>
    </Style>

    <!-- FOLDER: SURVEY POINTS -->
    <Folder>
      <name>Points (${points.length})</name>
`;

  for (const pt of points) {
    xml += `      <Placemark>
        <name>${escapeXml(pt.name)}</name>
        <description>Code: ${escapeXml(pt.code || '')}\nUTM: ${pt.utm.zoneString} ${pt.utm.eastingFormatted} ${pt.utm.northingFormatted}\nElev: ${pt.utm.elevationFormatted}</description>
        <styleUrl>#surveyPointStyle</styleUrl>
        <Point>
          <coordinates>${pt.lng.toFixed(7)},${pt.lat.toFixed(7)},${pt.utm.elevation.toFixed(2)}</coordinates>
        </Point>
      </Placemark>\n`;
  }

  xml += `    </Folder>

    <!-- FOLDER: SURVEY LINES -->
    <Folder>
      <name>Lines (${lines.length})</name>
`;

  for (const line of lines) {
    const coordsStr = line.vertices
      .map((v) => `${v.lng.toFixed(7)},${v.lat.toFixed(7)},${(v.elevation || 0).toFixed(2)}`)
      .join(' ');

    xml += `      <Placemark>
        <name>${escapeXml(line.name)}</name>
        <description>Code: ${escapeXml(line.code || '')}\nLength: ${line.totalLengthMeters.toFixed(2)} m\nSegments: ${line.segments.length}</description>
        <styleUrl>#surveyLineStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${coordsStr}</coordinates>
        </LineString>
      </Placemark>\n`;
  }

  xml += `    </Folder>

    <!-- FOLDER: SURVEY POLYGONS -->
    <Folder>
      <name>Polygons (${polygons.length})</name>
`;

  for (const poly of polygons) {
    // For KML polygon, coordinates must close back to the first point
    const closedVertices = [...poly.vertices];
    if (closedVertices.length > 0) {
      closedVertices.push(closedVertices[0]);
    }
    const coordsStr = closedVertices
      .map((v) => `${v.lng.toFixed(7)},${v.lat.toFixed(7)},${(v.elevation || 0).toFixed(2)}`)
      .join(' ');

    xml += `      <Placemark>
        <name>${escapeXml(poly.name)}</name>
        <description>Code: ${escapeXml(poly.code || '')}\nArea: ${poly.areaSquareMeters.toFixed(2)} m² (${poly.areaHectares.toFixed(2)} Ha)\nPerimeter: ${poly.perimeterMeters.toFixed(2)} m</description>
        <styleUrl>#surveyPolyStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsStr}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>\n`;
  }

  xml += `    </Folder>
  </Document>
</kml>`;

  return xml;
}

export interface ParsedKmlData {
  points: Array<{ name: string; lat: number; lng: number; elevation: number; description?: string }>;
  lines: Array<{ name: string; coordinates: Array<[number, number]>; description?: string }>;
  polygons: Array<{ name: string; coordinates: Array<[number, number]>; description?: string }>;
}

/**
 * Pure client-side KML XML parser using browser DOMParser
 */
export function parseKmlString(kmlString: string): ParsedKmlData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, 'application/xml');

  const points: ParsedKmlData['points'] = [];
  const lines: ParsedKmlData['lines'] = [];
  const polygons: ParsedKmlData['polygons'] = [];

  const placemarks = xmlDoc.getElementsByTagName('Placemark');

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const name = pm.getElementsByTagName('name')[0]?.textContent || `Feature_${i + 1}`;
    const desc = pm.getElementsByTagName('description')[0]?.textContent || '';

    // Check Point
    const pointEl = pm.getElementsByTagName('Point')[0];
    if (pointEl) {
      const coordEl = pointEl.getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const parts = coordEl.textContent.trim().split(',');
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const elev = parts[2] ? parseFloat(parts[2]) : 0;
        if (!isNaN(lat) && !isNaN(lng)) {
          points.push({ name, lat, lng, elevation: elev, description: desc });
        }
      }
    }

    // Check LineString
    const lineEl = pm.getElementsByTagName('LineString')[0];
    if (lineEl) {
      const coordEl = lineEl.getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const rawCoords = coordEl.textContent.trim().split(/\s+/);
        const lineCoords: Array<[number, number]> = [];
        for (const rc of rawCoords) {
          const parts = rc.split(',');
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            lineCoords.push([lat, lng]);
          }
        }
        if (lineCoords.length >= 2) {
          lines.push({ name, coordinates: lineCoords, description: desc });
        }
      }
    }

    // Check Polygon
    const polyEl = pm.getElementsByTagName('Polygon')[0];
    if (polyEl) {
      const coordEl = polyEl.getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const rawCoords = coordEl.textContent.trim().split(/\s+/);
        const polyCoords: Array<[number, number]> = [];
        for (const rc of rawCoords) {
          const parts = rc.split(',');
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            polyCoords.push([lat, lng]);
          }
        }
        if (polyCoords.length >= 3) {
          polygons.push({ name, coordinates: polyCoords, description: desc });
        }
      }
    }
  }

  return { points, lines, polygons };
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
