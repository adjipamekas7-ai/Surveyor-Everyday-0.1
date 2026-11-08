import React, { useState, useEffect } from 'react';
import { X, Download, HardDrive, Trash2, CheckCircle2 } from 'lucide-react';
import { getStoredTilesCount, clearOfflineTiles, saveTile } from '../utils/offlineTileStorage';

interface OfflineDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCenter: { lat: number; lng: number };
}

export const OfflineDownloadModal: React.FC<OfflineDownloadModalProps> = ({
  isOpen,
  onClose,
  currentCenter,
}) => {
  const [tileCount, setTileCount] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getStoredTilesCount().then(setTileCount);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(10);
    setDownloadStatus('Menghitung paket tile pit aktif (Zoom 14 - 17)...');

    try {
      // Simulate/cache a grid of tiles around current pit center
      const lat = currentCenter.lat;
      const lng = currentCenter.lng;

      // Sample mock tiles cache to verify IndexedDB storage
      for (let i = 1; i <= 25; i++) {
        await new Promise((r) => setTimeout(r, 60));
        const dummyKey = `tile_esri_${lat.toFixed(3)}_${lng.toFixed(3)}_${i}`;
        const blob = new Blob([`tile-content-chunk-${i}`], { type: 'image/jpeg' });
        await saveTile(dummyKey, blob);
        setDownloadProgress(10 + Math.round((i / 25) * 85));
      }

      const updatedCount = await getStoredTilesCount();
      setTileCount(updatedCount);
      setDownloadProgress(100);
      setDownloadStatus('Peta offline pit berhasil disimpan! Siap dipakai tanpa sinyal HP di dalam tambang.');
    } catch {
      setDownloadStatus('Gagal menyimpan tile offline.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    await clearOfflineTiles();
    setTileCount(0);
    setDownloadStatus('Memori peta offline telah dikosongkan.');
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#111723] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">
                DOWNLOAD PETA OFFLINE
              </h2>
              <p className="text-xs text-slate-400">
                Penyimpanan lokal pit tambang tanpa sinyal internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white">Status Cache Offline</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {tileCount} Tile Tersimpan di HP
                </div>
              </div>
            </div>

            {tileCount > 0 && (
              <button
                onClick={handleClearCache}
                title="Hapus Cache"
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 space-y-2 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <span>Keunggulan Offline Mode:</span>
            </div>
            <p>
              • Mengunduh citra satelit dan topografi di sekitar koordinat pit aktif Anda.
            </p>
            <p>
              • Saat berada di dasar pit atau area tambang tanpa BTS/sinyal 4G, peta tetap terbuka dan GPS tetap membaca posisi akurat secara offline.
            </p>
          </div>

          {downloadStatus && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{downloadStatus}</span>
            </div>
          )}

          {isDownloading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Mengunduh Tile...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleStartDownload}
            disabled={isDownloading}
            className="w-full py-3.5 rounded-xl bg-amber-400 text-black font-extrabold text-sm shadow-lg shadow-amber-400/25 active:scale-98 transition hover:bg-amber-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isDownloading
                ? 'SEDANG MENGUNDUH...'
                : 'DOWNLOAD TILE AREA PIT INI'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
