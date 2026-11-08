import React, { useState } from 'react';
import { X, MapPin, Share2, Square, Navigation, Target, Edit3 } from 'lucide-react';
import { UTMCoordinate, AppSettings } from '../types/survey';
import { utmToLatLng } from '../utils/utm';

interface SurveyPlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  crosshairUtm: UTMCoordinate;
  gpsUtm: UTMCoordinate | null;
  settings: AppSettings;
  onSavePoint: (data: {
    name: string;
    code: string;
    elevation: number;
    description: string;
    source: 'crosshair' | 'gps' | 'manual';
    manualCoords?: { easting: number; northing: number; zone: number; hemisphere: 'N' | 'S' };
  }) => void;
  onStartPlotting: (type: 'line' | 'polygon', name: string, code: string) => void;
}

export const SurveyPlotModal: React.FC<SurveyPlotModalProps> = ({
  isOpen,
  onClose,
  crosshairUtm,
  gpsUtm,
  settings,
  onSavePoint,
  onStartPlotting,
}) => {
  const [activeTab, setActiveTab] = useState<'point' | 'line' | 'polygon'>('point');
  const [pointSource, setPointSource] = useState<'crosshair' | 'gps' | 'manual'>('crosshair');

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState(settings.customPointCodes[0] || 'CREST');
  const [elevation, setElevation] = useState<string>('140.000');
  const [description, setDescription] = useState('');

  // Manual NEZ inputs
  const [manualEasting, setManualEasting] = useState<string>(crosshairUtm.easting.toFixed(3));
  const [manualNorthing, setManualNorthing] = useState<string>(crosshairUtm.northing.toFixed(3));
  const [manualZone, setManualZone] = useState<string>(crosshairUtm.zoneString);

  if (!isOpen) return null;

  const handlePointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ptName = name.trim() || `PT_${Date.now().toString().slice(-4)}`;
    const elev = parseFloat(elevation) || crosshairUtm.elevation || 0;

    if (pointSource === 'manual') {
      const eVal = parseFloat(manualEasting);
      const nVal = parseFloat(manualNorthing);
      const zoneNum = parseInt(manualZone) || crosshairUtm.zone;
      const hemi = (manualZone.slice(-1).toUpperCase() === 'N' ? 'N' : 'S') as 'N' | 'S';

      if (isNaN(eVal) || isNaN(nVal)) {
        alert('Mohon masukkan koordinat Easting dan Northing yang valid.');
        return;
      }

      onSavePoint({
        name: ptName,
        code,
        elevation: elev,
        description,
        source: 'manual',
        manualCoords: { easting: eVal, northing: nVal, zone: zoneNum, hemisphere: hemi },
      });
    } else {
      onSavePoint({
        name: ptName,
        code,
        elevation: elev,
        description,
        source: pointSource,
      });
    }

    setName('');
    setDescription('');
    onClose();
  };

  const handleLineStart = (e: React.FormEvent) => {
    e.preventDefault();
    const lineName = name.trim() || `LINE_${Date.now().toString().slice(-4)}`;
    onStartPlotting('line', lineName, code);
    setName('');
    onClose();
  };

  const handlePolygonStart = (e: React.FormEvent) => {
    e.preventDefault();
    const polyName = name.trim() || `AREA_${Date.now().toString().slice(-4)}`;
    onStartPlotting('polygon', polyName, code);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">
              ALAT SURVEY & PLOTTING
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih mode perekaman data lapangan tambang
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 dark:bg-[#0b0f17] border-b border-slate-200 dark:border-white/10 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('point');
              setCode(settings.customPointCodes[0] || 'CREST');
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'point'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Plot Titik</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('line');
              setCode(settings.customLineCodes[0] || 'CREST_LINE');
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'line'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Plot Garis</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('polygon');
              setCode(settings.customAreaCodes[0] || 'BLAST_AREA');
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'polygon'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Square className="w-4 h-4" />
            <span>Plot Area</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto">
          {/* TAB 1: PLOT TITIK */}
          {activeTab === 'point' && (
            <form onSubmit={handlePointSubmit} className="space-y-4">
              {/* Point Coordinate Source (3 options: Target, GPS, Manual NEZ) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Metode Penentuan Koordinat
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPointSource('crosshair')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      pointSource === 'crosshair'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Target className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                    <div className="text-[11px] leading-tight">Target Layar</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPointSource('gps')}
                    disabled={!gpsUtm}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      pointSource === 'gps'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    } ${!gpsUtm ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Navigation className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                    <div className="text-[11px] leading-tight">GPS Aktual</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPointSource('manual')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      pointSource === 'manual'
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 font-bold'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
                    <div className="text-[11px] leading-tight">Input Manual</div>
                  </button>
                </div>
              </div>

              {/* Manual NEZ Input Fields */}
              {pointSource === 'manual' ? (
                <div className="p-3.5 bg-blue-50/50 dark:bg-[#0c101b] border border-blue-200 dark:border-white/10 rounded-2xl space-y-2.5">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block uppercase">
                    Input Manual Koordinat UTM WGS84:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Easting (X / Timur)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={manualEasting}
                        onChange={(e) => setManualEasting(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/60 border border-slate-300 dark:border-white/15 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Northing (Y / Utara)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={manualNorthing}
                        onChange={(e) => setManualNorthing(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/60 border border-slate-300 dark:border-white/15 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Zona UTM (e.g. 50S, 48S)
                      </label>
                      <input
                        type="text"
                        value={manualZone}
                        onChange={(e) => setManualZone(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/60 border border-slate-300 dark:border-white/15 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Auto Coordinate Preview */
                <div className="p-3 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl font-mono text-xs">
                  <div className="text-slate-500 text-[10px] font-sans font-bold uppercase mb-1">
                    Koordinat {pointSource === 'gps' ? 'GPS' : 'Target'} ({crosshairUtm.zoneString}):
                  </div>
                  <div className="text-slate-900 dark:text-white font-bold flex justify-between">
                    <span>E {crosshairUtm.easting.toFixed(settings.decimalPlaces)}</span>
                    <span>N {crosshairUtm.northing.toFixed(settings.decimalPlaces)}</span>
                  </div>
                </div>
              )}

              {/* Point Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / ID Titik
                </label>
                <input
                  type="text"
                  placeholder="e.g. CR-101, BM-02, BH-25"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Mining Code Selection (from custom codes list) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kode / Fitur Tambang
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {settings.customPointCodes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCode(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                        code === c
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Elevation / MDPL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Elevasi (MDPL / Z)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="140.000"
                  value={elevation}
                  onChange={(e) => setElevation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Remark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Crest Bench 140 Barat, batas aktif"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-blue-500/25 active:scale-98 transition hover:bg-blue-700 mt-2"
              >
                SIMPAN TITIK KE PETA
              </button>
            </form>
          )}

          {/* TAB 2: PLOT LINE */}
          {activeTab === 'line' && (
            <form onSubmit={handleLineStart} className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                Plot garis interaktif: geser target tengah layar untuk setiap vertex, panjang tiap sisi dan total jarak akan muncul seketika di peta!
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Garis / Polyline
                </label>
                <input
                  type="text"
                  placeholder="e.g. CREST_BENCH_140, HAUL_ROAD_MAIN"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Garis
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {settings.customLineCodes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCode(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                        code === c
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-blue-500/25 active:scale-98 transition hover:bg-blue-700 mt-4"
              >
                MULAI PLOT GARIS DI PETA
              </button>
            </form>
          )}

          {/* TAB 3: PLOT POLYGON / AREA */}
          {activeTab === 'polygon' && (
            <form onSubmit={handlePolygonStart} className="space-y-4">
              <div className="p-3.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl text-xs text-cyan-800 dark:text-cyan-300 leading-relaxed">
                Plot area manual: geser target tengah layar, luas area akan otomatis muncul di tengah poligon, dan panjang sisi muncul di setiap garis batas!
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Area / Poligon
                </label>
                <input
                  type="text"
                  placeholder="e.g. BLAST_BLOCK_04, PIT_EXPANSION_A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Area Tambang
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {settings.customAreaCodes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCode(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                        code === c
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-blue-500/25 active:scale-98 transition hover:bg-blue-700 mt-4"
              >
                MULAI PLOT AREA & HITUNG LUAS
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
