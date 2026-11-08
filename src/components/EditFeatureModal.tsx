import React, { useState, useEffect } from 'react';
import { X, Check, Edit3, Palette, Layers, Hash } from 'lucide-react';
import { SurveyPoint, SurveyLine, SurveyPolygon, AppSettings } from '../types/survey';
import { utmToLatLng, latLngToUtm } from '../utils/utm';

export type EditableFeature =
  | { type: 'point'; data: SurveyPoint }
  | { type: 'line'; data: SurveyLine }
  | { type: 'polygon'; data: SurveyPolygon };

interface EditFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: EditableFeature | null;
  settings: AppSettings;
  onSavePoint: (updatedPoint: SurveyPoint) => void;
  onSaveLine: (updatedLine: SurveyLine) => void;
  onSavePolygon: (updatedPolygon: SurveyPolygon) => void;
}

const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#0284c7', // Sky
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#64748b', // Slate
  '#ffffff', // White
];

export const EditFeatureModal: React.FC<EditFeatureModalProps> = ({
  isOpen,
  onClose,
  feature,
  settings,
  onSavePoint,
  onSaveLine,
  onSavePolygon,
}) => {
  if (!isOpen || !feature) return null;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [description, setDescription] = useState('');

  // Point coordinates
  const [easting, setEasting] = useState('');
  const [northing, setNorthing] = useState('');
  const [elevation, setElevation] = useState('');

  useEffect(() => {
    if (feature.type === 'point') {
      setName(feature.data.name);
      setCode(feature.data.code);
      setColor(feature.data.color || '#2563eb');
      setDescription(feature.data.description || '');
      setEasting(feature.data.utm.easting.toFixed(settings.decimalPlaces));
      setNorthing(feature.data.utm.northing.toFixed(settings.decimalPlaces));
      setElevation(feature.data.utm.elevation.toFixed(settings.decimalPlaces));
    } else if (feature.type === 'line') {
      setName(feature.data.name);
      setCode(feature.data.code);
      setColor(feature.data.color || '#3b82f6');
      setDescription(feature.data.description || '');
    } else if (feature.type === 'polygon') {
      setName(feature.data.name);
      setCode(feature.data.code);
      setColor(feature.data.color || '#0284c7');
      setDescription(feature.data.description || '');
    }
  }, [feature, settings.decimalPlaces]);

  const handleSave = () => {
    if (feature.type === 'point') {
      const eVal = parseFloat(easting) || feature.data.utm.easting;
      const nVal = parseFloat(northing) || feature.data.utm.northing;
      const zVal = parseFloat(elevation) || feature.data.utm.elevation;
      const zoneNum = feature.data.utm.zone;
      const hemi = feature.data.utm.hemisphere;

      const converted = utmToLatLng(eVal, nVal, zoneNum, hemi);
      const updatedUtm = latLngToUtm(converted.lat, converted.lng, zVal, zoneNum, hemi);

      const updated: SurveyPoint = {
        ...feature.data,
        name: name.trim() || feature.data.name,
        code: code.trim() || feature.data.code,
        color,
        description,
        lat: converted.lat,
        lng: converted.lng,
        utm: updatedUtm,
      };
      onSavePoint(updated);
    } else if (feature.type === 'line') {
      const updated: SurveyLine = {
        ...feature.data,
        name: name.trim() || feature.data.name,
        code: code.trim() || feature.data.code,
        color,
        description,
      };
      onSaveLine(updated);
    } else if (feature.type === 'polygon') {
      const updated: SurveyPolygon = {
        ...feature.data,
        name: name.trim() || feature.data.name,
        code: code.trim() || feature.data.code,
        color,
        fillColor: color,
        description,
      };
      onSavePolygon(updated);
    }

    onClose();
  };

  const availableCodes =
    feature.type === 'point'
      ? settings.customPointCodes
      : feature.type === 'line'
      ? settings.customLineCodes
      : settings.customAreaCodes;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#111726] border border-blue-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Edit {feature.type === 'point' ? 'Titik (Point)' : feature.type === 'line' ? 'Garis (Line)' : 'Area / Poligon'}
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">ID: {feature.data.id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Name Field */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Nama Fitur / ID Lapangan
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Feature Code Selector */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Kode / Kategori Tambang
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {availableCodes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCode(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                    code === c
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Atau ketik kode kustom"
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-mono text-xs uppercase"
            />
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Warna Simbol di Peta
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-black dark:border-white shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Coordinate Editing for Points */}
          {feature.type === 'point' && (
            <div className="p-3 bg-blue-50/60 dark:bg-black/40 rounded-2xl border border-blue-200 dark:border-white/10 space-y-2">
              <span className="font-extrabold text-[10px] text-blue-700 dark:text-blue-300 uppercase block tracking-wider">
                Koordinat Presisi UTM WGS84 ({feature.data.utm.zoneString})
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold">
                    Easting (X)
                  </label>
                  <input
                    type="number"
                    value={easting}
                    onChange={(e) => setEasting(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-black/60 border border-slate-300 dark:border-white/10 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold">
                    Northing (Y)
                  </label>
                  <input
                    type="number"
                    value={northing}
                    onChange={(e) => setNorthing(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-black/60 border border-slate-300 dark:border-white/10 font-mono text-xs font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-[9px] uppercase font-bold">
                  Elevasi Z (MDPL)
                </label>
                <input
                  type="number"
                  value={elevation}
                  onChange={(e) => setElevation(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-black/60 border border-slate-300 dark:border-white/10 font-mono text-xs font-bold"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Keterangan / Catatan Lapangan
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan surveyor, kondisi lereng, atau nomor bench..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0c101b] flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>SIMPAN PERUBAHAN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
