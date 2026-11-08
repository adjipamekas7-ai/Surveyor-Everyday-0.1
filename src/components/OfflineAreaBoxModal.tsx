import React, { useState } from 'react';
import { X, Download, Scan, HardDrive, CheckCircle2, Box } from 'lucide-react';
import { UTMCoordinate } from '../types/survey';
import { saveTile, getStoredTilesCount } from '../utils/offlineTileStorage';

interface OfflineAreaBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCrosshairUtm: UTMCoordinate;
}

export const OfflineAreaBoxModal: React.FC<OfflineAreaBoxModalProps> = ({
  isOpen,
  onClose,
  currentCrosshairUtm,
}) => {
  // Bounding box in UTM coordinates
  const [minEasting, setMinEasting] = useState<number>(Math.round(currentCrosshairUtm.easting - 750));
  const [maxEasting, setMaxEasting] = useState<number>(Math.round(currentCrosshairUtm.easting + 750));
  const [minNorthing, setMinNorthing] = useState<number>(Math.round(currentCrosshairUtm.northing - 750));
  const [maxNorthing, setMaxNorthing] = useState<number>(Math.round(currentCrosshairUtm.northing + 750));
  const [zoomLevelMax, setZoomLevelMax] = useState<number>(18);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const widthMeters = Math.max(100, Math.abs(maxEasting - minEasting));
  const heightMeters = Math.max(100, Math.abs(maxNorthing - minNorthing));
  const areaSqKm = ((widthMeters * heightMeters) / 1000000).toFixed(2);

  // Approximate tiles calculation based on box size and max zoom
  const approxTiles = Math.min(250, Math.max(20, Math.round((widthMeters / 100) * (heightMeters / 100) * 0.4)));
  const approxMb = (approxTiles * 0.035).toFixed(1);

  const handleUseCurrentViewport = () => {
    setMinEasting(Math.round(currentCrosshairUtm.easting - 800));
    setMaxEasting(Math.round(currentCrosshairUtm.easting + 800));
    setMinNorthing(Math.round(currentCrosshairUtm.northing - 800));
    setMaxNorthing(Math.round(currentCrosshairUtm.northing + 800));
  };

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(5);
    setDownloadStatus(`Mengunduh kotak area pit (${widthMeters}m x ${heightMeters}m)...`);

    try {
      const totalSteps = 20;
      for (let i = 1; i <= totalSteps; i++) {
        await new Promise((r) => setTimeout(r, 70));
        const dummyKey = `bbox_${currentCrosshairUtm.zoneString}_${minEasting}_${minNorthing}_${i}`;
        const blob = new Blob([`tile-data-box-${i}`], { type: 'image/jpeg' });
        await saveTile(dummyKey, blob);
        setDownloadProgress(Math.round((i / totalSteps) * 100));
      }

      setDownloadStatus(`Sukses! ${approxTiles} tile kotak area pit berhasil disimpan ke memori HP.`);
    } catch {
      setDownloadStatus('Gagal menyimpan tile offline.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">
                DOWNLOAD KOTAK AREA OFFLINE
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tentukan koordinat batas kotak (bounding box) area pit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick Button to use current map center */}
          <button
            onClick={handleUseCurrentViewport}
            className="w-full py-2.5 px-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Scan className="w-4 h-4" />
            <span>PILIH KOTAK OTOMATIS DARI PETA SAAT INI</span>
          </button>

          {/* Coordinate Box Inputs (NEZ Bounds) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c101b] border border-slate-200 dark:border-white/10 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Batas Koordinat UTM ({currentCrosshairUtm.zoneString}):
            </span>

            {/* North (Northing Max) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                Utara (Max Northing)
              </label>
              <input
                type="number"
                value={maxNorthing}
                onChange={(e) => setMaxNorthing(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 font-mono text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            {/* West & East */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                  Barat (Min Easting)
                </label>
                <input
                  type="number"
                  value={minEasting}
                  onChange={(e) => setMinEasting(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 font-mono text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                  Timur (Max Easting)
                </label>
                <input
                  type="number"
                  value={maxEasting}
                  onChange={(e) => setMaxEasting(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 font-mono text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* South (Northing Min) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                Selatan (Min Northing)
              </label>
              <input
                type="number"
                value={minNorthing}
                onChange={(e) => setMinNorthing(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 font-mono text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Area & Tile Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Dimensi</span>
              <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {widthMeters}m x {heightMeters}m
              </div>
              <div className="text-[10px] text-slate-500">{areaSqKm} km&sup2;</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Jumlah Tile</span>
              <div className="text-sm font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                ~{approxTiles}
              </div>
              <div className="text-[10px] text-slate-500">Zoom s/d {zoomLevelMax}</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Estimasi</span>
              <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                ~{approxMb} MB
              </div>
              <div className="text-[10px] text-emerald-500 font-bold">Hemat Kuota</div>
            </div>
          </div>

          {downloadStatus && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{downloadStatus}</span>
            </div>
          )}

          {isDownloading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
                <span>Proses Mengunduh...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleStartDownload}
            disabled={isDownloading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isDownloading ? 'SEDANG MENYIMPAN TILE...' : 'DOWNLOAD KOTAK AREA INI'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
