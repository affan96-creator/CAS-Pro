import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  MonitorPlay,
  Layers,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/exportUtils';

interface MpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
}

export const MpiModal: React.FC<MpiModalProps> = ({
  isOpen,
  onClose,
  promptText,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAgain = async () => {
    const ok = await copyTextToClipboard(promptText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenGeminiCanvas = () => {
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="modal-mpi-prompt"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white p-4 sm:p-5 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <MonitorPlay className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Media Pembelajaran Interaktif (MPI)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/25 text-white border border-white/30">
                  Gemini Canvas • 100% Offline
                </span>
              </h2>
              <p className="text-xs text-amber-100">
                Prompt otomatis telah disalin ke clipboard — dirancang agar aplikasi yang diunduh dapat digunakan tanpa jaringan internet
              </p>
            </div>
          </div>
          <button
            id="btn-close-mpi-modal"
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-700">
          {/* Success Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-3">
            <div className="p-1 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
              <strong className="font-bold">Prompt Berhasil Disalin Otomatis!</strong>
              <p className="text-xs text-emerald-800 mt-0.5">
                Tab Google Gemini Canvas sedang atau telah terbuka di peramban Anda. Anda cukup menekan tombol <strong>Ctrl + V</strong> (atau <strong>Cmd + V</strong> di Mac) pada kolom input chat Gemini Canvas, lalu tekan <strong>Enter</strong>.
              </p>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              id="btn-open-gemini-canvas-again"
              type="button"
              onClick={handleOpenGeminiCanvas}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Gemini Canvas</span>
            </button>

            <button
              id="btn-copy-mpi-prompt-again"
              type="button"
              onClick={handleCopyAgain}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Salin Ulang Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Prompt Highlights & Structure Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                Fokus Pedagogis:
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Tujuan &amp; Materi Pembelajaran, Langkah Inti (Memahami, Mengaplikasikan, Merefleksikan).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-orange-600" />
                6 Bagian Wajib MPI:
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Halaman Awal, Menu Utama, Tujuan, Materi Modular, Kuis Interaktif, dan Penutup Motivasi.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-1">
              <span className="font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                100% Offline Standalone:
              </span>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                File .html yang diunduh langsung dapat dijalankan di laptop/HP tanpa kuota internet atau sinyal WiFi.
              </p>
            </div>
          </div>

          {/* Prompt Preview Box */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Teks Prompt yang Disalin:
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {promptText.length} karakter
              </span>
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={promptText}
                rows={8}
                className="w-full p-3 text-[11px] font-mono bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 shadow-inner resize-none focus:outline-none leading-relaxed selection:bg-emerald-700 selection:text-white"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Cipta Ajar Suit Pro • Standar Kurikulum Merdeka BSKAP
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
