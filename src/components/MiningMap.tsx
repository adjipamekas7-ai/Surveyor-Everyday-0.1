import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import {
  BasemapType,
  SurveyPoint,
  SurveyLine,
  SurveyPolygon,
  GeoOverlay,
  LatLngElevation,
  UTMCoordinate,
  SnapTarget,
} from '../types/survey';
import { latLngToUtm, formatDistance, formatArea } from '../utils/utm';
import { resolveOverlayUrl } from '../utils/overlayStore';

export interface MiningMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  /** Pindah tanpa animasi (dipakai GPS realtime agar tidak ada delay) */
  panTo: (lat: number, lng: number, zoom?: number) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  invalidateSize: () => void;
}

interface MiningMapProps {
  initialCenter: { lat: number; lng: number; zoom: number };
  basemap: BasemapType;
  points: SurveyPoint[];
  lines: SurveyLine[];
  polygons: SurveyPolygon[];
  overlays: GeoOverlay[];
  isPlotting: boolean;
  plottingType: 'line' | 'polygon' | null;
  activeVertices: LatLngElevation[];
  gpsPosition: { lat: number; lng: number; heading?: number; accuracy?: number } | null;
  snapTarget: SnapTarget | null;
  onCrosshairMove: (utm: UTMCoordinate, latLng: { lat: number; lng: number }) => void;
  onSelectFeature?: (type: 'point' | 'line' | 'polygon', id: string) => void;
  /** Dipanggil saat pengguna menggeser peta dengan jari (menghentikan mode ikuti GPS) */
  onUserPan?: () => void;
}

export const MiningMap = forwardRef<MiningMapHandle, MiningMapProps>(
  (
    {
      initialCenter,
      basemap,
      points,
      lines,
      polygons,
      overlays,
      isPlotting,
      plottingType,
      activeVertices,
      gpsPosition,
      snapTarget,
      onCrosshairMove,
      onSelectFeature,
      onUserPan,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const pointsLayerRef = useRef<L.LayerGroup | null>(null);
    const linesLayerRef = useRef<L.LayerGroup | null>(null);
    const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
    const overlaysLayerRef = useRef<L.LayerGroup | null>(null);
    const plottingLayerRef = useRef<L.LayerGroup | null>(null);
    const snapIndicatorLayerRef = useRef<L.LayerGroup | null>(null);
    const gpsMarkerRef = useRef<L.Marker | null>(null);
    const gpsCircleRef = useRef<L.Circle | null>(null);
    const onUserPanRef = useRef(onUserPan);
    onUserPanRef.current = onUserPan;

    // Expose control methods
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        mapInstanceRef.current?.zoomIn();
      },
      zoomOut: () => {
        mapInstanceRef.current?.zoomOut();
      },
      flyTo: (lat: number, lng: number, zoom) => {
        mapInstanceRef.current?.flyTo([lat, lng], zoom || mapInstanceRef.current.getZoom(), {
          duration: 1.2,
        });
      },
      panTo: (lat: number, lng: number, zoom?: number) => {
        const m = mapInstanceRef.current;
        if (!m) return;
        m.setView([lat, lng], zoom ?? m.getZoom(), { animate: false });
      },
      getCenter: () => {
        const c = mapInstanceRef.current?.getCenter();
        return c ? { lat: c.lat, lng: c.lng } : { lat: initialCenter.lat, lng: initialCenter.lng };
      },
      getZoom: () => {
        return mapInstanceRef.current?.getZoom() || initialCenter.zoom;
      },
      invalidateSize: () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ pan: false });
        }
      },
    }));

    // Initialize Map with auto-resize observer to prevent black partial screen
    useEffect(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: initialCenter.zoom,
        zoomControl: false,
        attributionControl: false,
        maxZoom: 22, // Deep zoom with tile overscaling
        minZoom: 2,
      });

      const overlaysGroup = L.layerGroup().addTo(map);
      const polygonsGroup = L.layerGroup().addTo(map);
      const linesGroup = L.layerGroup().addTo(map);
      const pointsGroup = L.layerGroup().addTo(map);
      const plottingGroup = L.layerGroup().addTo(map);
      const snapGroup = L.layerGroup().addTo(map);

      overlaysLayerRef.current = overlaysGroup;
      polygonsLayerRef.current = polygonsGroup;
      linesLayerRef.current = linesGroup;
      pointsLayerRef.current = pointsGroup;
      plottingLayerRef.current = plottingGroup;
      snapIndicatorLayerRef.current = snapGroup;
      mapInstanceRef.current = map;

      const updateCrosshair = () => {
        const center = map.getCenter();
        const utm = latLngToUtm(center.lat, center.lng);
        onCrosshairMove(utm, { lat: center.lat, lng: center.lng });
      };

      map.on('move', updateCrosshair);
      // geser manual oleh pengguna -> hentikan mode ikuti GPS (dragstart hanya muncul dari sentuhan/mouse)
      map.on('dragstart', () => onUserPanRef.current?.());
      updateCrosshair();

      // Invalidate size immediately and with small delay after initial mount
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
      });
      const timer = setTimeout(() => {
        map.invalidateSize({ pan: false });
      }, 150);

      // Setup ResizeObserver on map container
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            map.invalidateSize({ pan: false });
          }
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
        map.remove();
        mapInstanceRef.current = null;
      };
    }, []);

    // Basemap with multiple resilient high-res tile sources
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      // User requested: "pada menu peta, jika memilih peta geopdf, jngn menampilkan basemap, hanya tampilkan peta dari geopdf."
      // Skip tile layer completely when 'geopdf' is selected
      if (basemap === 'geopdf') {
        const firstRaster =
          overlays.find((o) => (o.type === 'pdf' || o.type === 'tiff' || o.type === 'ecw' || o.type === 'image') && o.visible) ||
          overlays.find((o) => o.visible);
        if (firstRaster) {
          map.fitBounds(firstRaster.bounds, { padding: [30, 30], maxZoom: 18 });
        }
        map.invalidateSize({ pan: false });
        return;
      }

      let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      let nativeZoom = 18;
      let subdomains = '';

      if (basemap === 'satelit') {
        // High quality Esri satellite imagery
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        nativeZoom = 18;
      } else if (basemap === 'kontur') {
        url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        nativeZoom = 17;
        subdomains = 'abc';
      } else if (basemap === 'road') {
        url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        nativeZoom = 19;
      }

      const layerOptions: L.TileLayerOptions = {
        maxNativeZoom: nativeZoom,
        maxZoom: 22,
        keepBuffer: 8,
      };
      if (subdomains) {
        layerOptions.subdomains = subdomains;
      }

      const newTileLayer = L.tileLayer(url, layerOptions).addTo(map);

      newTileLayer.bringToBack();
      tileLayerRef.current = newTileLayer;

      // Invalidate size to trigger immediate tile fetch across whole viewport
      map.invalidateSize({ pan: false });
    }, [basemap, overlays]);

    // Render GPS position marker (diperbarui langsung di setiap fix GPS, tanpa animasi/tunda)
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (!gpsPosition) {
        if (gpsMarkerRef.current) {
          map.removeLayer(gpsMarkerRef.current);
          gpsMarkerRef.current = null;
        }
        if (gpsCircleRef.current) {
          map.removeLayer(gpsCircleRef.current);
          gpsCircleRef.current = null;
        }
        return;
      }

      const ll: L.LatLngExpression = [gpsPosition.lat, gpsPosition.lng];
      const heading = gpsPosition.heading || 0;

      if (!gpsMarkerRef.current) {
        const gpsIcon = L.divIcon({
          className: 'custom-gps-icon',
          html: `
            <div class="gps-rot" style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg);">
              <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 2s infinite;"></div>
              <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
              <div style="position: absolute; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 14px solid #60a5fa; top: 0px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        gpsMarkerRef.current = L.marker(ll, {
          icon: gpsIcon,
          zIndexOffset: 1000,
          interactive: false,
        }).addTo(map);
      } else {
        gpsMarkerRef.current.setLatLng(ll);
        const el = gpsMarkerRef.current.getElement()?.querySelector('.gps-rot') as HTMLElement | null;
        if (el) el.style.transform = `rotate(${heading}deg)`;
      }

      // lingkaran akurasi GPS
      const acc = gpsPosition.accuracy;
      if (acc !== undefined && acc > 0 && acc < 1000) {
        if (!gpsCircleRef.current) {
          gpsCircleRef.current = L.circle(ll, {
            radius: acc,
            color: '#2563eb',
            weight: 1,
            fillColor: '#2563eb',
            fillOpacity: 0.1,
            interactive: false,
          }).addTo(map);
        } else {
          gpsCircleRef.current.setLatLng(ll);
          gpsCircleRef.current.setRadius(acc);
        }
      } else if (gpsCircleRef.current) {
        map.removeLayer(gpsCircleRef.current);
        gpsCircleRef.current = null;
      }
    }, [gpsPosition]);

    // Render Points
    useEffect(() => {
      const layerGroup = pointsLayerRef.current;
      if (!layerGroup) return;

      layerGroup.clearLayers();

      points.forEach((pt) => {
        const circle = L.circleMarker([pt.lat, pt.lng], {
          radius: 6,
          fillColor: pt.color || '#2563eb',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95,
        });

        circle.bindTooltip(
          `<div style="font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; line-height:1.2;">
            <span style="color:#ffffff;">${pt.name}</span>
            <span style="color:#60a5fa; margin-left:4px;">[${pt.code}]</span><br/>
            <span style="color:#94a3b8; font-size:9px;">Z:${pt.utm.elevation.toFixed(2)}m</span>
          </div>`,
          {
            permanent: true,
            direction: 'top',
            offset: [0, -8],
            className: 'survey-measurement-label',
          }
        );

        circle.on('click', () => onSelectFeature?.('point', pt.id));
        circle.addTo(layerGroup);
      });
    }, [points, onSelectFeature]);

    // Render Lines
    useEffect(() => {
      const layerGroup = linesLayerRef.current;
      if (!layerGroup) return;

      layerGroup.clearLayers();

      lines.forEach((line) => {
        const latLngs = line.vertices.map((v) => [v.lat, v.lng] as [number, number]);

        const polyline = L.polyline(latLngs, {
          color: line.color || '#3b82f6',
          weight: line.strokeWidth || 3,
          opacity: 0.95,
          lineJoin: 'round',
        });
        polyline.addTo(layerGroup);

        latLngs.forEach((coord) => {
          L.circleMarker(coord, {
            radius: 4,
            fillColor: '#ffffff',
            color: line.color || '#3b82f6',
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          }).addTo(layerGroup);
        });

        line.segments.forEach((seg) => {
          const marker = L.marker(seg.midpoint, {
            icon: L.divIcon({
              className: 'survey-measurement-label',
              html: `<span>${formatDistance(seg.lengthMeters)}</span>`,
              iconAnchor: [24, 10],
            }),
            interactive: false,
          });
          marker.addTo(layerGroup);
        });
      });
    }, [lines]);

    // Render Polygons (Areas)
    useEffect(() => {
      const layerGroup = polygonsLayerRef.current;
      if (!layerGroup) return;

      layerGroup.clearLayers();

      polygons.forEach((poly) => {
        const latLngs = poly.vertices.map((v) => [v.lat, v.lng] as [number, number]);

        const polygon = L.polygon(latLngs, {
          color: poly.color || '#0284c7',
          fillColor: poly.fillColor || '#0284c7',
          fillOpacity: poly.fillOpacity || 0.25,
          weight: 2.5,
        });
        polygon.addTo(layerGroup);

        poly.segments.forEach((seg) => {
          const marker = L.marker(seg.midpoint, {
            icon: L.divIcon({
              className: 'survey-measurement-label',
              html: `<span>${formatDistance(seg.lengthMeters)}</span>`,
              iconAnchor: [24, 10],
            }),
            interactive: false,
          });
          marker.addTo(layerGroup);
        });

        const areaFormatted = formatArea(poly.areaSquareMeters);
        const centroidMarker = L.marker(poly.centroid, {
          icon: L.divIcon({
            className: 'survey-polygon-area-label',
            html: `
              <div style="font-weight:800; font-size:11px; color:#ffffff;">${poly.name}</div>
              <div style="font-weight:700; font-size:12px; color:#38bdf8;">${areaFormatted.sqMetersStr}</div>
              <div style="font-size:10px; color:#93c5fd;">${areaFormatted.hectaresStr}</div>
            `,
            iconAnchor: [50, 20],
          }),
          interactive: false,
        });
        centroidMarker.addTo(layerGroup);
      });
    }, [polygons]);

    // Render Overlays (gambar besar disimpan di IndexedDB, di-resolve ke blob URL)
    useEffect(() => {
      const layerGroup = overlaysLayerRef.current;
      if (!layerGroup) return;

      let cancelled = false;
      void (async () => {
        const visible = overlays.filter((o) => o.visible);
        const resolved = await Promise.all(
          visible.map(async (ov) => ({ ov, url: await resolveOverlayUrl(ov.url) }))
        );
        if (cancelled) return;
        layerGroup.clearLayers();
        resolved.forEach(({ ov, url }) => {
          if (!url) return;
          L.imageOverlay(url, ov.bounds, {
            opacity: ov.opacity,
            interactive: false,
          }).addTo(layerGroup);
        });
      })();

      return () => {
        cancelled = true;
      };
    }, [overlays]);

    // Render Active Snap Target Indicator
    useEffect(() => {
      const layerGroup = snapIndicatorLayerRef.current;
      if (!layerGroup) return;

      layerGroup.clearLayers();

      if (!snapTarget) return;

      // Outer snap targeting ring with dashed boundary (stable, no CSS transform glitch)
      L.circleMarker([snapTarget.lat, snapTarget.lng], {
        radius: 14,
        fillColor: '#38bdf8',
        color: '#0284c7',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.25,
        dashArray: '4, 4',
        interactive: false,
      }).addTo(layerGroup);

      // Inner snap ring
      L.circleMarker([snapTarget.lat, snapTarget.lng], {
        radius: 6,
        fillColor: '#ffffff',
        color: '#0284c7',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95,
        interactive: false,
      }).addTo(layerGroup);

      // Center snap core dot
      L.circleMarker([snapTarget.lat, snapTarget.lng], {
        radius: 2.5,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 1,
        fillOpacity: 1,
        interactive: false,
      }).addTo(layerGroup);
    }, [snapTarget]);

    // Render Active Plotting Line/Polygon
    useEffect(() => {
      const layerGroup = plottingLayerRef.current;
      if (!layerGroup) return;

      layerGroup.clearLayers();

      if (!isPlotting || activeVertices.length === 0) return;

      const latLngs = activeVertices.map((v) => [v.lat, v.lng] as [number, number]);

      latLngs.forEach((pt, idx) => {
        L.circleMarker(pt, {
          radius: 5,
          fillColor: '#2563eb',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(layerGroup);

        L.marker(pt, {
          icon: L.divIcon({
            className: 'survey-measurement-label',
            html: `<span>#${idx + 1}</span>`,
            iconAnchor: [12, -4],
          }),
          interactive: false,
        }).addTo(layerGroup);
      });

      if (latLngs.length >= 2) {
        L.polyline(latLngs, {
          color: '#2563eb',
          weight: 3,
          dashArray: '6, 6',
        }).addTo(layerGroup);
      }

      if (plottingType === 'polygon' && latLngs.length >= 3) {
        L.polygon(latLngs, {
          color: '#0284c7',
          fillColor: '#0284c7',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '4, 4',
        }).addTo(layerGroup);
      }
    }, [isPlotting, plottingType, activeVertices]);

    return (
      <div className="relative w-full h-full overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full bg-[#0b0f17]" />
      </div>
    );
  }
);

MiningMap.displayName = 'MiningMap';
