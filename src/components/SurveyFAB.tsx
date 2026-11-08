import React from 'react';
import { Pencil, Plus, Check, X, RotateCcw } from 'lucide-react';
import { formatDistance, formatArea } from '../utils/utm';

interface SurveyFABProps {
  onOpenSurveyMenu: () => void;
  isPlotting: boolean;
  plottingType: 'point' | 'line' | 'polygon' | null;
  activeVerticesCount: number;
  activeLengthMeters: number;
  activeAreaSquareMeters: number;
  onAddVertex: () => void;
  onUndoVertex: () => void;
  onFinishPlotting: () => void;
  onCancelPlotting: () => void;
}

export const SurveyFAB: React.FC<SurveyFABProps> = ({
  onOpenSurveyMenu,
  isPlotting,
  plottingType,
  activeVerticesCount,
  activeLengthMeters,
  activeAreaSquareMeters,
  onAddVertex,
  onUndoVertex,
  onFinishPlotting,
  onCancelPlotting,
}) => {
  if (isPlotting) {
    const areaFormatted = formatArea(activeAreaSquareMeters);

    return (
      <div className="absolute bottom-[158px] left-3 right-3 sm:left-4 sm:right-4 z-[480] pointer-events-auto flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
        {/* Floating plotting status bar */}
        <div className="bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-400 dark:border-blue-500/50 rounded-2xl px-4 py-2.5 shadow-xl flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              Plotting {plottingType === 'line' ? 'Garis (Line)' : 'Area / Poligon'}
            </span>
            <span className="text-slate-800 dark:text-white font-mono text-xs font-semibold mt-0.5">
              {activeVerticesCount === 0 ? (
                <span className="text-blue-600 dark:text-blue-300 font-sans font-bold">
                  0 Titik Terpasang &bull; Geser target & klik Tambah Titik Pertama
                </span>
              ) : (
                <>
                  {activeVerticesCount} Titik Terpasang
                  {plottingType === 'line' && (
                    <span className="text-blue-600 dark:text-blue-300 ml-2 font-bold">
                      &bull; P: {formatDistance(activeLengthMeters)}
                    </span>
                  )}
                  {plottingType === 'polygon' && activeVerticesCount >= 3 && (
                    <span className="text-cyan-600 dark:text-cyan-300 ml-2 font-bold">
                      &bull; Luas: {areaFormatted.sqMetersStr} ({areaFormatted.hectaresStr})
                    </span>
                  )}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {activeVerticesCount > 0 && (
              <button
                onClick={onUndoVertex}
                title="Undo Titik Terakhir"
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 active:scale-95 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onCancelPlotting}
              title="Batalkan"
              className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 active:scale-95 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons: Add vertex at center target & Finish */}
        <div className="flex items-center gap-2">
          {/* Add Vertex Button at Crosshair */}
          <button
            onClick={onAddVertex}
            className="flex-1 h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 active:scale-98 transition hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>
              {activeVerticesCount === 0 ? '+ PILIH TITIK PERTAMA' : '+ TAMBAH TITIK TARGET'}
            </span>
          </button>

          {/* Finish Button */}
          {((plottingType === 'line' && activeVerticesCount >= 2) ||
            (plottingType === 'polygon' && activeVerticesCount >= 3)) && (
            <button
              onClick={onFinishPlotting}
              className="h-12 px-5 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-xl shadow-emerald-500/25 active:scale-98 transition hover:bg-emerald-700"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>SELESAI</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default Bottom-Left Pencil FAB:
  // Placed at bottom-[158px] left-3 sm:left-4, clearly above the coordinate bar (which ends at ~134px)
  return (
    <div className="absolute bottom-[158px] left-3 sm:left-4 z-[480] pointer-events-auto">
      <button
        onClick={onOpenSurveyMenu}
        aria-label="Alat Survey & Plotting"
        title="Alat Survey & Plotting"
        className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center active:scale-95 transition shadow-2xl shadow-blue-600/40 border-2 border-white dark:border-slate-800"
      >
        <Pencil className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
};
