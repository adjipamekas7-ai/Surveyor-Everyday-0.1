import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Sun,
  Moon,
  Plus,
  Trash2,
  Info,
  Check,
  Tag,
  Layers,
  ChevronRight,
  ArrowLeft,
  Ruler,
  Compass,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, CoordinateSystemType, UnitSystem, AppTheme } from '../types/survey';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
}

type SettingsSubPage =
  | 'unit'
  | 'decimal'
  | 'coordinate'
  | 'elevation'
  | 'theme'
  | 'codes'
  | 'about'
  | null;

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
}) => {
  const [activeSubPage, setActiveSubPage] = useState<SettingsSubPage>(null);
  const [newPointCode, setNewPointCode] = useState('');
  const [newLineCode, setNewLineCode] = useState('');
  const [newAreaCode, setNewAreaCode] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const showSaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleAddPointCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPointCode.trim().toUpperCase();
    if (trimmed && !settings.customPointCodes.includes(trimmed)) {
      onUpdateSettings({
        customPointCodes: [...settings.customPointCodes, trimmed],
      });
      setNewPointCode('');
      showSaved();
    }
  };

  const handleDeletePointCode = (code: string) => {
    onUpdateSettings({
      customPointCodes: settings.customPointCodes.filter((c) => c !== code),
    });
    showSaved();
  };

  const handleAddLineCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLineCode.trim().toUpperCase();
    if (trimmed && !settings.customLineCodes.includes(trimmed)) {
      onUpdateSettings({
        customLineCodes: [...settings.customLineCodes, trimmed],
      });
      setNewLineCode('');
      showSaved();
    }
  };

  const handleDeleteLineCode = (code: string) => {
    onUpdateSettings({
      customLineCodes: settings.customLineCodes.filter((c) => c !== code),
    });
    showSaved();
  };

  const handleAddAreaCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAreaCode.trim().toUpperCase();
    if (trimmed && !settings.customAreaCodes.includes(trimmed)) {
      onUpdateSettings({
        customAreaCodes: [...settings.customAreaCodes, trimmed],
      });
      setNewAreaCode('');
      showSaved();
    }
  };

  const handleDeleteAreaCode = (code: string) => {
    onUpdateSettings({
      customAreaCodes: settings.customAreaCodes.filter((c) => c !== code),
    });
    showSaved();
  };

  // Helper label formatters
  const unitLabel = settings.unitSystem === 'metric' ? 'Metrik (SI: m, Ha)' : 'Imperial (US: ft, Acre)';
  const decimalLabel = `${settings.decimalPlaces} Desimal (${settings.decimalPlaces === 3 ? 'Milimeter Standard' : `${settings.decimalPlaces} Digit`})`;
  const coordLabel =
    settings.coordinateSystem === 'utm'
      ? 'UTM WGS84 (NEZ)'
      : settings.coordinateSystem === 'geographic'
      ? 'Geografis (Lat/Lon)'
      : 'DMS (Derajat Menit Detik)';
  const elevationLabel =
    settings.elevationOffset >= 0
      ? `+${settings.elevationOffset.toFixed(3)} m`
      : `${settings.elevationOffset.toFixed(3)} m`;
  const themeLabel = settings.theme === 'light' ? 'Terang (Fresh Biru)' : 'Gelap (Dark Pit)';
  const codesLabel = `${settings.customPointCodes.length} Titik, ${settings.customLineCodes.length} Garis, ${settings.customAreaCodes.length} Area`;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 p-4 sm:p-6 pb-24 space-y-4">
      {/* ========================================================
          MASTER VIEW (List Menu Pengaturan yang Ringkas & Rapi)
          ======================================================== */}
      {activeSubPage === null && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span>PENGATURAN</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih menu di bawah untuk mengatur konfigurasi aplikasi
              </p>
            </div>

            {savedNotice && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
                <Check className="w-3.5 h-3.5" /> Tersimpan
              </span>
            )}
          </div>

          {/* Group 1: Sistem Geodetik & Ukur */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 ml-2">
              SISTEM UKUR & KOORDINAT
            </span>
            <div className="bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5 shadow-sm">
              {/* Item: Sistem Proyeksi Koordinat */}
              <button
                onClick={() => setActiveSubPage('coordinate')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Sistem Proyeksi Koordinat
                    </div>
                    <div className="text-[11px] text-slate-500">
                      UTM WGS84 (NEZ), Geografis, atau DMS
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {coordLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Item: Presisi Angka Desimal */}
              <button
                onClick={() => setActiveSubPage('decimal')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Format Presisi Desimal
                    </div>
                    <div className="text-[11px] text-slate-500">
                      2, 3 (milimeter), atau 4 angka di belakang koma
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {decimalLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Item: Satuan Unit */}
              <button
                onClick={() => setActiveSubPage('unit')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Sistem Satuan Unit
                    </div>
                    <div className="text-[11px] text-slate-500">Metrik (Meter, Ha) atau Imperial</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {unitLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Item: Koreksi Elevasi Z */}
              <button
                onClick={() => setActiveSubPage('elevation')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Koreksi Elevasi Z (Offset Pole)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tinggi tongkat prisma atau antena GPS
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {elevationLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>
          </div>

          {/* Group 2: Fitur & Tampilan */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 ml-2">
              KUSTOMISASI & TAMPILAN
            </span>
            <div className="bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5 shadow-sm">
              {/* Item: Tema Tampilan */}
              <button
                onClick={() => setActiveSubPage('theme')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-500 flex items-center justify-center shrink-0">
                    {settings.theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Tema Aplikasi
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Terang Fresh Biru atau Gelap Dark Pit
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {themeLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Item: Kamus Kode Tambang */}
              <button
                onClick={() => setActiveSubPage('codes')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Kamus Kode & Fitur Tambang
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Kelola kode titik, garis, dan area/poligon
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {codesLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Item: Tentang Aplikasi */}
              <button
                onClick={() => setActiveSubPage('about')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Tentang Aplikasi
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Versi 2.0.0, spesifikasi teknis & offline
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">v2.0.0</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-PAGE 1: SISTEM PROYEKSI KOORDINAT
          ======================================================== */}
      {activeSubPage === 'coordinate' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              onClick={() => setActiveSubPage(null)}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Sistem Proyeksi Koordinat
              </h2>
              <p className="text-[11px] text-slate-500">Pilih format pembacaan koordinat di lapangan</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'utm' as CoordinateSystemType,
                title: 'UTM WGS84 (NEZ) - Standard Tambang',
                desc: 'Universal Transverse Mercator format Northing, Easting, dan Z Elevasi. Standard wajib pertambangan Indonesia (Kalimantan 50S, Sumatera 48S).',
              },
              {
                id: 'geographic' as CoordinateSystemType,
                title: 'Geografis Desimal (Latitude / Longitude)',
                desc: 'Derajat desimal (e.g. -3.123456°, 115.987654°). Digunakan untuk integrasi data GIS regional.',
              },
              {
                id: 'dms' as CoordinateSystemType,
                title: 'DMS (Derajat Menit Detik)',
                desc: 'Format tradisional GPS (e.g. 03°07\'24.4"S 115°59\'15.5"E).',
              },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onUpdateSettings({ coordinateSystem: item.id });
                  showSaved();
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between ${
                  settings.coordinateSystem === item.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726]'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{item.title}</span>
                    {settings.coordinateSystem === item.id && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-600 text-white font-mono">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
                {settings.coordinateSystem === item.id && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 ml-3 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-PAGE 2: FORMAT PRESISI DESIMAL
          ======================================================== */}
      {activeSubPage === 'decimal' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              onClick={() => setActiveSubPage(null)}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Presisi Angka di Belakang Koma
              </h2>
              <p className="text-[11px] text-slate-500">Menentukan tingkat akurasi tampilan angka koordinat</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                digits: 3,
                title: '3 Desimal (Presisi Milimeter) - RECOMMENDED',
                desc: 'Standard utama juru ukur tambang. Angka koordinat ditampilkan hingga milimeter (0.001 m).',
                sample: 'E 307284.125 • N 9649781.450',
              },
              {
                digits: 2,
                title: '2 Desimal (Presisi Sentimeter)',
                desc: 'Cocok untuk pengukuran volume stockpile atau batas pit yang lebih sederhana (0.01 m).',
                sample: 'E 307284.13 • N 9649781.45',
              },
              {
                digits: 4,
                title: '4 Desimal (Sub-Milimeter)',
                desc: 'Akurasi sangat tinggi untuk pemantauan pergerakan lereng / slope monitoring prism.',
                sample: 'E 307284.1250 • N 9649781.4500',
              },
            ].map((item) => (
              <div
                key={item.digits}
                onClick={() => {
                  onUpdateSettings({ decimalPlaces: item.digits });
                  showSaved();
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between ${
                  settings.decimalPlaces === item.digits
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726]'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                  <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold pt-1">
                    Contoh: {item.sample}
                  </div>
                </div>
                {settings.decimalPlaces === item.digits && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 ml-3 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-PAGE 3: SISTEM SATUAN UNIT
          ======================================================== */}
      {activeSubPage === 'unit' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              onClick={() => setActiveSubPage(null)}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Sistem Satuan Unit
              </h2>
              <p className="text-[11px] text-slate-500">Satuan pengukuran jarak, panjang jalan, dan luas area</p>
            </div>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => {
                onUpdateSettings({ unitSystem: 'metric' });
                showSaved();
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between ${
                settings.unitSystem === 'metric'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 shadow-sm'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726]'
              }`}
            >
              <div>
                <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                  Sistem Metrik Internasional (SI) - Standard
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Jarak dalam Meter (m) & Kilometer (km), Luas dalam Meter Persegi (m&sup2;) dan Hektar (Ha).
                </div>
              </div>
              {settings.unitSystem === 'metric' && (
                <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
              )}
            </div>

            <div
              onClick={() => {
                onUpdateSettings({ unitSystem: 'imperial' });
                showSaved();
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between ${
                settings.unitSystem === 'imperial'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 shadow-sm'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726]'
              }`}
            >
              <div>
                <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                  Sistem Imperial (US Customary)
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Jarak dalam Kaki (ft) & Miles (mi), Luas dalam sq ft dan Acre (ac).
                </div>
              </div>
              {settings.unitSystem === 'imperial' && (
                <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-PAGE 4: KOREKSI ELEVASI Z (OFFSET POLE)
          ======================================================== */}
      {activeSubPage === 'elevation' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              onClick={() => setActiveSubPage(null)}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Koreksi Elevasi Z (Offset Pole)
              </h2>
              <p className="text-[11px] text-slate-500">Penyesuaian tinggi tongkat prisma atau antena geodetik</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-4">
            <div className="text-center py-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                NILAI OFFSET SAAT INI
              </span>
              <div className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                {settings.elevationOffset >= 0 ? `+${settings.elevationOffset.toFixed(3)}` : settings.elevationOffset.toFixed(3)} Meter
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed text-center max-w-md mx-auto">
              Nilai offset ini akan otomatis ditambahkan ke pembacaan elevasi Z seluruh titik ukur untuk mengoreksi tinggi jangkauan alat.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  onUpdateSettings({ elevationOffset: settings.elevationOffset - 0.5 });
                  showSaved();
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 font-mono text-xs font-bold hover:bg-slate-200"
              >
                -0.5m
              </button>
              <button
                onClick={() => {
                  onUpdateSettings({ elevationOffset: settings.elevationOffset - 0.1 });
                  showSaved();
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 font-mono text-xs font-bold hover:bg-slate-200"
              >
                -0.1m
              </button>
              <input
                type="number"
                step="0.01"
                value={settings.elevationOffset}
                onChange={(e) => {
                  onUpdateSettings({ elevationOffset: parseFloat(e.target.value) || 0 });
                  showSaved();
                }}
                className="w-28 px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-mono text-center text-sm font-bold"
              />
              <button
                onClick={() => {
                  onUpdateSettings({ elevationOffset: settings.elevationOffset + 0.1 });
                  showSaved();
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 font-mono text-xs font-bold hover:bg-slate-200"
              >
                +0.1m
              </button>
              <button
                onClick={() => {
                  onUpdateSettings({ elevationOffset: settings.elevationOffset + 0.5 });
                  showSaved();
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 font-mono text-xs font-bold hover:bg-slate-200"
              >
                +0.5m
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  onUpdateSettings({ elevationOffset: 0 });
                  showSaved();
                }}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition underline"
              >
                Reset ke 0.000 Meter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-PAGE 5: TEMA TAMPILAN
          ======================================================== */}
      {activeSubPage === 'theme' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              onClick={() => setActiveSubPage(null)}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Tema Tampilan Aplikasi
              </h2>
              <p className="text-[11px] text-slate-500">Pilih skema warna yang nyaman untuk kondisi lapangan Anda</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => {
                onUpdateSettings({ theme: 'light' });
                showSaved();
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                settings.theme === 'light'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-md'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Sun className="w-5 h-5 stroke-[2.5]" />
                </div>
                {settings.theme === 'light' && <Check className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">Tema Terang (Fresh Biru)</div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sangat jelas dan kontras tinggi di bawah terik sinar matahari tambang terbuka (open pit).
                </p>
              </div>
            </div>

            <div
              onClick={() => {
                onUpdateSettings({ theme: 'dark' });
                showSaved();
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                settings.theme === 'dark'
                  ? 'border-blue-500 bg-blue-950/60 text-white shadow-md'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-900/60 text-blue-400 flex items-center justify-center">
                  <Moon className="w-5 h-5 stroke-[2.5]" />
                </div>
                {settings.theme === 'dark' && <Check className="w-5 h-5 text-blue-400" />}
              </div>
              <div>
                <div className="text-sm font-extrabold text-white">Tema Gelap (Dark Pit)</div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Hemat baterai smartphone dan nyaman digunakan pada shift malam tambang atau dalam ruangan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-PAGE 6: KAMUS KODE & FITUR TAMBANG
          ======================================================== */}
      {activeSubPage === 'codes' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              onClick={() => setActiveSubPage(null)}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Kamus Kode & Fitur Tambang
              </h2>
              <p className="text-[11px] text-slate-500">Kustomisasi kode titik, garis, dan area</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Point Codes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                Kode Fitur Titik (Point Codes):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {settings.customPointCodes.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold"
                  >
                    <span>{c}</span>
                    <button
                      onClick={() => handleDeletePointCode(c)}
                      className="hover:text-red-500 transition ml-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddPointCode} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Kode titik baru (e.g. DRILL_HOLE)"
                  value={newPointCode}
                  onChange={(e) => setNewPointCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>
            </div>

            {/* Line Codes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                Kode Fitur Garis (Line Codes):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {settings.customLineCodes.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold"
                  >
                    <span>{c}</span>
                    <button
                      onClick={() => handleDeleteLineCode(c)}
                      className="hover:text-red-500 transition ml-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddLineCode} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Kode garis baru (e.g. PIT_SLOPE)"
                  value={newLineCode}
                  onChange={(e) => setNewLineCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>
            </div>

            {/* Area Codes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 space-y-2.5">
              <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                Kode Fitur Area / Poligon (Area Codes):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {settings.customAreaCodes.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold"
                  >
                    <span>{c}</span>
                    <button
                      onClick={() => handleDeleteAreaCode(c)}
                      className="hover:text-red-500 transition ml-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddAreaCode} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Kode area baru (e.g. ROM_STOCKPILE)"
                  value={newAreaCode}
                  onChange={(e) => setNewAreaCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-PAGE 7: TENTANG APLIKASI
          ======================================================== */}
      {activeSubPage === 'about' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              onClick={() => setActiveSubPage(null)}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Tentang Surveyor Everyday
              </h2>
              <p className="text-[11px] text-slate-500">Spesifikasi aplikasi dan standar pertambangan</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-3 text-xs leading-relaxed">
            <div className="flex items-center gap-2 font-black text-sm text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>Surveyor Everyday - Mining Field Edition</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Aplikasi pemetaan dan survey lapangan pertambangan presisi tinggi yang dirancang khusus untuk memenuhi standar surveyor tambang, geologist, dan geotechnical engineer di Indonesia.
            </p>

            <div className="pt-2 text-[11px] text-slate-500 space-y-1.5 font-mono border-t border-slate-100 dark:border-white/5">
              <div>&bull; <strong>Versi:</strong> 2.0.0 (Mining Edition)</div>
              <div>&bull; <strong>Sistem Proyeksi:</strong> Universal Transverse Mercator (UTM) WGS84</div>
              <div>&bull; <strong>Format Koordinat:</strong> NEZ (Northing, Easting, Z Elevasi) 3 Desimal</div>
              <div>&bull; <strong>Arsitektur:</strong> Offline-First Progressive Web App (PWA)</div>
              <div>&bull; <strong>Kompatibilitas CAD:</strong> AutoCAD DXF R12, Google Earth KML, CSV</div>
              <div>&bull; <strong>Keamanan Data:</strong> Tersimpan 100% lokal di memori HP Anda</div>
            </div>

            {/* Attribution & Data Credits (Moved from map view as requested) */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
              <span className="font-extrabold text-[11px] text-slate-900 dark:text-white uppercase tracking-wider block">
                Kredit & Sumber Data Peta (Attribution)
              </span>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed">
                <div>
                  &bull; <strong>Citra Satelit Lapangan:</strong> Powered by Esri &bull; Sources: Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community.
                </div>
                <div>
                  &bull; <strong>Peta Topografi & Kontur:</strong> OpenTopoMap (CC-BY-SA 3.0), SRTM Data.
                </div>
                <div>
                  &bull; <strong>Peta Jalan & Batas:</strong> &copy; OpenStreetMap contributors (ODbL).
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-center">
              <button
                onClick={onResetSettings}
                className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                Reset Semua Pengaturan ke Standar Awal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
