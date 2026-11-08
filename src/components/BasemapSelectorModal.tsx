import React from 'react';
import { X, Check, Globe } from 'lucide-react';
import { BasemapType } from '../types/survey';

interface BasemapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBasemap: BasemapType;
  onSelectBasemap: (type: BasemapType) => void;
}

export const BasemapSelectorModal: React.FC<BasemapSelectorModalProps> = ({
  isOpen,
  onClose,
  activeBasemap,
  onSelectBasemap,
}) => {
  if (!isOpen) return null;

  const basemapOptions: Array<{
    id: BasemapType;
    title: string;
    description: string;
    tag: string;
  }> = [
    {
      id: 'geopdf',
      title: 'Peta GeoPDF Tambang (Khusus GeoPDF)',
      description: 'Hanya menampilkan peta GeoPDF yang diimpor tanpa basemap citra satelit atau jalan di latar belakang.',
      tag: 'SOLO GEOPDF • TANPA BASEMAP',
    },
    {
      id: 'satelit',
      title: 'Citra Satelit Resolusi Tinggi (Esri World Imagery)',
      description: 'Peta foto optik satelit detail untuk melihat jenjang lereng pit, bench, jalan hauling, stockpile, dan kolam sump tambang.',
      tag: 'STANDAR SURVEY TAMBANG',
    },
    {
      id: 'kontur',
      title: 'Peta Topografi & Kontur Elevasi (OpenTopoMap)',
      description: 'Garis kontur ketinggian, bukit terjal, morfologi lembah dan drainase air tambang.',
      tag: 'KONTUR & ELEVASI',
    },
    {
      id: 'road',
      title: 'Peta Jalan & Batas Wilayah (OpenStreetMap)',
      description: 'Peta vektor jalan hauling, jalan akses tambang, pelabuhan/jetty, dan pemukiman sekitar.',
      tag: 'INFRASTRUKTUR JALAN',
    },
  ];

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#111726] border border-blue-100 dark:border-blue-900/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">
                PILIH BASEMAP LAPANGAN
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ganti tampilan layer peta dasar sesuai kebutuhan survey
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

        {/* Options */}
        <div className="p-4 space-y-3">
          {basemapOptions.map((opt) => {
            const isSelected = activeBasemap === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectBasemap(opt.id);
                  onClose();
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {opt.title}
                    </span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {opt.tag}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div
                  className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-white/20 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
