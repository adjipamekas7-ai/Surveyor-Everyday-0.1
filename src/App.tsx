/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { deleteOverlayBlob } from './utils/overlayStore';
import {
  BasemapType,
  SurveyProject,
  SurveyPoint,
  SurveyLine,
  SurveyPolygon,
  GeoOverlay,
  UTMCoordinate,
  LatLngElevation,
  AppSettings,
  SnapMode,
} from './types/survey';
import { INITIAL_PROJECT, DEFAULT_MINE_CENTER } from './data/initialProject';
import {
  latLngToUtm,
  utmToLatLng,
  computeLineSegments,
  computePolygonMetrics,
} from './utils/utm';
import { findSnapTarget } from './utils/snap';
import { MiningMap, MiningMapHandle } from './components/MiningMap';
import { MiningCrosshair } from './components/MiningCrosshair';
import { TopBar } from './components/TopBar';
import { RightToolBar } from './components/RightToolBar';
import { BottomCoordinateBar } from './components/BottomCoordinateBar';
import { SurveyFAB } from './components/SurveyFAB';
import { SurveyPlotModal } from './components/SurveyPlotModal';
import { ImportOverlayModal } from './components/ImportOverlayModal';
import { LayersDrawer } from './components/LayersDrawer';
import { BasemapSelectorModal } from './components/BasemapSelectorModal';
import { OfflineAreaBoxModal } from './components/OfflineAreaBoxModal';
import { LandingPage } from './components/LandingPage';
import { MainNavigation, MainTabType } from './components/MainNavigation';
import { HomeWeatherTab } from './components/HomeWeatherTab';
import { CompassClinometerTab } from './components/CompassClinometerTab';
import { SettingsTab } from './components/SettingsTab';
import { MapModeSelectorScreen } from './components/MapModeSelectorScreen';

const PROJECTS_STORAGE_KEY = 'surveyor_everyday_projects_v3';
const ACTIVE_PROJECT_ID_KEY = 'surveyor_everyday_active_project_id_v3';
const SETTINGS_STORAGE_KEY = 'surveyor_everyday_settings_v3';

const DEFAULT_SETTINGS: AppSettings = {
  unitSystem: 'metric',
  decimalPlaces: 3,
  coordinateSystem: 'utm',
  theme: 'light',
  elevationOffset: 0,
  customPointCodes: ['CREST', 'TOE', 'BM', 'SPOT', 'BLAST', 'ROAD', 'SUMP', 'BOUNDARY'],
  customLineCodes: ['CREST_LINE', 'TOE_LINE', 'HAUL_ROAD', 'DRAINAGE', 'FAULT_LINE', 'PIPELINE'],
  customAreaCodes: ['BLAST_AREA', 'PIT_BOUNDARY', 'DISPOSAL', 'ROM_STOCKPILE', 'SUMP_POND', 'SETTLING_POND'],
};

export default function App() {
  // Navigation view: landing page vs main 4-tab workstation
  const [isLandingOpen, setIsLandingOpen] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('home');

  // Sub-view for the 'Peta' tab: 'selector' (pilih Basemap atau PDF) vs 'map' (peta interaktif)
  const [mapSubView, setMapSubView] = useState<'selector' | 'map'>('selector');

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Multi-Project State (Requirement 5)
  const [projects, setProjects] = useState<SurveyProject[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return [INITIAL_PROJECT];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
      if (saved) return saved;
    } catch {
      // Fallback
    }
    return INITIAL_PROJECT.id;
  });

  // Active Project Reference
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECT;
  }, [projects, activeProjectId]);

  // Persist projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, activeProjectId);
    } catch {
      // Ignore
    }
  }, [projects, activeProjectId]);

  // Project Management Handlers
  const handleCreateProject = (newProj: SurveyProject) => {
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
  };

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) return;
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeProjectId === id) {
      setActiveProjectId(remaining[0].id);
    }
  };

  // Helper to update active project
  const updateActiveProject = useCallback((updater: (prevProj: SurveyProject) => SurveyProject) => {
    setProjects((prevProjects) => {
      return prevProjects.map((proj) => {
        if (proj.id === activeProjectId) {
          return updater(proj);
        }
        return proj;
      });
    });
  }, [activeProjectId]);

  // Basemap state
  const [basemap, setBasemap] = useState<BasemapType>('satelit');

  // Map center and coordinates
  const [crosshairUtm, setCrosshairUtm] = useState<UTMCoordinate>(() =>
    latLngToUtm(DEFAULT_MINE_CENTER.lat, DEFAULT_MINE_CENTER.lng, 142.5, 50, 'S')
  );
  const [crosshairLatLng, setCrosshairLatLng] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_MINE_CENTER.lat,
    lng: DEFAULT_MINE_CENTER.lng,
  });

  // GPS state
  const [gpsPosition, setGpsPosition] = useState<{
    lat: number;
    lng: number;
    elevation?: number;
    heading?: number;
    accuracy?: number;
  } | null>(null);
  const [gpsUtm, setGpsUtm] = useState<UTMCoordinate | null>(null);
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [coordinateDisplayMode, setCoordinateDisplayMode] = useState<'crosshair' | 'gps'>('crosshair');

  // Snap engine state
  const [snapMode, setSnapMode] = useState<SnapMode>('free');

  // Current map zoom level
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_MINE_CENTER.zoom);

  // Map instance ref
  const mapRef = useRef<MiningMapHandle | null>(null);

  // Invalidate Map Size whenever transitioning into the interactive map view (Fix Requirement 1)
  useEffect(() => {
    if (activeMainTab === 'map' && mapSubView === 'map') {
      requestAnimationFrame(() => {
        mapRef.current?.invalidateSize();
      });
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeMainTab, mapSubView]);

  // Compute active snap target
  const activeSnapTarget = useMemo(() => {
    if (snapMode === 'free') return null;
    return findSnapTarget(
      crosshairLatLng,
      currentZoom,
      snapMode,
      activeProject.points,
      activeProject.lines,
      activeProject.polygons
    );
  }, [crosshairLatLng, currentZoom, snapMode, activeProject.points, activeProject.lines, activeProject.polygons]);

  // Effective targeting coordinate
  const effectiveTargetLatLng = activeSnapTarget
    ? { lat: activeSnapTarget.lat, lng: activeSnapTarget.lng }
    : crosshairLatLng;

  const effectiveTargetUtm = activeSnapTarget ? activeSnapTarget.utm : crosshairUtm;

  // Plotting state
  const [isPlotting, setIsPlotting] = useState(false);
  const [plottingType, setPlottingType] = useState<'line' | 'polygon' | null>(null);
  const [activeFeatureName, setActiveFeatureName] = useState('');
  const [activeFeatureCode, setActiveFeatureCode] = useState('');
  const [activeVertices, setActiveVertices] = useState<LatLngElevation[]>([]);

  // Computed metrics during live plotting
  const [activeLengthMeters, setActiveLengthMeters] = useState(0);
  const [activeAreaSquareMeters, setActiveAreaSquareMeters] = useState(0);

  // Modals state
  const [isSurveyPlotModalOpen, setIsSurveyPlotModalOpen] = useState(false);
  const [isImportOverlayModalOpen, setIsImportOverlayModalOpen] = useState(false);
  const [isLayersDrawerOpen, setIsLayersDrawerOpen] = useState(false);
  const [isBasemapModalOpen, setIsBasemapModalOpen] = useState(false);
  const [isOfflineAreaBoxModalOpen, setIsOfflineAreaBoxModalOpen] = useState(false);

  // Update live metrics as vertices change during plotting
  useEffect(() => {
    if (!isPlotting) {
      setActiveLengthMeters(0);
      setActiveAreaSquareMeters(0);
      return;
    }

    if (plottingType === 'line') {
      const metrics = computeLineSegments(activeVertices);
      setActiveLengthMeters(metrics.totalLengthMeters);
    } else if (plottingType === 'polygon') {
      const metrics = computePolygonMetrics(activeVertices);
      setActiveAreaSquareMeters(metrics.areaSquareMeters);
      setActiveLengthMeters(metrics.perimeterMeters);
    }
  }, [activeVertices, isPlotting, plottingType]);

  // Crosshair move handler from Map
  const handleCrosshairMove = useCallback(
    (utm: UTMCoordinate, latLng: { lat: number; lng: number }) => {
      setCrosshairUtm(utm);
      setCrosshairLatLng(latLng);
      if (mapRef.current) {
        setCurrentZoom(mapRef.current.getZoom());
      }
    },
    []
  );

  // ---- GPS realtime: watchPosition terus berjalan, setiap fix langsung dipakai (tanpa smoothing/animasi) ----
  const gpsWatchIdRef = useRef<number | null>(null);
  const followGpsRef = useRef(false);
  const lastHeadingRef = useRef(0);
  const gpsDeniedRef = useRef(false);
  const gpsZoomedRef = useRef(false);

  const stopGpsWatch = useCallback(() => {
    if (gpsWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
    }
    gpsWatchIdRef.current = null;
  }, []);

  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation || gpsWatchIdRef.current !== null) return;
    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        gpsDeniedRef.current = false;
        const { latitude, longitude, altitude, heading, accuracy, speed } = pos.coords;
        // arah gerak hanya dipercaya saat bergerak; diam -> pakai arah terakhir
        if (typeof heading === 'number' && !isNaN(heading) && (speed ?? 0) > 0.5) {
          lastHeadingRef.current = heading;
        }
        const elev = typeof altitude === 'number' && !isNaN(altitude) ? altitude : 0;
        setGpsUtm(latLngToUtm(latitude, longitude, elev));
        setGpsPosition({
          lat: latitude,
          lng: longitude,
          elevation: elev,
          heading: lastHeadingRef.current,
          accuracy,
        });
        if (followGpsRef.current) {
          // zoom dekat hanya di fix pertama setelah tombol GPS ditekan; selanjutnya zoom pengguna dihormati
          const zoom = gpsZoomedRef.current ? undefined : 18;
          gpsZoomedRef.current = true;
          mapRef.current?.panTo(latitude, longitude, zoom);
        }
      },
      (err) => {
        console.warn('GPS error:', err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) {
          gpsDeniedRef.current = true;
          stopGpsWatch();
        }
      },
      // maximumAge: 0 = jangan pernah pakai posisi lama (cache); timeout besar agar watch tidak mati
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
  }, [stopGpsWatch]);

  // Mulai GPS begitu aplikasi dibuka; restart saat kembali dari background (WebView menjeda lokasi)
  useEffect(() => {
    startGpsWatch();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        stopGpsWatch();
        startGpsWatch();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopGpsWatch();
    };
  }, [startGpsWatch, stopGpsWatch]);

  // Tombol GPS: pusatkan peta ke posisi sekarang dan ikuti terus
  const handleGpsLocate = () => {
    if (!navigator.geolocation) {
      alert('HP Anda tidak mendukung GPS / Geolocation.');
      return;
    }
    if (gpsDeniedRef.current) {
      alert('Izin lokasi ditolak. Aktifkan izin Lokasi untuk Surveyor Everyday di Pengaturan HP, lalu tekan tombol GPS lagi.');
    }
    startGpsWatch();
    followGpsRef.current = true;
    setIsGpsTracking(true);
    if (gpsPosition) {
      const z = Math.max(mapRef.current?.getZoom() ?? 0, 17);
      gpsZoomedRef.current = true;
      mapRef.current?.panTo(gpsPosition.lat, gpsPosition.lng, z);
    } else {
      gpsZoomedRef.current = false; // fix pertama nanti akan memusatkan & zoom
    }
  };

  // Pengguna menggeser peta -> berhenti mengikuti GPS (posisi tetap diperbarui)
  const handleUserPan = useCallback(() => {
    if (followGpsRef.current) {
      followGpsRef.current = false;
      setIsGpsTracking(false);
    }
  }, []);

  // Start Plotting: Do not immediately lock first vertex; let user position crosshair and click "+ Tambah Titik Target"
  const handleStartPlotting = (type: 'line' | 'polygon', name: string, code: string) => {
    setIsPlotting(true);
    setPlottingType(type);
    setActiveFeatureName(name);
    setActiveFeatureCode(code);
    setActiveVertices([]); // Start with 0 vertices; first vertex chosen upon first tap of + Tambah Titik Target
  };

  // Add vertex
  const handleAddVertex = () => {
    const newVertex: LatLngElevation = {
      lat: effectiveTargetLatLng.lat,
      lng: effectiveTargetLatLng.lng,
      elevation: effectiveTargetUtm.elevation || 140,
    };
    setActiveVertices((prev) => [...prev, newVertex]);
  };

  // Undo vertex
  const handleUndoVertex = () => {
    setActiveVertices((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  // Cancel plotting
  const handleCancelPlotting = () => {
    setIsPlotting(false);
    setPlottingType(null);
    setActiveVertices([]);
  };

  // Finish plotting
  const handleFinishPlotting = () => {
    if (plottingType === 'line') {
      if (activeVertices.length < 2) return;
      const metrics = computeLineSegments(activeVertices);
      const utmVertices = activeVertices.map((v) =>
        latLngToUtm(v.lat, v.lng, v.elevation || 0, crosshairUtm.zone, crosshairUtm.hemisphere)
      );

      const newLine: SurveyLine = {
        id: `ln-${Date.now()}`,
        name: activeFeatureName || `LINE_${activeProject.lines.length + 1}`,
        code: activeFeatureCode || 'LINE',
        color: '#2563eb',
        strokeWidth: 3,
        vertices: activeVertices,
        utmVertices,
        totalLengthMeters: metrics.totalLengthMeters,
        segments: metrics.segments,
        timestamp: Date.now(),
      };

      updateActiveProject((prev) => ({
        ...prev,
        lines: [...prev.lines, newLine],
        updatedAt: Date.now(),
      }));
    } else if (plottingType === 'polygon') {
      if (activeVertices.length < 3) return;
      const metrics = computePolygonMetrics(activeVertices);
      const utmVertices = activeVertices.map((v) =>
        latLngToUtm(v.lat, v.lng, v.elevation || 0, crosshairUtm.zone, crosshairUtm.hemisphere)
      );

      const newPoly: SurveyPolygon = {
        id: `pg-${Date.now()}`,
        name: activeFeatureName || `AREA_${activeProject.polygons.length + 1}`,
        code: activeFeatureCode || 'AREA',
        color: '#0284c7',
        fillColor: '#0284c7',
        fillOpacity: 0.25,
        vertices: activeVertices,
        utmVertices,
        areaSquareMeters: metrics.areaSquareMeters,
        areaHectares: metrics.areaHectares,
        perimeterMeters: metrics.perimeterMeters,
        centroid: metrics.centroid,
        segments: metrics.segments,
        timestamp: Date.now(),
      };

      updateActiveProject((prev) => ({
        ...prev,
        polygons: [...prev.polygons, newPoly],
        updatedAt: Date.now(),
      }));
    }

    setIsPlotting(false);
    setPlottingType(null);
    setActiveVertices([]);
  };

  // Save single Survey Point
  const handleSavePoint = (data: {
    name: string;
    code: string;
    elevation: number;
    description: string;
    source: 'crosshair' | 'gps' | 'manual';
    manualCoords?: { easting: number; northing: number; zone: number; hemisphere: 'N' | 'S' };
  }) => {
    let lat: number;
    let lng: number;
    let utm: UTMCoordinate;

    if (data.source === 'manual' && data.manualCoords) {
      const converted = utmToLatLng(
        data.manualCoords.easting,
        data.manualCoords.northing,
        data.manualCoords.zone,
        data.manualCoords.hemisphere
      );
      lat = converted.lat;
      lng = converted.lng;
      utm = latLngToUtm(
        lat,
        lng,
        data.elevation,
        data.manualCoords.zone,
        data.manualCoords.hemisphere
      );
      mapRef.current?.flyTo(lat, lng, 17);
    } else if (data.source === 'gps' && gpsPosition) {
      lat = gpsPosition.lat;
      lng = gpsPosition.lng;
      utm = latLngToUtm(lat, lng, data.elevation, crosshairUtm.zone, crosshairUtm.hemisphere);
    } else {
      lat = effectiveTargetLatLng.lat;
      lng = effectiveTargetLatLng.lng;
      utm = latLngToUtm(lat, lng, data.elevation, crosshairUtm.zone, crosshairUtm.hemisphere);
    }

    const colors: Record<string, string> = {
      CREST: '#2563eb',
      TOE: '#06b6d4',
      BM: '#ef4444',
      SPOT: '#8b5cf6',
      BLAST: '#ec4899',
    };

    const newPoint: SurveyPoint = {
      id: `pt-${Date.now()}`,
      name: data.name,
      code: data.code,
      color: colors[data.code] || '#2563eb',
      lat,
      lng,
      utm,
      timestamp: Date.now(),
      description: data.description,
    };

    updateActiveProject((prev) => ({
      ...prev,
      points: [...prev.points, newPoint],
      updatedAt: Date.now(),
    }));
  };

  // Feature Updates from Edit Modal (Requirement 3)
  const handleSaveUpdatedPoint = (updatedPoint: SurveyPoint) => {
    updateActiveProject((prev) => ({
      ...prev,
      points: prev.points.map((p) => (p.id === updatedPoint.id ? updatedPoint : p)),
      updatedAt: Date.now(),
    }));
  };

  const handleSaveUpdatedLine = (updatedLine: SurveyLine) => {
    updateActiveProject((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === updatedLine.id ? updatedLine : l)),
      updatedAt: Date.now(),
    }));
  };

  const handleSaveUpdatedPolygon = (updatedPolygon: SurveyPolygon) => {
    updateActiveProject((prev) => ({
      ...prev,
      polygons: prev.polygons.map((pg) => (pg.id === updatedPolygon.id ? updatedPolygon : pg)),
      updatedAt: Date.now(),
    }));
  };

  // Import Features
  const handleImportFeatures = (data: {
    points: SurveyPoint[];
    lines: SurveyLine[];
    polygons: SurveyPolygon[];
    overlay?: GeoOverlay;
  }) => {
    updateActiveProject((prev) => {
      const nextOverlays = data.overlay ? [...prev.overlays, data.overlay] : prev.overlays;
      return {
        ...prev,
        points: [...prev.points, ...data.points],
        lines: [...prev.lines, ...data.lines],
        polygons: [...prev.polygons, ...data.polygons],
        overlays: nextOverlays,
        updatedAt: Date.now(),
      };
    });

    if (data.points.length > 0) {
      mapRef.current?.flyTo(data.points[0].lat, data.points[0].lng, 15);
    } else if (data.lines.length > 0 && data.lines[0].vertices.length > 0) {
      mapRef.current?.flyTo(data.lines[0].vertices[0].lat, data.lines[0].vertices[0].lng, 15);
    } else if (data.overlay) {
      const sw = data.overlay.bounds[0];
      const ne = data.overlay.bounds[1];
      const centerLat = (sw[0] + ne[0]) / 2;
      const centerLng = (sw[1] + ne[1]) / 2;

      // Calculate optimal zoom level based on ground extent span
      const maxSpanDeg = Math.max(Math.abs(ne[0] - sw[0]), Math.abs(ne[1] - sw[1]));
      let targetZoom = 15;
      if (maxSpanDeg > 0.4) targetZoom = 10;
      else if (maxSpanDeg > 0.15) targetZoom = 12;
      else if (maxSpanDeg > 0.06) targetZoom = 13;
      else if (maxSpanDeg > 0.02) targetZoom = 14;
      else if (maxSpanDeg > 0.008) targetZoom = 15;
      else targetZoom = 16;

      mapRef.current?.flyTo(centerLat, centerLng, targetZoom);
      setActiveMainTab('map');
      setMapSubView('map');
    }
  };

  // Delete handlers
  const handleDeletePoint = (id: string) => {
    updateActiveProject((prev) => ({
      ...prev,
      points: prev.points.filter((p) => p.id !== id),
      updatedAt: Date.now(),
    }));
  };
  const handleDeleteLine = (id: string) => {
    updateActiveProject((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== id),
      updatedAt: Date.now(),
    }));
  };
  const handleDeletePolygon = (id: string) => {
    updateActiveProject((prev) => ({
      ...prev,
      polygons: prev.polygons.filter((pg) => pg.id !== id),
      updatedAt: Date.now(),
    }));
  };
  const handleDeleteOverlay = (id: string) => {
    const target = activeProject.overlays.find((ov) => ov.id === id);
    if (target) void deleteOverlayBlob(target.url);
    updateActiveProject((prev) => ({
      ...prev,
      overlays: prev.overlays.filter((ov) => ov.id !== id),
      updatedAt: Date.now(),
    }));
  };
  const handleToggleOverlay = (id: string) => {
    updateActiveProject((prev) => ({
      ...prev,
      overlays: prev.overlays.map((ov) =>
        ov.id === id ? { ...ov, visible: !ov.visible } : ov
      ),
      updatedAt: Date.now(),
    }));
  };
  const handleClearAll = () => {
    activeProject.overlays.forEach((ov) => void deleteOverlayBlob(ov.url));
    updateActiveProject((prev) => ({
      ...prev,
      points: [],
      lines: [],
      polygons: [],
      overlays: [],
      updatedAt: Date.now(),
    }));
  };

  const handleEditProject = (updatedProj: SurveyProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
  };

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  const totalFeatures =
    activeProject.points.length + activeProject.lines.length + activeProject.polygons.length;
  const hasActiveOverlay = activeProject.overlays.some((ov) => ov.visible);

  return (
    <div className="relative w-screen h-dvh bg-slate-50 dark:bg-[#0b0f17] overflow-hidden select-none">
      {/* 1. LANDING PAGE (With Project Switcher & Creation & Edit) */}
      {isLandingOpen ? (
        <LandingPage
          projects={projects}
          activeProject={activeProject}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
          onOpenApp={() => setIsLandingOpen(false)}
        />
      ) : (
        /* 2. MAIN APPLICATION WORKSTATION WITH 4 TABS */
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {/* TAB CONTENT CONTAINER */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
            {/* TAB A: HOME (Weather forecast for today & pit status) */}
            {activeMainTab === 'home' && (
              <HomeWeatherTab
                project={activeProject}
                currentCenter={crosshairLatLng}
                onNavigateToMap={() => {
                  setMapSubView('selector');
                  setActiveMainTab('map');
                }}
                onNavigateToCompass={() => setActiveMainTab('compass')}
                onOpenImportOverlay={() => setIsImportOverlayModalOpen(true)}
                onOpenLayers={() => setIsLayersDrawerOpen(true)}
                onBackToProjects={() => setIsLandingOpen(true)}
              />
            )}

            {/* TAB B: PETA */}
            {activeMainTab === 'map' && mapSubView === 'selector' && (
              <MapModeSelectorScreen
                onSelectBasemapMode={() => {
                  setBasemap('satelit');
                  setMapSubView('map');
                }}
                onSelectPdfMode={() => {
                  setMapSubView('map');
                }}
                onOpenImportPdfModal={() => {
                  setMapSubView('map');
                  setIsImportOverlayModalOpen(true);
                }}
                overlays={activeProject.overlays}
                onBackToHome={() => setActiveMainTab('home')}
              />
            )}

            {/* ACTIVE MAP VIEWPORT */}
            <div
              className={`w-full h-full relative ${
                activeMainTab === 'map' && mapSubView === 'map' ? 'block' : 'hidden'
              }`}
            >
              {/* Full-bleed Leaflet Map */}
              <MiningMap
                ref={mapRef}
                initialCenter={DEFAULT_MINE_CENTER}
                basemap={basemap}
                points={activeProject.points}
                lines={activeProject.lines}
                polygons={activeProject.polygons}
                overlays={activeProject.overlays}
                isPlotting={isPlotting}
                plottingType={plottingType}
                activeVertices={activeVertices}
                gpsPosition={gpsPosition}
                snapTarget={activeSnapTarget}
                onCrosshairMove={handleCrosshairMove}
                onUserPan={handleUserPan}
              />

              {/* Center Targeting Crosshair with snap feedback */}
              <MiningCrosshair
                isPlotting={isPlotting}
                plottingType={plottingType}
                vertexCount={activeVertices.length}
                snapTarget={activeSnapTarget}
              />

              {/* Top Bar */}
              <TopBar
                basemap={basemap}
                hasActiveOverlay={hasActiveOverlay}
                onBackToMenu={() => setMapSubView('selector')}
                onOpenImportOverlay={() => setIsImportOverlayModalOpen(true)}
                onOpenOfflineDownload={() => setIsOfflineAreaBoxModalOpen(true)}
                onToggleBasemap={() => setIsBasemapModalOpen(true)}
              />

              {/* Right Floating Control Strip with Snapping Button */}
              <RightToolBar
                onOpenLayers={() => setIsLayersDrawerOpen(true)}
                onOpenBasemapSelector={() => setIsBasemapModalOpen(true)}
                onZoomIn={() => mapRef.current?.zoomIn()}
                onZoomOut={() => mapRef.current?.zoomOut()}
                onGpsLocate={handleGpsLocate}
                isGpsTracking={isGpsTracking}
                totalFeaturesCount={totalFeatures}
                snapMode={snapMode}
                onChangeSnapMode={setSnapMode}
                activeSnapLabel={activeSnapTarget?.label}
              />

              {/* Bottom Left Survey FAB */}
              <SurveyFAB
                onOpenSurveyMenu={() => setIsSurveyPlotModalOpen(true)}
                isPlotting={isPlotting}
                plottingType={plottingType}
                activeVerticesCount={activeVertices.length}
                activeLengthMeters={activeLengthMeters}
                activeAreaSquareMeters={activeAreaSquareMeters}
                onAddVertex={handleAddVertex}
                onUndoVertex={handleUndoVertex}
                onFinishPlotting={handleFinishPlotting}
                onCancelPlotting={handleCancelPlotting}
              />

              {/* Bottom Coordinate Bar */}
              <BottomCoordinateBar
                crosshairUtm={effectiveTargetUtm}
                gpsUtm={gpsUtm}
                crosshairLatLng={effectiveTargetLatLng}
                gpsLatLng={gpsPosition ? { lat: gpsPosition.lat, lng: gpsPosition.lng } : null}
                displayMode={coordinateDisplayMode}
                coordinateSystem={settings.coordinateSystem}
                decimalPlaces={settings.decimalPlaces}
                elevationOffset={settings.elevationOffset}
                onToggleDisplayMode={() =>
                  setCoordinateDisplayMode((prev) => (prev === 'crosshair' ? 'gps' : 'crosshair'))
                }
              />
            </div>

            {/* TAB C: KOMPAS & KLINOMETER GEOLOGI */}
            {activeMainTab === 'compass' && <CompassClinometerTab />}

            {/* TAB D: PENGATURAN (With Dedicated Sub-pages) */}
            {activeMainTab === 'settings' && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onResetSettings={() => setSettings(DEFAULT_SETTINGS)}
              />
            )}
          </div>

          {/* 4-Tab Bottom Navigation Bar */}
          <MainNavigation
            activeTab={activeMainTab}
            onChangeTab={(tab) => {
              if (tab === 'map' && activeMainTab !== 'map') {
                setMapSubView('selector');
              }
              setActiveMainTab(tab);
            }}
            isMapPlotting={isPlotting}
          />

          {/* MODALS */}
          {/* Survey Plot Modal */}
          <SurveyPlotModal
            isOpen={isSurveyPlotModalOpen}
            onClose={() => setIsSurveyPlotModalOpen(false)}
            crosshairUtm={effectiveTargetUtm}
            gpsUtm={gpsUtm}
            settings={settings}
            onSavePoint={handleSavePoint}
            onStartPlotting={handleStartPlotting}
          />

          {/* Import Overlay Modal (PDF, DXF, KML) */}
          <ImportOverlayModal
            isOpen={isImportOverlayModalOpen}
            onClose={() => setIsImportOverlayModalOpen(false)}
            currentCrosshairUtm={crosshairUtm}
            onImportFeatures={handleImportFeatures}
            onSelectBasemap={setBasemap}
          />

          {/* Layers Drawer (With Edit & Delete Confirmation) */}
          <LayersDrawer
            isOpen={isLayersDrawerOpen}
            onClose={() => setIsLayersDrawerOpen(false)}
            points={activeProject.points}
            lines={activeProject.lines}
            polygons={activeProject.polygons}
            overlays={activeProject.overlays}
            settings={settings}
            onTogglePoint={() => {}}
            onDeletePoint={handleDeletePoint}
            onToggleLine={() => {}}
            onDeleteLine={handleDeleteLine}
            onTogglePolygon={() => {}}
            onDeletePolygon={handleDeletePolygon}
            onToggleOverlay={handleToggleOverlay}
            onDeleteOverlay={handleDeleteOverlay}
            onSavePoint={handleSaveUpdatedPoint}
            onSaveLine={handleSaveUpdatedLine}
            onSavePolygon={handleSaveUpdatedPolygon}
            onClearAll={handleClearAll}
          />

          {/* Basemap Selector Modal */}
          <BasemapSelectorModal
            isOpen={isBasemapModalOpen}
            onClose={() => setIsBasemapModalOpen(false)}
            activeBasemap={basemap}
            onSelectBasemap={setBasemap}
          />

          {/* Offline Area Box Modal */}
          <OfflineAreaBoxModal
            isOpen={isOfflineAreaBoxModalOpen}
            onClose={() => setIsOfflineAreaBoxModalOpen(false)}
            currentCrosshairUtm={crosshairUtm}
          />
        </div>
      )}
    </div>
  );
}
