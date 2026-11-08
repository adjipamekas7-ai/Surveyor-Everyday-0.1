import React, { useState } from 'react';
import { X, Plus, FolderPlus, MapPin, Globe } from 'lucide-react';
import { SurveyProject } from '../types/survey';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: SurveyProject) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [utmZone, setUtmZone] = useState('50S');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProject: SurveyProject = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      siteName: siteName.trim() || 'Site Tambang Baru',
      defaultUtmZone: utmZone,
      datum: 'WGS84',
      updatedAt: Date.now(),
      points: [],
      lines: [],
      polygons: [],
      overlays: [],
    };

    onCreateProject(newProject);
    setName('');
    setSiteName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#111726] border border-blue-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Buat Project Tambang Baru
            </h2>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Nama Project / Pit Tambang *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pit Tutupan Selatan - Blok 04"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Lokasi Site / Perusahaan
            </label>
            <input
              type="text"
              placeholder="Contoh: Site Sangatta / PT Tambang Batubara"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs">
            <div>
              <span className="font-extrabold text-blue-700 dark:text-blue-300 block text-[11px]">
                SISTEM KOORDINAT & ZONA UTM
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Zona UTM terdeteksi otomatis dari posisi GPS / peta GeoPDF lapangan
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono text-[10px] font-black shrink-0">
              AUTO WGS84
            </span>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Keterangan / Target Pengukuran (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Monitoring single slope bench, batas disposal, dan haul road km 12..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>SIMPAN & BUKA PROJECT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
