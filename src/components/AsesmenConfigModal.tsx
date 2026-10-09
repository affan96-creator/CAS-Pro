import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  ListChecks,
  Sliders,
  Plus,
  Minus,
  BrainCircuit,
  HelpCircle,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { AsesmenConfig, JenisAsesmen, FormState } from '../types';

interface AsesmenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: AsesmenConfig) => void;
  formData: FormState;
  isLoading: boolean;
}

export const DEFAULT_ASESMEN_CONFIG: AsesmenConfig = {
  jenisAsesmen: 'Asesmen Formatif',
  soalPG: {
    enabled: true,
    jumlahSoal: 5,
    jumlahOpsi: 4,
  },
  soalPGK: {
    enabled: true,
    jumlahSoal: 2,
  },
  soalIsianSingkat: {
    enabled: true,
    jumlahSoal: 2,
  },
  soalUraian: {
    enabled: true,
    jumlahSoal: 2,
  },
  soalBenarSalah: {
    enabled: false,
    jumlahSoal: 2,
  },
  soalMenjodohkan: {
    enabled: false,
    jumlahSoal: 2,
  },
  levelKognitif: ['MOTS', 'HOTS'],
  instruksiTambahan: '',
};

export const AsesmenConfigModal: React.FC<AsesmenConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  formData,
  isLoading,
}) => {
  const [config, setConfig] = useState<AsesmenConfig>(() => {
    // Set default opsi PG based on jenjang (SD: 3/4, SMP: 4, SMA/SMK: 5)
    const initialOpsi = formData.jenjang === 'SMA' || formData.jenjang === 'SMK' ? 5 : 4;
    return {
      ...DEFAULT_ASESMEN_CONFIG,
      soalPG: {
        ...DEFAULT_ASESMEN_CONFIG.soalPG,
        jumlahOpsi: initialOpsi,
      },
    };
  });

  if (!isOpen) return null;

  // Calculate total items
  const totalSoal =
    (config.soalPG.enabled ? config.soalPG.jumlahSoal : 0) +
    (config.soalPGK.enabled ? config.soalPGK.jumlahSoal : 0) +
    (config.soalIsianSingkat.enabled ? config.soalIsianSingkat.jumlahSoal : 0) +
    (config.soalUraian.enabled ? config.soalUraian.jumlahSoal : 0) +
    (config.soalBenarSalah.enabled ? config.soalBenarSalah.jumlahSoal : 0) +
    (config.soalMenjodohkan.enabled ? config.soalMenjodohkan.jumlahSoal : 0);

  const toggleLevelKognitif = (level: 'LOTS' | 'MOTS' | 'HOTS') => {
    const exists = config.levelKognitif.includes(level);
    if (exists) {
      if (config.levelKognitif.length === 1) {
        // Minimal 1 level kognitif aktif
        return;
      }
      setConfig((prev) => ({
        ...prev,
        levelKognitif: prev.levelKognitif.filter((l) => l !== level),
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        levelKognitif: [...prev.levelKognitif, level],
      }));
    }
  };

  const handleReset = () => {
    const initialOpsi = formData.jenjang === 'SMA' || formData.jenjang === 'SMK' ? 5 : 4;
    setConfig({
      ...DEFAULT_ASESMEN_CONFIG,
      soalPG: {
        ...DEFAULT_ASESMEN_CONFIG.soalPG,
        jumlahOpsi: initialOpsi,
      },
    });
  };

  const handleSubmit = () => {
    if (totalSoal === 0) {
      alert('Pilihlah minimal 1 jenis tipe soal untuk digenerate.');
      return;
    }
    if (config.levelKognitif.length === 0) {
      alert('Pilihlah minimal 1 level kognitif soal (LOTS, MOTS, atau HOTS).');
      return;
    }
    onConfirm(config);
  };

  const jenisList: { id: JenisAsesmen; title: string; desc: string; badge: string }[] = [
    {
      id: 'Asesmen Awal (Diagnostik)',
      title: 'Asesmen Awal (Diagnostik)',
      desc: 'Pemetaan kesiapan belajar, minat murid, dan apersepsi sebelum materi dimulai.',
      badge: 'Awal Pembelajaran',
    },
    {
      id: 'Asesmen Formatif',
      title: 'Asesmen Formatif',
      desc: 'Pemantauan berkala saat proses KBM untuk memberikan umpan balik perbaikan segera.',
      badge: 'Selama KBM',
    },
    {
      id: 'Asesmen Sumatif',
      title: 'Asesmen Sumatif',
      desc: 'Evaluasi ketercapaian Tujuan Pembelajaran di akhir lingkup materi atau semester.',
      badge: 'Akhir Materi/Tujuan',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Sliders className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Konfigurasi Perangkat Asesmen
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/40 border border-emerald-300/30 text-emerald-100">
                  {formData.jenjang} • {formData.namaMapel || 'Mata Pelajaran'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Sesuaikan jenis asesmen, kombinasi tipe dan jumlah soal, serta target level kognitif
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Banner Khusus Standar Huruf Hijaiyah PAI */}
          {(formData.namaMapel?.toLowerCase().includes('islam') ||
            formData.materiPembelajaran?.toLowerCase().includes('hijai') ||
            formData.materiPembelajaran?.toLowerCase().includes('harakat')) && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-2.5 shadow-2xs">
              <span className="font-serif font-bold text-lg text-emerald-800 shrink-0 leading-none mt-0.5" dir="rtl">اَ بَ تَ</span>
              <div className="text-xs text-emerald-900 leading-relaxed">
                <strong className="font-bold text-emerald-800">Standar Huruf Hijaiyah & Harakat Resmi PAI:</strong>
                <p className="text-[11px] text-emerald-800/90 mt-0.5">
                  Seluruh butir soal, stimulus, kisi-kisi, kunci jawaban, dan pilihan jawaban yang berkaitan dengan huruf hijaiyah dan harakat otomatis menggunakan <strong>aksara huruf hijaiyah Arab asli dengan tanda harakat Arab (misal: بَ, بِ, بُ, كَتَبَ)</strong>. Kecuali jika soal meminta cara membaca/lafal, maka opsi jawaban tetap disajikan dalam abjad Indonesia.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Pilihan Bentuk / Jenis Asesmen */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>1. Pilihan Bentuk / Jenis Asesmen</span>
              </label>
              <span className="text-[11px] text-slate-500">Pilih salah satu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {jenisList.map((item) => {
                const isSelected = config.jenisAsesmen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, jenisAsesmen: item.id }))}
                    className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-800 mb-1">{item.title}</div>
                    <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Tipe & Jumlah Soal */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-emerald-600" />
                <span>2. Tipe & Jumlah Soal</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Total: {totalSoal} Butir Soal
                </span>
              </div>
            </div>

            {/* Grid of Question Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Type 1: Pilihan Ganda (PG) with options count */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  config.soalPG.enabled
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.soalPG.enabled}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          soalPG: { ...p.soalPG, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Pilihan Ganda (PG)
                    </span>
                  </label>

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={!config.soalPG.enabled || config.soalPG.jumlahSoal <= 1}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalPG: {
                            ...p.soalPG,
                            jumlahSoal: Math.max(1, p.soalPG.jumlahSoal - 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      disabled={!config.soalPG.enabled}
                      value={config.soalPG.jumlahSoal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({
                          ...p,
                          soalPG: {
                            ...p.soalPG,
                            jumlahSoal: isNaN(val) ? 1 : Math.min(30, Math.max(1, val)),
                          },
                        }));
                      }}
                      className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!config.soalPG.enabled || config.soalPG.jumlahSoal >= 30}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalPG: {
                            ...p.soalPG,
                            jumlahSoal: Math.min(30, p.soalPG.jumlahSoal + 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-option: Jumlah Pilihan Option (3, 4, 5) */}
                {config.soalPG.enabled && (
                  <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-600">
                      Jumlah Opsi Jawaban:
                    </span>
                    <div className="flex items-center gap-1">
                      {([3, 4, 5] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setConfig((p) => ({
                              ...p,
                              soalPG: { ...p.soalPG, jumlahOpsi: opt },
                            }))
                          }
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            config.soalPG.jumlahOpsi === opt
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {opt} Opsi ({opt === 3 ? 'A-C' : opt === 4 ? 'A-D' : 'A-E'})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Type 2: Pilihan Ganda Kompleks (PGK) */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  config.soalPGK.enabled
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.soalPGK.enabled}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            soalPGK: { ...p.soalPGK, enabled: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Pilihan Ganda Kompleks (PGK)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 ml-6">
                      (Jawaban lebih dari satu / ceklis)
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={!config.soalPGK.enabled || config.soalPGK.jumlahSoal <= 1}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalPGK: {
                            ...p.soalPGK,
                            jumlahSoal: Math.max(1, p.soalPGK.jumlahSoal - 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      disabled={!config.soalPGK.enabled}
                      value={config.soalPGK.jumlahSoal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({
                          ...p,
                          soalPGK: {
                            ...p.soalPGK,
                            jumlahSoal: isNaN(val) ? 1 : Math.min(20, Math.max(1, val)),
                          },
                        }));
                      }}
                      className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!config.soalPGK.enabled || config.soalPGK.jumlahSoal >= 20}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalPGK: {
                            ...p.soalPGK,
                            jumlahSoal: Math.min(20, p.soalPGK.jumlahSoal + 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Type 3: Isian Singkat */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  config.soalIsianSingkat.enabled
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.soalIsianSingkat.enabled}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            soalIsianSingkat: {
                              ...p.soalIsianSingkat,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Isian Singkat (Short Answer)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 ml-6">
                      (Jawaban berupa kata/istilah/angka)
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={
                        !config.soalIsianSingkat.enabled ||
                        config.soalIsianSingkat.jumlahSoal <= 1
                      }
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalIsianSingkat: {
                            ...p.soalIsianSingkat,
                            jumlahSoal: Math.max(1, p.soalIsianSingkat.jumlahSoal - 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      disabled={!config.soalIsianSingkat.enabled}
                      value={config.soalIsianSingkat.jumlahSoal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({
                          ...p,
                          soalIsianSingkat: {
                            ...p.soalIsianSingkat,
                            jumlahSoal: isNaN(val) ? 1 : Math.min(20, Math.max(1, val)),
                          },
                        }));
                      }}
                      className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={
                        !config.soalIsianSingkat.enabled ||
                        config.soalIsianSingkat.jumlahSoal >= 20
                      }
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalIsianSingkat: {
                            ...p.soalIsianSingkat,
                            jumlahSoal: Math.min(20, p.soalIsianSingkat.jumlahSoal + 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Type 4: Uraian (Essay) */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  config.soalUraian.enabled
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.soalUraian.enabled}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            soalUraian: { ...p.soalUraian, enabled: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Uraian / Esai (Essay)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 ml-6">
                      (Analitis, elaborasi argumen, solusi)
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={!config.soalUraian.enabled || config.soalUraian.jumlahSoal <= 1}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalUraian: {
                            ...p.soalUraian,
                            jumlahSoal: Math.max(1, p.soalUraian.jumlahSoal - 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      disabled={!config.soalUraian.enabled}
                      value={config.soalUraian.jumlahSoal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({
                          ...p,
                          soalUraian: {
                            ...p.soalUraian,
                            jumlahSoal: isNaN(val) ? 1 : Math.min(15, Math.max(1, val)),
                          },
                        }));
                      }}
                      className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!config.soalUraian.enabled || config.soalUraian.jumlahSoal >= 15}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalUraian: {
                            ...p.soalUraian,
                            jumlahSoal: Math.min(15, p.soalUraian.jumlahSoal + 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Type 5: Benar / Salah (True or False) */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  config.soalBenarSalah.enabled
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.soalBenarSalah.enabled}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            soalBenarSalah: {
                              ...p.soalBenarSalah,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Benar / Salah (True or False)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 ml-6">
                      (Tabel matriks berstimulus: 2–3 pernyataan per soal)
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={
                        !config.soalBenarSalah.enabled ||
                        config.soalBenarSalah.jumlahSoal <= 1
                      }
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalBenarSalah: {
                            ...p.soalBenarSalah,
                            jumlahSoal: Math.max(1, p.soalBenarSalah.jumlahSoal - 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      disabled={!config.soalBenarSalah.enabled}
                      value={config.soalBenarSalah.jumlahSoal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({
                          ...p,
                          soalBenarSalah: {
                            ...p.soalBenarSalah,
                            jumlahSoal: isNaN(val) ? 1 : Math.min(20, Math.max(1, val)),
                          },
                        }));
                      }}
                      className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={
                        !config.soalBenarSalah.enabled ||
                        config.soalBenarSalah.jumlahSoal >= 20
                      }
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalBenarSalah: {
                            ...p.soalBenarSalah,
                            jumlahSoal: Math.min(20, p.soalBenarSalah.jumlahSoal + 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Type 6: Menjodohkan (Matching) */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  config.soalMenjodohkan.enabled
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.soalMenjodohkan.enabled}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            soalMenjodohkan: {
                              ...p.soalMenjodohkan,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Menjodohkan (Matching Pairs)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 ml-6">
                      (Tabel 2 kolom seimbang teks: Premis di kiri & Opsi di kanan, murni kalimat tanpa gambar)
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={
                        !config.soalMenjodohkan.enabled ||
                        config.soalMenjodohkan.jumlahSoal <= 1
                      }
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalMenjodohkan: {
                            ...p.soalMenjodohkan,
                            jumlahSoal: Math.max(1, p.soalMenjodohkan.jumlahSoal - 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      disabled={!config.soalMenjodohkan.enabled}
                      value={config.soalMenjodohkan.jumlahSoal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfig((p) => ({
                          ...p,
                          soalMenjodohkan: {
                            ...p.soalMenjodohkan,
                            jumlahSoal: isNaN(val) ? 1 : Math.min(15, Math.max(1, val)),
                          },
                        }));
                      }}
                      className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={
                        !config.soalMenjodohkan.enabled ||
                        config.soalMenjodohkan.jumlahSoal >= 15
                      }
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          soalMenjodohkan: {
                            ...p.soalMenjodohkan,
                            jumlahSoal: Math.min(15, p.soalMenjodohkan.jumlahSoal + 1),
                          },
                        }))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Level Kognitif Soal (Multi-select) */}
          <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-emerald-600" />
                <span>3. Level Kognitif Soal (Bisa Pilih &gt; 1 Level)</span>
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {config.levelKognitif.join(' + ') || 'Pilih level'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* LOTS */}
              <button
                type="button"
                onClick={() => toggleLevelKognitif('LOTS')}
                className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                  config.levelKognitif.includes('LOTS')
                    ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        config.levelKognitif.includes('LOTS') ? 'bg-blue-600' : 'bg-slate-400'
                      }`}
                    />
                    LOTS (C1 - C2)
                  </span>
                  {config.levelKognitif.includes('LOTS') && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="text-[11px] font-semibold text-blue-900">
                  Mengingat & Memahami
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Pemahaman konsep dasar, definisi, klasifikasi, fakta penting.
                </p>
              </button>

              {/* MOTS */}
              <button
                type="button"
                onClick={() => toggleLevelKognitif('MOTS')}
                className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                  config.levelKognitif.includes('MOTS')
                    ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        config.levelKognitif.includes('MOTS') ? 'bg-amber-600' : 'bg-slate-400'
                      }`}
                    />
                    MOTS (C3)
                  </span>
                  {config.levelKognitif.includes('MOTS') && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="text-[11px] font-semibold text-amber-900">
                  Menerapkan / Mengaplikasikan
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Penerapan rumus, prosedur kerja, contoh kasus kontekstual.
                </p>
              </button>

              {/* HOTS */}
              <button
                type="button"
                onClick={() => toggleLevelKognitif('HOTS')}
                className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                  config.levelKognitif.includes('HOTS')
                    ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        config.levelKognitif.includes('HOTS') ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                    />
                    HOTS (C4 - C6)
                  </span>
                  {config.levelKognitif.includes('HOTS') && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="text-[11px] font-semibold text-emerald-900">
                  Nalar Kritis & Analisis
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Analisis data, evaluasi argumen, pemecahan masalah, kreasi.
                </p>
              </button>
            </div>
          </div>

          {/* Notice: Aturan Stimulus Visual Literasi Numerasi HOTS */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
            <span className="text-base shrink-0 mt-0.5">📐</span>
            <div className="space-y-1">
              <span className="font-bold text-amber-900 block">
                Aturan Pembuatan Soal Literasi &amp; Numerasi Visual (HOTS):
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Minimal <strong>30% dari total soal</strong> otomatis menyertakan stimulus visual bergambar (pada bentuk soal PG, PGK, Isian Singkat, Uraian, dan Benar/Salah) dengan tag resmi: <strong>[CHART_URL]</strong> untuk grafik data aktif atau <strong>[GAMBAR_STIMULUS]</strong> untuk bagan/ilustrasi. Khusus <strong>soal menjodohkan</strong>, opsi pilihan dan premis murni menggunakan kalimat/teks saja tanpa gambar.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || totalSoal === 0 || config.levelKognitif.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Perangkat Asesmen ({totalSoal} Soal)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
