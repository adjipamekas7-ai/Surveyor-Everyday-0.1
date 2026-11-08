import React from 'react';
import { Magnet } from 'lucide-react';
import { SnapTarget } from '../types/survey';

interface MiningCrosshairProps {
  isPlotting?: boolean;
  plottingType?: 'point' | 'line' | 'polygon' | null;
  vertexCount?: number;
  snapTarget?: SnapTarget | null;
}

export const MiningCrosshair: React.FC<MiningCrosshairProps> = ({
  isPlotting = false,
  plottingType = null,
  vertexCount = 0,
  snapTarget = null,
}) => {
  const isSnapped = !!snapTarget;

  return (
    <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Outer subtle target ring */}
        <div
          className={`w-14 h-14 rounded-full border border-dashed transition-all duration-200 ${
            isSnapped
              ? 'border-blue-400 bg-blue-500/20 scale-125'
              : isPlotting
              ? 'border-blue-500 bg-blue-500/10 scale-110'
              : 'border-white/60 bg-black/10'
          }`}
        />

        {/* Inner precision ring */}
        <div
          className={`absolute w-6 h-6 rounded-full border transition-all ${
            isSnapped
              ? 'border-cyan-400 scale-110'
              : isPlotting
              ? 'border-blue-500'
              : 'border-white/90'
          }`}
        />

        {/* Center precision dot */}
        <div
          className={`absolute w-1.5 h-1.5 rounded-full transition-colors ${
            isSnapped
              ? 'bg-cyan-300 ring-2 ring-blue-700'
              : isPlotting
              ? 'bg-blue-600 ring-2 ring-white'
              : 'bg-red-500 ring-1 ring-white'
          }`}
        />

        {/* North hairline */}
        <div className="absolute -top-7 w-[1.5px] h-4 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        {/* South hairline */}
        <div className="absolute -bottom-7 w-[1.5px] h-4 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        {/* West hairline */}
        <div className="absolute -left-7 h-[1.5px] w-4 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        {/* East hairline */}
        <div className="absolute -right-7 h-[1.5px] w-4 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />

        {/* Snapped Badge above crosshair */}
        {isSnapped && (
          <div className="absolute -top-16 flex items-center gap-1.5 px-3 py-1 bg-blue-700 text-white text-xs font-mono font-bold rounded-full shadow-2xl whitespace-nowrap animate-in fade-in">
            <Magnet className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>TERKUNCI: {snapTarget.label}</span>
          </div>
        )}

        {/* Plotting badge tooltip above crosshair if not snapped */}
        {!isSnapped && isPlotting && (
          <div className="absolute -top-14 flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-mono rounded-full shadow-xl whitespace-nowrap animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-300" />
            <span>
              Target {plottingType === 'point' ? 'Titik' : plottingType === 'line' ? 'Garis' : 'Poligon'}
              {vertexCount > 0 ? ` (#${vertexCount + 1})` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
