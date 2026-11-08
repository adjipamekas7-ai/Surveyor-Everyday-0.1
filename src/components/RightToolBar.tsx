import React, { useState } from 'react';
import { Layers, Image as ImageIcon, Plus, Minus, Navigation, Magnet, Dot, Slash } from 'lucide-react';
import { SnapMode } from '../types/survey';

interface RightToolBarProps {
  onOpenLayers: () => void;
  onOpenBasemapSelector: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGpsLocate: () => void;
  isGpsTracking: boolean;
  totalFeaturesCount: number;
  snapMode: SnapMode;
  onChangeSnapMode: (mode: SnapMode) => void;
  activeSnapLabel?: string | null;
}

export const RightToolBar: React.FC<RightToolBarProps> = ({
  onOpenLayers,
  onOpenBasemapSelector,
  onZoomIn,
  onZoomOut,
  onGpsLocate,
  isGpsTracking,
  totalFeaturesCount,
  snapMode,
  onChangeSnapMode,
  activeSnapLabel,
}) => {
  const [showSnapFlyout, setShowSnapFlyout] = useState(false);

  // Cycle snap mode quickly on tap
  const handleCycleSnap = () => {
    if (snapMode === 'free') {
      onChangeSnapMode('point');
    } else if (snapMode === 'point') {
      onChangeSnapMode('line');
    } else {
      onChangeSnapMode('free');
    }
  };

  const isSnapActive = snapMode !== 'free';

  return (
    <aside className="absolute right-3 top-20 z-[450] flex flex-col items-center gap-2.5 pointer-events-auto">
      {/* 1. Layer Manager Button */}
      <button
        onClick={onOpenLayers}
        title="Daftar Layer & Data Ukur"
        aria-label="Layer Manager"
        className="relative w-11 h-11 rounded-2xl bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-200 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition shadow-md hover:bg-white dark:hover:bg-[#182035]"
      >
        <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        {totalFeaturesCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow">
            {totalFeaturesCount > 99 ? '99+' : totalFeaturesCount}
          </span>
        )}
      </button>

      {/* 2. Basemap Switcher Button */}
      <button
        onClick={onOpenBasemapSelector}
        title="Ganti Layout Basemap"
        aria-label="Ganti Basemap"
        className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-200 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition shadow-md hover:bg-white dark:hover:bg-[#182035]"
      >
        <ImageIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
      </button>

      {/* 3. Zoom In (+) */}
      <button
        onClick={onZoomIn}
        title="Perbesar Peta (Zoom In)"
        aria-label="Zoom In"
        className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-200 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition shadow-md hover:bg-white dark:hover:bg-[#182035]"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* 4. Zoom Out (-) */}
      <button
        onClick={onZoomOut}
        title="Perkecil Peta (Zoom Out)"
        aria-label="Zoom Out"
        className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-200 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition shadow-md hover:bg-white dark:hover:bg-[#182035]"
      >
        <Minus className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* 5. GPS Current Location Button */}
      <button
        onClick={onGpsLocate}
        title="Fokus ke Lokasi GPS Saat Ini"
        aria-label="Lokasi GPS"
        className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition shadow-lg ${
          isGpsTracking
            ? 'bg-blue-600 text-white ring-4 ring-blue-400/40 animate-pulse'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <Navigation className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* 6. DEDICATED SNAPPING BUTTON (Posisikan di Kanan, Icon Baru Snapping) */}
      <div className="relative flex items-center">
        {/* Flyout popout menu extending to the left when clicked or long-pressed */}
        {showSnapFlyout && (
          <div className="absolute right-14 flex items-center gap-1 p-1 bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-200 dark:border-white/10 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-right-2">
            <button
              onClick={() => {
                onChangeSnapMode('free');
                setShowSnapFlyout(false);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                snapMode === 'free'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <span>Bebas</span>
            </button>

            <button
              onClick={() => {
                onChangeSnapMode('point');
                setShowSnapFlyout(false);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                snapMode === 'point'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <Dot className="w-3.5 h-3.5 stroke-[4]" />
              <span>Titik</span>
            </button>

            <button
              onClick={() => {
                onChangeSnapMode('line');
                setShowSnapFlyout(false);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                snapMode === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <Slash className="w-3 h-3" />
              <span>Garis</span>
            </button>
          </div>
        )}

        {/* Custom Snapping Action Button */}
        <button
          onClick={handleCycleSnap}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowSnapFlyout((prev) => !prev);
          }}
          title={`Mode Snap: ${snapMode === 'free' ? 'Bebas' : snapMode === 'point' ? 'Snap Titik' : 'Snap Garis'} (Klik untuk ganti, tahan/klik kanan untuk opsi)`}
          aria-label="Mode Snapping"
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition shadow-lg ${
            isSnapActive
              ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white ring-2 ring-cyan-400/50 shadow-cyan-500/25'
              : 'bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-[#182035]'
          }`}
        >
          {/* Custom Snapping Icon: Magnet with snap target crosshairs */}
          <div className="relative flex items-center justify-center">
            <Magnet className={`w-5 h-5 ${isSnapActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            {snapMode === 'point' && (
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-300 ring-2 ring-blue-700 animate-ping" />
            )}
            {snapMode === 'line' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-1 rounded-sm bg-cyan-300 ring-1 ring-blue-700" />
            )}
          </div>

          {/* Micro-badge indicating current snap mode */}
          <span
            className={`absolute -bottom-1 -left-1 px-1 py-0.2 rounded text-[8px] font-mono font-black uppercase ${
              isSnapActive ? 'bg-cyan-400 text-black' : 'bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-slate-300'
            }`}
          >
            {snapMode === 'free' ? 'OFF' : snapMode === 'point' ? 'PT' : 'LN'}
          </span>
        </button>
      </div>

      {/* Snap Active Indicator Badge on Right Side */}
      {activeSnapLabel && (
        <div className="absolute right-14 bottom-0 bg-blue-700 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl shadow-lg border border-cyan-300/40 whitespace-nowrap animate-in fade-in flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
          <span>Snap: {activeSnapLabel}</span>
        </div>
      )}
    </aside>
  );
};
