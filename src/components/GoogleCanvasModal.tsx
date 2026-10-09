import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Monitor,
  LayoutTemplate,
  GraduationCap,
  Sparkles,
  Layers,
  BookOpen,
  Share2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/exportUtils';

interface GoogleCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'pwa' | 'sites' | 'classroom' | 'canvas-lms' | 'docs';

export const GoogleCanvasModal: React.FC<GoogleCanvasModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('pwa');
  const [urlCopied, setUrlCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  if (!isOpen) return null;

  // IMPORTANT: In Google AI Studio, "ais-dev-*" is the private developer URL which throws
  // "403 Forbidden" when opened by other Google accounts.
  // The public shareable URL is "ais-pre-*", accessible by anyone without authentication!
  const getPublicSharedUrl = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('ais-dev-')) {
        return origin.replace('ais-dev-', 'ais-pre-');
      }
      if (origin.includes('ais-pre-')) {
        return origin;
      }
    }
    return 'https://ais-pre-wjxjg46otpotiatutuk7pi-222698544668.asia-southeast1.run.app';
  };

  const publicUrlBase = getPublicSharedUrl();
  const publicUrl = `${publicUrlBase}?public=true`;
  const embedCode = `<iframe src="${publicUrlBase}?embed=true" width="100%" height="850" frameborder="0" style="border:none; border-radius:12px; width:100%; min-height:850px;" allow="clipboard-read; clipboard-write; storage-access; fullscreen" allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;

  const handleCopyUrl = async () => {
    const success = await copyTextToClipboard(publicUrl);
    if (success) {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    }
  };

  const handleCopyEmbed = async () => {
    const success = await copyTextToClipboard(embedCode);
    if (success) {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2500);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="modal-google-canvas-guide"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-emerald-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-sky-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Akses &amp; Buka via Google / Canvas</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PWA &amp; Embed Ready
                </span>
              </h2>
              <p className="text-xs text-sky-200/80">
                Panduan membuka sebagai aplikasi Chrome (seperti Google Canvas), Google Sites, Classroom, atau Canvas LMS
              </p>
            </div>
          </div>
          <button
            id="btn-close-google-canvas-modal"
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-700">
          
          {/* 404 / Share Activation Guide Banner */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1.5">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 flex-wrap">
                <span>Langkah Wajib: Aktifkan Tautan via Tombol "Share" di Google AI Studio</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-semibold">
                  Mencegah Error 404
                </span>
              </span>
              <p className="text-slate-700 leading-relaxed">
                Jika saat membuka tautan publik muncul pesan <em>"Error: Page not found - The requested URL was not found on this server (404)"</em>, hal tersebut terjadi karena aplikasi <strong>belum dipublikasikan/dideploy oleh Google Cloud Run</strong>.
              </p>
              <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200 text-slate-800 space-y-1">
                <p className="font-semibold text-amber-900">Cara mengaktifkannya sangat mudah:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>Lihat ke pojok kanan atas jendela <strong>Google AI Studio</strong> (di atas jendela pratinjau).</li>
                  <li>Klik tombol biru <strong>"Share"</strong> (atau ikon Bagikan).</li>
                  <li>Pada jendela pop-up yang muncul, pilih visibilitas <strong>"Anyone with the link"</strong> lalu klik <strong>Publish / Update</strong>.</li>
                  <li>Tunggu beberapa detik hingga proses deploy Google Cloud selesai. Setelah itu, tautan publik di bawah akan langsung aktif dan bisa dibuka oleh akun email manapun!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Quick Access Box: URL & Embed Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Live Web Link */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  Tautan Langsung Publik (URL)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gunakan tautan ini untuk membuka di browser Google Chrome akun lain, disimpan ke bookmark, atau dibagikan.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 select-all font-semibold"
                />
                <button
                  id="btn-copy-url-modal"
                  type="button"
                  onClick={handleCopyUrl}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {urlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{urlCopied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  id="btn-open-tab-modal"
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Uji Buka di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Iframe Embed Code */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  Kode Sematkan (Embed Iframe)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tempelkan ke Google Sites, Canvas LMS, atau portal web sekolah agar tampil langsung di halaman.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={embedCode}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 select-all"
                />
                <button
                  id="btn-copy-embed-modal"
                  type="button"
                  onClick={handleCopyEmbed}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {embedCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{embedCopied ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clean View Guarantee Note */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-sky-900">
            <span className="text-base shrink-0">✨</span>
            <p className="leading-relaxed">
              <strong>Tampilan Bersih Otomatis:</strong> Saat tautan publik dibuka atau disematkan di Google Sites/Canvas LMS, tombol <em>"Muat Contoh Cepat"</em> dan tombol <em>"Buka di Google / Canvas"</em> <strong>secara otomatis tidak akan ditampilkan</strong> di layar publik agar antarmuka guru dan murid tetap bersih, rapi, dan profesional.
            </p>
          </div>

          {/* Integration Guide Tabs */}
          <div>
            <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('pwa')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === 'pwa'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>1. Aplikasi Chrome PWA (Seperti Google Canvas)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sites')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === 'sites'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>2. Google Sites</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('classroom')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === 'classroom'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>3. Google Classroom</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('canvas-lms')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === 'canvas-lms'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>4. Canvas LMS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === 'docs'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>5. Google Docs &amp; Gemini</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="pt-4 text-xs leading-relaxed space-y-3">
              {activeTab === 'pwa' && (
                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Jadikan Aplikasi Mandiri di Google Chrome / Chromebook (Mode PWA)
                      </h4>
                      <p className="text-slate-600 mt-0.5">
                        Sama seperti aplikasi <strong>Google Canvas</strong> (<em>canvas.apps.chrome.com</em>), aplikasi <strong>Cipta-Ajar-Suit-Pro</strong> ini telah dilengkapi dukungan PWA (Progressive Web App) sehingga dapat di-install dan dibuka langsung sebagai aplikasi mandiri di laptop, PC, atau Chromebook Anda.
                      </p>
                    </div>
                  </div>

                  <ol className="list-decimal list-inside space-y-2 text-slate-700 pl-1 pt-1">
                    <li className="font-medium">
                      Buka tautan aplikasi ini di browser <strong>Google Chrome</strong>.
                    </li>
                    <li>
                      Di bilah alamat (omnibox) sebelah kanan, cari ikon <strong>"Instal Aplikasi"</strong> (ikon layar kecil berpanah ke bawah), ATAU klik menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas Chrome.
                    </li>
                    <li>
                      Pilih menu <strong>"Simpan dan Bagikan" (Save and Share)</strong> &gt; klik <strong>"Instal aplikasi ini..." (Install as app)</strong>.
                    </li>
                    <li>
                      Klik <strong>"Instal"</strong> pada jendela konfirmasi.
                    </li>
                    <li>
                      Selesai! Aplikasi akan memiliki jendela tersendiri tanpa bilah URL, ikon di desktop / taskbar, dan muncul di daftar aplikasi Google Chrome Anda layaknya Google Canvas.
                    </li>
                  </ol>
                </div>
              )}

              {activeTab === 'sites' && (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <LayoutTemplate className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Panduan Sematkan (Embed) di Google Sites
                      </h4>
                      <p className="text-slate-600 mt-0.5">
                        Aplikasi <strong>Cipta-Ajar-Suit-Pro</strong> dapat disematkan ke dalam Google Sites sekolah agar guru atau murid dapat langsung menggunakannya.
                      </p>
                    </div>
                  </div>

                  {/* Metode 1: Rekomendasi Utama (Menurut URL) */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-300 shadow-xs space-y-2">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-semibold">
                        Metode 1 (Paling Direkomendasikan &amp; 100% Berhasil)
                      </span>
                      <span>Sematkan Menggunakan "Menurut URL" (By URL)</span>
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                      <li>Buka halaman situs Anda di <strong>sites.google.com</strong> dalam mode edit.</li>
                      <li>Di bilah sisi kanan, klik menu <strong>Sisipkan (Insert)</strong> &gt; pilih <strong>Sematkan (Embed)</strong>.</li>
                      <li>Pada jendela pop-up, pilih tab <strong>"Menurut URL" (By URL)</strong>.</li>
                      <li>Tempelkan <strong>Tautan Langsung Publik (URL)</strong> yang telah Anda salin dari kotak di atas.</li>
                      <li>Pilih opsi pratinjau <strong>"Seluruh halaman" (Whole page)</strong>, lalu klik <strong>Sisipkan (Insert)</strong>.</li>
                      <li>Tarik tepi bingkai untuk memperluas tinggi dan lebar tampilan agar nyaman digunakan, kemudian klik <strong>Publikasikan (Publish)</strong>.</li>
                    </ol>
                  </div>

                  {/* Metode 2: Alternatif Sematkan Kode */}
                  <div className="bg-white/80 p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700 text-white font-semibold">
                        Metode 2
                      </span>
                      <span>Sematkan Menggunakan "Sematkan Kode" (Embed HTML)</span>
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                      <li>Salin <strong>Kode Sematkan (Embed Iframe)</strong> yang ada di kotak atas.</li>
                      <li>Di Google Sites, pilih <strong>Sisipkan &gt; Sematkan &gt; tab "Sematkan kode"</strong>.</li>
                      <li>Tempelkan kode tersebut lalu klik <strong>Berikutnya &gt; Sisipkan</strong>.</li>
                      <li><em>Catatan:</em> Jika pada pembukaan pertama muncul tampilan verifikasi Google Cloud Run (tombol <em>"Authenticate in new window"</em>), cukup klik tombol tersebut 1 kali di tab baru untuk mengizinkan cookie keamanan, setelah itu aplikasi akan terbuka normal di Google Sites.</li>
                    </ol>
                  </div>

                  {/* Penjelasan Error Konsol Browser */}
                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-300 text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">ℹ️ Penjelasan Pesan Diagnostik Chrome (Slow Network / Filesystem Fonts):</p>
                    <p>
                      Pesan seperti <em>"[Intervention] Slow network is detected... Fallback font... filesystem:https://docs.google.com/..."</em> adalah catatan internal Google Chrome saat koneksi internet lambat saat Google Sites mengakses cache font Google Drive/Docs. Pesan ini murni informasi browser dan <strong>tidak mempengaruhi keamanan maupun fungsi aplikasi Cipta Ajar</strong>.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'classroom' && (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Tautkan ke Google Classroom
                      </h4>
                      <p className="text-slate-600 mt-0.5">
                        Bagikan aplikasi ini kepada rekan guru satu MGMP/KKG atau siswa di kelas Google Classroom.
                      </p>
                    </div>
                  </div>

                  <ol className="list-decimal list-inside space-y-2 text-slate-700 pl-1 pt-1">
                    <li>Buka kelas Anda di <strong>classroom.google.com</strong>.</li>
                    <li>Buka tab <strong>Tugas Kelas (Classwork)</strong> lalu klik tombol <strong>+ Buat (+ Create)</strong>.</li>
                    <li>Pilih <strong>Materi</strong> atau <strong>Tugas</strong>.</li>
                    <li>Klik ikon <strong>Tautan (Link)</strong> di bagian lampiran.</li>
                    <li>Tempelkan URL aplikasi ini dan klik <strong>Tambahkan tautan</strong>, lalu klik <strong>Posting</strong>.</li>
                  </ol>
                </div>
              )}

              {activeTab === 'canvas-lms' && (
                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Sematkan di Canvas LMS (Instructure)
                      </h4>
                      <p className="text-slate-600 mt-0.5">
                        Jika instansi Anda menggunakan platform Canvas LMS, Anda dapat memasukkan aplikasi ini sebagai External Tool atau disematkan pada Page modul.
                      </p>
                    </div>
                  </div>

                  <ol className="list-decimal list-inside space-y-2 text-slate-700 pl-1 pt-1">
                    <li>Masuk ke mata pelajaran Anda di <strong>Canvas LMS</strong>.</li>
                    <li>Buka modul ajar yang dituju, klik tombol <strong>+ Tambah Item</strong>.</li>
                    <li>
                      Pilih tipe <strong>External URL</strong>, tempelkan URL aplikasi, beri nama (misal: "Generator Kurikulum Merdeka AI"), dan klik <strong>Add Item</strong>.
                    </li>
                    <li>
                      <strong>Alternatif Iframe:</strong> Buat <strong>Page</strong> baru di Canvas LMS, klik ikon <strong>HTML Editor (&lt;/&gt;)</strong> pada editor teks, tempelkan kode iframe di atas, lalu simpan.
                    </li>
                  </ol>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Bawa Hasil Dokumen ke Google Docs &amp; Gemini Canvas
                      </h4>
                      <p className="text-slate-600 mt-0.5">
                        Setiap dokumen yang berhasil dibuat oleh AI di aplikasi ini siap dipindahkan ke ekosistem Google:
                      </p>
                    </div>
                  </div>

                  <ul className="list-disc list-inside space-y-1.5 text-slate-700 pl-1">
                    <li>
                      <strong>Edit Langsung pada Lembar:</strong> Gunakan tombol <em>"Edit Teks"</em> untuk menyempurnakan isi dokumen langsung pada lembar pratinjau sesuai kebutuhan pembelajaran.
                    </li>
                    <li>
                      <strong>Cetak atau Simpan PDF:</strong> Klik tombol <em>"Cetak / Simpan PDF"</em> untuk langsung mencetak dokumen atau menyimpannya sebagai file PDF siap pakai dengan format standar A4.
                    </li>
                    <li>
                      <strong>Buka di Google Docs / Gemini:</strong> Anda dapat menyeleksi dan menyalin teks dari lembar dokumen ke Google Docs atau Google Gemini Canvas untuk memperluas referensi atau menambahkan narasi pengayaan.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Aplikasi didukung protokol PWA, HTTPS, dan CORS multi-platform.</span>
          </span>
          <button
            id="btn-close-google-canvas-footer"
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
