import React from 'react';
import { Globe, FileText, Plus, ChevronRight, CheckCircle2, Sliders, ArrowLeft } from 'lucide-react';
import { GeoOverlay } from '../types/survey';

interface MapModeSelectorScreenProps {
  onSelectBasemapMode: () => void;
  onSelectPdfMode: () => void;
  onOpenImportPdfModal: () => void;
  overlays: GeoOverlay[];
  onBackToHome?: () => void;
}

export const MapModeSelectorScreen: React.FC<MapModeSelectorScreenProps> = ({
  onSelectBasemapMode,
  onSelectPdfMode,
  onOpenImportPdfModal,
  overlays,
  onBackToHome,
}) => {
  const activePdfOverlay = overlays.find(
    (ov) => (ov.type === 'pdf' || ov.type === 'tiff' || ov.type === 'ecw') && ov.visible
  ) || overlays.find((ov) => ov.type === 'pdf' || ov.type === 'tiff' || ov.type === 'ecw');

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 p-4 sm:p-6 pb-24 space-y-5 flex flex-col justify-between">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                aria-label="Kembali"
                className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/15 transition mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                MODUL PETA TAMBANG
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Pilih Tampilan Peta
              </h1>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
          Tentukan sumber peta yang ingin Anda gunakan untuk navigasi dan survey lapangan saat ini:
        </p>

        {/* 2 Main Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* OPTION 1: BASEMAP SATELIT / TOPOGRAFI */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111726] border-2 border-blue-500/30 hover:border-blue-600 dark:border-blue-900/40 dark:hover:border-blue-500 transition-all shadow-md flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                <Globe className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Peta Citra Satelit / Topo
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold font-mono">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Citra satelit resolusi tinggi (Esri World Imagery) dan peta kontur topografi. Sangat optimal untuk melihat lereng pit, jenjang tambang, jalan hauling, dan posisi GPS aktual.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Mendukung zoom mendalam hingga level 22 tanpa error</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Dapat disimpan untuk penggunaan offline di dalam pit</span>
                </div>
              </div>
            </div>

            <button
              onClick={onSelectBasemapMode}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <span>MASUK PETA BASEMAP</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* OPTION 2: PETA DOKUMEN PDF GEOREFERENCE */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111726] border-2 border-cyan-500/30 hover:border-cyan-600 dark:border-cyan-900/40 dark:hover:border-cyan-500 transition-all shadow-md flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                <FileText className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div>
                  <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Peta GeoPDF & Orthomosaic Raster
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold font-mono">
                    GEOREFERENCED
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Menampilkan dokumen GeoPDF desain tambang, GeoTIFF orthomosaic udara drone, dan ECW ER Mapper yang memiliki koordinat georeferensi asli otomatis tertempel presisi di peta.
                </p>
              </div>

              {activePdfOverlay ? (
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/60 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-cyan-800 dark:text-cyan-300 flex items-center justify-between">
                    <span>Overlay Aktif Terpasang:</span>
                    <span className="font-mono text-[10px]">{Math.round(activePdfOverlay.opacity * 100)}% Opasitas</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono truncate">
                    {activePdfOverlay.name}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-500">
                  Belum ada GeoPDF / GeoTIFF / ECW terpasang. File ber-georeferensi otomatis menempel akurat.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {activePdfOverlay && (
                <button
                  onClick={onSelectPdfMode}
                  className="flex-1 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 active:scale-98 transition flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-4 h-4" />
                  <span>BUKA OVERLAY PETA</span>
                </button>
              )}

              <button
                onClick={onOpenImportPdfModal}
                className={`${
                  activePdfOverlay ? 'px-4' : 'w-full'
                } py-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-extrabold text-xs active:scale-98 transition flex items-center justify-center gap-1.5`}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{activePdfOverlay ? 'Ganti Overlay' : '+ IMPORT OVERLAY (PDF / TIFF / ECW)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Tip */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-white/5 border border-blue-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans mt-4">
        <strong className="text-blue-700 dark:text-blue-300">Tips Surveyor Tambang:</strong> Anda tetap dapat mengganti tampilan antara Citra Satelit dan Peta PDF kapan saja secara instan melalui tombol di bilah atas layar peta.
      </div>
    </div>
  );
};
