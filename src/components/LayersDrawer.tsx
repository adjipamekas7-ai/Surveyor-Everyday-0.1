import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Share2,
  Square,
  Layers,
  FileSpreadsheet,
  Globe,
  Edit3,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  SurveyPoint,
  SurveyLine,
  SurveyPolygon,
  GeoOverlay,
  AppSettings,
} from '../types/survey';
import { exportToDxf } from '../utils/dxf';
import { exportToKml } from '../utils/kml';
import { exportAllSurveyDataToCsv } from '../utils/csv';
import { formatDistance, formatArea } from '../utils/utm';
import { EditFeatureModal, EditableFeature } from './EditFeatureModal';
import { saveOrShareFile } from '../utils/nativeFile';

interface LayersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  points: SurveyPoint[];
  lines: SurveyLine[];
  polygons: SurveyPolygon[];
  overlays: GeoOverlay[];
  settings: AppSettings;
  onTogglePoint: (id: string) => void;
  onDeletePoint: (id: string) => void;
  onToggleLine: (id: string) => void;
  onDeleteLine: (id: string) => void;
  onTogglePolygon: (id: string) => void;
  onDeletePolygon: (id: string) => void;
  onToggleOverlay: (id: string) => void;
  onDeleteOverlay: (id: string) => void;
  onSavePoint: (updatedPoint: SurveyPoint) => void;
  onSaveLine: (updatedLine: SurveyLine) => void;
  onSavePolygon: (updatedPolygon: SurveyPolygon) => void;
  onClearAll: () => void;
}

export const LayersDrawer: React.FC<LayersDrawerProps> = ({
  isOpen,
  onClose,
  points,
  lines,
  polygons,
  overlays,
  settings,
  onTogglePoint,
  onDeletePoint,
  onToggleLine,
  onDeleteLine,
  onTogglePolygon,
  onDeletePolygon,
  onToggleOverlay,
  onDeleteOverlay,
  onSavePoint,
  onSaveLine,
  onSavePolygon,
  onClearAll,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'points' | 'lines' | 'polygons' | 'overlays'
  >('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Edit Feature State
  const [editingFeature, setEditingFeature] = useState<EditableFeature | null>(null);

  // Delete Confirmation State (Requirement: "tombol hapus harus ada konfirmasi 1x dulu")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (!isOpen) return null;

  const downloadFile = async (content: string, filename: string, type: string) => {
    try {
      await saveOrShareFile(content, filename, type);
      setExportNotice(`Berhasil: ${filename}`);
    } catch (err) {
      console.error(err);
      setExportNotice(`Gagal menyimpan: ${filename}`);
    }
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportDataCsv = () => {
    const csv = exportAllSurveyDataToCsv(
      points,
      lines,
      polygons,
      settings.elevationOffset,
      settings.decimalPlaces
    );
    downloadFile(csv, `Surveyor_Data_All_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportKml = () => {
    const kml = exportToKml(points, lines, polygons, 'Surveyor Everyday Mining Project');
    downloadFile(kml, `Surveyor_Project_${Date.now()}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  const handleExportDxf = () => {
    const dxf = exportToDxf(points, lines, polygons, settings.elevationOffset);
    downloadFile(dxf, `Surveyor_AutoCAD_${Date.now()}.dxf`, 'application/dxf');
  };

  const totalCount = points.length + lines.length + polygons.length + overlays.length;

  return (
    <>
      <div className="fixed inset-0 z-[600] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white dark:bg-[#111726] border-l border-blue-100 dark:border-white/10 h-full flex flex-col shadow-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wider uppercase">
                  DAFTAR LAYER & DATA UKUR
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {totalCount} fitur tersimpan di memori HP
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

          {/* Export Action Bar */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-[#0b0f17] border-b border-blue-100 dark:border-white/10 space-y-2">
            <div className="text-[11px] font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center justify-between">
              <span>EXPORT DATA LAPANGAN (OFFLINE)</span>
              <span className="text-[10px] text-slate-400 font-normal">CAD & GIS Ready</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleExportDataCsv}
                className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono flex flex-col items-center justify-center gap-1 active:scale-95 transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportKml}
                className="py-2.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold font-mono flex flex-col items-center justify-center gap-1 active:scale-95 transition shadow-sm"
              >
                <Globe className="w-4 h-4" />
                <span>Export KML</span>
              </button>

              <button
                onClick={handleExportDxf}
                className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono flex flex-col items-center justify-center gap-1 active:scale-95 transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export DXF</span>
              </button>
            </div>

            {exportNotice && (
              <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold animate-in fade-in">
                {exportNotice}
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-[#10141f] border-b border-slate-200 dark:border-white/5 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setActiveCategory('points')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeCategory === 'points'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Titik ({points.length})
            </button>
            <button
              onClick={() => setActiveCategory('lines')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeCategory === 'lines'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Garis ({lines.length})
            </button>
            <button
              onClick={() => setActiveCategory('polygons')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeCategory === 'polygons'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Area ({polygons.length})
            </button>
            <button
              onClick={() => setActiveCategory('overlays')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeCategory === 'overlays'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Overlay ({overlays.length})
            </button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {totalCount === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada data ukur. Gunakan tombol pensil di peta untuk mulai merekam.
              </div>
            ) : null}

            {/* Points list */}
            {(activeCategory === 'all' || activeCategory === 'points') &&
              points.map((pt) => {
                const isConfirming = confirmDeleteId === pt.id;

                return (
                  <div
                    key={pt.id}
                    className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col gap-2 text-xs hover:border-blue-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-sm"
                          style={{ backgroundColor: pt.color }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{pt.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono font-bold">
                              {pt.code}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {pt.utm.zoneString} E {pt.utm.easting.toFixed(settings.decimalPlaces)} &bull;{' '}
                            N {pt.utm.northing.toFixed(settings.decimalPlaces)}
                          </div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                            Z {(pt.utm.elevation + settings.elevationOffset).toFixed(settings.decimalPlaces)} MDPL
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingFeature({ type: 'point', data: pt })}
                          title="Edit Titik"
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button with 1-step confirmation */}
                        <button
                          onClick={() => setConfirmDeleteId(pt.id)}
                          title="Hapus Titik"
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 1-Step Delete Confirmation Banner */}
                    {isConfirming && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-between animate-in fade-in">
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-300">
                          Hapus titik ini secara permanen?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => {
                              onDeletePoint(pt.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-extrabold shadow-sm"
                          >
                            Ya, Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Lines list */}
            {(activeCategory === 'all' || activeCategory === 'lines') &&
              lines.map((ln) => {
                const isConfirming = confirmDeleteId === ln.id;

                return (
                  <div
                    key={ln.id}
                    className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col gap-2 text-xs hover:border-blue-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2.5">
                        <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{ln.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono font-bold">
                              {ln.code}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                            Panjang: {formatDistance(ln.totalLengthMeters)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {ln.vertices.length} vertices ({ln.segments.length} segmen)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingFeature({ type: 'line', data: ln })}
                          title="Edit Garis"
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(ln.id)}
                          title="Hapus Garis"
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-between animate-in fade-in">
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-300">
                          Hapus garis ini secara permanen?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => {
                              onDeleteLine(ln.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-extrabold shadow-sm"
                          >
                            Ya, Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Polygons list */}
            {(activeCategory === 'all' || activeCategory === 'polygons') &&
              polygons.map((pg) => {
                const area = formatArea(pg.areaSquareMeters);
                const isConfirming = confirmDeleteId === pg.id;

                return (
                  <div
                    key={pg.id}
                    className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col gap-2 text-xs hover:border-blue-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2.5">
                        <Square className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{pg.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                              {pg.code}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold mt-0.5">
                            Luas: {area.sqMetersStr} ({area.hectaresStr})
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Keliling: {formatDistance(pg.perimeterMeters)} &bull; {pg.vertices.length} titik
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingFeature({ type: 'polygon', data: pg })}
                          title="Edit Area"
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(pg.id)}
                          title="Hapus Area"
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-between animate-in fade-in">
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-300">
                          Hapus area ini secara permanen?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => {
                              onDeletePolygon(pg.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-extrabold shadow-sm"
                          >
                            Ya, Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Overlays list */}
            {(activeCategory === 'all' || activeCategory === 'overlays') &&
              overlays.map((ov) => {
                const isConfirming = confirmDeleteId === ov.id;

                return (
                  <div
                    key={ov.id}
                    className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col gap-2 text-xs hover:border-blue-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{ov.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Tipe: {ov.type.toUpperCase()} &bull; Transparansi: {Math.round(ov.opacity * 100)}%
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleOverlay(ov.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        >
                          {ov.visible ? (
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(ov.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-between animate-in fade-in">
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-300">
                          Hapus overlay peta ini?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => {
                              onDeleteOverlay(ov.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-extrabold shadow-sm"
                          >
                            Ya, Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Clear All Footer */}
          {totalCount > 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f17]">
              {!confirmClearAll ? (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Semua Data Ukur</span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Yakin ingin menghapus SELURUH titik, garis, dan area?</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      className="flex-1 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        onClearAll();
                        setConfirmClearAll(false);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black shadow"
                    >
                      Ya, Bersihkan Semua
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Feature Modal */}
      <EditFeatureModal
        isOpen={Boolean(editingFeature)}
        onClose={() => setEditingFeature(null)}
        feature={editingFeature}
        settings={settings}
        onSavePoint={onSavePoint}
        onSaveLine={onSaveLine}
        onSavePolygon={onSavePolygon}
      />
    </>
  );
};
