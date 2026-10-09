import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Lock,
  XCircle,
} from 'lucide-react';
import { FormState, JenjangPendidikan, JabatanGuru } from '../types';
import { JENJANG_OPTIONS } from '../data/kurikulumData';
import {
  SpreadsheetKontrolRow,
  findMatchingRow,
  isSchoolRegistered,
  isTeacherRegistered,
  isValidSchoolAndTeacher,
  findTeacherWithPunctuationMismatch,
  normalizeName,
} from '../data/spreadsheetKontrolData';

interface SchoolIdentityCardProps {
  formData: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  onJenjangChange: (jenjang: JenjangPendidikan) => void;
  spreadsheetRows: SpreadsheetKontrolRow[];
  isSpreadsheetLoading?: boolean;
  isSpreadsheetSynced?: boolean;
  onRefreshSpreadsheet?: () => void;
}

export const SchoolIdentityCard: React.FC<SchoolIdentityCardProps> = ({
  formData,
  onChange,
  onJenjangChange,
  spreadsheetRows,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Background Verification:
  // 1. Apakah nama sekolah yang diketik terdaftar di sheet KONTROL?
  const isSchoolValid = useMemo(() => {
    if (!formData.namaSekolah.trim()) return null; // belum diisi
    return isSchoolRegistered(spreadsheetRows, formData.namaSekolah);
  }, [spreadsheetRows, formData.namaSekolah]);

  // 2. Apakah nama guru yang diketik terdaftar di sheet KONTROL?
  const isTeacherValidAnywhere = useMemo(() => {
    if (!formData.namaGuru.trim()) return null; // belum diisi
    return isTeacherRegistered(spreadsheetRows, formData.namaGuru);
  }, [spreadsheetRows, formData.namaGuru]);

  // 3. Apakah pasangan nama sekolah dan guru cocok persis di spreadsheet?
  const matchedRow = useMemo(() => {
    return findMatchingRow(
      spreadsheetRows,
      formData.namaSekolah,
      formData.namaGuru,
      formData.jabatan
    );
  }, [spreadsheetRows, formData.namaSekolah, formData.namaGuru, formData.jabatan]);

  const isExactPairValid = useMemo(() => {
    if (!formData.namaSekolah.trim() || !formData.namaGuru.trim()) return false;
    return isValidSchoolAndTeacher(spreadsheetRows, formData.namaSekolah, formData.namaGuru);
  }, [spreadsheetRows, formData.namaSekolah, formData.namaGuru]);

  // Deteksi jika huruf cocok namun tanda koma (,) atau titik (.) berbeda
  const punctuationMismatchGuru = useMemo(() => {
    if (!formData.namaGuru.trim() || isTeacherValidAnywhere) return undefined;
    return findTeacherWithPunctuationMismatch(
      spreadsheetRows,
      formData.namaGuru,
      formData.namaSekolah
    );
  }, [spreadsheetRows, formData.namaGuru, formData.namaSekolah, isTeacherValidAnywhere]);

  // SINKRONISASI OTOMATIS DI LATAR BELAKANG:
  // Ketika nama sekolah & nama guru yang diketik pengguna cocok dengan data di spreadsheet:
  // - Jabatan Guru otomatis menyesuaikan dengan Kontrol Jabatan Guru di sheet KONTROL
  // - Jenjang otomatis menyesuaikan jika berbeda
  // - Mata pelajaran otomatis sinkron ke mata pelajaran guru tersebut
  useEffect(() => {
    if (matchedRow) {
      if (formData.jabatan !== matchedRow.kontrolJabatanGuru) {
        onChange('jabatan', matchedRow.kontrolJabatanGuru);
      }
      if (matchedRow.jenjang && matchedRow.jenjang !== formData.jenjang) {
        onJenjangChange(matchedRow.jenjang);
      }
      if (
        matchedRow.mataPelajaran.length > 0 &&
        (!formData.namaMapel || !matchedRow.mataPelajaran.includes(formData.namaMapel))
      ) {
        onChange('namaMapel', matchedRow.mataPelajaran[0]);
      }
    }
  }, [matchedRow, formData.jabatan, formData.jenjang, formData.namaMapel, onChange, onJenjangChange]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200">
      {/* Header Kartu */}
      <button
        id="btn-toggle-school-identity"
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-semibold text-xs border border-sky-200">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              1. Identitas Satuan Pendidikan & Guru
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {formData.jenjang}
              </span>
              {isExactPairValid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Terdaftar di Sheet KONTROL
                </span>
              ) : isSchoolValid === false || isTeacherValidAnywhere === false ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  Ada Data Tidak Terdaftar
                </span>
              ) : null}
            </h2>
            <p className="text-xs text-slate-500">
              Ketik nama satuan pendidikan dan nama guru secara manual. Sistem otomatis memverifikasi kecocokan di latar belakang.
            </p>
          </div>
        </div>
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Konten Kartu */}
      {isExpanded && (
        <div className="p-4 space-y-3.5 bg-white">
          {/* Baris 1: Jenjang & Kotak Isian Nama Satuan Pendidikan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="input-jenjang" className="block text-xs font-semibold text-slate-700 mb-1">
                Jenjang Pendidikan <span className="text-rose-500">*</span>
              </label>
              <select
                id="input-jenjang"
                value={formData.jenjang}
                onChange={(e) => onJenjangChange(e.target.value as JenjangPendidikan)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800"
              >
                {JENJANG_OPTIONS.map((jenjang) => (
                  <option key={jenjang} value={jenjang}>
                    {jenjang} (Sekolah {jenjang === 'SD' ? 'Dasar' : jenjang === 'SMP' ? 'Menengah Pertama' : jenjang === 'SMA' ? 'Menengah Atas' : 'Menengah Kejuruan'})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-nama-sekolah" className="text-xs font-semibold text-slate-700">
                  Nama Satuan Pendidikan <span className="text-rose-500">*</span>
                </label>
                {isSchoolValid === true && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Sekolah Terdaftar
                  </span>
                )}
                {isSchoolValid === false && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    Tidak Terdaftar
                  </span>
                )}
              </div>

              {/* KOTAK UNTUK MENGETIK / MENGISI NAMA SATUAN PENDIDIKAN (BUKAN DROPDOWN) */}
              <input
                id="input-nama-sekolah"
                type="text"
                value={formData.namaSekolah}
                onChange={(e) => onChange('namaSekolah', e.target.value)}
                placeholder="Ketik nama satuan pendidikan, contoh: SD Negeri 1 Merdeka"
                className={`w-full px-3 py-2 text-xs font-medium rounded-lg border focus:ring-2 focus:outline-none transition-colors ${
                  isSchoolValid === false
                    ? 'bg-rose-50/50 border-rose-300 text-rose-900 focus:ring-rose-400 focus:border-rose-400'
                    : isSchoolValid === true
                    ? 'bg-emerald-50/30 border-emerald-300 text-slate-800 focus:ring-emerald-400 focus:border-emerald-400'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-sky-500 focus:border-sky-500'
                }`}
              />

              {/* PERINGATAN OTOMATIS JIKA NAMA SATUAN PENDIDIKAN TIDAK TERDAFTAR */}
              {isSchoolValid === false && (
                <div
                  id="warning-sekolah-tidak-terdaftar"
                  className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-1.5 text-[11px] text-rose-800"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Peringatan:</strong> Nama satuan pendidikan{' '}
                    <u>"{formData.namaSekolah}"</u> <strong>tidak terdaftar</strong> di data sheet KONTROL pada spreadsheet.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Baris 2: Kotak Isian Nama Guru Penyusun, NIP Guru, Jabatan Guru Otomatis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-nama-guru" className="text-xs font-semibold text-slate-700">
                  Nama Guru Penyusun <span className="text-rose-500">*</span>
                </label>
                {isExactPairValid ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Guru Sesuai
                  </span>
                ) : isTeacherValidAnywhere === false ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    Tidak Terdaftar
                  </span>
                ) : null}
              </div>

              {/* KOTAK UNTUK MENGETIK / MENGISI NAMA GURU PENYUSUN (BUKAN DROPDOWN) */}
              <input
                id="input-nama-guru"
                type="text"
                value={formData.namaGuru}
                onChange={(e) => onChange('namaGuru', e.target.value)}
                placeholder="Ketik nama guru penyusun, contoh: Rista Kasaraeng, SPd"
                className={`w-full px-3 py-2 text-xs font-medium rounded-lg border focus:ring-2 focus:outline-none transition-colors ${
                  formData.namaGuru.trim() && isTeacherValidAnywhere === false
                    ? 'bg-rose-50/50 border-rose-300 text-rose-900 focus:ring-rose-400 focus:border-rose-400'
                    : isExactPairValid
                    ? 'bg-emerald-50/30 border-emerald-300 text-slate-800 focus:ring-emerald-400 focus:border-emerald-400'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-sky-500 focus:border-sky-500'
                }`}
              />

              {/* PERINGATAN OTOMATIS JIKA NAMA GURU PENYUSUN TIDAK TERDAFTAR ATAU TANDA BACA BERBEDA */}
              {formData.namaGuru.trim() && isTeacherValidAnywhere === false && (
                <div
                  id="warning-guru-tidak-terdaftar"
                  className="mt-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-[11px] text-rose-800"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    {punctuationMismatchGuru ? (
                      <div>
                        <div className="font-semibold text-rose-900">
                          Peringatan Tanda Baca: Tanda koma (,) atau titik (.) belum sama persis dengan spreadsheet.
                        </div>
                        <p className="text-[10px] text-rose-700 mt-0.5">
                          Di sheet KONTROL tertulis:{' '}
                          <strong className="underline decoration-rose-400 font-mono text-slate-800">
                            "{punctuationMismatchGuru}"
                          </strong>
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onChange('namaGuru', punctuationMismatchGuru)}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] cursor-pointer shadow-xs transition-colors"
                          >
                            Sesuaikan dengan Format Resmi
                          </button>
                          <span className="text-[9px] text-slate-500">
                            (Huruf besar/kecil terbaca sama, tanda koma & titik wajib sama)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>Peringatan:</strong> Nama guru <u>"{formData.namaGuru}"</u>{' '}
                        <strong>tidak terdaftar</strong> di data sheet KONTROL pada spreadsheet.
                        <p className="text-[10px] text-rose-600 mt-0.5">
                          Pastikan penulisan nama guru dan gelar (termasuk tanda koma dan titik) sesuai dengan sheet KONTROL.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PERINGATAN JIKA GURU TERDAFTAR TAPI DI SEKOLAH LAIN */}
              {formData.namaGuru.trim() &&
                isTeacherValidAnywhere === true &&
                isSchoolValid === true &&
                !isExactPairValid && (
                  <div
                    id="warning-guru-beda-sekolah"
                    className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-1.5 text-[11px] text-amber-800"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Peringatan:</strong> Guru "{formData.namaGuru}" terdaftar di spreadsheet, namun tidak tercatat mengajar di satuan pendidikan "{formData.namaSekolah}".
                    </div>
                  </div>
                )}
            </div>

            <div>
              <label htmlFor="input-nip-guru" className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Guru
              </label>
              <input
                id="input-nip-guru"
                type="text"
                value={formData.nipGuru}
                onChange={(e) => onChange('nipGuru', e.target.value)}
                placeholder="19880512 201101 2 008 atau -"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-jabatan-guru" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  Jabatan Guru
                  {matchedRow && <Lock className="w-3 h-3 text-emerald-600" />}
                </label>
                {matchedRow && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Otomatis Menyesuaikan
                  </span>
                )}
              </div>

              {/* KOTAK JABATAN GURU MENYESUAIKAN OTOMATIS */}
              <div className="relative">
                <input
                  id="input-jabatan-guru"
                  type="text"
                  readOnly={Boolean(matchedRow)}
                  value={formData.jabatan}
                  onChange={(e) => {
                    if (!matchedRow) {
                      onChange('jabatan', e.target.value as JabatanGuru);
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border ${
                    matchedRow
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900 cursor-not-allowed pr-8'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
                {matchedRow && (
                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-500 mt-1">
                {matchedRow
                  ? `✓ Disesuaikan otomatis dengan kolom "Kontrol Jabatan Guru" (${matchedRow.kontrolJabatanGuru}).`
                  : 'Ketik nama sekolah & nama guru yang cocok di spreadsheet agar jabatan terisi otomatis.'}
              </p>
            </div>
          </div>

          {/* Baris 3: Kepala Sekolah, NIP, Tempat & Tanggal TTD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label htmlFor="input-nama-kepsek" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kepala Sekolah
              </label>
              <input
                id="input-nama-kepsek"
                type="text"
                value={formData.namaKepalaSekolah}
                onChange={(e) => onChange('namaKepalaSekolah', e.target.value)}
                placeholder="Contoh: Drs. H. Bambang Sujatmiko, M.Pd."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="input-nip-kepsek" className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                id="input-nip-kepsek"
                type="text"
                value={formData.nipKepalaSekolah}
                onChange={(e) => onChange('nipKepalaSekolah', e.target.value)}
                placeholder="19680315 199403 1 005 atau -"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="input-tempat-ttd" className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat TTD
              </label>
              <input
                id="input-tempat-ttd"
                type="text"
                value={formData.tempatTtd}
                onChange={(e) => onChange('tempatTtd', e.target.value)}
                placeholder="Contoh: Merdeka"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="input-tanggal-ttd" className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal TTD
              </label>
              <input
                id="input-tanggal-ttd"
                type="text"
                value={formData.tanggalTtd || '14 Juli 2025'}
                onChange={(e) => onChange('tanggalTtd', e.target.value)}
                placeholder="Contoh: 14 Juli 2025"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
