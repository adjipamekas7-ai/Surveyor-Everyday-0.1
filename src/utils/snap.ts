/**
 * Surveyor Everyday - Snapping Engine (Snap to Point, Snap to Line, Free)
 * Enables millimeter precision targeting onto existing features and imported CAD files
 */

import {
  SurveyPoint,
  SurveyLine,
  SurveyPolygon,
  SnapMode,
  SnapTarget,
  LatLngElevation,
} from '../types/survey';
import { calculateDistanceMeters, latLngToUtm } from './utm';

/**
 * Find snap target based on current center position, current zoom, and active snap mode
 */
export function findSnapTarget(
  center: { lat: number; lng: number },
  zoom: number,
  mode: SnapMode,
  points: SurveyPoint[],
  lines: SurveyLine[],
  polygons: SurveyPolygon[]
): SnapTarget | null {
  if (mode === 'free') return null;

  // Pixel to meter scale approximate at equator/Indonesia:
  // At zoom 17, ~1.19 m/px -> 25px tolerance is ~30m
  // At zoom 18, ~0.60 m/px -> 25px tolerance is ~15m
  // At zoom 15, ~4.77 m/px -> 25px tolerance is ~120m
  const metersPerPixel = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const snapRadiusMeters = Math.max(8, metersPerPixel * 28); // 28px snap threshold

  let closestDist = Infinity;
  let bestTarget: SnapTarget | null = null;

  // 1. Check Points
  for (const pt of points) {
    const d = calculateDistanceMeters(center.lat, center.lng, pt.lat, pt.lng);
    if (d < snapRadiusMeters && d < closestDist) {
      closestDist = d;
      bestTarget = {
        type: 'point',
        lat: pt.lat,
        lng: pt.lng,
        utm: pt.utm,
        label: `${pt.name} (${pt.code})`,
        color: pt.color,
      };
    }
  }

  // 2. Check Line vertices
  for (const line of lines) {
    line.vertices.forEach((v, idx) => {
      const d = calculateDistanceMeters(center.lat, center.lng, v.lat, v.lng);
      if (d < snapRadiusMeters && d < closestDist) {
        closestDist = d;
        bestTarget = {
          type: 'point',
          lat: v.lat,
          lng: v.lng,
          utm: line.utmVertices[idx] || latLngToUtm(v.lat, v.lng, v.elevation || 0),
          label: `${line.name} [V${idx + 1}]`,
          color: line.color,
        };
      }
    });
  }

  // 3. Check Polygon vertices
  for (const poly of polygons) {
    poly.vertices.forEach((v, idx) => {
      const d = calculateDistanceMeters(center.lat, center.lng, v.lat, v.lng);
      if (d < snapRadiusMeters && d < closestDist) {
        closestDist = d;
        bestTarget = {
          type: 'point',
          lat: v.lat,
          lng: v.lng,
          utm: poly.utmVertices[idx] || latLngToUtm(v.lat, v.lng, v.elevation || 0),
          label: `${poly.name} [V${idx + 1}]`,
          color: poly.color,
        };
      }
    });
  }

  // If in 'snap to point' mode, return closest vertex point found
  if (mode === 'point' || bestTarget) {
    return bestTarget;
  }

  // 4. In 'snap to line' mode: project onto edges if no vertex snapped
  if (mode === 'line') {
    const checkSegments = (vertices: LatLngElevation[], labelPrefix: string, color: string) => {
      for (let i = 0; i < vertices.length - 1; i++) {
        const a = vertices[i];
        const b = vertices[i + 1];
        const proj = projectPointOnSegment(center, a, b);
        const d = calculateDistanceMeters(center.lat, center.lng, proj.lat, proj.lng);
        if (d < snapRadiusMeters && d < closestDist) {
          closestDist = d;
          bestTarget = {
            type: 'line',
            lat: proj.lat,
            lng: proj.lng,
            utm: latLngToUtm(proj.lat, proj.lng, proj.elevation),
            label: `${labelPrefix} (Segmen ${i + 1})`,
            color,
          };
        }
      }
    };

    for (const l of lines) {
      checkSegments(l.vertices, l.name, l.color);
    }
    for (const p of polygons) {
      // Check closed polygon edges including closing segment
      if (p.vertices.length >= 3) {
        const closed = [...p.vertices, p.vertices[0]];
        checkSegments(closed, p.name, p.color);
      }
    }
  }

  return bestTarget;
}

/**
 * Geometric projection of point P onto segment AB
 */
function projectPointOnSegment(
  p: { lat: number; lng: number },
  a: LatLngElevation,
  b: LatLngElevation
): { lat: number; lng: number; elevation: number } {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { lat: a.lat, lng: a.lng, elevation: a.elevation || 0 };
  }

  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq));
  const projLat = a.lat + t * dy;
  const projLng = a.lng + t * dx;
  const elevA = a.elevation || 0;
  const elevB = b.elevation || 0;
  const projElev = elevA + t * (elevB - elevA);

  return { lat: projLat, lng: projLng, elevation: projElev };
}
