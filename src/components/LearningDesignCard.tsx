import React, { useState, useMemo, useEffect } from 'react';
import {
  BookMarked,
  Sparkles,
  Layers,
  Monitor,
  CheckSquare,
  Square,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Sparkle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { FormState, Semester, CPItem } from '../types';
import {
  MAPEL_BY_JENJANG,
  FASE_KELAS_BY_JENJANG,
  DIMENSI_PROFIL_LULUSAN,
  DIGITALISASI_DEFAULT_OPTIONS,
  CP_CATALOG,
  isMataPelajaranAgama,
  getCpReferenceShort,
  getCpReferenceFull,
  isMapelMatch,
  isCpMatchingFaseKelas,
  getFaseFromFaseKelas,
} from '../data/kurikulumData';
import {
  SpreadsheetKontrolRow,
  FALLBACK_SPREADSHEET_KONTROL,
  findMatchingRow,
} from '../data/spreadsheetKontrolData';

interface LearningDesignCardProps {
  formData: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  spreadsheetRows?: SpreadsheetKontrolRow[];
}

export const LearningDesignCard: React.FC<LearningDesignCardProps> = ({
  formData,
  onChange,
  spreadsheetRows = FALLBACK_SPREADSHEET_KONTROL,
}) => {
  const [showCpModal, setShowCpModal] = useState(false);
  const [cpSearchQuery, setCpSearchQuery] = useState('');
  const [selectedModalMapel, setSelectedModalMapel] = useState<string>('all');
  const [selectedModalFase, setSelectedModalFase] = useState<string>('all');
  const [selectedModalElemen, setSelectedModalElemen] = useState<string>('all');
  const [onlyMatchFaseKelasInModal, setOnlyMatchFaseKelasInModal] = useState<boolean>(true);

  // Matching row in Spreadsheet KONTROL based on current School, Teacher, & Jabatan
  const matchedSpreadsheetRow = useMemo(() => {
    return findMatchingRow(
      spreadsheetRows,
      formData.namaSekolah,
      formData.namaGuru,
      formData.jabatan
    );
  }, [spreadsheetRows, formData.namaSekolah, formData.namaGuru, formData.jabatan]);

  const isSpreadsheetActive = Boolean(
    matchedSpreadsheetRow && matchedSpreadsheetRow.mataPelajaran.length > 0
  );
  const spreadsheetSubjects = matchedSpreadsheetRow?.mataPelajaran || [];

  // Active Mapel Options:
  // USER INTENT: "Begitupun pada pilihan Nama Mata Pelajaran yang muncul di drop down di aplikasi, secara otomatis membaca yang ada di spreadsheet, sheet KONTROL bagian Mata Pelajaran."
  const activeMapels = useMemo(() => {
    if (isSpreadsheetActive && spreadsheetSubjects.length > 0) {
      return spreadsheetSubjects;
    }
    return MAPEL_BY_JENJANG[formData.jenjang] || [];
  }, [isSpreadsheetActive, spreadsheetSubjects, formData.jenjang]);

  // Auto-sync formData.namaMapel if current selection is not in activeMapels
  useEffect(() => {
    if (activeMapels.length > 0) {
      const isCurrentInList = activeMapels.includes(formData.namaMapel);
      if (!isCurrentInList) {
        onChange('namaMapel', activeMapels[0]);
      }
    }
  }, [activeMapels, formData.namaMapel, onChange]);

  const currentMapels = MAPEL_BY_JENJANG[formData.jenjang] || [];
  const currentFaseKelas = FASE_KELAS_BY_JENJANG[formData.jenjang] || [];

  // Get all CPs for the currently chosen Jenjang (SD, SMP, SMA, SMK)
  const jenjangCps = useMemo(() => {
    return CP_CATALOG.filter((item) => item.jenjang === formData.jenjang);
  }, [formData.jenjang]);

  // Unique mapels in this Jenjang from the catalog
  const availableCatalogMapels = useMemo(() => {
    const set = new Set<string>();
    jenjangCps.forEach((item) => {
      if (item.mapel) set.add(item.mapel);
    });
    return Array.from(set).sort();
  }, [jenjangCps]);

  // Unique fases in this Jenjang from the catalog
  const availableCatalogFases = useMemo(() => {
    const set = new Set<string>();
    jenjangCps.forEach((item) => {
      if (item.fase) set.add(item.fase);
    });
    return Array.from(set).sort();
  }, [jenjangCps]);

  // Unique elements for the selected mapel
  const availableCatalogElements = useMemo(() => {
    const set = new Set<string>();
    jenjangCps.forEach((item) => {
      if (selectedModalMapel === 'all' || item.mapel === selectedModalMapel) {
        if (item.elemen) set.add(item.elemen);
      }
    });
    return Array.from(set).sort();
  }, [jenjangCps, selectedModalMapel]);

  // When opening modal or changing jenjang, sync initial filter with formData if available
  useEffect(() => {
    if (showCpModal) {
      // 1. Sinkronisasi Mapel terpilih
      if (formData.namaMapel) {
        const matchingCatalogMapel = availableCatalogMapels.find((m) =>
          isMapelMatch(formData.namaMapel, m)
        );
        setSelectedModalMapel(matchingCatalogMapel || 'all');
      } else {
        setSelectedModalMapel('all');
      }

      // 2. Sinkronisasi Fase terpilih
      const formFase = getFaseFromFaseKelas(formData.faseKelas);
      if (formFase && availableCatalogFases.includes(formFase)) {
        setSelectedModalFase(formFase);
      } else {
        setSelectedModalFase('all');
      }

      setSelectedModalElemen('all');
      setCpSearchQuery('');
      setOnlyMatchFaseKelasInModal(Boolean(formData.faseKelas));
    }
  }, [
    showCpModal,
    formData.jenjang,
    formData.namaMapel,
    formData.faseKelas,
    availableCatalogMapels,
    availableCatalogFases,
  ]);

  // Filtered CP list in modal
  const filteredCps = useMemo(() => {
    const q = cpSearchQuery.trim().toLowerCase();
    return jenjangCps.filter((item) => {
      // Filter by Mapel
      if (selectedModalMapel !== 'all' && item.mapel !== selectedModalMapel) {
        return false;
      }
      // Filter by Fase
      if (selectedModalFase !== 'all' && item.fase !== selectedModalFase) {
        return false;
      }
      // Filter by Elemen
      if (selectedModalElemen !== 'all' && item.elemen !== selectedModalElemen) {
        return false;
      }
      // Optional strict filter matching teacher's selected Fase/Kelas
      if (
        onlyMatchFaseKelasInModal &&
        formData.faseKelas &&
        !isCpMatchingFaseKelas(item, formData.faseKelas)
      ) {
        return false;
      }
      // Search query
      if (q) {
        const inMapel = item.mapel.toLowerCase().includes(q);
        const inFase = item.fase.toLowerCase().includes(q);
        const inKelas = (item.kelas || '').toLowerCase().includes(q);
        const inElemen = (item.elemen || '').toLowerCase().includes(q);
        const inDeskripsi = item.deskripsi.toLowerCase().includes(q);
        return inMapel || inFase || inKelas || inElemen || inDeskripsi;
      }
      return true;
    });
  }, [
    jenjangCps,
    selectedModalMapel,
    selectedModalFase,
    selectedModalElemen,
    onlyMatchFaseKelasInModal,
    formData.faseKelas,
    cpSearchQuery,
  ]);

  // Quick CPs strictly relevant to current form's Mapel AND Fase/Kelas (for quick inline selector)
  const quickRelevantCps = useMemo(() => {
    if (!formData.namaMapel) return [];

    // 1. Prioritaskan kecocokan tepat: Mapel DAN Fase/Kelas
    const strictMatches = jenjangCps.filter(
      (item) =>
        isMapelMatch(formData.namaMapel, item.mapel) &&
        isCpMatchingFaseKelas(item, formData.faseKelas)
    );

    if (strictMatches.length > 0) {
      return strictMatches;
    }

    // 2. Jika tidak ada spesifik kelas, tampilkan berdasarkan Mapel pada Fase terpilih
    const formFase = getFaseFromFaseKelas(formData.faseKelas);
    if (formFase) {
      const faseMatches = jenjangCps.filter(
        (item) =>
          isMapelMatch(formData.namaMapel, item.mapel) &&
          item.fase.toLowerCase() === formFase.toLowerCase()
      );
      if (faseMatches.length > 0) return faseMatches;
    }

    // 3. Fallback: seluruh CP pada Mapel tersebut di jenjang ini
    return jenjangCps.filter((item) =>
      isMapelMatch(formData.namaMapel, item.mapel)
    );
  }, [jenjangCps, formData.namaMapel, formData.faseKelas]);

  // Match CP to appropriate faseKelas value
  const handleSelectCp = (cp: CPItem) => {
    onChange('capaianPembelajaran', cp.deskripsi);

    // Sync mapel if empty or different
    if (!formData.namaMapel || !isMapelMatch(formData.namaMapel, cp.mapel)) {
      const foundInCurrent = currentMapels.find((m) => isMapelMatch(m, cp.mapel));
      onChange('namaMapel', foundInCurrent || cp.mapel);
    }

    // Smartly map faseKelas if currently unset or different
    if (cp.kelas) {
      const match = currentFaseKelas.find(
        (fk) =>
          fk.value.toLowerCase().includes(cp.kelas!.toLowerCase()) ||
          fk.label.toLowerCase().includes(cp.kelas!.toLowerCase())
      );
      if (match) {
        onChange('faseKelas', match.value);
      } else if (cp.fase) {
        const faseMatch = currentFaseKelas.find((fk) =>
          fk.value.toLowerCase().includes(cp.fase.toLowerCase())
        );
        if (faseMatch) {
          onChange('faseKelas', faseMatch.value);
        }
      }
    } else if (cp.fase) {
      const faseMatch = currentFaseKelas.find((fk) =>
        fk.value.toLowerCase().includes(cp.fase.toLowerCase())
      );
      if (faseMatch) {
        onChange('faseKelas', faseMatch.value);
      }
    }

    setShowCpModal(false);
  };

  // Helper to toggle Profil Lulusan item
  const toggleProfilLulusan = (item: string) => {
    const exists = formData.profilLulusan.includes(item);
    if (exists) {
      onChange(
        'profilLulusan',
        formData.profilLulusan.filter((d) => d !== item)
      );
    } else {
      onChange('profilLulusan', [...formData.profilLulusan, item]);
    }
  };

  // Helper to toggle Digitalisasi item
  const toggleDigitalisasi = (item: string) => {
    const exists = formData.digitalisasi.includes(item);
    if (exists) {
      onChange(
        'digitalisasi',
        formData.digitalisasi.filter((d) => d !== item)
      );
    } else {
      onChange('digitalisasi', [...formData.digitalisasi, item]);
    }
  };

  // Quick prompt to generate TP from CP & Materi
  const handleAutoDraftTP = () => {
    if (!formData.materiPembelajaran) {
      alert('Silakan isi Materi Pembelajaran terlebih dahulu agar sistem dapat merumuskan Tujuan Pembelajaran yang relevan.');
      return;
    }
    const lowerMapel = (formData.namaMapel || '').toLowerCase();
    const lowerMat = formData.materiPembelajaran.toLowerCase();
    const isPaiOrHijaiyah =
      lowerMapel.includes('islam') ||
      lowerMapel.includes('agama') ||
      lowerMat.includes('hijai') ||
      lowerMat.includes('harakat') ||
      lowerMat.includes('qur');

    let sampleTP = '';
    if (isPaiOrHijaiyah) {
      sampleTP = `1. Murid mampu mengenal dan melafalkan huruf hijaiyah berharakat (fathah, kasrah, dhammah) dan bersambung dengan makhraj yang fasih dan benar.\n2. Murid mampu membedakan bentuk perubahan huruf hijaiyah tunggal dan huruf bersambung secara tepat.\n3. Murid mampu menuliskan dan merangkai huruf hijaiyah serta menginternalisasikan nilai-nilai keimanan dalam keseharian.`;
    } else {
      sampleTP = `1. Melalui eksplorasi dan diskusi mendalam, peserta didik mampu menganalisis konsep ${formData.materiPembelajaran} dengan nalar kritis.\n2. Melalui kerja kelompok dan pemanfaatan media digital, peserta didik mampu mengaplikasikan pemahaman tentang ${formData.materiPembelajaran} dalam pemecahan masalah kontekstual.\n3. Peserta didik mampu merefleksikan dan mengomunikasikan hasil karya atau solusi secara kolaboratif dan bermakna.`;
    }
    onChange('tujuanPembelajaran', sampleTP);
  };

  // Reset modal filters
  const handleResetFilters = () => {
    setSelectedModalMapel('all');
    setSelectedModalFase('all');
    setSelectedModalElemen('all');
    setOnlyMatchFaseKelasInModal(false);
    setCpSearchQuery('');
  };

  // Restore filters to match form
  const handleSyncFiltersWithForm = () => {
    if (formData.namaMapel) {
      const matchingCatalogMapel = availableCatalogMapels.find((m) =>
        isMapelMatch(formData.namaMapel, m)
      );
      setSelectedModalMapel(matchingCatalogMapel || 'all');
    } else {
      setSelectedModalMapel('all');
    }

    const formFase = getFaseFromFaseKelas(formData.faseKelas);
    if (formFase && availableCatalogFases.includes(formFase)) {
      setSelectedModalFase(formFase);
    } else {
      setSelectedModalFase('all');
    }

    setSelectedModalElemen('all');
    setOnlyMatchFaseKelasInModal(Boolean(formData.faseKelas));
    setCpSearchQuery('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Card Header */}
      <div className="px-4 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-semibold text-xs shadow-sm">
            <BookMarked className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              2. Desain Pembelajaran Kurikulum Merdeka
            </h2>
            <p className="text-xs text-slate-500">
              Capaian Pembelajaran (CP) Resmi {formData.jenjang} &bull;{' '}
              <span className="font-semibold text-emerald-700">
                {formData.namaMapel
                  ? getCpReferenceShort(formData.namaMapel)
                  : 'BSKAP 046/2025 & BKPDM 020/2026'}
              </span>
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Sheet {formData.jenjang} ({jenjangCps.length} CP)
        </span>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-4">
        {/* Row 1: Mapel & Fase/Kelas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="select-mapel" className="text-xs font-semibold text-slate-700">
                Nama Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              {isSpreadsheetActive ? (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Sheet KONTROL ({spreadsheetSubjects.length} Mapel)
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  Katalog {formData.jenjang}
                </span>
              )}
            </div>
            <select
              id="select-mapel"
              value={formData.namaMapel}
              onChange={(e) => onChange('namaMapel', e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            >
              <option value="">-- Pilih Mata Pelajaran --</option>
              {activeMapels.map((mapel) => (
                <option key={mapel} value={mapel}>
                  {mapel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="select-fase-kelas" className="block text-xs font-semibold text-slate-700 mb-1">
              Fase / Kelas <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-fase-kelas"
              value={formData.faseKelas}
              onChange={(e) => onChange('faseKelas', e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            >
              <option value="">-- Pilih Fase & Kelas --</option>
              {currentFaseKelas.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Semester, Tahun Pelajaran, Alokasi Waktu, Jumlah Pertemuan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="select-semester" className="block text-xs font-semibold text-slate-700 mb-1">
              Semester
            </label>
            <select
              id="select-semester"
              value={formData.semester}
              onChange={(e) => onChange('semester', e.target.value as Semester)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div>
            <label htmlFor="input-tahun-pelajaran" className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Pelajaran
            </label>
            <input
              id="input-tahun-pelajaran"
              type="text"
              value={formData.tahunPelajaran}
              onChange={(e) => onChange('tahunPelajaran', e.target.value)}
              placeholder="2025/2026"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            />
          </div>

          <div>
            <label htmlFor="input-alokasi-waktu" className="block text-xs font-semibold text-slate-700 mb-1">
              Alokasi Waktu (JP)
            </label>
            <input
              id="input-alokasi-waktu"
              type="text"
              value={formData.alokasiWaktu}
              onChange={(e) => onChange('alokasiWaktu', e.target.value)}
              placeholder="Contoh: 2 JP (2 x 35 Menit)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            />
          </div>

          <div>
            <label htmlFor="select-jumlah-pertemuan" className="block text-xs font-semibold text-slate-700 mb-1">
              Jumlah Pertemuan
            </label>
            <select
              id="select-jumlah-pertemuan"
              value={formData.jumlahPertemuan || '1 Pertemuan'}
              onChange={(e) => onChange('jumlahPertemuan', e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            >
              {Array.from({ length: 20 }, (_, i) => {
                const val = `${i + 1} Pertemuan`;
                return (
                  <option key={val} value={val}>
                    {val}
                  </option>
                );
              })}
              {formData.jumlahPertemuan &&
                !Array.from({ length: 20 }, (_, i) => `${i + 1} Pertemuan`).includes(
                  formData.jumlahPertemuan
                ) && (
                  <option value={formData.jumlahPertemuan}>
                    {formData.jumlahPertemuan}
                  </option>
                )}
            </select>
          </div>
        </div>

        {/* Row 3: Capaian Pembelajaran (CP) with Catalog Picker */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
            <label htmlFor="input-cp" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
              <span>Capaian Pembelajaran (CP)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-semibold border transition-all ${
                  isMataPelajaranAgama(formData.namaMapel)
                    ? 'text-amber-900 bg-amber-100/90 border-amber-300 ring-1 ring-amber-400/30'
                    : 'text-emerald-800 bg-emerald-100/80 border-emerald-300'
                }`}
              >
                Sheet {formData.jenjang} &bull; {getCpReferenceShort(formData.namaMapel)}
              </span>
            </label>
            <button
              id="btn-open-cp-catalog"
              type="button"
              onClick={() => setShowCpModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buka Katalog CP {formData.jenjang} ({jenjangCps.length} CP)</span>
            </button>
          </div>

          {/* Quick inline selector if user already selected a Mapel */}
          {formData.namaMapel ? (
            quickRelevantCps.length > 0 ? (
              <div className="mb-2.5 p-2.5 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Sparkle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      Pilihan CP untuk {formData.namaMapel}
                    </span>
                    {formData.faseKelas && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                        {formData.faseKelas}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        isMataPelajaranAgama(formData.namaMapel)
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {getCpReferenceShort(formData.namaMapel)}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {quickRelevantCps.length} elemen CP sesuai
                  </span>
                </div>
                <select
                  aria-label="Pilih Cepat Capaian Pembelajaran dari Elemen"
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800 shadow-2xs cursor-pointer"
                  value=""
                  onChange={(e) => {
                    const found = quickRelevantCps.find((c) => c.id === e.target.value);
                    if (found) handleSelectCp(found);
                  }}
                >
                  <option value="">
                    👉 Klik di sini untuk memilih Capaian Pembelajaran (CP) berdasarkan Elemen...
                  </option>
                  {quickRelevantCps.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      [{cp.fase}{cp.kelas ? ` • ${cp.kelas}` : ''}] Elemen: {cp.elemen || 'Umum'} — {cp.deskripsi.slice(0, 95)}...
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-2 p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                <span className="text-amber-800">
                  Tidak ada data CP otomatis di sheet untuk {formData.namaMapel} ({formData.faseKelas || 'Fase ini'}). Anda dapat membuka katalog lengkap atau mengetik CP langsung di bawah.
                </span>
                <button
                  type="button"
                  onClick={() => setShowCpModal(true)}
                  className="shrink-0 font-semibold text-emerald-700 underline hover:text-emerald-800"
                >
                  Buka Katalog
                </button>
              </div>
            )
          ) : (
            <div className="mb-2 p-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Silakan pilih <strong>Mata Pelajaran</strong> dan <strong>Fase / Kelas</strong> di atas untuk menampilkan pilihan Capaian Pembelajaran (CP) yang sesuai.</span>
            </div>
          )}

          <textarea
            id="input-cp"
            rows={3}
            value={formData.capaianPembelajaran}
            onChange={(e) => onChange('capaianPembelajaran', e.target.value)}
            placeholder="Teks Capaian Pembelajaran (CP) resmi akan terisi otomatis saat Anda memilih dari katalog di atas, atau Anda dapat mengetik/mengeditnya langsung di sini..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 leading-relaxed"
          />
        </div>

        {/* Row 4: Materi Pembelajaran / Pokok */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="input-materi-pembelajaran" className="text-xs font-semibold text-slate-700">
              Materi Pembelajaran / Materi Pokok <span className="text-rose-500">*</span>
            </label>
            {(formData.namaMapel?.toLowerCase().includes('islam') ||
              formData.materiPembelajaran?.toLowerCase().includes('hijai') ||
              formData.materiPembelajaran?.toLowerCase().includes('harakat')) && (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="font-serif font-bold text-xs" dir="rtl">اَ بَ تَ</span>
                <span>Standar Hijaiyah & Harakat Arab Aktif</span>
              </span>
            )}
          </div>
          <input
            id="input-materi-pembelajaran"
            type="text"
            value={formData.materiPembelajaran}
            onChange={(e) => onChange('materiPembelajaran', e.target.value)}
            placeholder="Contoh: Mengenal Huruf Hijaiyah Berharakat dan Bersambung / Metamorfosis Hewan"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Row 5: Tujuan Pembelajaran (TP) with AI Draft helper */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="input-tujuan-pembelajaran" className="text-xs font-semibold text-slate-700">
              Tujuan Pembelajaran (TP) <span className="text-rose-500">*</span>
            </label>
            <button
              id="btn-auto-draft-tp"
              type="button"
              onClick={handleAutoDraftTP}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 transition-colors cursor-pointer"
              title="Buat draf tujuan pembelajaran otomatis dari materi pokok"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Drafkan Otomatis</span>
            </button>
          </div>
          <textarea
            id="input-tujuan-pembelajaran"
            rows={3}
            value={formData.tujuanPembelajaran}
            onChange={(e) => onChange('tujuanPembelajaran', e.target.value)}
            placeholder="Tuliskan tujuan pembelajaran operasional, misal:&#10;1. Peserta didik dapat menganalisis konsep...&#10;2. Peserta didik dapat merancang produk..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 leading-relaxed"
          />
        </div>

        {/* Row 6: Dimensi Profil Lulusan / Pelajar Pancasila (Checklist multi-select) */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Dimensi Profil Lulusan (Bisa memilih lebih dari 1)
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              {formData.profilLulusan.length} dipilih
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIMENSI_PROFIL_LULUSAN.map((dimensi) => {
              const isChecked = formData.profilLulusan.includes(dimensi);
              return (
                <button
                  key={dimensi}
                  type="button"
                  onClick={() => toggleProfilLulusan(dimensi)}
                  className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate leading-tight">{dimensi}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 7: Pemanfaatan Digitalisasi Pembelajaran (Checklist + Custom) */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5 text-sky-600" />
              Pemanfaatan Digitalisasi Pembelajaran (Bisa memilih lebih dari 1)
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              {formData.digitalisasi.length} media dipilih
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIGITALISASI_DEFAULT_OPTIONS.map((item) => {
              const isChecked = formData.digitalisasi.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleDigitalisasi(item)}
                  className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-sky-50 border-sky-500 text-sky-900 font-semibold shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate leading-tight">{item}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Digital Media input */}
          <div className="mt-2">
            <input
              id="input-digital-lainnya"
              type="text"
              value={formData.digitalisasiLainnya}
              onChange={(e) => onChange('digitalisasiLainnya', e.target.value)}
              placeholder="Lainnya: ketik media digital/aplikasi khusus jika ada (misal: PhET Sim, Padlet, Assemblr Edu)..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Catalog CP Modal - Full Sheet Data Viewer & Selector */}
      {showCpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shadow-inner">
                  <BookMarked className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2 flex-wrap">
                    <span>Katalog Capaian Pembelajaran (CP) - Jenjang {formData.jenjang}</span>
                    <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full font-semibold">
                      Sheet {formData.jenjang}
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-100 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>Rujukan Regulasi CP:</span>
                    <span className="font-semibold text-white bg-black/25 px-2 py-0.5 rounded text-[11px] shadow-2xs">
                      {selectedModalMapel !== 'all'
                        ? `${selectedModalMapel} — ${getCpReferenceFull(selectedModalMapel)}`
                        : formData.namaMapel
                          ? `${getCpReferenceShort(formData.namaMapel)} (Aktif: ${formData.namaMapel})`
                          : 'Kepka BKPDM No. 020/2026 (Agama) & BSKAP No. 046/2025 (Umum)'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCpModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-emerald-700/80 transition-colors cursor-pointer"
                title="Tutup Katalog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={cpSearchQuery}
                  onChange={(e) => setCpSearchQuery(e.target.value)}
                  placeholder="Cari materi, elemen, fase, kelas, atau kata kunci Capaian Pembelajaran..."
                  className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 shadow-2xs"
                />
                {cpSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCpSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                {/* Filter Mapel */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mata Pelajaran:
                  </label>
                  <select
                    value={selectedModalMapel}
                    onChange={(e) => {
                      setSelectedModalMapel(e.target.value);
                      setSelectedModalElemen('all');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  >
                    <option value="all">Semua Mata Pelajaran ({availableCatalogMapels.length})</option>
                    {availableCatalogMapels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Fase */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Fase:
                  </label>
                  <select
                    value={selectedModalFase}
                    onChange={(e) => setSelectedModalFase(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  >
                    <option value="all">Semua Fase ({availableCatalogFases.length})</option>
                    {availableCatalogFases.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Elemen */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Elemen:
                  </label>
                  <select
                    value={selectedModalElemen}
                    onChange={(e) => setSelectedModalElemen(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  >
                    <option value="all">Semua Elemen ({availableCatalogElements.length})</option>
                    {availableCatalogElements.map((el) => (
                      <option key={el} value={el}>
                        {el}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status summary, quick sync button, and reset */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-200/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-600 font-medium">
                    Menampilkan <strong className="text-emerald-700 font-bold">{filteredCps.length}</strong> dari{' '}
                    <span className="text-slate-700">{jenjangCps.length}</span> CP {formData.jenjang}
                  </span>

                  {formData.faseKelas && (
                    <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyMatchFaseKelasInModal}
                        onChange={(e) => setOnlyMatchFaseKelasInModal(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span>Hanya sesuai <strong>{formData.faseKelas}</strong></span>
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(formData.namaMapel || formData.faseKelas) && (
                    <button
                      type="button"
                      onClick={handleSyncFiltersWithForm}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/70 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      title="Filter otomatis sesuai Mapel dan Fase pada formulir"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Sesuai Form Guru</span>
                    </button>
                  )}

                  {(selectedModalMapel !== 'all' ||
                    selectedModalFase !== 'all' ||
                    selectedModalElemen !== 'all' ||
                    !onlyMatchFaseKelasInModal ||
                    cpSearchQuery !== '') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-100/50">
              {filteredCps.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center my-auto space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    Tidak ditemukan Capaian Pembelajaran yang cocok
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Coba sesuaikan kata kunci pencarian atau matikan filter Fase/Kelas, atau klik Tampilkan Semua CP.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Tampilkan Semua CP {formData.jenjang}</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredCps.map((cp) => {
                  const isCurrentlySelected =
                    formData.capaianPembelajaran &&
                    formData.capaianPembelajaran.trim() === cp.deskripsi.trim();

                  const isFormMatch =
                    isMapelMatch(formData.namaMapel, cp.mapel) &&
                    isCpMatchingFaseKelas(cp, formData.faseKelas);

                  return (
                    <div
                      key={cp.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrentlySelected
                          ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                          : isFormMatch
                          ? 'bg-white border-emerald-300 ring-1 ring-emerald-400/30 hover:shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Top metadata tags */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {cp.mapel}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                            {cp.fase}
                            {cp.kelas ? ` • ${cp.kelas}` : ''}
                          </span>
                          {cp.elemen && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Elemen: {cp.elemen}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              isMataPelajaranAgama(cp.mapel)
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {getCpReferenceShort(cp.mapel)}
                          </span>
                          {isFormMatch && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                              ✨ Sesuai Pilihan Form
                            </span>
                          )}
                        </div>

                        {isCurrentlySelected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sedang Dipilih</span>
                          </span>
                        )}
                      </div>

                      {/* Description / Capaian Pembelajaran text */}
                      <p className="text-xs text-slate-700 leading-relaxed mb-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 font-normal">
                        {cp.deskripsi}
                      </p>

                      {/* Action Button */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          {cp.jenjang} &bull; {cp.fase}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectCp(cp)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isCurrentlySelected
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:scale-[1.02]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isCurrentlySelected ? 'Terpilih (Gunakan Lagi)' : 'Pilih Capaian Pembelajaran Ini'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Data bersumber langsung dari <strong className="text-slate-700">Sheet {formData.jenjang}</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowCpModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup Katalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
