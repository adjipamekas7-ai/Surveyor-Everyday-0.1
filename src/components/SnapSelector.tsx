import React from 'react';
import { Magnet, Dot, Slash } from 'lucide-react';
import { SnapMode } from '../types/survey';

interface SnapSelectorProps {
  mode: SnapMode;
  onChangeMode: (mode: SnapMode) => void;
  activeSnapLabel?: string | null;
}

export const SnapSelector: React.FC<SnapSelectorProps> = ({
  mode,
  onChangeMode,
  activeSnapLabel,
}) => {
  return (
    <div className="absolute top-16 left-4 z-[450] pointer-events-auto flex flex-col gap-1.5">
      <div className="bg-white/90 dark:bg-[#101625]/90 backdrop-blur-md border border-blue-200 dark:border-white/10 rounded-2xl p-1 shadow-lg flex items-center gap-1">
        <button
          onClick={() => onChangeMode('free')}
          title="Snap Bebas (Free Cursor)"
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            mode === 'free'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Magnet className="w-3.5 h-3.5 opacity-60" />
          <span>Bebas</span>
        </button>

        <button
          onClick={() => onChangeMode('point')}
          title="Snap ke Titik & Vertex"
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            mode === 'point'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Dot className="w-4 h-4 stroke-[4]" />
          <span>Titik</span>
        </button>

        <button
          onClick={() => onChangeMode('line')}
          title="Snap ke Garis / Sisi Area"
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            mode === 'line'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Slash className="w-3.5 h-3.5" />
          <span>Garis</span>
        </button>
      </div>

      {activeSnapLabel && (
        <div className="bg-blue-600/95 text-white text-[11px] font-mono px-3 py-1 rounded-xl shadow-lg border border-white/20 flex items-center gap-1.5 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
          <span className="font-bold truncate max-w-[180px]">Snap: {activeSnapLabel}</span>
        </div>
      )}
    </div>
  );
};
