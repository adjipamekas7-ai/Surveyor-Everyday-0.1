import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Gauge,
  Lock,
  Unlock,
  Bookmark,
  Edit2,
  Trash2,
  Check,
  X,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from 'lucide-react';

type CompassMode = 'compass' | 'clinometer' | 'dual';

export interface ObservationRecord {
  id: string;
  time: string;
  azimuth: number;
  dip: number;
  grade: string;
  strikeDip: string;
  remark?: string;
}

const OBSERVATIONS_STORAGE_KEY = 'surveyor_everyday_compass_obs_v1';

export const normalizeDeg = (deg: number): number => {
  return ((deg % 360) + 360) % 360;
};

export const shortestAngleDelta = (target: number, current: number): number => {
  let diff = (target - current) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
};

export const CompassClinometerTab: React.FC = () => {
  const [activeMode, setActiveMode] = useState<CompassMode>('dual');
  const [heading, setHeading] = useState<number>(48);
  const [continuousHeading, setContinuousHeading] = useState<number>(48);
  const isFirstReadingRef = useRef<boolean>(true);
  const prevHeadingRef = useRef<number>(48);
  const continuousHeadingRef = useRef<number>(48);

  const [pitch, setPitch] = useState<number>(8.5); // Slope angle (dip)
  const [roll, setRoll] = useState<number>(0.5); // Lateral tilt
  const [declination] = useState<number>(1.2); // Magnetic declination in East Kalimantan/Indonesia
  const [isLocked, setIsLocked] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [sensorActive, setSensorActive] = useState<boolean>(false);

  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingDialRef = useRef<boolean>(false);

  // Saved observations state with localStorage persistence
  const [savedObservations, setSavedObservations] = useState<ObservationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(OBSERVATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'obs-sample-1',
        time: '08:42:15',
        azimuth: 49.2,
        dip: 8.5,
        grade: '14.9%',
        strikeDip: 'N 139° E / 8.5°',
        remark: 'Bidang Sesar Lereng Barat',
      },
      {
        id: 'obs-sample-2',
        time: '09:15:30',
        azimuth: 135.0,
        dip: 12.0,
        grade: '21.3%',
        strikeDip: 'N 225° E / 12.0°',
        remark: 'Kemiringan Ramp Haul Road Utama',
      },
    ];
  });

  // Edit / Delete Observation State
  const [editingObs, setEditingObs] = useState<ObservationRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState({
    azimuth: '0.0',
    dip: '8.0',
    remark: '',
  });

  // Persist observations
  useEffect(() => {
    try {
      localStorage.setItem(OBSERVATIONS_STORAGE_KEY, JSON.stringify(savedObservations));
    } catch {
      // Ignore
    }
  }, [savedObservations]);

  // Robust smooth rotation updater with continuous angle unwrapping
  // Eliminates 359° <-> 0° reverse-spin glitch completely
  const updateHeadingSmooth = (rawH: number) => {
    const rounded = Math.round(normalizeDeg(rawH) * 10) / 10;

    if (isFirstReadingRef.current) {
      isFirstReadingRef.current = false;
      prevHeadingRef.current = rounded;
      continuousHeadingRef.current = rounded;
      setHeading(rounded);
      setContinuousHeading(rounded);
      return;
    }

    const prev = prevHeadingRef.current;
    const delta = shortestAngleDelta(rounded, prev);

    const nextContinuous = continuousHeadingRef.current + delta;
    continuousHeadingRef.current = nextContinuous;
    prevHeadingRef.current = rounded;

    setHeading(rounded);
    setContinuousHeading(nextContinuous);
  };

  // Step heading manually by delta (e.g. +1°, -1°, +10°, -10°)
  const stepHeading = (delta: number) => {
    const current = prevHeadingRef.current;
    const next = normalizeDeg(current + delta);
    updateHeadingSmooth(next);
  };

  // Set explicit heading (e.g. 0° North, 90° East, 359° testing)
  const setExactHeading = (deg: number) => {
    updateHeadingSmooth(deg);
  };

  // Device orientation sensors (supports Android absolute and iOS webkitCompassHeading)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (isLocked || isDraggingDialRef.current) return;

      setSensorActive(true);

      // 1. iOS Safari native compass heading
      const iosHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof iosHeading === 'number' && !isNaN(iosHeading)) {
        updateHeadingSmooth(iosHeading);
      } else if (e.alpha !== null && e.alpha !== undefined) {
        // 2. Android / Standard W3C Device Orientation
        // alpha rotates counter-clockwise from north, so heading = 360 - alpha
        const h = (360 - e.alpha) % 360;
        updateHeadingSmooth(h);
      }

      if (e.beta !== null && e.beta !== undefined) {
        setPitch(Math.round(e.beta * 10) / 10);
      }
      if (e.gamma !== null && e.gamma !== undefined) {
        setRoll(Math.round(e.gamma * 10) / 10);
      }
    };

    // Listen to both standard deviceorientation and Chrome Android deviceorientationabsolute
    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isLocked]);

  // Touch / pointer drag handler for rotating compass dial interactively
  const handleDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingDialRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleDialPointerMove(e);
  };

  const handleDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDialRef.current || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Angle in degrees from 12 o'clock (North)
    const rad = Math.atan2(dx, -dy);
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;

    updateHeadingSmooth(deg);
  };

  const handleDialPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingDialRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Request sensor permission for modern iOS Safari
  const requestSensorPermission = async () => {
    try {
      const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
        const resp = await DeviceOrientationEventAny.requestPermission();
        if (resp === 'granted') {
          setSensorActive(true);
        }
      } else {
        setSensorActive(true);
      }
    } catch {
      // Ignore
    }
  };

  // True North Azimuth (Corrected with Declination)
  const trueHeading = normalizeDeg(
    Math.round(normalizeDeg(heading + declination) * 10) / 10
  );

  // Cardinal direction text
  const getCardinal = (deg: number): string => {
    const directions = [
      'U (Utara)',
      'TL (Timur Laut)',
      'T (Timur)',
      'TG (Tenggara)',
      'S (Selatan)',
      'BD (Barat Daya)',
      'B (Barat)',
      'BL (Barat Laut)',
    ];
    const norm = normalizeDeg(deg);
    const index = Math.round(norm / 45) % 8;
    return directions[index];
  };

  // Quadrant bearing notation (e.g. N 42° 30' E)
  const getQuadrantBearing = (deg: number): string => {
    const norm = normalizeDeg(deg);
    if (norm <= 90) return `N ${norm.toFixed(1)}° E`;
    if (norm <= 180) return `S ${(180 - norm).toFixed(1)}° E`;
    if (norm <= 270) return `S ${(norm - 180).toFixed(1)}° W`;
    return `N ${(360 - norm).toFixed(1)}° W`;
  };

  // Slope angle calculation
  const slopeAngle = Math.abs(pitch);
  const slopePercent = (Math.tan((slopeAngle * Math.PI) / 180) * 100).toFixed(1);
  const slopeRatio =
    slopeAngle > 0 ? `1 : ${(1 / Math.tan((slopeAngle * Math.PI) / 180)).toFixed(2)}` : '1 : ∞';

  // Strike & Dip Notation
  const strikeBearing = normalizeDeg(Math.round(heading + 90));
  const strikeDipNotation = `N ${strikeBearing}° E / ${slopeAngle.toFixed(1)}°`;

  // Horizontal spirit level deviation
  const isHorizontallyLevel = Math.abs(pitch) < 3 && Math.abs(roll) < 3;

  // Save current observation
  const handleSaveObservation = () => {
    const obs: ObservationRecord = {
      id: `obs-${Date.now()}`,
      time: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      azimuth: trueHeading,
      dip: slopeAngle,
      grade: `${slopePercent}%`,
      strikeDip: strikeDipNotation,
      remark: 'Bidikan Lapangan',
    };
    setSavedObservations((prev) => [obs, ...prev]);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  // Delete observation handler
  const handleDeleteObservation = (id: string) => {
    setSavedObservations((prev) => prev.filter((o) => o.id !== id));
    setDeleteConfirmId(null);
  };

  // Save edited observation
  const handleSaveEditedObservation = (updated: ObservationRecord) => {
    // Recompute grade and strikeDip consistently
    const dip = Math.abs(updated.dip);
    const grade = `${(Math.tan((dip * Math.PI) / 180) * 100).toFixed(1)}%`;
    const strike = normalizeDeg(Math.round(updated.azimuth + 90));
    const strikeDip = `N ${strike}° E / ${dip.toFixed(1)}°`;

    const finalObs: ObservationRecord = {
      ...updated,
      dip,
      grade,
      strikeDip,
    };

    setSavedObservations((prev) => prev.map((o) => (o.id === finalObs.id ? finalObs : o)));
    setEditingObs(null);
  };

  // Add manual observation
  const handleAddManualObservation = () => {
    const az = normalizeDeg(parseFloat(manualForm.azimuth) || 0);
    const dip = Math.abs(parseFloat(manualForm.dip) || 0);
    const grade = `${(Math.tan((dip * Math.PI) / 180) * 100).toFixed(1)}%`;
    const strike = normalizeDeg(Math.round(az + 90));
    const strikeDip = `N ${strike}° E / ${dip.toFixed(1)}°`;

    const newObs: ObservationRecord = {
      id: `obs-${Date.now()}`,
      time: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      azimuth: az,
      dip,
      grade,
      strikeDip,
      remark: manualForm.remark.trim() || 'Input Manual Surveyor',
    };

    setSavedObservations((prev) => [newObs, ...prev]);
    setShowAddManualModal(false);
    setManualForm({ azimuth: '0.0', dip: '8.0', remark: '' });
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 p-4 sm:p-6 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>KOMPAS & KLINOMETER GEOLOGI</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Instrumen penentuan azimuth arah geodetik, kemiringan lereng (dip), dan strike jurus batuan
          </p>
        </div>

        {/* Lock/Hold Reading Button */}
        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
            isLocked
              ? 'bg-amber-400 text-black ring-2 ring-amber-500'
              : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
          }`}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          <span>{isLocked ? 'TERKUNCI' : 'KUNCI NILAI'}</span>
        </button>
      </div>

      {/* Mode Switcher Pill */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-200/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-bold max-w-md mx-auto">
        <button
          onClick={() => setActiveMode('dual')}
          className={`py-2 rounded-xl transition ${
            activeMode === 'dual'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Dual Monitor
        </button>
        <button
          onClick={() => setActiveMode('compass')}
          className={`py-2 rounded-xl transition ${
            activeMode === 'compass'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Kompas Brunton
        </button>
        <button
          onClick={() => setActiveMode('clinometer')}
          className={`py-2 rounded-xl transition ${
            activeMode === 'clinometer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Klinometer Lereng
        </button>
      </div>

      {/* Leveling Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-white/10 text-xs shadow-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isHorizontallyLevel ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {isHorizontallyLevel
              ? 'Posisi HP Datar Sempurna (Waterpass OK)'
              : `Kemiringan Instrumen: Pitch ${pitch > 0 ? `+${pitch}` : pitch}°, Roll ${roll}°`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!sensorActive && (
            <button
              onClick={requestSensorPermission}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 transition"
              title="Aktifkan Sensor Gerak Gyroscope"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-500" />
              <span>Sensor Gyro</span>
            </button>
          )}

          <button
            onClick={handleSaveObservation}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] flex items-center gap-1 active:scale-95 transition shadow-sm"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{copiedNotice ? 'Tersimpan!' : 'Catat Data'}</span>
          </button>
        </div>
      </div>

      {/* Main Instruments Grid */}
      <div
        className={`grid gap-4 max-w-4xl mx-auto ${
          activeMode === 'dual' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {/* ========================================================
            INSTRUMENT 1: PROFESSIONAL BRUNTON GEOLOGICAL COMPASS
            ======================================================== */}
        {(activeMode === 'dual' || activeMode === 'compass') && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-md flex flex-col items-center justify-between relative overflow-hidden">
            {/* Top Subheader */}
            <div className="w-full flex justify-between items-center text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Compass className="w-4 h-4" />
                KOMPAS AZIMUTH GEOLOGI
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-black">
                {getCardinal(trueHeading)}
              </span>
            </div>

            {/* Sighting Crosshair Hairline at Top */}
            <div className="relative w-full flex justify-center py-1">
              <div className="w-0.5 h-4 bg-red-500 rounded-full" />
              <div className="absolute -top-1 px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-black uppercase tracking-wider font-mono shadow">
                BIDIKAN SIGHTING
              </div>
            </div>

            {/* Geological Dial with Smooth Continuous Rotation & Interactive Touch Drag */}
            <div
              ref={dialRef}
              onPointerDown={handleDialPointerDown}
              onPointerMove={handleDialPointerMove}
              onPointerUp={handleDialPointerUp}
              onPointerCancel={handleDialPointerUp}
              className="relative w-64 h-64 my-2 flex items-center justify-center select-none cursor-grab active:cursor-grabbing touch-none"
              title="Putar atau geser piringan kompas untuk membidik secara manual"
            >
              {/* Metallic Outer Chassis */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-slate-200 via-slate-100 to-white dark:from-slate-900 dark:via-[#131b2e] dark:to-slate-800 border-4 border-slate-300 dark:border-white/10 shadow-2xl flex items-center justify-center" />

              {/* Rotating Compass Dial with smooth angle unwrapping - NO 359->0 wrap jump */}
              <div
                className="absolute inset-3 rounded-full bg-slate-900 text-white border-2 border-cyan-500/30 flex items-center justify-center shadow-inner transition-transform duration-75 ease-out will-change-transform"
                style={{ transform: `rotate(${-continuousHeading - declination}deg)` }}
              >
                {/* 360 Ticks */}
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-0.5 ${
                      i % 3 === 0 ? 'h-3 bg-cyan-400' : 'h-1.5 bg-slate-500'
                    }`}
                    style={{
                      transform: `rotate(${i * 10}deg) translateY(-106px)`,
                    }}
                  />
                ))}

                {/* Cardinal Marks */}
                <span className="absolute top-3 font-black text-red-500 font-mono text-base">U</span>
                <span className="absolute right-3 font-black text-cyan-300 font-mono text-sm">T</span>
                <span className="absolute bottom-3 font-black text-slate-300 font-mono text-sm">S</span>
                <span className="absolute left-3 font-black text-cyan-300 font-mono text-sm">B</span>

                {/* Degree labels inside dial */}
                <span className="absolute top-9 text-[9px] font-mono font-bold text-red-400">0°</span>
                <span className="absolute right-9 text-[9px] font-mono font-bold text-slate-400">90°</span>
                <span className="absolute bottom-9 text-[9px] font-mono font-bold text-slate-400">180°</span>
                <span className="absolute left-9 text-[9px] font-mono font-bold text-slate-400">270°</span>
              </div>

              {/* Waterpass Spirit Bubble in Center */}
              <div className="absolute w-14 h-14 rounded-full border-2 border-white/20 bg-black/40 flex items-center justify-center pointer-events-none z-10 backdrop-blur-[1px]">
                <div
                  className="w-4 h-4 rounded-full bg-emerald-400/90 border border-white shadow transition-all duration-100"
                  style={{
                    transform: `translate(${Math.max(-18, Math.min(18, roll * 1.5))}px, ${Math.max(
                      -18,
                      Math.min(18, pitch * 1.5)
                    )}px)`,
                  }}
                />
              </div>

              {/* Fixed Sighting Needle */}
              <div className="relative z-20 flex flex-col items-center pointer-events-none">
                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[38px] border-b-red-600 drop-shadow-lg" />
                <div className="w-4 h-4 rounded-full bg-white border-2 border-red-600 -my-1 z-30 shadow" />
                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[38px] border-t-slate-300 drop-shadow-lg" />
              </div>
            </div>

            {/* Azimuth & Quadrant Readouts */}
            <div className="w-full text-center space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  {trueHeading.toFixed(1)}&deg;
                </span>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  {getQuadrantBearing(trueHeading)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                True Azimuth (Deklinasi Magnet: +{declination}&deg;)
              </p>

              {/* Step & Preset Buttons to easily verify 359° <-> 0° continuous rotation */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => stepHeading(-1)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold transition flex items-center gap-0.5"
                  title="Kurang 1 derajat"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>-1°</span>
                </button>
                <button
                  type="button"
                  onClick={() => stepHeading(1)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold transition flex items-center gap-0.5"
                  title="Tambah 1 derajat"
                >
                  <span>+1°</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-0.5" />

                <button
                  type="button"
                  onClick={() => setExactHeading(359)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-mono text-[11px] font-bold transition"
                  title="Uji 359°"
                >
                  359°
                </button>
                <button
                  type="button"
                  onClick={() => setExactHeading(0)}
                  className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-extrabold transition"
                  title="Uji Utara 0°"
                >
                  0° (U)
                </button>
                <button
                  type="button"
                  onClick={() => setExactHeading(90)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-mono text-[11px] font-bold transition"
                  title="Uji Timur 90°"
                >
                  90° (T)
                </button>
                <button
                  type="button"
                  onClick={() => setExactHeading(180)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-mono text-[11px] font-bold transition"
                  title="Uji Selatan 180°"
                >
                  180° (S)
                </button>
                <button
                  type="button"
                  onClick={() => setExactHeading(270)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-mono text-[11px] font-bold transition"
                  title="Uji Barat 270°"
                >
                  270° (B)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            INSTRUMENT 2: MINING SLOPE CLINOMETER & DIP ANGLE
            ======================================================== */}
        {(activeMode === 'dual' || activeMode === 'clinometer') && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-md flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                <Gauge className="w-4 h-4" />
                KLINOMETER LERENG & DIP
              </span>
              <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">
                DIP: {slopeAngle.toFixed(1)}°
              </span>
            </div>

            {/* Inclinometer Gauge Protractor */}
            <div className="relative w-full h-48 bg-slate-900 rounded-3xl border-2 border-cyan-500/20 overflow-hidden flex items-center justify-center shadow-inner">
              {/* Protractor grid arc */}
              <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center">
                <div className="w-full h-[1px] bg-cyan-500/20" />
                <div className="h-full w-[1px] bg-cyan-500/20" />
              </div>

              {/* Slope Angle Horizon Bar */}
              <div
                className="absolute w-52 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 shadow-xl transition-transform duration-100 ease-out"
                style={{ transform: `rotate(${-pitch}deg)` }}
              />

              {/* Pendulum Indicator */}
              <div
                className="absolute w-1 h-24 bg-red-500/80 origin-top top-1/2 rounded shadow-lg transition-transform duration-100"
                style={{ transform: `rotate(${pitch}deg)` }}
              />

              {/* Digital Angle Badge in Center */}
              <div className="relative z-10 px-4 py-2 rounded-2xl bg-black/80 border border-white/20 text-center backdrop-blur-md shadow-2xl">
                <div className="text-3xl font-black font-mono text-cyan-400">
                  {slopeAngle.toFixed(1)}&deg;
                </div>
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  SUDUT KEMIRINGAN
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  GRADE KEMIRINGAN (%)
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {slopePercent}%
                </div>
                <div className="text-[10px] font-mono text-slate-400">Rasio: {slopeRatio}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  NOTASI STRIKE / DIP
                </span>
                <div className="text-base font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                  {strikeDipNotation}
                </div>
                <div className="text-[10px] text-slate-400">Arah jurus bidang batuan</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Observation History Table with EDIT and DELETE functionality */}
      <div className="max-w-4xl mx-auto p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-white/10 space-y-3 shadow-md">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-extrabold uppercase tracking-wide">
              Riwayat Catatan Bidikan Lapangan
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold">
              {savedObservations.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAddManualModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Manual</span>
            </button>
          </div>
        </div>

        {savedObservations.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 space-y-1">
            <p>Belum ada catatan bidikan kompas atau kemiringan lereng.</p>
            <p className="text-[11px]">
              Klik tombol <strong className="text-blue-600 font-bold">"Catat Data"</strong> di atas
              atau <strong className="text-blue-600 font-bold">"Input Manual"</strong> untuk menyimpan data bidikan.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {savedObservations.map((obs) => (
              <div
                key={obs.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono transition hover:border-blue-200 dark:hover:border-blue-900/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 text-[11px] font-bold">{obs.time}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                    Az: {obs.azimuth.toFixed(1)}°
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold">
                    Dip: {obs.dip.toFixed(1)}°
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 font-bold">
                    {obs.grade}
                  </span>
                  <span className="text-slate-500 text-[11px]">{obs.strikeDip}</span>
                  {obs.remark && (
                    <span className="text-slate-400 font-sans text-[11px] italic">
                      &bull; {obs.remark}
                    </span>
                  )}
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  {deleteConfirmId === obs.id ? (
                    <div className="flex items-center gap-1 bg-red-100 dark:bg-red-950/70 p-1 rounded-xl border border-red-300 dark:border-red-900">
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-bold px-1.5 font-sans">
                        Hapus data ini?
                      </span>
                      <button
                        onClick={() => handleDeleteObservation(obs.id)}
                        className="px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-1 text-[11px] font-bold"
                        title="Ya, hapus permanen"
                      >
                        <Check className="w-3 h-3" />
                        <span>Ya</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                        title="Batal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingObs(obs)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-white/10 transition active:scale-95 flex items-center gap-1 text-[11px] font-bold"
                        title="Edit Catatan Bidikan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(obs.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-white/10 transition active:scale-95 flex items-center gap-1 text-[11px] font-bold"
                        title="Hapus Catatan Bidikan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Observation Modal */}
      {editingObs && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#111726] border border-blue-200 dark:border-blue-900/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Edit Catatan Bidikan</span>
              </h2>
              <button
                onClick={() => setEditingObs(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Waktu Pencatatan
                </label>
                <input
                  type="text"
                  value={editingObs.time}
                  onChange={(e) => setEditingObs({ ...editingObs, time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Azimuth Bidikan (0° - 360°)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="360"
                  value={editingObs.azimuth}
                  onChange={(e) =>
                    setEditingObs({ ...editingObs, azimuth: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Dip / Kemiringan Lereng (0° - 90°)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="90"
                  value={editingObs.dip}
                  onChange={(e) => {
                    const newDip = parseFloat(e.target.value) || 0;
                    setEditingObs({ ...editingObs, dip: newDip });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Keterangan / Remark Geologi
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sesar minor lereng barat, Ramp haul road"
                  value={editingObs.remark || ''}
                  onChange={(e) => setEditingObs({ ...editingObs, remark: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 font-sans"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingObs(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedObservation(editingObs)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Observation Modal */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#111726] border border-blue-200 dark:border-blue-900/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Input Catatan Bidikan Baru</span>
              </h2>
              <button
                onClick={() => setShowAddManualModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Azimuth (0° - 360°)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="360"
                  value={manualForm.azimuth}
                  onChange={(e) => setManualForm({ ...manualForm, azimuth: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Dip / Kemiringan Lereng (0° - 90°)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="90"
                  value={manualForm.dip}
                  onChange={(e) => setManualForm({ ...manualForm, dip: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Keterangan / Remark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batas crest pit blok 2, Bidang sesar"
                  value={manualForm.remark}
                  onChange={(e) => setManualForm({ ...manualForm, remark: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 font-sans"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddManualModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddManualObservation}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition"
              >
                Tambah Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

