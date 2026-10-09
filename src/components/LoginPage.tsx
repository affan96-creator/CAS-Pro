import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  RotateCw,
  LogIn,
  AlertCircle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

/**
 * ============================================================================
 * PENGATURAN KREDENSIAL LOGIN (USERNAME & PASSWORD STANDAR)
 * ============================================================================
 * Anda dapat mengganti Username dan Password login aplikasi di bawah ini:
 * - USERNAME : Nama pengguna untuk login (tidak sensitif huruf besar/kecil)
 * - PASSWORD : Kata sandi login (sensitif huruf besar/kecil)
 * ============================================================================
 */
export const AUTH_CREDENTIALS = {
  USERNAME: 'Affan',      // <-- GANTI USERNAME STANDAR DI SINI
  PASSWORD: 'sdnkjl1*',   // <-- GANTI PASSWORD STANDAR DI SINI
};

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
  onOpenLogoMeaning?: () => void;
}

// Karakter acak untuk kode keamanan (menghindari karakter ambigu seperti 0/O, 1/I)
const CAPTCHA_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomCaptcha(length = 5): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return result;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenLogoMeaning }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isRotatingCaptcha, setIsRotatingCaptcha] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captchaInputRef = useRef<HTMLInputElement | null>(null);

  // Generate captcha awal saat komponen dimuat
  useEffect(() => {
    refreshCaptcha();
  }, []);

  // Gambar kode keamanan pada elemen canvas dengan distorsi, rotasi, garis dan bintik pengaman
  useEffect(() => {
    if (!captchaCode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Bersihkan kanvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient elegan
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e293b');
    gradient.addColorStop(1, '#0f2744');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Garis pengacak (security lines)
    const lineColors = ['#0284c7', '#059669', '#38bdf8', '#34d399', '#94a3b8'];
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.strokeStyle = lineColors[i % lineColors.length];
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.45;
      ctx.moveTo(Math.random() * 20, Math.random() * canvas.height);
      ctx.bezierCurveTo(
        Math.random() * canvas.width * 0.5,
        Math.random() * canvas.height,
        Math.random() * canvas.width * 0.8,
        Math.random() * canvas.height,
        canvas.width - Math.random() * 10,
        Math.random() * canvas.height
      );
      ctx.stroke();
    }

    // Bintik pengacak (noise dots)
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = lineColors[Math.floor(Math.random() * lineColors.length)];
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Gambar setiap karakter dengan sudut rotasi dan warna berbeda
    const charCount = captchaCode.length;
    const charSpacing = canvas.width / (charCount + 0.8);
    const fonts = [
      'bold 18px "Courier New", monospace',
      'bold 19px "Lucida Console", monospace',
      'bold 18px monospace',
    ];
    const charColors = ['#38bdf8', '#34d399', '#f8fafc', '#a7f3d0', '#7dd3fc'];

    for (let i = 0; i < charCount; i++) {
      const char = captchaCode[i];
      ctx.save();
      const x = (i + 0.65) * charSpacing;
      const y = canvas.height / 2 + 6 + (Math.random() * 3 - 1.5);

      ctx.translate(x, y);
      const angle = (Math.random() * 20 - 10) * (Math.PI / 180);
      ctx.rotate(angle);

      ctx.font = fonts[i % fonts.length];
      ctx.fillStyle = charColors[i % charColors.length];
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(char, 0, 0);

      ctx.restore();
    }
  }, [captchaCode]);

  const refreshCaptcha = () => {
    setIsRotatingCaptcha(true);
    const newCode = generateRandomCaptcha(5);
    setCaptchaCode(newCode);
    setCaptchaInput('');
    setTimeout(() => {
      setIsRotatingCaptcha(false);
    }, 450);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedCaptcha = captchaInput.trim().toUpperCase();

    // Validasi field kosong
    if (!trimmedUsername) {
      setErrorMessage('Silakan masukkan Username Anda.');
      return;
    }
    if (!trimmedPassword) {
      setErrorMessage('Silakan masukkan Password Anda.');
      return;
    }
    if (!trimmedCaptcha) {
      setErrorMessage('Silakan masukkan Kode Keamanan (Captcha).');
      return;
    }

    // Validasi Kode Keamanan (Captcha)
    if (trimmedCaptcha !== captchaCode.toUpperCase()) {
      setErrorMessage('Kode keamanan yang Anda masukkan salah. Silakan coba kembali.');
      refreshCaptcha();
      return;
    }

    // Validasi Kredensial Standar (Rahasia di AUTH_CREDENTIALS)
    const isValidUser =
      trimmedUsername.toLowerCase() === AUTH_CREDENTIALS.USERNAME.toLowerCase();
    const isValidPass = trimmedPassword === AUTH_CREDENTIALS.PASSWORD;

    if (!isValidUser || !isValidPass) {
      setErrorMessage('Username atau Password salah. Silakan periksa kembali akun Anda.');
      refreshCaptcha();
      return;
    }

    // Login Berhasil
    setIsSubmitting(true);
    setTimeout(() => {
      onLoginSuccess(
        trimmedUsername.toLowerCase() === AUTH_CREDENTIALS.USERNAME.toLowerCase()
          ? AUTH_CREDENTIALS.USERNAME
          : trimmedUsername
      );
    }, 400);
  };

  return (
    <div
      id="login-page-container"
      className="h-screen w-full bg-slate-950 relative flex items-center justify-center p-3 sm:p-4 overflow-y-auto sm:overflow-hidden select-none font-sans"
    >
      {/* Background Decorative Ambient Gradients (matching App Palette: Sky / Emerald / Slate) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-sky-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-gradient-to-tr from-sky-900/10 via-emerald-900/10 to-transparent rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm sm:max-w-md relative z-10 my-auto"
      >
        {/* Card Outer Glow & Container */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl shadow-slate-950/80 p-4 sm:p-5 sm:py-5.5 text-slate-100 relative overflow-hidden">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-emerald-400 to-teal-500" />

          {/* Header Brand Section */}
          <div className="text-center mb-3">
            {/* Logo */}
            <div className="inline-block relative mb-1.5">
              <button
                type="button"
                onClick={onOpenLogoMeaning}
                title="Klik untuk melihat Makna & Filosofi Logo"
                className="group relative w-12 h-12 rounded-xl overflow-hidden shadow-md shadow-emerald-500/20 ring-2 ring-white/20 flex items-center justify-center bg-slate-950 hover:ring-emerald-400 transition-all cursor-pointer mx-auto"
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
                {/* Hover Makna Indicator */}
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                  <span className="text-[8px] font-bold text-emerald-200">Makna</span>
                </div>
              </button>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5 leading-tight">
              <span className="bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                CAS Pro
              </span>
            </h1>
            <p className="text-[11px] text-sky-300/90 font-medium mt-0.5">
              Generator RPPM, LKPD, Asesmen & MPI terintegrasi AI
            </p>
            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              SD NEGERI KAJULANGKO
            </div>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-rose-950/70 border border-rose-800/80 rounded-lg p-2.5 flex items-start gap-2 text-rose-200 text-xs overflow-hidden"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-2.5" noValidate>
            {/* Input Username */}
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan username"
                  className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan password"
                  className="w-full pl-8 pr-9 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Kode Keamanan (Captcha) - Compact Inline Row */}
            <div>
              <label
                htmlFor="login-captcha"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Kode Keamanan (Captcha)
              </label>

              <div className="flex items-center gap-2">
                {/* Input for Captcha */}
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <input
                    ref={captchaInputRef}
                    id="login-captcha"
                    type="text"
                    maxLength={6}
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Ketik kode"
                    className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm font-mono tracking-widest text-white placeholder:text-slate-500 placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase transition-all"
                  />
                </div>

                {/* Display Box Captcha Canvas */}
                <div
                  className="relative rounded-xl overflow-hidden border border-slate-700/90 shadow-inner w-28 sm:w-32 h-9 flex items-center justify-center bg-slate-950 shrink-0"
                  title="Kode keamanan teracak otomatis"
                >
                  <canvas
                    ref={canvasRef}
                    width={130}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Refresh Button */}
                <button
                  id="btn-refresh-captcha"
                  type="button"
                  onClick={refreshCaptcha}
                  className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-sky-300 hover:text-white border border-slate-700/90 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                  title="Acak ulang kode keamanan"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isRotatingCaptcha ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Info Keamanan Sesi Browser: Otomatis keluar saat Chrome ditutup */}
            <div className="flex items-center justify-between pt-0.5 px-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Sesi Aman Peramban</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1.5 py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:via-teal-500 hover:to-emerald-500 active:scale-[0.99] transition-all shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 cursor-pointer border border-sky-400/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memverifikasi Masuk...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk Sekarang</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-center">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
              <span>Sesuai BSKAP 046/2025 & BKPDM 020/2026</span>
            </p>
          </div>
        </div>

        {/* Outer App Credential Footer */}
        <div className="text-center mt-2 text-[11px] text-slate-400">
          <span>Created By : Fidhal Touna</span>
        </div>
      </motion.div>
    </div>
  );
};
