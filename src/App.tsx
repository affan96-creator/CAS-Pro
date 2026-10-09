import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SchoolIdentityCard } from './components/SchoolIdentityCard';
import { LearningDesignCard } from './components/LearningDesignCard';
import { ActionButtons } from './components/ActionButtons';
import { DocumentPreview } from './components/DocumentPreview';
import { HistoryModal } from './components/HistoryModal';
import { AsesmenConfigModal } from './components/AsesmenConfigModal';
import { GoogleCanvasModal } from './components/GoogleCanvasModal';
import { MpiModal } from './components/MpiModal';
import { LogoMeaningModal } from './components/LogoMeaningModal';
import { LoginPage } from './components/LoginPage';
import { FormState, JenjangPendidikan, DocumentType, GeneratedDoc, AsesmenConfig } from './types';
import { MAPEL_BY_JENJANG, FASE_KELAS_BY_JENJANG } from './data/kurikulumData';
import { sanitizeDocumentContent } from './utils/cleanRppm';
import { generateMpiPrompt } from './utils/mpiPromptGenerator';
import { copyTextToClipboard } from './utils/exportUtils';
import { safeSessionStorage, safeLocalStorage } from './utils/safeStorage';
import { AlertCircle, CheckCircle } from 'lucide-react';
import {
  SpreadsheetKontrolRow,
  FALLBACK_SPREADSHEET_KONTROL,
  isValidSchoolAndTeacher,
  isSchoolRegistered,
  isTeacherRegistered,
  findTeacherWithPunctuationMismatch,
} from './data/spreadsheetKontrolData';

const INITIAL_FORM_STATE: FormState = {
  // Identitas Sekolah (Default Resmi Spreadsheet KONTROL)
  jenjang: 'SD',
  namaSekolah: 'SD Negeri 1 Merdeka',
  namaGuru: 'Rista Kasaraeng, SPd',
  nipGuru: '19880512 201101 2 008',
  jabatan: 'Guru Kelas',
  namaKepalaSekolah: 'Drs. H. Bambang Sujatmiko, M.Pd.',
  nipKepalaSekolah: '19680315 199403 1 005',
  tempatTtd: 'Merdeka',
  tanggalTtd: '14 Juli 2025',

  // Desain Pembelajaran
  namaMapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
  faseKelas: 'Fase B (Kelas 4)',
  semester: 'Ganjil',
  tahunPelajaran: '2025/2026',
  alokasiWaktu: '3 JP (3 x 35 Menit)',
  jumlahPertemuan: '1 Pertemuan',
  capaianPembelajaran:
    'Peserta didik dapat membuat simulasi menggunakan bagan/alat bantu sederhana tentang siklus hidup makhluk hidup dan upaya pelestariannya serta memahami rantai makanan dalam ekosistem.',
  materiPembelajaran: 'Metamorfosis Hewan dan Hubungan Rantai Makanan di Lingkungan Sekitar',
  tujuanPembelajaran:
    '1. Peserta didik mampu membedakan metamorfosis sempurna dan tidak sempurna melalui pengamatan bagan interaktif.\n2. Peserta didik mampu membuat skema siklus hidup kupu-kupu dan katak dengan nalar kritis.\n3. Peserta didik mampu menyimpulkan pentingnya menjaga kelestarian hewan dalam jaring-jaring makanan.',
  profilLulusan: [
    'Keimanan dan Ketakwaan terhadap Tuhan YME',
    'Penalaran Kritis',
    'Kolaborasi',
    'Kreativitas',
  ],
  digitalisasi: [
    'PID (Papan Interaktif Digital / Smartboard)',
    'Infocus / LCD Proyektor',
    'Canva for Education',
  ],
  digitalisasiLainnya: 'Video Animasi Interaktif YouTube Edukasi',
};

const STORAGE_KEY_HISTORY = 'gen_kurikulum_history_v1';
const STORAGE_KEY_DRAFT = 'gen_kurikulum_draft_v1';
const STORAGE_KEY_AUTH = 'cipta_ajar_auth_user';

export default function App() {
  // Status Autentikasi Pengguna (Username Standar: Admin, Password: admin123)
  // Sesi login hanya tersimpan di sessionStorage, sehingga jika Chrome atau tab ditutup, pengguna otomatis keluar dan wajib login ulang
  const [authUser, setAuthUser] = useState<string | null>(() => {
    try {
      // Bersihkan sisa sesi permanen dari storage jika ada
      safeLocalStorage.removeItem(STORAGE_KEY_AUTH);
      const session = safeSessionStorage.getItem(STORAGE_KEY_AUTH);
      if (session) return session;
    } catch (e) {
      console.warn('Gagal membaca sesi autentikasi:', e);
    }
    return null;
  });

  const [formData, setFormData] = useState<FormState>(() => {
    try {
      const saved = safeLocalStorage.getItem(STORAGE_KEY_DRAFT);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse draft state:', e);
    }
    return INITIAL_FORM_STATE;
  });

  const [history, setHistory] = useState<GeneratedDoc[]>(() => {
    try {
      const saved = safeLocalStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed: GeneratedDoc[] = JSON.parse(saved);
        return parsed.map((doc) => ({
          ...doc,
          content: sanitizeDocumentContent(doc.content, doc.type, doc.formDataSnapshot),
        }));
      }
    } catch (e) {
      console.warn('Failed to parse history state:', e);
    }
    return [];
  });

  const [currentDoc, setCurrentDoc] = useState<GeneratedDoc | null>(() => {
    try {
      const saved = safeLocalStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed: GeneratedDoc[] = JSON.parse(saved);
        if (parsed.length > 0) {
          const first = parsed[0];
          return {
            ...first,
            content: sanitizeDocumentContent(first.content, first.type, first.formDataSnapshot),
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeGeneratingType, setActiveGeneratingType] = useState<DocumentType | null>(null);
  const [lastFailedType, setLastFailedType] = useState<DocumentType | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAsesmenModalOpen, setIsAsesmenModalOpen] = useState(false);
  const [isGoogleCanvasModalOpen, setIsGoogleCanvasModalOpen] = useState(false);
  const [isMpiModalOpen, setIsMpiModalOpen] = useState(false);
  const [isLogoMeaningOpen, setIsLogoMeaningOpen] = useState(false);
  const [mpiPromptText, setMpiPromptText] = useState('');
  const [lastAsesmenConfig, setLastAsesmenConfig] = useState<AsesmenConfig | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Spreadsheet Data State & Real-Time Background Synchronization
  const [spreadsheetRows, setSpreadsheetRows] = useState<SpreadsheetKontrolRow[]>(FALLBACK_SPREADSHEET_KONTROL);
  const [isSpreadsheetSynced, setIsSpreadsheetSynced] = useState(false);

  // Fungsi sinkronisasi latar belakang secara real-time dan otomatis
  const fetchSpreadsheetData = async (forceRefresh = false) => {
    try {
      const url = `/api/spreadsheet-control?t=${Date.now()}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (!res.ok) throw new Error('Gagal mengambil data spreadsheet');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setSpreadsheetRows((prevRows) => {
          // Hanya update state jika ada perubahan nyata pada data agar tidak memicu re-render berlebih
          if (JSON.stringify(prevRows) !== JSON.stringify(json.data)) {
            return json.data;
          }
          return prevRows;
        });
        setIsSpreadsheetSynced(true);
      }
    } catch (e) {
      console.warn('Sinkronisasi latar belakang sheet KONTROL:', e);
    }
  };

  // Real-time synchronization lifecycle:
  // 1. Initial fetch saat aplikasi dibuka
  // 2. Interval polling otomatis setiap 6 detik di latar belakang
  // 3. Sinkronisasi instan saat user kembali ke tab aplikasi (window focus / visibilitychange)
  useEffect(() => {
    // 1. Fetch awal
    fetchSpreadsheetData(true);

    // 2. Polling otomatis real-time setiap 6 detik
    const intervalId = setInterval(() => {
      fetchSpreadsheetData(false);
    }, 6000);

    // 3. Re-sync instan saat tab browser aktif kembali
    const handleFocus = () => {
      fetchSpreadsheetData(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSpreadsheetData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const [isPublicView, setIsPublicView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isPre = hostname.includes('ais-pre-');
      const params = new URLSearchParams(window.location.search);
      const hasEmbedParam =
        params.get('embed') === 'true' ||
        params.get('public') === 'true' ||
        params.has('embed') ||
        params.has('public') ||
        params.get('view') === 'public';
      let isExternalIframe = false;
      try {
        if (window.self !== window.top) {
          isExternalIframe = !hostname.includes('ais-dev-') && !hostname.includes('localhost');
        }
      } catch (e) {
        isExternalIframe = true;
      }

      return isPre || hasEmbedParam || isExternalIframe;
    }
    return false;
  });

  // Detect if current view is public shared URL (ais-pre-*) or embedded iframe (?embed=true / external iframe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isPre = hostname.includes('ais-pre-');
      const params = new URLSearchParams(window.location.search);
      const hasEmbedParam =
        params.get('embed') === 'true' ||
        params.get('public') === 'true' ||
        params.has('embed') ||
        params.has('public') ||
        params.get('view') === 'public';
      let isExternalIframe = false;
      try {
        if (window.self !== window.top) {
          isExternalIframe = !hostname.includes('ais-dev-') && !hostname.includes('localhost');
        }
      } catch (e) {
        isExternalIframe = true;
      }

      if (isPre || hasEmbedParam || isExternalIframe) {
        setIsPublicView(true);
      }
    }
  }, []);

  // Sync custom logo to favicon on mount & enforce PNG favicon
  useEffect(() => {
    try {
      // Remove any legacy svg favicon link so modern browsers don't override PNG
      const svgLinks = document.querySelectorAll("link[type='image/svg+xml']");
      svgLinks.forEach((el) => el.remove());

      const savedLogo = safeLocalStorage.getItem('cipta_ajar_custom_logo');
      const targetFavicon = savedLogo || `/favicon.png?t=${Date.now()}`;

      const iconLinks = document.querySelectorAll<HTMLLinkElement>(
        "link[rel*='icon'], link[rel='apple-touch-icon']"
      );
      if (iconLinks.length > 0) {
        iconLinks.forEach((link) => {
          link.type = 'image/png';
          link.href = targetFavicon;
        });
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = targetFavicon;
        document.head.appendChild(link);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Auto-save form draft to safeLocalStorage
  useEffect(() => {
    try {
      safeLocalStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(formData));
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }, [formData]);

  // Auto-save history list to safeLocalStorage
  useEffect(() => {
    try {
      safeLocalStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [history]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Field change handler
  const handleFieldChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle Jenjang Change (SD, SMP, SMA, SMK)
  const handleJenjangChange = (newJenjang: JenjangPendidikan) => {
    const availableMapels = MAPEL_BY_JENJANG[newJenjang] || [];
    const availableFase = FASE_KELAS_BY_JENJANG[newJenjang] || [];

    setFormData((prev) => ({
      ...prev,
      jenjang: newJenjang,
      namaMapel: availableMapels[0] || '',
      faseKelas: availableFase[0]?.value || '',
      capaianPembelajaran: '',
    }));
  };

  // Load Preset
  const handleLoadPreset = (preset: FormState) => {
    setFormData(preset);
    showToast('success', 'Contoh data berhasil dimuat!');
  };

  // Reset Form
  const handleResetForm = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan seluruh isian formulir?')) {
      setFormData({
        jenjang: 'SD',
        namaSekolah: '',
        namaGuru: '',
        nipGuru: '',
        jabatan: 'Guru Mata Pelajaran',
        namaKepalaSekolah: '',
        nipKepalaSekolah: '',
        tempatTtd: '',
        namaMapel: '',
        faseKelas: '',
        semester: 'Ganjil',
        tahunPelajaran: '2025/2026',
        alokasiWaktu: '',
        jumlahPertemuan: '1 Pertemuan',
        capaianPembelajaran: '',
        materiPembelajaran: '',
        tujuanPembelajaran: '',
        profilLulusan: [],
        digitalisasi: [],
        digitalisasiLainnya: '',
      });
      showToast('success', 'Formulir telah direset.');
    }
  };

  // Verifikasi Latar Belakang Data Spreadsheet KONTROL:
  // USER INTENT: "Jika nama sekolah dan nama guru muncul peringatan tidak terdaftar, maka tombol generate Buat RPPM, Buat LKPD dan Buat Asesmen, pastikan Tidak aktif."
  const isSchoolValid = useMemo(() => {
    if (!formData.namaSekolah.trim()) return false;
    return isSchoolRegistered(spreadsheetRows, formData.namaSekolah);
  }, [spreadsheetRows, formData.namaSekolah]);

  const isTeacherValid = useMemo(() => {
    if (!formData.namaGuru.trim()) return false;
    return isTeacherRegistered(spreadsheetRows, formData.namaGuru);
  }, [spreadsheetRows, formData.namaGuru]);

  const punctuationMismatchTeacher = useMemo(() => {
    if (!formData.namaGuru.trim() || isTeacherValid) return undefined;
    return findTeacherWithPunctuationMismatch(
      spreadsheetRows,
      formData.namaGuru,
      formData.namaSekolah
    );
  }, [spreadsheetRows, formData.namaGuru, formData.namaSekolah, isTeacherValid]);

  const isExactIdentityValid = useMemo(() => {
    if (!formData.namaSekolah.trim() || !formData.namaGuru.trim()) return false;
    return isValidSchoolAndTeacher(spreadsheetRows, formData.namaSekolah, formData.namaGuru);
  }, [spreadsheetRows, formData.namaSekolah, formData.namaGuru]);

  const identityDisabledReason = useMemo(() => {
    if (!formData.namaSekolah.trim() && !formData.namaGuru.trim()) {
      return 'Ketik Nama Satuan Pendidikan dan Nama Guru Penyusun terlebih dahulu.';
    }
    if (!formData.namaSekolah.trim()) {
      return 'Nama Satuan Pendidikan belum diisi.';
    }
    if (!formData.namaGuru.trim()) {
      return 'Nama Guru Penyusun belum diisi.';
    }
    if (!isSchoolValid) {
      return `Nama Satuan Pendidikan "${formData.namaSekolah}" tidak terdaftar di data sheet KONTROL.`;
    }
    if (!isTeacherValid) {
      if (punctuationMismatchTeacher) {
        return `Tanda koma (,) atau titik (.) pada Nama Guru belum sesuai. Di sheet KONTROL tertulis: "${punctuationMismatchTeacher}".`;
      }
      return `Nama Guru Penyusun "${formData.namaGuru}" tidak terdaftar di data sheet KONTROL.`;
    }
    if (!isExactIdentityValid) {
      return `Guru "${formData.namaGuru}" tidak terdaftar mengajar di satuan pendidikan "${formData.namaSekolah}".`;
    }
    return '';
  }, [
    formData.namaSekolah,
    formData.namaGuru,
    isSchoolValid,
    isTeacherValid,
    punctuationMismatchTeacher,
    isExactIdentityValid,
  ]);

  const isGenerateDisabled = Boolean(identityDisabledReason);

  // Generate Document
  const handleGenerate = async (type: DocumentType, asesmenConfigOverride?: AsesmenConfig) => {
    // Validasi Wajib: Nama Sekolah dan Nama Guru Penyusun wajib sama dengan yang ada di data spreadsheet
    if (isGenerateDisabled) {
      showToast(
        'error',
        identityDisabledReason ||
          'Nama Satuan Pendidikan dan Nama Guru Penyusun wajib terdaftar di data Spreadsheet sheet KONTROL.'
      );
      return;
    }

    if (!formData.materiPembelajaran) {
      showToast('error', 'Harap isi "Materi Pembelajaran / Materi Pokok" terlebih dahulu.');
      return;
    }
    if (!formData.namaMapel) {
      showToast('error', 'Harap pilih "Nama Mata Pelajaran".');
      return;
    }

    const configToUse = asesmenConfigOverride || (type === 'asesmen' ? lastAsesmenConfig : undefined);
    if (type === 'asesmen' && configToUse) {
      setLastAsesmenConfig(configToUse);
    }

    setIsLoading(true);
    setActiveGeneratingType(type);
    setGenerationError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          formData,
          asesmenConfig: configToUse,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghasilkan dokumen.');
      }

      const asesmenLabel = configToUse?.jenisAsesmen ? configToUse.jenisAsesmen.replace(/\s+/g, '_') : 'Asesmen_Rubrik';
      const typeTitles: Record<DocumentType, string> = {
        rppm: `RPPM_${formData.namaMapel}_${formData.materiPembelajaran}`.slice(0, 45),
        asesmen: `${asesmenLabel}_${formData.namaMapel}_${formData.materiPembelajaran}`.slice(0, 45),
        lkpd: `LKPD_${formData.namaMapel}_${formData.materiPembelajaran}`.slice(0, 45),
      };

      const finalContent = sanitizeDocumentContent(data.content, type, formData);

      const newDoc: GeneratedDoc = {
        id: `doc_${Date.now()}`,
        type,
        title: typeTitles[type],
        content: finalContent,
        createdAt: new Date().toISOString(),
        formDataSnapshot: { ...formData },
      };

      setCurrentDoc(newDoc);
      setGenerationError(null);
      setLastFailedType(null);
      // Prepend to auto-save history
      setHistory((prev) => [newDoc, ...prev]);
      showToast('success', `Dokumen ${type.toUpperCase()} berhasil dibuat dan disimpan otomatis!`);
    } catch (err: any) {
      console.error('Generation error:', err);
      const errMsg = err?.message || 'Terjadi kesalahan saat memproses dengan AI.';
      setGenerationError(errMsg);
      setLastFailedType(type);
      showToast('error', errMsg);
    } finally {
      setIsLoading(false);
      setActiveGeneratingType(null);
    }
  };

  // Trigger Asesmen Modal when user clicks "Buat Asesmen"
  const handleRequestAsesmen = () => {
    if (!formData.materiPembelajaran) {
      showToast('error', 'Harap isi "Materi Pembelajaran / Materi Pokok" terlebih dahulu.');
      return;
    }
    if (!formData.namaMapel) {
      showToast('error', 'Harap pilih "Nama Mata Pelajaran".');
      return;
    }
    setIsAsesmenModalOpen(true);
  };

  // Trigger MPI generation: auto-copy prompt & open Gemini Canvas
  const handleRequestMpi = async () => {
    if (isGenerateDisabled) return;

    if (!formData.materiPembelajaran) {
      showToast('error', 'Harap isi "Materi Pembelajaran / Materi Pokok" terlebih dahulu.');
      return;
    }

    // Ambil referensi RPPM dan LKPD jika sudah ada di histori / pratinjau aktif
    const rppmDoc =
      history.find((d) => d.type === 'rppm') ||
      (currentDoc?.type === 'rppm' ? currentDoc : null);
    const lkpdDoc =
      history.find((d) => d.type === 'lkpd') ||
      (currentDoc?.type === 'lkpd' ? currentDoc : null);

    const prompt = generateMpiPrompt(formData, rppmDoc, lkpdDoc);
    setMpiPromptText(prompt);

    // Otomatis salin ke clipboard
    await copyTextToClipboard(prompt);

    // Otomatis buka Google Gemini Canvas di tab baru
    try {
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Pop-up prevented opening new tab:', e);
    }

    setIsMpiModalOpen(true);
    showToast('success', 'Prompt MPI berhasil disalin! Menghubungkan ke Gemini Canvas...');
  };

  // Handle direct markdown edits in preview
  const handleUpdateContent = (newContent: string) => {
    if (!currentDoc) return;
    const updatedDoc = { ...currentDoc, content: newContent };
    setCurrentDoc(updatedDoc);

    // Update in history as well
    setHistory((prev) =>
      prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
    );
  };

  // Delete document from history
  const handleDeleteHistoryDoc = (id: string) => {
    setHistory((prev) => prev.filter((d) => d.id !== id));
    if (currentDoc?.id === id) {
      setCurrentDoc(null);
    }
    showToast('success', 'Dokumen dihapus dari histori.');
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat dokumen tersimpan?')) {
      setHistory([]);
      showToast('success', 'Semua riwayat dokumen berhasil dibersihkan.');
    }
  };

  // Autentikasi Pengguna: Login Berhasil (Sesi aman: hanya aktif selama Chrome dibuka)
  const handleLoginSuccess = (username: string) => {
    try {
      safeSessionStorage.setItem(STORAGE_KEY_AUTH, username);
      safeLocalStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {
      console.warn('Gagal menyimpan status login:', e);
    }
    setAuthUser(username);
    showToast('success', `Selamat datang, ${username}! Berhasil masuk ke Cipta Ajar Suit Pro.`);
  };

  // Autentikasi Pengguna: Keluar / Logout
  const handleLogout = () => {
    try {
      safeLocalStorage.removeItem(STORAGE_KEY_AUTH);
      safeSessionStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {
      console.warn('Gagal menghapus status login:', e);
    }
    setAuthUser(null);
    showToast('success', 'Anda berhasil keluar dari sistem aplikasi.');
  };

  // JIKA PENGGUNA BELUM LOGIN: Tampilkan Halaman Login Modern
  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans relative">
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenLogoMeaning={() => setIsLogoMeaningOpen(true)}
        />

        {/* Floating Toast Notification pada Halaman Login */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 animate-bounce no-print">
            <div
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold text-white ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-600 border-emerald-500'
                  : 'bg-rose-600 border-rose-500'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Modal Makna Logo Cipta Ajar Suit Pro */}
        <LogoMeaningModal
          isOpen={isLogoMeaningOpen}
          onClose={() => setIsLogoMeaningOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-100 flex flex-col font-sans">
      {/* App Header */}
      <Header
        onLoadPreset={handleLoadPreset}
        onReset={handleResetForm}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenGoogleCanvasGuide={() => setIsGoogleCanvasModalOpen(true)}
        onOpenLogoMeaning={() => setIsLogoMeaningOpen(true)}
        onLogout={handleLogout}
        currentUser={authUser}
        showGoogleCanvasButton={!isPublicView}
        showPresetButton={!isPublicView}
        historyCount={history.length}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-bounce no-print">
          <div
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold text-white ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 border-emerald-500'
                : 'bg-rose-600 border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area - Split View Independen (Form Kiri & Pratinjau Kanan Bersandar Penuh Antara Header & Footer) */}
      <main className="flex-1 min-h-0 w-full max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 py-0 flex flex-col lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 items-start lg:items-stretch flex-1 min-h-0 lg:h-full">
          
          {/* Left Column: Form Inputs & Actions (Scroll Mandiri / Independent Scroll) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 lg:h-full no-print">
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden space-y-3.5 pt-2 pb-6 pr-1 lg:pr-2 overscroll-contain">
              <SchoolIdentityCard
                formData={formData}
                onChange={handleFieldChange}
                onJenjangChange={handleJenjangChange}
                spreadsheetRows={spreadsheetRows}
              />

              <LearningDesignCard
                formData={formData}
                onChange={handleFieldChange}
                spreadsheetRows={spreadsheetRows}
              />

              <ActionButtons
                onGenerate={handleGenerate}
                onRequestAsesmen={handleRequestAsesmen}
                onRequestMpi={handleRequestMpi}
                isLoading={isLoading}
                activeGeneratingType={activeGeneratingType}
                disabled={isGenerateDisabled}
                disabledReason={identityDisabledReason}
              />
            </div>
          </div>

          {/* Right Column: Output & Document Preview (Scroll Mandiri / Independent Scroll) */}
          <div className="lg:col-span-7 flex flex-col min-h-0 lg:h-full">
            <DocumentPreview
              currentDoc={currentDoc}
              isLoading={isLoading}
              activeType={activeGeneratingType}
              error={generationError}
              onRetry={() => {
                if (lastFailedType === 'asesmen') {
                  handleGenerate('asesmen', lastAsesmenConfig);
                } else if (lastFailedType) {
                  handleGenerate(lastFailedType);
                } else {
                  handleGenerate('rppm');
                }
              }}
              onUpdateContent={handleUpdateContent}
            />
          </div>

        </div>
      </main>

      {/* Asesmen Configuration Modal */}
      <AsesmenConfigModal
        isOpen={isAsesmenModalOpen}
        onClose={() => setIsAsesmenModalOpen(false)}
        onConfirm={(config) => {
          setIsAsesmenModalOpen(false);
          handleGenerate('asesmen', config);
        }}
        formData={formData}
        isLoading={isLoading}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectDoc={(doc) => {
          const sanitizedDoc = {
            ...doc,
            content: sanitizeDocumentContent(doc.content, doc.type, doc.formDataSnapshot),
          };
          setCurrentDoc(sanitizedDoc);
        }}
        onDeleteDoc={handleDeleteHistoryDoc}
        onClearHistory={handleClearAllHistory}
      />

      {/* Google / Canvas Guide & Integration Modal */}
      <GoogleCanvasModal
        isOpen={isGoogleCanvasModalOpen}
        onClose={() => setIsGoogleCanvasModalOpen(false)}
      />

      {/* Media Pembelajaran Interaktif (MPI) Modal */}
      <MpiModal
        isOpen={isMpiModalOpen}
        onClose={() => setIsMpiModalOpen(false)}
        promptText={mpiPromptText}
      />

      {/* Modal Makna Logo Cipta Ajar Suit Pro */}
      <LogoMeaningModal
        isOpen={isLogoMeaningOpen}
        onClose={() => setIsLogoMeaningOpen(false)}
      />

      {/* Footer */}
      <footer className="shrink-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 py-2 px-2 sm:px-4 lg:px-6 text-center text-xs text-slate-500 no-print z-10">
        <div className="w-full max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
          <span>
            Cipta Ajar Suit Pro
          </span>
          <span className="text-slate-400">
            Created By : AF-One86
          </span>
        </div>
      </footer>
    </div>
  );
}
