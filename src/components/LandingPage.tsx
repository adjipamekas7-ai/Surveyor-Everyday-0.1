import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Share2,
  Square,
  FileUp,
  Download,
  Gauge,
  ChevronRight,
  ShieldCheck,
  FolderPlus,
  Layers,
  Trash2,
  Edit,
  Plus,
} from 'lucide-react';
import { SurveyProject } from '../types/survey';
import { NewProjectModal } from './NewProjectModal';
import { EditProjectModal } from './EditProjectModal';

interface LandingPageProps {
  projects: SurveyProject[];
  activeProject: SurveyProject;
  onSelectProject: (id: string) => void;
  onCreateProject: (project: SurveyProject) => void;
  onEditProject: (project: SurveyProject) => void;
  onDeleteProject: (id: string) => void;
  onOpenApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onOpenApp,
}) => {
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<SurveyProject | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeTotalFeatures =
    activeProject.points.length + activeProject.lines.length + activeProject.polygons.length;

  return (
    <>
      <div className="h-full w-full bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
        {/* Top Brand Bar */}
        <header className="shrink-0 bg-white/90 dark:bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 py-2.5 z-20">
          <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <Compass className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                  SURVEYOR EVERYDAY
                </span>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 tracking-wider uppercase block font-bold">
                  ALL-IN-ONE MINE SURVEYING
                </span>
              </div>
            </div>

            <button
              onClick={onOpenApp}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-1"
            >
              <span>Buka</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 w-full overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          <main className="max-w-4xl w-full mx-auto space-y-4">
            {/* Ringkas Hero Section: All-in-One Surveyor, Geologi & Mine Plan */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>ALL-IN-ONE &bull; UTM WGS84 NEZ 3 DESIMAL &bull; OFFLINE-FIRST</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Aplikasi All-in-One <br />
                <span className="text-blue-600 dark:text-blue-400">
                  Mine Surveying
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Aplikasi untuk mempermudah pekerjaan pemetaan dan survey lapangan dengan navigasi gps, overlay peta GeoPDF, pembacaan koordinat, menghitung jarak, kemiringan, sudut, menghitung luas poligon, serta mampu import dan export berbagai format.
              </p>
            </div>

            {/* SEKSI PILIH PROJECT (Ringkas: Judul 'Pilih Project', Tombol 1 Baris, Fitur New/Edit/Hapus) */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111726] border border-blue-200 dark:border-blue-900/40 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      PILIH PROJECT
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {projects.length} Project Tersimpan
                    </span>
                  </div>
                </div>

                {/* Tombol Project Baru: 1 Baris Penuh (Simbol tunggal +) */}
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="whitespace-nowrap">Project Baru</span>
                </button>
              </div>

              {/* Daftar Project Tambang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {projects.map((proj) => {
                  const isSelected = proj.id === activeProject.id;
                  const isConfirming = confirmDeleteId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => onSelectProject(proj.id)}
                      className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 shadow-sm'
                          : 'border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 bg-slate-50/60 dark:bg-[#0c101b]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {proj.name}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-black font-mono shrink-0">
                                AKTIF
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate">
                            {proj.siteName} &bull; Zona {proj.defaultUtmZone}
                          </div>
                        </div>

                        {/* Action buttons: Edit & Hapus */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(proj);
                            }}
                            title="Edit Project"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {projects.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(proj.id);
                              }}
                              title="Hapus Project"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-200/60 dark:border-white/5 pt-1.5">
                        <span>
                          {proj.points.length} pt &bull; {proj.lines.length} ln &bull; {proj.polygons.length} area
                        </span>
                        <span>{new Date(proj.updatedAt).toLocaleDateString('id-ID')}</span>
                      </div>

                      {/* 1-Step Delete Confirmation */}
                      {isConfirming && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-0 bg-red-600 text-white rounded-2xl p-3 flex items-center justify-between z-10 animate-in fade-in"
                        >
                          <span className="text-xs font-bold">Hapus project ini?</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => {
                                onDeleteProject(proj.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 bg-white text-red-600 rounded-lg text-[10px] font-black shadow"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Card for Active Selected Project */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 text-white shadow-xl shadow-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  PROJECT AKTIF TERPILIH
                </span>
                <div className="text-base sm:text-xl font-black tracking-tight">
                  {activeProject.name}
                </div>
                <p className="text-[11px] text-blue-100/90 font-medium">
                  Site: {activeProject.siteName} &bull; Zona: {activeProject.defaultUtmZone} &bull; Datum: {activeProject.datum} ({activeTotalFeatures} fitur tersimpan)
                </p>
              </div>

              <button
                onClick={onOpenApp}
                className="relative z-10 w-full sm:w-auto px-6 py-3 rounded-xl sm:rounded-2xl bg-white text-blue-700 font-extrabold text-xs sm:text-sm tracking-wide shadow-xl active:scale-95 transition flex items-center justify-center gap-2 hover:bg-blue-50 shrink-0"
              >
                <span>BUKA PROJECT INI SEKARANG</span>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              </button>
            </div>

            {/* Core Capabilities Grid (All-in-One) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 pb-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Plot Titik Presisi Milimeter
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Plot koordinat aktual GPS, bidik target tengah layar, atau input manual koordinat NEZ (Easting, Northing, Elevasi Z).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Plot Garis & Panjang Segmen
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Merekam garis crest, toe, jalan hauling, atau drainage. Jarak tiap sisi segmen dan total panjang otomatis terhitung.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Square className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Plot Area & Luas Otomatis
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Merekam poligon blok blasting, disposal, atau settling pond. Luas otomatis muncul di tengah area dalam m&sup2; dan Hektar.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileUp className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Overlay Peta PDF Tambang
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tumpangkan dokumen peta PDF desain mine plan CAD ke atas citra satelit dengan auto-fit dan slider transparansi.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Export CAD DXF, KML & CSV
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ekspor hasil ukur ke format standar AutoCAD DXF R12, Google Earth KML, atau CSV koordinat lengkap (ID, Name, Code, X, Y, Z).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Kompas Geologi & Klinometer
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bidikan azimuth kompas dan klinometer untuk mengukur kemiringan lereng tambang (slope angle, dip/strike, grade jalan).
                </p>
              </div>
            </div>

            {/* Footer note: Surveyor Everyday - All-In-One Mine Surveying */}
            <footer className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 font-sans py-3 tracking-wide">
              Surveyor Everyday - All-In-One Mine Surveying
            </footer>
          </main>
        </div>

        {/* Sticky Bottom Bar on Mobile */}
        <div className="shrink-0 sm:hidden bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md p-3 border-t border-slate-200 dark:border-white/10 shadow-2xl">
          <button
            onClick={onOpenApp}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-blue-500/30 active:scale-98 transition flex items-center justify-center gap-2"
          >
            <span>BUKA PROJECT INI SEKARANG</span>
            <ChevronRight className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={(newProj) => {
          onCreateProject(newProj);
          onOpenApp();
        }}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onSaveProject={onEditProject}
      />
    </>
  );
};
