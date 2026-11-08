import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  Compass,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Share2,
  Square,
  FileUp,
  Download,
  RefreshCw,
  Sun,
  ChevronRight,
  ArrowLeft,
  FolderOpen,
} from 'lucide-react';
import { MiningWeatherReport, fetchMiningWeather } from '../utils/weather';
import { SurveyProject } from '../types/survey';

interface HomeWeatherTabProps {
  project: SurveyProject;
  currentCenter: { lat: number; lng: number };
  onNavigateToMap: () => void;
  onNavigateToCompass: () => void;
  onOpenImportOverlay: () => void;
  onOpenLayers: () => void;
  onBackToProjects: () => void;
}

export const HomeWeatherTab: React.FC<HomeWeatherTabProps> = ({
  project,
  currentCenter,
  onNavigateToMap,
  onNavigateToCompass,
  onOpenImportOverlay,
  onOpenLayers,
  onBackToProjects,
}) => {
  const [weather, setWeather] = useState<MiningWeatherReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWeather = async () => {
    setLoading(true);
    const data = await fetchMiningWeather(currentCenter.lat, currentCenter.lng, project.siteName);
    setWeather(data);
    setLoading(false);
  };

  useEffect(() => {
    loadWeather();
  }, [currentCenter.lat, currentCenter.lng]);

  const totalPoints = project.points.length;
  const totalLines = project.lines.length;
  const totalPolygons = project.polygons.length;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 p-4 sm:p-6 pb-24 space-y-4">
      {/* Top Project Switcher Bar (Requirement: "jika sudah masuk home, beri tombol back ke pilih project") */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={onBackToProjects}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111726] border border-blue-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pilih Project</span>
        </button>

        <span className="text-[11px] font-mono text-slate-400">
          Zona: <strong className="text-blue-600 dark:text-blue-400">{project.defaultUtmZone}</strong>
        </span>
      </div>

      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 text-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-blue-500/15 relative overflow-hidden">
        {/* Subtle background decorative rings */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              SITUS TAMBANG AKTIF &bull; {project.defaultUtmZone}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-blue-100/90 font-medium">
              {project.siteName} &bull; Proyeksi UTM WGS84
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToMap}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-extrabold text-xs shadow-md active:scale-95 transition flex items-center gap-1.5 hover:bg-blue-50"
            >
              <span>BUKA PETA</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>

      {/* Weather Forecast Card */}
      <div className="bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Perkiraan Cuaca Tambang Hari Ini
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Data real-time untuk operasional pit, hauling & blasting
              </p>
            </div>
          </div>

          <button
            onClick={loadWeather}
            title="Perbarui Cuaca"
            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {weather ? (
          <div className="space-y-4">
            {/* Primary metric strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Temp */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d121e] border border-slate-100 dark:border-white/5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Suhu Udara
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {weather.temperature}&deg;C
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Terasa {weather.apparentTemperature}&deg;C &bull; {weather.conditionText}
                </div>
              </div>

              {/* Rain Chance */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d121e] border border-slate-100 dark:border-white/5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  Peluang Hujan
                </span>
                <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                  {weather.precipitationProbability}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Curah: {weather.precipitationMm} mm
                </div>
              </div>

              {/* Wind Speed */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d121e] border border-slate-100 dark:border-white/5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-500" />
                  Kecepatan Angin
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {weather.windSpeed} <span className="text-xs font-sans">km/h</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Arah {weather.windDirection}&deg; &bull; Lembab: {weather.humidity}%
                </div>
              </div>

              {/* UV Index */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d121e] border border-slate-100 dark:border-white/5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Indeks UV
                </span>
                <div className="text-2xl font-black font-mono text-amber-500 mt-0.5">
                  {weather.uvIndex} <span className="text-xs font-sans text-slate-400">/ 11</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Jarak Pandang: {weather.visibilityKm} km
                </div>
              </div>
            </div>

            {/* Pit Safety Advisory */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                weather.pitSafetyStatus === 'NORMAL'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                  : weather.pitSafetyStatus === 'WASPADA'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300'
              }`}
            >
              {weather.pitSafetyStatus === 'NORMAL' ? (
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold uppercase tracking-wide">
                  Status Keselamatan Pit: {weather.pitSafetyStatus}
                </div>
                <div className="text-xs leading-relaxed opacity-90">
                  {weather.pitAdvisory}
                </div>
              </div>
            </div>

            {/* Hourly Trend Mini-Row */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Prakiraan Per Jam
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {weather.hourly.map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0d121e] border border-slate-100 dark:border-white/5 flex flex-col items-center min-w-[70px] text-center"
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-400">{h.time}</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white my-1">
                      {h.temp}&deg;
                    </span>
                    <span className="text-[10px] text-blue-500 font-bold font-mono">
                      {h.rainProb}% rain
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Memuat prakiraan cuaca tambang...
          </div>
        )}
      </div>

      {/* Field Survey Project Overview */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onOpenLayers}
          className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 text-center hover:border-blue-400 transition"
        >
          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {totalPoints}
          </div>
          <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Titik (Point)
          </div>
        </button>

        <button
          onClick={onOpenLayers}
          className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 text-center hover:border-blue-400 transition"
        >
          <Share2 className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {totalLines}
          </div>
          <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Garis (Line)
          </div>
        </button>

        <button
          onClick={onOpenLayers}
          className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 text-center hover:border-blue-400 transition"
        >
          <Square className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {totalPolygons}
          </div>
          <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Area (Polygon)
          </div>
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onOpenImportOverlay}
          className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 flex items-center gap-3 text-left hover:border-blue-500 transition active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
              Import PDF / DXF / KML
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Overlay peta tambang
            </div>
          </div>
        </button>

        <button
          onClick={onNavigateToCompass}
          className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 flex items-center gap-3 text-left hover:border-blue-500 transition active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
              Kompas & Klinometer
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Ukur azimuth & kemiringan lereng
            </div>
          </div>
        </button>

        <button
          onClick={onOpenLayers}
          className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 flex items-center gap-3 text-left hover:border-blue-500 transition active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
              Export CAD DXF & CSV
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Unduh hasil survey lapangan
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
