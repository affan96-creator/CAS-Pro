import React from 'react';
import {
  FileText,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Sliders,
  AlertTriangle,
  MonitorPlay,
} from 'lucide-react';
import { DocumentType } from '../types';

interface ActionButtonsProps {
  onGenerate: (type: DocumentType) => void;
  onRequestAsesmen?: () => void;
  onRequestMpi?: () => void;
  isLoading: boolean;
  activeGeneratingType: DocumentType | null;
  disabled?: boolean;
  disabledReason?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGenerate,
  onRequestAsesmen,
  onRequestMpi,
  isLoading,
  activeGeneratingType,
  disabled = false,
  disabledReason,
}) => {
  const isAnyButtonDisabled = isLoading || disabled;

  const handleAsesmenClick = () => {
    if (disabled || isLoading) return;
    if (onRequestAsesmen) {
      onRequestAsesmen();
    } else {
      onGenerate('asesmen');
    }
  };

  const handleMpiClick = () => {
    if (disabled || isLoading) return;
    if (onRequestMpi) {
      onRequestMpi();
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Aksi Pembuatan Perangkat Ajar AI
        </h3>
        <span className="text-[11px] text-slate-500">
          {disabled ? 'Perlu data terdaftar' : 'Pilih salah satu dokumen / media'}
        </span>
      </div>

      {/* Peringatan ketika tombol dinonaktifkan karena nama sekolah/guru tidak terdaftar */}
      {disabled && (
        <div
          id="banner-tombol-nonaktif"
          className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 flex items-start gap-2 text-xs text-rose-800"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Tombol Generate Tidak Aktif:</span>{' '}
            {disabledReason ||
              'Nama Satuan Pendidikan dan Nama Guru Penyusun wajib terdaftar di Spreadsheet sheet KONTROL sebelum membuat dokumen.'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tombol 1: Buat RPPM */}
        <button
          id="btn-generate-rppm"
          type="button"
          disabled={isAnyButtonDisabled}
          onClick={() => !isAnyButtonDisabled && onGenerate('rppm')}
          className={`relative group flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-center ${
            activeGeneratingType === 'rppm'
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg ring-4 ring-blue-100'
              : disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-blue-600 shadow-md shadow-blue-500/20 hover:shadow-lg cursor-pointer'
          } disabled:cursor-not-allowed`}
        >
          {activeGeneratingType === 'rppm' ? (
            <Loader2 className="w-6 h-6 animate-spin mb-1.5 text-white" />
          ) : (
            <FileText
              className={`w-6 h-6 mb-1.5 transition-transform ${
                disabled ? 'text-slate-400' : 'text-blue-100 group-hover:scale-110'
              }`}
            />
          )}
          <span className="font-bold text-sm tracking-wide">1. Buat RPPM</span>
          <span
            className={`text-[10px] font-normal mt-0.5 ${
              disabled ? 'text-slate-400' : 'text-blue-100'
            }`}
          >
            Rencana Pelaksanaan Pembelajaran Mendalam
          </span>
        </button>

        {/* Tombol 2: Buat LKPD */}
        <button
          id="btn-generate-lkpd"
          type="button"
          disabled={isAnyButtonDisabled}
          onClick={() => !isAnyButtonDisabled && onGenerate('lkpd')}
          className={`relative group flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-center ${
            activeGeneratingType === 'lkpd'
              ? 'bg-purple-600 border-purple-600 text-white shadow-lg ring-4 ring-purple-100'
              : disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-purple-600 shadow-md shadow-purple-500/20 hover:shadow-lg cursor-pointer'
          } disabled:cursor-not-allowed`}
        >
          {activeGeneratingType === 'lkpd' ? (
            <Loader2 className="w-6 h-6 animate-spin mb-1.5 text-white" />
          ) : (
            <FileSpreadsheet
              className={`w-6 h-6 mb-1.5 transition-transform ${
                disabled ? 'text-slate-400' : 'text-purple-100 group-hover:scale-110'
              }`}
            />
          )}
          <span className="font-bold text-sm tracking-wide">2. Buat LKPD</span>
          <span
            className={`text-[10px] font-normal mt-0.5 ${
              disabled ? 'text-slate-400' : 'text-purple-100'
            }`}
          >
            Lembar Kerja Peserta Didik Interaktif
          </span>
        </button>

        {/* Tombol 3: Buat Asesmen */}
        <button
          id="btn-generate-asesmen"
          type="button"
          disabled={isAnyButtonDisabled}
          onClick={handleAsesmenClick}
          className={`relative group flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-center ${
            activeGeneratingType === 'asesmen'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg ring-4 ring-emerald-100'
              : disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-emerald-600 shadow-md shadow-emerald-500/20 hover:shadow-lg cursor-pointer'
          } disabled:cursor-not-allowed`}
        >
          {activeGeneratingType === 'asesmen' ? (
            <Loader2 className="w-6 h-6 animate-spin mb-1.5 text-white" />
          ) : (
            <div className="relative">
              <CheckCircle2
                className={`w-6 h-6 mb-1.5 transition-transform ${
                  disabled ? 'text-slate-400' : 'text-emerald-100 group-hover:scale-110'
                }`}
              />
              <Sliders
                className={`w-3 h-3 absolute -bottom-0.5 -right-1 ${
                  disabled ? 'text-slate-400' : 'text-amber-300'
                }`}
              />
            </div>
          )}
          <span className="font-bold text-sm tracking-wide">3. Buat Asesmen</span>
          <span
            className={`text-[10px] font-normal mt-0.5 ${
              disabled ? 'text-slate-400' : 'text-emerald-100'
            }`}
          >
            Diagnostik, Formatif, Sumatif & Soal
          </span>
        </button>

        {/* Tombol 4: Buat MPI (Media Pembelajaran Interaktif) */}
        <button
          id="btn-generate-mpi"
          type="button"
          disabled={isAnyButtonDisabled}
          onClick={handleMpiClick}
          className={`relative group flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-center ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white border-amber-600 shadow-md shadow-amber-500/20 hover:shadow-lg cursor-pointer'
          } disabled:cursor-not-allowed`}
        >
          <MonitorPlay
            className={`w-6 h-6 mb-1.5 transition-transform ${
              disabled ? 'text-slate-400' : 'text-amber-100 group-hover:scale-110'
            }`}
          />
          <span className="font-bold text-sm tracking-wide">4. Buat MPI</span>
          <span
            className={`text-[10px] font-normal mt-0.5 ${
              disabled ? 'text-slate-400' : 'text-amber-100'
            }`}
          >
            Media Pembelajaran Interaktif (Canvas • Offline Ready)
          </span>
        </button>
      </div>
    </div>
  );
};

