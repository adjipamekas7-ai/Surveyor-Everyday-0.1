import React from 'react';
import { ArrowLeft, Download, Plus, FileText, Globe } from 'lucide-react';
import { BasemapType } from '../types/survey';

interface TopBarProps {
  basemap: BasemapType;
  hasActiveOverlay: boolean;
  onBackToMenu: () => void;
  onOpenImportOverlay: () => void;
  onOpenOfflineDownload: () => void;
  onToggleBasemap: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  basemap,
  hasActiveOverlay,
  onBackToMenu,
  onOpenImportOverlay,
  onOpenOfflineDownload,
  onToggleBasemap,
}) => {
  const basemapLabel =
    basemap === 'satelit'
      ? 'SATELIT'
      : basemap === 'kontur'
      ? 'KONTUR'
      : basemap === 'road'
      ? 'ROAD'
      : 'GEOPDF';

  return (
    <header className="absolute top-0 left-0 right-0 z-[500] p-3 pt-safe flex items-center justify-between pointer-events-none">
      {/* Left Slot: Back Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onBackToMenu}
          aria-label="Kembali ke Menu Utama"
          className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-[#101625]/90 backdrop-blur-md border border-blue-200 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white shadow-md active:scale-95 transition hover:bg-white dark:hover:bg-[#182035]"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Center Slot: Peta Mode Switcher (Basemap vs PDF Overlay) */}
      <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl bg-white/90 dark:bg-[#101625]/90 backdrop-blur-md border border-blue-200 dark:border-white/10 shadow-md">
        {/* Basemap button */}
        <button
          onClick={onToggleBasemap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white shadow-sm active:scale-95 transition"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{basemapLabel}</span>
        </button>

        {/* Import PDF Quick Button (+) */}
        <button
          onClick={onOpenImportOverlay}
          title="Import Peta PDF Georeference / Overlay"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
            hasActiveOverlay
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">PDF Georef</span>
          <Plus className="w-3.5 h-3.5 stroke-[3] text-blue-500" />
        </button>
      </div>

      {/* Right Slot: Download Offline Area Map */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onOpenOfflineDownload}
          title="Download Kotak Area Peta Offline"
          aria-label="Download Peta Offline"
          className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-[#101625]/90 backdrop-blur-md border border-blue-200 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-md active:scale-95 transition hover:bg-white dark:hover:bg-[#182035]"
        >
          <Download className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
};
