import React from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Pencil,
  Users,
  Star,
  Layers,
  Palette,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

interface LogoMeaningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoMeaningModal: React.FC<LogoMeaningModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [imgError, setImgError] = React.useState(false);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      id="modal-logo-meaning"
      className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 flex justify-center items-start animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-3 sm:my-6 max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header (Always Visible & Sticky at Top) */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 via-sky-950 to-emerald-950 text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b border-sky-800/40 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Makna Logo Cipta Ajar Suit Pro</span>
              </h2>
              <p className="text-xs text-emerald-200/80">
                Filosofi, Visi, &amp; Simbolisme Desain Pembelajaran Modern
              </p>
            </div>
          </div>
          <button
            id="btn-close-logo-meaning-modal"
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable with Smooth Scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-700">
          {/* Hero Banner: Logo Showcase & Slogan */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-700/50 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-slate-900/90 ring-4 ring-emerald-400/40 shadow-xl flex items-center justify-center">
                {!imgError ? (
                  <img
                    src="/logo.png"
                    alt="Logo Cipta Ajar"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center text-white">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow">
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <GraduationCap className="w-3 h-3" />
                <span>Slogan Utama</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-white tracking-tight italic">
                “Mudahnya Merancang Masa Depan Kelas.”
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Logo CiptaAjar dirancang untuk merepresentasikan semangat inovasi pendidikan, kreativitas guru, serta kemudahan dalam merancang pembelajaran dan asesmen modern. Setiap elemen memiliki filosofi yang saling terhubung untuk menggambarkan visi aplikasi:
              </p>
            </div>
          </div>

          {/* 5 Elemen Utama Logo */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                5 Elemen Filosofi Logo
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* 1. Huruf C */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-sky-300 hover:bg-sky-50/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
                    C
                  </div>
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>1. Huruf “C”</span>
                      <span className="text-[11px] font-medium text-sky-700 bg-sky-100 px-2 py-0.2 rounded-full">
                        Identitas Utama
                      </span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Bentuk lengkung besar menyerupai huruf <strong>C</strong> melambangkan identitas utama <strong>CiptaAjar</strong>. Selain itu, bentuk ini menggambarkan:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 pt-0.5">
                      <li>
                        <strong className="text-slate-800">Creativity (Kreativitas)</strong> dalam menyusun modul ajar.
                      </li>
                      <li>
                        <strong className="text-slate-800">Continuous Learning</strong> atau proses belajar yang terus berkembang.
                      </li>
                      <li>
                        <strong className="text-slate-800">Perlindungan dan dukungan</strong> aplikasi terhadap guru dalam proses mengajar.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 2. Buku Terbuka */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>2. Buku Terbuka</span>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">
                        Sumber Pengetahuan
                      </span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Ikon buku terbuka melambangkan:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 pt-0.5">
                      <li>
                        <strong className="text-slate-800">Sumber ilmu pengetahuan</strong>.
                      </li>
                      <li>
                        <strong className="text-slate-800">Modul ajar dan perangkat pembelajaran</strong>.
                      </li>
                      <li>
                        <strong className="text-slate-800">Keterbukaan terhadap ide</strong>, inovasi, dan perkembangan pendidikan.
                      </li>
                    </ul>
                    <p className="text-slate-600 pt-1 italic">
                      Buku yang terbuka juga menggambarkan bahwa CiptaAjar membantu guru menciptakan pembelajaran yang lebih terstruktur dan mudah dipahami.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Pensil */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>3. Pensil</span>
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full">
                        Pusat Kreativitas
                      </span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Pensil di tengah logo menjadi simbol:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 pt-0.5">
                      <li>
                        <strong className="text-slate-800">Kreativitas</strong> dalam merancang pembelajaran.
                      </li>
                      <li>
                        <strong className="text-slate-800">Proses menyusun modul</strong>, soal asesmen, dan perangkat ajar.
                      </li>
                      <li>
                        <strong className="text-slate-800">Produktivitas guru</strong> dalam menciptakan pengalaman belajar yang bermakna.
                      </li>
                    </ul>
                    <p className="text-slate-700 pt-1 font-medium">
                      Posisi pensil di tengah menunjukkan bahwa <span className="text-amber-900 font-bold">guru adalah pusat dari proses pendidikan</span>.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Figur Manusia */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>4. Figur Manusia</span>
                      <span className="text-[11px] font-medium text-teal-800 bg-teal-100 px-2 py-0.2 rounded-full">
                        Guru Inspiratif
                      </span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Siluet manusia berwarna hijau melambangkan:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 pt-0.5">
                      <li>
                        <strong className="text-slate-800">Guru yang aktif</strong>, kreatif, dan inspiratif.
                      </li>
                      <li>
                        <strong className="text-slate-800">Semangat pertumbuhan</strong> dan perkembangan peserta didik.
                      </li>
                      <li>
                        <strong className="text-slate-800">Kolaborasi</strong> antara teknologi dan tenaga pendidik.
                      </li>
                    </ul>
                    <p className="text-slate-600 pt-1 italic">
                      Gerakan figur yang mengarah ke atas mencerminkan harapan dan kemajuan pendidikan.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Bintang */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-yellow-300 hover:bg-yellow-50/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>5. Bintang</span>
                      <span className="text-[11px] font-medium text-amber-900 bg-amber-200/80 px-2 py-0.2 rounded-full">
                        Cita-Cita &amp; Kualitas
                      </span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Bintang kecil di bagian atas melambangkan:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 pt-0.5">
                      <li>
                        <strong className="text-slate-800">Masa depan yang cerah</strong>.
                      </li>
                      <li>
                        <strong className="text-slate-800">Prestasi dan kualitas pendidikan</strong>.
                      </li>
                      <li>
                        <strong className="text-slate-800">Inspirasi serta pencapaian tujuan belajar</strong>.
                      </li>
                    </ul>
                    <p className="text-amber-900 font-semibold pt-1">
                      Elemen ini memperkuat makna slogan: <em>“Mudahnya Merancang Masa Depan Kelas.”</em>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Makna Warna */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Palette className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                Makna Warna
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Biru */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-sky-600 border border-white shadow-2xs shrink-0" />
                  <span className="font-bold text-xs text-sky-950">Biru</span>
                </div>
                <p className="text-[11px] font-medium text-sky-800">Melambangkan:</p>
                <ul className="space-y-1 text-xs text-slate-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>Kepercayaan</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>Profesionalisme</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>Teknologi pendidikan modern</span>
                  </li>
                </ul>
              </div>

              {/* Hijau */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 border border-white shadow-2xs shrink-0" />
                  <span className="font-bold text-xs text-emerald-950">Hijau</span>
                </div>
                <p className="text-[11px] font-medium text-emerald-800">Melambangkan:</p>
                <ul className="space-y-1 text-xs text-slate-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Pertumbuhan</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Inovasi</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Semangat belajar</span>
                  </li>
                </ul>
              </div>

              {/* Kuning/Emas */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500 border border-white shadow-2xs shrink-0" />
                  <span className="font-bold text-xs text-amber-950">Kuning / Emas</span>
                </div>
                <p className="text-[11px] font-medium text-amber-800">Melambangkan:</p>
                <ul className="space-y-1 text-xs text-slate-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Kreativitas</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Ide cemerlang</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Optimisme masa depan pendidikan</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return modalContent;
};
