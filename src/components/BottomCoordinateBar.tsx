import React, { useState } from 'react';
import { UTMCoordinate, CoordinateSystemType } from '../types/survey';
import { Copy, Check, Navigation, Target } from 'lucide-react';

interface BottomCoordinateBarProps {
  crosshairUtm: UTMCoordinate;
  gpsUtm: UTMCoordinate | null;
  crosshairLatLng: { lat: number; lng: number };
  gpsLatLng: { lat: number; lng: number } | null;
  displayMode: 'crosshair' | 'gps';
  coordinateSystem: CoordinateSystemType;
  decimalPlaces: number;
  elevationOffset: number;
  onToggleDisplayMode: () => void;
  basemapAttribution?: string;
}

export const BottomCoordinateBar: React.FC<BottomCoordinateBarProps> = ({
  crosshairUtm,
  gpsUtm,
  crosshairLatLng,
  gpsLatLng,
  displayMode,
  coordinateSystem,
  decimalPlaces,
  elevationOffset,
  onToggleDisplayMode,
  basemapAttribution = 'Powered by Esri · Sources: Esri, Maxar, Earthstar Geographics',
}) => {
  const [copied, setCopied] = useState(false);

  const activeUtm = displayMode === 'gps' && gpsUtm ? gpsUtm : crosshairUtm;
  const activeLatLng = displayMode === 'gps' && gpsLatLng ? gpsLatLng : crosshairLatLng;
  const adjustedElevation = activeUtm.elevation + elevationOffset;

  // Format DMS
  const toDms = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(2);
    return `${deg}°${min}'${sec}"${dir}`;
  };

  const copyCoordinates = () => {
    let text = '';
    if (coordinateSystem === 'utm') {
      text = `${activeUtm.zoneString} E ${activeUtm.easting.toFixed(decimalPlaces)} N ${activeUtm.northing.toFixed(decimalPlaces)} Z ${adjustedElevation.toFixed(decimalPlaces)}m`;
    } else if (coordinateSystem === 'geographic') {
      text = `Lat: ${activeLatLng.lat.toFixed(6)}, Lon: ${activeLatLng.lng.toFixed(6)}, Z: ${adjustedElevation.toFixed(decimalPlaces)}m`;
    } else {
      text = `${toDms(activeLatLng.lat, true)} ${toDms(activeLatLng.lng, false)} Z: ${adjustedElevation.toFixed(decimalPlaces)}m`;
    }
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute bottom-[64px] left-3 right-3 sm:left-4 sm:right-4 z-[450] pointer-events-auto">
      <div className="bg-white/95 dark:bg-[#101625]/95 backdrop-blur-md border border-blue-200/80 dark:border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl flex flex-col gap-0.5 transition-all">
        {/* Top telemetry row */}
        <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          <div className="flex items-center gap-2">
            <span>KOORDINAT</span>
            <button
              onClick={onToggleDisplayMode}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold transition-colors"
            >
              {displayMode === 'crosshair' ? (
                <>
                  <Target className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>TARGET TENGAH</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3 h-3 text-emerald-500" />
                  <span>GPS AKTUAL</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span>ELEVASI</span>
            <button
              onClick={copyCoordinates}
              title="Salin Koordinat"
              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              {copied ? (
                <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-mono font-bold">
                  <Check className="w-3 h-3" /> TERSALIN
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Values row with NEZ in FRONT of the numbers */}
        <div className="flex items-baseline justify-between font-mono">
          {coordinateSystem === 'utm' ? (
            <div className="text-slate-900 dark:text-white text-xs sm:text-sm font-bold tracking-tight">
              <span className="text-blue-600 dark:text-blue-400 mr-1.5 font-black">
                {activeUtm.zoneString}
              </span>
              <span>E {activeUtm.easting.toFixed(decimalPlaces)}</span>
              <span className="mx-1.5 text-slate-400 font-normal">&bull;</span>
              <span>N {activeUtm.northing.toFixed(decimalPlaces)}</span>
            </div>
          ) : coordinateSystem === 'geographic' ? (
            <div className="text-slate-900 dark:text-white text-xs sm:text-sm font-bold tracking-tight">
              <span>{activeLatLng.lat.toFixed(6)}&deg;</span>
              <span className="mx-1.5 text-slate-400 font-normal">&bull;</span>
              <span>{activeLatLng.lng.toFixed(6)}&deg;</span>
            </div>
          ) : (
            <div className="text-slate-900 dark:text-white text-[11px] sm:text-xs font-bold tracking-tight">
              <span>{toDms(activeLatLng.lat, true)}</span>
              <span className="mx-1 text-slate-400 font-normal">&bull;</span>
              <span>{toDms(activeLatLng.lng, false)}</span>
            </div>
          )}

          <div className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-bold tracking-tight">
            {adjustedElevation !== 0 ? (
              <span>
                <span className="text-slate-500 dark:text-slate-400 mr-0.5">Z</span>{' '}
                {adjustedElevation.toFixed(decimalPlaces)}{' '}
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">MDPL</span>
              </span>
            ) : (
              <span className="text-slate-400">Z -- MDPL</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
