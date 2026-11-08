import React, { useState, useEffect } from 'react';
import { X, Check, Edit, FolderEdit } from 'lucide-react';
import { SurveyProject } from '../types/survey';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: SurveyProject | null;
  onSaveProject: (updated: SurveyProject) => void;
}

const COMMON_UTM_ZONES = [
  { code: '50S', label: '50S - Kaltim, Kalsel, Kalteng (Ibu Kota Nusantara, Sangatta, Tapin)' },
  { code: '48S', label: '48S - Sumsel, Lampung, Bengkulu (Tanjung Enim, Lahat)' },
  { code: '49S', label: '49S - Jawa Barat, Jawa Tengah, Kalbar' },
  { code: '51S', label: '51S - Sulawesi Selatan, NTB, NTT' },
  { code: '52S', label: '52S - Maluku, Papua Barat' },
  { code: '50N', label: '50N - Tarakan, Nunukan, Kaltara' },
  { code: '48N', label: '48N - Riau, Sumut, Aceh' },
];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSaveProject,
}) => {
  if (!isOpen || !project) return null;

  const [name, setName] = useState(project.name);
  const [siteName, setSiteName] = useState(project.siteName);
  const [utmZone, setUtmZone] = useState(project.defaultUtmZone);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setSiteName(project.siteName);
      setUtmZone(project.defaultUtmZone);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProject({
      ...project,
      name: name.trim(),
      siteName: siteName.trim() || project.siteName,
      defaultUtmZone: utmZone,
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[750] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#111726] border border-blue-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Edit Project Tambang
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
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 text-[10px]">
              Zona UTM Wilayah Kerja (WGS84)
            </label>
            <select
              value={utmZone}
              onChange={(e) => setUtmZone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
            >
              {COMMON_UTM_ZONES.map((z) => (
                <option key={z.code} value={z.code}>
                  {z.label}
                </option>
              ))}
            </select>
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
              <Check className="w-4 h-4 stroke-[3]" />
              <span>SIMPAN PERUBAHAN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
