import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { optimizeImage } from '../utils/imageStorage';

interface SoalImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (dataUrl: string, targetQuestion: string, caption?: string) => void;
  availableQuestions: string[];
}

export const SoalImageModal: React.FC<SoalImageModalProps> = ({
  isOpen,
  onClose,
  onInsertImage,
  availableQuestions,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [targetQuestion, setTargetQuestion] = useState<string>('cursor');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedImage(null);
      setCaption('');
      setErrorMsg(null);
      if (availableQuestions.length > 0) {
        setTargetQuestion(availableQuestions[0]);
      } else {
        setTargetQuestion('cursor');
      }
    }
  }, [isOpen, availableQuestions]);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Harap pilih file gambar (JPG, PNG, WebP, GIF).');
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const optimized = await optimizeImage(file);
      setSelectedImage(optimized);
    } catch (err: any) {
      setErrorMsg('Gagal memproses gambar: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessFile(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleConfirm = () => {
    if (!selectedImage) {
      setErrorMsg('Harap pilih atau tempel gambar terlebih dahulu.');
      return;
    }
    onInsertImage(selectedImage, targetQuestion, caption.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        onPaste={handlePaste}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-sky-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Unggah &amp; Sisipkan Gambar Soal
              </h3>
              <p className="text-[11px] text-sky-200 mt-0.5">
                Pastikan gambar masuk ke lembar naskah soal dan tersimpan permanen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Question Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Nomor Soal yang Membutuhkan Gambar:
            </label>
            <select
              value={targetQuestion}
              onChange={(e) => setTargetQuestion(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
            >
              {availableQuestions.length > 0 ? (
                availableQuestions.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))
              ) : (
                <option value="cursor">Posisi Kursor Saat Ini</option>
              )}
              <option value="top">Bagian Awal Lembar Soal</option>
              <option value="bottom">Bagian Akhir Lembar Soal</option>
            </select>
          </div>

          {/* Upload / Paste Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih File atau Tempel Gambar:
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              className={`p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-sky-500 bg-sky-50/80 scale-[0.99]'
                  : selectedImage
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-slate-300 hover:border-sky-400 bg-slate-50/70 hover:bg-sky-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {isProcessing ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                  <span className="text-xs font-medium">Sedang mengoptimalkan resolusi gambar...</span>
                </div>
              ) : selectedImage ? (
                <div className="space-y-2">
                  <div className="relative inline-block mx-auto max-h-52">
                    <img
                      src={selectedImage}
                      alt="Pratinjau Gambar Soal"
                      className="max-h-48 max-w-full rounded-lg shadow-sm border border-slate-200 object-contain mx-auto bg-white"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
                      title="Hapus / Ganti Gambar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Gambar Siap Disisipkan (Klik untuk mengganti)</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      Klik untuk Unggah Gambar dari Komputer / HP
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Atau seret file gambar ke kotak ini
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 shadow-2xs">
                      💡 Bisa langsung tekan <kbd className="font-bold text-slate-800">Ctrl + V</kbd> untuk tempel
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Caption */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Caption Gambar (Opsional):
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Contoh: Gambar 1: Bagan Metamorfosis Kupu-Kupu"
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Practical Guide */}
          <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Tips Gambar Soal:
            </span>
            <p className="leading-relaxed">
              Jika Anda membuat gambar menggunakan Google Gemini, klik kanan pada gambar di Gemini lalu pilih <strong>&quot;Salin Gambar&quot;</strong>. Kemudian cukup tekan <strong>Ctrl + V</strong> di kotak atas untuk menempelkannya secara instan.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!selectedImage || isProcessing}
            onClick={handleConfirm}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
              selectedImage && !isProcessing
                ? 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white hover:scale-102'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Sisipkan Gambar ke Soal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
