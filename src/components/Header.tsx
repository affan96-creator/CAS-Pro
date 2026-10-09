import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  History,
  RotateCcw,
  GraduationCap,
  Layers,
  Globe,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { SAMPLE_PRESETS } from '../data/kurikulumData';
import { FormState } from '../types';

interface HeaderProps {
  onLoadPreset: (preset: FormState) => void;
  onReset: () => void;
  onOpenHistory: () => void;
  onOpenGoogleCanvasGuide: () => void;
  onOpenLogoMeaning?: () => void;
  onLogout?: () => void;
  currentUser?: string;
  showGoogleCanvasButton?: boolean;
  showPresetButton?: boolean;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadPreset,
  onReset,
  onOpenHistory,
  onOpenGoogleCanvasGuide,
  onOpenLogoMeaning,
  onLogout,
  currentUser = 'Admin',
  showGoogleCanvasButton = true,
  showPresetButton = true,
  historyCount,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-sky-950 to-emerald-950 text-white shadow-lg border-b border-sky-800/40 no-print backdrop-blur-md shrink-0">
      <div className="w-full max-w-[1800px] mx-auto px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <button
                id="btn-show-logo-meaning"
                type="button"
                onClick={onOpenLogoMeaning}
                title="Klik untuk melihat Makna & Filosofi Logo Cipta Ajar Suit Pro"
                className="group/logo-btn relative w-11 h-11 rounded-xl overflow-hidden shadow-md shadow-emerald-500/20 ring-2 ring-white/20 flex items-center justify-center bg-slate-900/80 hover:ring-emerald-400 transition-all cursor-pointer"
              >
                {!imgError ? (
                  <img
                    src="/logo.png"
                    alt="Logo Cipta Ajar Suit Pro"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-slate-950" />
                  </div>
                )}

                {/* Hover Makna Logo Overlay */}
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] opacity-0 group-hover/logo-btn:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                  <span className="text-[7.5px] font-bold tracking-tight text-emerald-200 mt-0.5">Makna</span>
                </div>
              </button>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                  CAS Pro
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cipta Ajar Suit Pro
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5 mt-0.5">
                <span>Generator RPPM, Asesmen & Rubrik, LKPD serta Pembuatan MPI Terpadu Berbasis AI</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            {/* Preset Selector (Hidden on public/embed views) */}
            {showPresetButton && (
              <div className="relative group">
                <button
                  id="btn-preset-dropdown"
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-sky-100 transition-colors border border-white/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Muat Contoh Cepat</span>
                </button>
                <div className="absolute right-0 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Pilih Contoh Kurikulum
                  </div>
                  {SAMPLE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onLoadPreset(preset.data)}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:bg-sky-900/60 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Google / Canvas Guide Button (hidden on public / embed views) */}
            {showGoogleCanvasButton && (
              <button
                id="btn-open-google-canvas"
                type="button"
                onClick={onOpenGoogleCanvasGuide}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white transition-all shadow-sm border border-sky-400/30 cursor-pointer"
                title="Panduan & Tautan Buka di Google Chrome (PWA seperti Google Canvas), Google Sites, Classroom, atau Canvas LMS"
              >
                <Globe className="w-3.5 h-3.5 text-sky-200" />
                <span>Buka di Google / Canvas</span>
              </button>
            )}

            {/* History Button */}
            <button
              id="btn-history-open"
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors shadow-sm"
              title="Lihat riwayat dokumen yang telah dibuat"
            >
              <History className="w-3.5 h-3.5" />
              <span>Histori</span>
              {historyCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white text-emerald-900 text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Reset Form Button */}
            <button
              id="btn-reset-form"
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
              title="Kosongkan formulir"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* User Badge & Logout Button */}
            {onLogout && (
              <div className="flex items-center gap-1.5 border-l border-slate-700/80 pl-2 sm:pl-2.5">
                <div
                  className="hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-sky-200 border border-slate-700/80"
                  title="Pengguna aktif saat ini"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-white">{currentUser}</span>
                </div>
                <button
                  id="btn-header-logout"
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 transition-all cursor-pointer shadow-sm"
                  title="Keluar dari akun dan kembali ke halaman login"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
