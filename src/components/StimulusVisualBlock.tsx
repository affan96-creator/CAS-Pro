import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Image as ImageIcon,
  RefreshCw,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  BarChart3,
  Zap,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import {
  optimizeImage,
  saveDocImage,
  getDocImage,
  removeDocImage,
  hashString,
} from '../utils/imageStorage';

// ==========================================
// 1. HELPERS & PROMPT OPTIMIZER FOR GEMINI
// ==========================================

const GEMINI_IMAGE_URL =
  'https://gemini.google.com/images?utm_source=app_launcher&utm_medium=owned&utm_campaign=base_all';

/**
 * Sanitizes question stems and visual descriptions to prevent leaking the correct answers
 * into Gemini Image prompts (anti-spoiler / exam confidentiality).
 */
export function sanitizeAntiSpoiler(text: string): string {
  if (!text) return '';
  return text
    // Remove explicit answer keys, rubrics, or scoring notes
    .replace(/(?:Kunci\s*(?:Jawaban)?|Jawaban\s*(?:Benar)?|Kunci|Kunci\s*Soal)\s*:\s*[A-E0-9a-z\s.,-]+(?:\n|$|\))/gi, '')
    .replace(/\((?:Kunci|Jawaban)\s*:\s*[^)]+\)/gi, '')
    .replace(/\[(?:Kunci|Jawaban)\s*:\s*[^\]]+\]/gi, '')
    // Remove "kunci jawaban adalah ..." or "jawaban yang benar yaitu ..."
    .replace(/(?:kunci\s*jawaban|jawaban\s*(?:yang\s*benar)?)\s*(?:adalah|yaitu|merupakan)\s*:[^\n,.]+/gi, '')
    // Remove inline spoiler tags
    .replace(/\[(?:SPOILER|JAWABAN_BENAR|KUNCI)[^\]]*\]/gi, '')
    .trim();
}

export function createGeminiImagePrompt(
  cleanDesc: string,
  qLabel?: string,
  questionText?: string,
  subject?: string,
  topic?: string
): string {
  let promptText = sanitizeAntiSpoiler(cleanDesc.trim().replace(/^["']|["']$/g, '').trim());
  const forQuestion = qLabel ? ` (${qLabel})` : '';

  const subjectInfo = subject ? `Mata Pelajaran: ${subject}` : '';
  const topicInfo = topic ? `Materi Pokok: ${topic}` : '';
  const contextHeader = [subjectInfo, topicInfo].filter(Boolean).join(' | ');

  const lowerSubject = (subject || '').toLowerCase();
  const lowerTopic = (topic || '').toLowerCase();
  const lowerDesc = promptText.toLowerCase();

  // Panduan spesifik adaptif untuk SEMUA MATA PELAJARAN dengan proteksi kerahasiaan soal
  let subjectGuideline = '';
  if (lowerSubject.includes('matematika') || lowerTopic.includes('geometri') || lowerTopic.includes('pecahan') || lowerDesc.includes('bangun')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN MATEMATIKA:
- Tampilkan gambar bangun datar / bangun ruang (2D/3D), sudut, jaring-jaring, atau diagram pecahan berarsir secara presisi, proporsional, dan terukur.
- Tampilkan hanya ukuran panjang sisi, alas, tinggi, atau besar sudut yang DIKETAHUI pada stimulus soal (misal: alas 6 cm, tinggi 8 cm, tanda siku-siku).
- KERAHASIAAN SOAL (ANTI-BOCOR): DILARANG KERAS menuliskan rumus solusi atau hasil perhitungan yang sedang ditanyakan (seperti luas, volume, keliling, atau besar sudut hasil hitungan) pada gambar! Siswa wajib menghitungnya sendiri.`;
  } else if (lowerSubject.includes('alam') || lowerSubject.includes('ipas') || lowerSubject.includes('ipa') || lowerSubject.includes('sains') || lowerSubject.includes('biologi') || lowerSubject.includes('fisika')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN IPAS / IPA / SAINS:
- Tampilkan diagram organ anatomi tubuh, daur hidup / metamorfosis hewan, rantai makanan ekosistem, siklus air, fotosintesis tumbuhan, tata surya, atau rangkaian listrik dengan akurat secara ilmiah dan edukatif.
- Jika butir soal menanyakan bagian tertentu dengan tanda panah atau huruf penunjuk (misal: 'bagian yang ditunjuk oleh huruf X', 'tahap ke-2', 'organ bernomor 1'), WAJIB SERTAKAN TANDA PANAH DAN LABEL PENUNJUK (huruf X, Y, atau angka) YANG MENGARAH TEPAT KE BAGIAN TERSEBUT.
- KERAHASIAAN SOAL (ANTI-BOCOR): DILARANG KERAS menuliskan nama organ/fungsi/tahap yang menjadi jawaban soal di gambar! Label pada bagian yang ditanyakan HANYA huruf 'X' atau nomor penunjuk tanpa ada teks nama jawabannya (contoh: jangan menulis kata 'Lambung' atau 'Ginjal' di gambar jika itu yang sedang ditanyakan, cukup label 'X' agar siswa berpikir dan menganalisis sendiri).`;
  } else if (lowerSubject.includes('islam') || lowerSubject.includes('agama') || lowerTopic.includes('hijai') || lowerTopic.includes('harakat') || lowerDesc.includes('hijai')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN PENDIDIKAN AGAMA ISLAM (PAI):
- Jika materi memuat Huruf Hijaiyah / Al-Qur'an, gunakan kaligrafi aksara huruf hijaiyah Arab asli berharakat lengkap (fathah, kasrah, dhammah, sukun, tasydid) dengan khat Naskh yang proporsional, tajam, dan harakat yang terbaca sangat jelas.
- Jika berkaitan dengan tata cara ibadah (gerakan wudhu, gerakan salat), sajikan ilustrasi karakter anak muslim yang santun, sopan, dan sesuai kaidah syariat yang ditanyakan di soal.
- KERAHASIAAN SOAL (ANTI-BOCOR): Jangan menuliskan teks nama gerakan atau rukun ibadah jika nama gerakan tersebut merupakan hal yang ditanyakan pada butir soal.`;
  } else if (lowerSubject.includes('indonesia') || lowerSubject.includes('inggris') || lowerSubject.includes('bahasa')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN BAHASA:
- Gambar seri aktivitas atau situasi cerita harus menggambarkan alur peristiwa secara runtut, ekspresif, dan relevan dengan wacana bacaan dan pertanyaan pada soal.
- Objek, latar suasana, dan tokoh yang digambarkan harus sesuai dengan konteks yang dipertanyakan pada butir soal.
- KERAHASIAAN SOAL (ANTI-BOCOR): Jangan menuliskan teks pesan moral, kesimpulan cerita, atau kalimat jawaban langsung di dalam gambar.`;
  } else if (lowerSubject.includes('sosial') || lowerSubject.includes('ips') || lowerSubject.includes('geografi') || lowerSubject.includes('sejarah')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN IPS:
- Tampilkan denah rute lingkungan dengan arah mata angin, bentang alam (sungai, pantai, pegunungan), kegiatan ekonomi pasar, atau peninggalan sejarah yang akurat sesuai pertanyaan soal.
- KERAHASIAAN SOAL (ANTI-BOCOR): Jika soal menanyakan lokasi tujuan atau arah mata angin tertentu, jangan memberi tanda sorotan atau teks label jawaban langsung pada objek tujuan yang ditanyakan.`;
  } else if (lowerSubject.includes('pancasila') || lowerSubject.includes('ppkn') || lowerSubject.includes('pkn')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN PPKN / PENDIDIKAN PANCASILA:
- Tampilkan ilustrasi pengamalan sila Pancasila, kerja sama gotong royong, musyawarah, simbol lambang Garuda Pancasila, atau keragaman pakaian adat nusantara yang edukatif dan sesuai pertanyaan soal.
- KERAHASIAAN SOAL (ANTI-BOCOR): Jika soal menanyakan penerapan sila ke berapa atau nilai tertentu, JANGAN menuliskan teks jawaban 'Sila ke-X' atau membocorkan jawaban di gambar! Biarkan siswa menyimpulkan sendiri dari adegan gambar.`;
  } else if (lowerSubject.includes('pjok') || lowerSubject.includes('olahraga') || lowerSubject.includes('penjas')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN PJOK:
- Tampilkan peragaan teknik gerak olahraga (posisi awalan, tumpuan kaki, ayunan tangan, dan sikap akhir) dengan lintasan gerak dan posisi tubuh yang benar sesuai pertanyaan soal.
- KERAHASIAAN SOAL (ANTI-BOCOR): Jangan menuliskan nama teknik gerak atau jawaban yang sedang diujikan sebagai teks di gambar.`;
  } else if (lowerSubject.includes('seni') || lowerSubject.includes('budaya') || lowerSubject.includes('rupa') || lowerSubject.includes('musik')) {
    subjectGuideline = `PANDUAN KHUSUS MATA PELAJARAN SENI BUDAYA:
- Tampilkan ragam hias motif ornamen nusantara, pola batik, atau alat musik tradisional dengan visual yang estetis, rapi, dan berkarakter khas sesuai butir soal.
- KERAHASIAAN SOAL (ANTI-BOCOR): Jangan menuliskan teks nama motif atau nama alat musik yang menjadi jawaban pertanyaan soal pada gambar.`;
  } else {
    subjectGuideline = `PANDUAN MATA PELAJARAN:
- Sajikan ilustrasi edukatif resmi yang selaras dengan topik "${topic || subject || 'materi pelajaran'}" dan secara langsung menjawab kebutuhan visual butir soal di atas tanpa membocorkan kunci jawaban di gambar.`;
  }

  let prompt = `TUGAS: Buatkan gambar stimulus visual buku pelajaran Kurikulum Merdeka yang jelas, bersih, berdefinisi tinggi (HD), dan berlatar belakang putih polos untuk stimulus visual butir soal asesmen${forQuestion}.\n\n`;

  if (contextHeader) {
    prompt += `Konteks Pembelajaran: ${contextHeader}\n\n`;
  }

  // ATURAN KERAHASIAAN SOAL & ANTI-BOCOR JAWABAN (WAJIB DIPATUHI)
  prompt += `============================================================\n`;
  prompt += `ATURAN KRUSIAL: KERAHASIAAN SOAL & ANTI-BOCOR JAWABAN (WAJIB DIPATUHI):\n`;
  prompt += `Gambar ini adalah STIMULUS BUTIR SOAL ASESMEN SISWA. Kerahasiaan soal harus terjaga 100% agar siswa berpikir dan memecahkan soal secara mandiri!\n`;
  prompt += `1. DILARANG KERAS MENAMPILKAN JAWABAN BENAR PADA GAMBAR:\n`;
  prompt += `   - JANGAN berikan tanda centang (✓), lingkaran sorotan hijau, mahkota, atau penanda visual apapun yang mengistimewakan salah satu bagian/opsi sebagai jawaban benar.\n`;
  prompt += `   - JANGAN menuliskan teks kunci jawaban, pembahasan, atau teks jawaban yang benar di dalam gambar.\n`;
  prompt += `2. JANGAN MENULISKAN LABEL JAWABAN PADA BAGIAN YANG DITANYAKAN:\n`;
  prompt += `   - Jika pertanyaan di bawah menanyakan nama bagian organ/benda/bangun/tahap yang ditunjuk huruf (misal: 'ditunjukkan oleh huruf X', 'huruf Y', 'angka 1', 'tanda tanya ?'), gambar HANYA BOLEH menampilkan label huruf/angka/tanda tanya tersebut beserta tanda panah penunjuknya.\n`;
  prompt += `   - DILARANG menuliskan nama ilmiah/nama organ/nama benda yang ditanyakan di gambar! Biarkan siswa yang menganalisis dan menjawabnya sendiri.\n`;
  prompt += `3. JANGAN MENULISKAN HASIL PERHITUNGAN ATAU JAWABAN MATEMATIKA:\n`;
  prompt += `   - Jika soal matematika menanyakan luas, keliling, volume, besar sudut, atau hasil operasi hitung, gambar HANYA menampilkan bangun dan ukuran-ukuran dasar yang diketahui (misal: alas 6 cm, tinggi 8 cm).\n`;
  prompt += `   - DILARANG menuliskan rumus penyelesaian atau hasil jawaban akhir (misal: jangan menulis "Luas = 24 cm²") pada gambar!\n`;
  prompt += `4. GAMBAR MURNI SEBAGAI STIMULUS PENGAMATAN OBJEKTIF & NETRAL:\n`;
  prompt += `   - Seluruh objek disajikan sebagai teka-teki / fenomena visual akademis yang objektif, rapi, dan belum terpecahkan untuk diobservasi oleh peserta didik.\n`;
  prompt += `============================================================\n\n`;

  if (questionText && questionText.trim().length > 3) {
    const qClean = sanitizeAntiSpoiler(questionText.trim().replace(/^["']|["']$/g, ''));
    prompt += `PERTANYAAN SOAL YANG HARUS DIJAWAB SISWA BERDASARKAN GAMBAR INI:\n`;
    prompt += `"${qClean}"\n\n`;
    prompt += `RINCIAN OBJEK GAMBAR YANG WAJIB DIBUAT (MENGIKUTI PERTANYAAN SOAL DI ATAS, TANPA MEMBOCORKAN JAWABAN):\n`;
    prompt += `"${promptText}"\n\n`;
  } else {
    prompt += `RINCIAN OBJEK GAMBAR YANG WAJIB DIBUAT (MURNI SEBAGAI STIMULUS NETRAL, TANPA MEMBOCORKAN JAWABAN):\n"${promptText}"\n\n`;
  }

  prompt += `PETUNJUK TEKNIS FORMAT VISUAL (STANDAR RESMI BUKU TEKS):\n`;
  prompt += `1. KESESUAIAN PRESISI: Gambar WAJIB MENGIKUTI DAN MERUJUK LANGSUNG PADA BUTIR PERTANYAAN SOAL di atas sebagai bahan stimulus observasi siswa.\n`;
  prompt += `2. LABEL PENUNJUK NETRAL: Tampilkan tanda panah atau label huruf/angka penunjuk (misal: 'X', 'Y', '1', '2') secara presisi dan jelas mengarah ke objek yang ditanyakan, TANPA menuliskan nama jawabannya.\n`;
  prompt += `3. STANDAR VISUAL: Gaya ilustrasi vektor / diagram edukatif resmi buku teks Kurikulum Merdeka, latar belakang putih polos bersih (clean white background), tajam, tanpa bayangan gelap mengganggu, dan tanpa teks asing acak/gibberish.\n\n`;

  if (subjectGuideline) {
    prompt += `${subjectGuideline}\n`;
  }

  return prompt.trim();
}

export function getOptimizedImagePrompt(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^["']|["']$/g, '').trim();
  const lower = text.toLowerCase();

  if (lower.includes('kupu-kupu') || lower.includes('metamorfosis kupu')) {
    return 'butterfly life cycle diagram with egg caterpillar chrysalis butterfly, educational textbook illustration, clean vector style, white background';
  }
  if (lower.includes('katak') || lower.includes('metamorfosis katak')) {
    return 'frog life cycle diagram with eggs tadpole froglet adult frog, educational textbook illustration, clean vector style, white background';
  }
  if (lower.includes('nyamuk') || lower.includes('metamorfosis nyamuk')) {
    return 'mosquito life cycle diagram with eggs larva pupa adult mosquito, educational textbook illustration, clean white background';
  }
  if (lower.includes('jaring makanan') || lower.includes('rantai makanan') || lower.includes('food chain')) {
    return 'food chain diagram grass grasshopper frog snake eagle, educational scientific illustration, clean vector style, white background';
  }
  if (lower.includes('fotosintesis') || lower.includes('photosynthesis')) {
    return 'plant photosynthesis diagram sunlight carbon dioxide water oxygen glucose, educational textbook illustration, clean white background';
  }
  if (lower.includes('siklus air') || lower.includes('hidrologi')) {
    return 'water cycle diagram evaporation condensation precipitation clouds rain, educational scientific illustration, clean white background';
  }
  if (lower.includes('tata surya') || lower.includes('planet')) {
    return 'solar system planets orbit sun, educational science diagram, clean illustration, dark background';
  }
  if (lower.includes('jantung') || lower.includes('peredaran darah')) {
    return 'human heart anatomy circulatory system diagram, educational science illustration, white background';
  }
  if (lower.includes('pencernaan') || lower.includes('organ pencernaan')) {
    return 'human digestive system diagram organs labeled, educational textbook illustration, white background';
  }
  if (lower.includes('trapesium') || lower.includes('bangun datar') || lower.includes('geometri')) {
    return `${text}, clean mathematical geometry shape diagram with clear labels measurements and right angles, blueprint textbook style, white background`;
  }
  if (lower.includes('balok') || lower.includes('kubus') || lower.includes('jaring-jaring')) {
    return `${text}, 3D geometric shape net diagram, mathematical textbook illustration, white background`;
  }
  if (lower.includes('denah') || lower.includes('peta')) {
    return `${text}, architectural floor plan layout map, clean vector schematic, white background`;
  }

  return `${text}, educational textbook diagram illustration, clear scientific schematic, white background`;
}

export function extractSequenceSteps(text: string): { steps: string[]; type: 'cycle' | 'foodchain' | 'flow' } | null {
  const clean = text.replace(/^["']|["']$/g, '').trim();

  if (clean.includes('->') || clean.includes('➔') || clean.includes('-->') || clean.includes('=>')) {
    const rawParts = clean.split(/->|➔|-->|=>/);
    const steps = rawParts
      .map((p, idx) => {
        let cleaned = p.trim();
        if (idx === 0) {
          cleaned = cleaned.replace(/^.*?(?:urutan|tahapan|siklus|berikut|yaitu|adalah)?:\s*/i, '').trim();
        }
        return cleaned.replace(/^(?:Urutan|Tahapan|Siklus|Diagram|Tahap\s*\d+)[\s:]*/i, '').trim();
      })
      .filter((p) => p.length > 0);

    if (steps.length >= 2) {
      return { steps, type: /siklus|metamorfosis/i.test(clean) ? 'cycle' : 'flow' };
    }
  }

  if (/dimakan/i.test(clean)) {
    const parts: string[] = [];
    const segments = clean.split(/[,;\n]/);
    for (const seg of segments) {
      const sub = seg.split(/dimakan/i);
      if (sub.length === 2) {
        const left = sub[0].replace(/^.*?:\s*/, '').trim();
        const right = sub[1].trim();
        if (left && !parts.includes(left)) parts.push(left);
        if (right && !parts.includes(right)) parts.push(right);
      }
    }
    if (parts.length >= 2) {
      return { steps: parts, type: 'foodchain' };
    }
  }

  return null;
}

export function sanitizeQuickChartUrl(rawUrl: string): string {
  try {
    const trimmed = rawUrl.trim().replace(/^["']|["']$/g, '');
    if (!trimmed.includes('quickchart.io/chart')) return trimmed;

    const splitIdx = trimmed.indexOf('?c=');
    if (splitIdx === -1) return trimmed;

    const baseUrl = trimmed.substring(0, splitIdx + 3);
    const queryPart = trimmed.substring(splitIdx + 3);

    if (queryPart.includes('{') || queryPart.includes(' ') || queryPart.includes('"') || queryPart.includes('[')) {
      return `${baseUrl}${encodeURIComponent(queryPart)}&w=550&h=300&bkg=white&devicePixelRatio=2`;
    }

    if (!queryPart.includes('bkg=')) {
      return `${trimmed}&bkg=white&devicePixelRatio=2`;
    }

    return trimmed;
  } catch {
    return rawUrl;
  }
}

// ==========================================
// 2. INSTANT EDUCATIONAL ILLUSTRATION ENGINE
// ==========================================

export function renderEducationalIllustration(_text: string): React.ReactNode | null {
  // Built-in illustrations (butterflies, diagrams, etc.) removed per user instruction.
  // The application focuses strictly on Gemini-generated images uploaded by the teacher.
  return null;
}

interface StimulusVisualBlockProps {
  description: string;
  docId?: string;
  blockKey?: string;
  questionNumber?: string | number;
  questionLabel?: string;
  questionText?: string;
  subject?: string;
  topic?: string;
  onImageChange?: (url: string | null) => void;
}

export const StimulusVisualBlock: React.FC<StimulusVisualBlockProps> = ({
  description,
  docId,
  blockKey,
  questionNumber,
  questionLabel,
  questionText,
  subject,
  topic,
  onImageChange,
}) => {
  const cleanDesc = description.replace(/^["']|["']$/g, '').trim();

  // Resolved human-readable question label, e.g. "Soal Nomor 1", "Soal Nomor 2"
  const resolvedQuestionLabel = useMemo(() => {
    if (questionLabel) return questionLabel;
    if (questionNumber) return `Soal Nomor ${questionNumber}`;
    return null;
  }, [questionLabel, questionNumber]);

  // Construct unique, deterministic, and isolated storage key for THIS specific question
  const storageKey = useMemo(() => {
    if (blockKey) return blockKey;
    const qPart = questionNumber ? `soal_${questionNumber}_` : '';
    const hash = hashString(cleanDesc);
    const slug = cleanDesc.slice(0, 30).toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `stimulus_${qPart}${slug}_${hash}`;
  }, [blockKey, questionNumber, cleanDesc]);

  // Strict isolated state: Only look up this specific block's unique storage key
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(() => {
    return getDocImage(docId || 'default_doc', storageKey);
  });

  const [showImage, setShowImage] = useState(true);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptBox, setShowPromptBox] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync if docId or storageKey changes
  useEffect(() => {
    const saved = getDocImage(docId || 'default_doc', storageKey);
    setCustomImageUrl(saved || null);
  }, [docId, storageKey]);

  // Listen to image update events - STRICTLY SCOPED to this block's key
  useEffect(() => {
    const handleGlobalImageUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      // Only update this component if the event explicitly matches this block's storageKey or blockKey
      const isTargeted =
        (detail.storageKey && detail.storageKey === storageKey) ||
        (detail.blockKey && blockKey && detail.blockKey === blockKey);

      if (!isTargeted) {
        return; // Ignore updates intended for other questions/blocks
      }

      if (detail.dataUrl) {
        setCustomImageUrl(detail.dataUrl);
        setShowImage(true);
      } else if (detail.dataUrl === null) {
        setCustomImageUrl(null);
      }
    };

    window.addEventListener('doc-image-updated', handleGlobalImageUpdate);
    return () => window.removeEventListener('doc-image-updated', handleGlobalImageUpdate);
  }, [storageKey, blockKey]);

  // The tailored Google Gemini prompt for this specific stimulus and question (strictly follows question text)
  const geminiPrompt = useMemo(
    () =>
      createGeminiImagePrompt(
        cleanDesc,
        resolvedQuestionLabel || undefined,
        questionText,
        subject,
        topic
      ),
    [cleanDesc, resolvedQuestionLabel, questionText, subject, topic]
  );

  // Copy prompt and open Google Gemini Images in a new tab
  const handleOpenGeminiAndCopyPrompt = (e?: React.MouseEvent) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(geminiPrompt).catch(() => {});
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = geminiPrompt;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // fallback
    }

    setCopiedPrompt(true);
    setShowPromptBox(true);
    setTimeout(() => setCopiedPrompt(false), 8000);

    if (!e || !(e.currentTarget instanceof HTMLAnchorElement)) {
      try {
        window.open(GEMINI_IMAGE_URL, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Popup blocked by browser:', err);
      }
    }
  };

  const handleCopyOnly = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(geminiPrompt);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = geminiPrompt;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 5000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const applyImage = async (fileOrUrl: File | string) => {
    try {
      setIsOptimizing(true);
      const optimized = await optimizeImage(fileOrUrl);
      setCustomImageUrl(optimized);
      // Save strictly under THIS block's unique storageKey (never polluting global slots)
      saveDocImage(docId || 'default_doc', storageKey, optimized);
      if (blockKey && blockKey !== storageKey) {
        saveDocImage(docId || 'default_doc', blockKey, optimized);
      }
      setShowImage(true);
      onImageChange?.(optimized);
      window.dispatchEvent(
        new CustomEvent('doc-image-updated', {
          detail: { dataUrl: optimized, storageKey, blockKey },
        })
      );
    } catch (err) {
      console.error('Gagal memproses gambar:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyImage(file);
    e.target.value = '';
  };

  // Support pasting images directly from clipboard (Ctrl + V) onto this card
  const handleCardPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          applyImage(file);
          e.preventDefault();
          e.stopPropagation();
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
    if (file && file.type.startsWith('image/')) {
      applyImage(file);
    }
  };

  const handleSaveCustomUrl = () => {
    if (inputUrl.trim()) {
      applyImage(inputUrl.trim());
      setIsUrlModalOpen(false);
      setInputUrl('');
    }
  };

  const handleRemoveImage = () => {
    // Strictly delete only THIS question's image
    removeDocImage(docId || 'default_doc', storageKey);
    if (blockKey && blockKey !== storageKey) {
      removeDocImage(docId || 'default_doc', blockKey);
    }
    setCustomImageUrl(null);
    onImageChange?.(null);
    window.dispatchEvent(
      new CustomEvent('doc-image-updated', {
        detail: { dataUrl: null, storageKey, blockKey },
      })
    );
  };

  const hasImage = Boolean(customImageUrl);

  return (
    <div
      data-stimulus-block="true"
      data-storage-key={storageKey}
      data-block-key={blockKey || storageKey}
      data-question-number={questionNumber || ''}
      onPaste={handleCardPaste}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      tabIndex={0}
      contentEditable={false}
      className={`visual-stimulus-wrapper my-3.5 p-3.5 rounded-xl text-slate-800 shadow-2xs not-prose transition-all focus:outline-none ${
        isDragging
          ? 'bg-amber-100/90 border-2 border-dashed border-amber-600 ring-2 ring-amber-300'
          : 'bg-amber-50/70 border border-amber-300/90 focus:ring-1 focus:ring-amber-400'
      } ${
        hasImage
          ? 'has-image print:border-none print:border-0 print:p-0 print:m-0 print:my-2 print:bg-transparent print:shadow-none'
          : 'no-image print:hidden'
      }`}
    >
      {/* Header bar: Tersembunyi saat cetak PDF atau ekspor dokumen jika memiliki gambar agar gambar bersih */}
      <div
        data-stimulus-header="true"
        className="stimulus-header-bar flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200/80 no-print print:hidden"
      >
        <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[0.82rem] uppercase tracking-wide print:text-slate-900">
          <span className="text-sm">📐</span>
          <span>
            {resolvedQuestionLabel
              ? `Stimulus Visual ${resolvedQuestionLabel} (Gambar Dari Gemini)`
              : 'Stimulus Visual Soal (Gambar Dari Gemini)'}
          </span>
        </div>

        {/* Teacher Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 no-print text-xs">
          {/* Main button: Open Google Gemini + Auto Copy Prompt */}
          <a
            href={GEMINI_IMAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenGeminiAndCopyPrompt}
            title={
              resolvedQuestionLabel
                ? `Buka Google Gemini Images & Salin Otomatis Prompt Gambar ${resolvedQuestionLabel}`
                : 'Buka Google Gemini Images & Salin Otomatis Prompt Gambar Soal Ini'
            }
            className="btn-open-gemini inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-[11px] rounded-md shadow-2xs transition-all cursor-pointer border border-blue-400/40 transform active:scale-95 no-underline"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Buat Gambar di Google Gemini</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          {/* Upload Image button */}
          <label
            title={
              resolvedQuestionLabel
                ? `Unggah gambar khusus untuk ${resolvedQuestionLabel}`
                : 'Unggah gambar hasil dari Gemini atau dari komputer Anda'
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-medium text-[11px] transition-colors cursor-pointer border border-slate-300"
          >
            <Upload className="w-3 h-3 text-slate-600" />
            <span>{hasImage ? 'Ganti Gambar' : 'Unggah Gambar'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Paste URL button */}
          <button
            type="button"
            onClick={() => setIsUrlModalOpen((v) => !v)}
            title="Tempel URL link gambar"
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-medium text-[11px] transition-colors cursor-pointer border border-slate-300"
          >
            <LinkIcon className="w-3 h-3 text-slate-600" />
            <span>Link URL</span>
          </button>

          {/* Delete Image button */}
          {hasImage && (
            <button
              type="button"
              onClick={handleRemoveImage}
              title={
                resolvedQuestionLabel
                  ? `Hapus gambar khusus ${resolvedQuestionLabel}`
                  : 'Hapus gambar stimulus ini'
              }
              className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-[11px] transition-colors cursor-pointer border border-rose-200"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Hapus</span>
            </button>
          )}

          {/* Toggle view button */}
          {hasImage && (
            <button
              type="button"
              onClick={() => setShowImage((v) => !v)}
              title={showImage ? 'Sembunyikan gambar' : 'Tampilkan gambar'}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-md text-[11px] transition-colors cursor-pointer border border-slate-300"
            >
              {showImage ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* URL Input Modal */}
      {isUrlModalOpen && (
        <div className="mb-3 p-2.5 bg-white border border-amber-300 rounded-lg flex items-center gap-2 no-print shadow-xs animate-in fade-in">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Tempel URL gambar (https://...)"
            className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleSaveCustomUrl}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUrlModalOpen(false)}
            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Batal
          </button>
        </div>
      )}

      {/* SUCCESS BANNER WHEN GEMINI BUTTON IS CLICKED */}
      {showPromptBox && (
        <div className="my-2.5 p-3.5 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-300 rounded-xl no-print shadow-xs animate-in fade-in space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs sm:text-[13px] flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Prompt Gambar {resolvedQuestionLabel || 'Soal'} Otomatis Berhasil Disalin!</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Mengikuti Pertanyaan Soal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                  Anti-Bocor Jawaban (Kerahasiaan Terjaga)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                Tab <strong>Google Gemini Images</strong> telah terbuka. Anda tinggal menekan{' '}
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold shadow-2xs">
                  Ctrl + V
                </kbd>{' '}
                (Paste) di kolom input chat Gemini, lalu tekan <strong>Enter</strong>. Prompt telah dilengkapi perintah khusus agar Gemini menghasilkan gambar stimulus yang presisi mengikuti pertanyaan soal <em>tanpa menampilkan kunci jawaban atau hasil pemecahan</em> di dalam gambar.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyOnly}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-100/60 text-blue-800 text-[11px] font-semibold rounded-md border border-blue-200 cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPrompt ? 'Tersalin' : 'Salin Ulang'}</span>
              </button>
            </div>
          </div>

          {/* Context question notice */}
          {questionText && (
            <div className="px-2.5 py-1.5 bg-sky-100/70 border border-sky-200 rounded-lg text-[11px] text-sky-900 space-y-0.5">
              <div className="flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                <span>Pertanyaan Soal yang Diikuti (Stimulus Netral &amp; Objektif):</span>
              </div>
              <p className="italic pl-4 text-slate-800">&quot;{questionText.length > 160 ? questionText.slice(0, 160) + '...' : questionText}&quot;</p>
              <div className="text-[10px] text-emerald-800 font-medium pl-4">
                ✓ Kerahasiaan soal terproteksi: gambar hanya menyajikan bahan observasi (misal: label huruf X atau ukuran bangun) tanpa membocorkan nama jawaban atau hasil perhitungan.
              </div>
            </div>
          )}

          {/* Prompt preview box */}
          <div className="p-2.5 bg-white/95 border border-blue-200 rounded-lg text-[11px] text-slate-700 font-mono select-all max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {geminiPrompt}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1 border-t border-blue-100">
            <span>
              💡 <em>Setelah gambar selesai di Gemini, klik kanan &quot;Salin Gambar&quot;, lalu tekan <strong>Ctrl + V</strong> di kartu ini atau gunakan tombol &quot;Unggah Gambar&quot;.</em>
            </span>
            <button
              type="button"
              onClick={() => setShowPromptBox(false)}
              className="text-xs text-blue-700 hover:underline cursor-pointer font-medium"
            >
              Tutup Petunjuk
            </button>
          </div>
        </div>
      )}

      {/* 1. CUSTOM UPLOADED / PASTED IMAGE FROM GEMINI */}
      {showImage && hasImage && (
        <div className="visual-image-display my-2 text-center print:m-0 print:my-1.5 print:p-0">
          <div className="inline-block relative max-w-full">
            <img
              src={customImageUrl!}
              alt={cleanDesc}
              className="max-w-full sm:max-w-md max-h-72 object-contain mx-auto rounded-lg shadow-2xs border border-slate-200 bg-white print:max-h-64 print:shadow-none print:border-none print:border-0 print:rounded-none"
            />
            {/* Delete button directly on image corner */}
            <button
              type="button"
              onClick={handleRemoveImage}
              title={
                resolvedQuestionLabel
                  ? `Hapus gambar ${resolvedQuestionLabel}`
                  : 'Hapus gambar ini'
              }
              className="no-print absolute -top-2.5 -right-2.5 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md text-xs cursor-pointer transition-transform hover:scale-110 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] text-slate-500 font-sans italic mt-1.5 flex items-center justify-center gap-1.5 no-print">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {resolvedQuestionLabel
                ? `Gambar ${resolvedQuestionLabel} Berhasil Dimuat & Siap Dicetak`
                : 'Gambar Soal Berhasil Dimuat & Siap Dicetak'}
            </span>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sky-700 hover:text-sky-900 underline font-semibold cursor-pointer"
            >
              Ganti Gambar
            </button>
          </div>
        </div>
      )}

      {/* 2. IF NO IMAGE HAS BEEN UPLOADED YET: Clean Dedicated Upload Box (NO Default App Graphics) */}
      {!hasImage && (
        <div className="my-2.5 p-4 sm:p-5 bg-white border-2 border-dashed border-amber-300 rounded-xl text-center no-print shadow-2xs">
          <div className="flex items-center justify-center gap-2 text-amber-950 font-bold text-xs sm:text-sm mb-1.5">
            <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {resolvedQuestionLabel
                ? `Tempat Unggah Gambar ${resolvedQuestionLabel}`
                : 'Tempat Unggah Gambar Soal Ini'}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 max-w-md mx-auto mb-3.5 leading-relaxed">
            {resolvedQuestionLabel
              ? `${resolvedQuestionLabel} membutuhkan gambar stimulus. Klik tombol di bawah untuk membuat gambar di Google Gemini dengan prompt otomatis, lalu unggah gambarnya ke sini.`
              : 'Soal ini membutuhkan gambar stimulus. Klik tombol di bawah untuk membuat gambar di Google Gemini dengan prompt otomatis, lalu unggah gambarnya ke sini.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <label
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer transform active:scale-95"
            >
              <Upload className="w-4 h-4 text-sky-200" />
              <span>📁 Unggah File Gambar</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <a
              href={GEMINI_IMAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenGeminiAndCopyPrompt}
              className="btn-open-gemini inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer no-underline transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Buka Google Gemini</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 italic">
            💡 Bisa juga klik di kotak ini lalu tekan <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700">Ctrl + V</kbd> untuk langsung menempelkan gambar
          </div>
        </div>
      )}

      {/* 3. CAPTION & VISUAL SPECIFICATION: Hanya untuk panduan guru di aplikasi web, tidak pernah dicetak di PDF/Word */}
      <div
        data-stimulus-caption="true"
        className="stimulus-caption-box mt-2 text-slate-700 text-xs pl-2.5 border-l-2 border-amber-400 font-sans space-y-0.5 no-print print:hidden"
      >
        {questionText && (
          <div className="not-italic text-slate-700 line-clamp-2">
            <span className="font-semibold text-amber-950">Pertanyaan Soal:</span>{' '}
            <span className="text-slate-800 font-medium">&quot;{questionText}&quot;</span>
          </div>
        )}
        <div className="italic text-slate-600">
          <span className="font-semibold text-amber-900 not-italic mr-1">
            Keterangan Visual Gambar:
          </span>
          <span className="visual-desc-text">&quot;{cleanDesc}&quot;</span>
        </div>
      </div>
    </div>
  );
};

interface ChartVisualBlockProps {
  url: string;
  docId?: string;
  blockKey?: string;
}

export const ChartVisualBlock: React.FC<ChartVisualBlockProps> = ({ url, docId, blockKey }) => {
  const sanitizedUrl = useMemo(() => sanitizeQuickChartUrl(url), [url]);
  const storageKey = useMemo(() => {
    return blockKey || `chart_${sanitizedUrl.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, [blockKey, sanitizedUrl]);

  const [customImageUrl, setCustomImageUrl] = useState<string | null>(() => {
    return getDocImage(docId || 'default_doc', storageKey);
  });
  const [chartStatus, setChartStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [showChart, setShowChart] = useState(true);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getDocImage(docId || 'default_doc', storageKey);
    if (saved) {
      setCustomImageUrl(saved);
      setChartStatus('loaded');
    }
  }, [docId, storageKey]);

  const activeUrl = customImageUrl || sanitizedUrl;

  const applyChartImage = async (fileOrUrl: File | string) => {
    try {
      const optimized = await optimizeImage(fileOrUrl);
      setCustomImageUrl(optimized);
      saveDocImage(docId || 'default_doc', storageKey, optimized);
      setChartStatus('loaded');
    } catch (err) {
      console.error('Gagal memproses gambar grafik:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyChartImage(file);
    e.target.value = '';
  };

  const handleChartPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          applyChartImage(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSaveCustomUrl = () => {
    if (inputUrl.trim()) {
      applyChartImage(inputUrl.trim());
      setIsUrlModalOpen(false);
      setInputUrl('');
    }
  };

  const handleRemoveChart = () => {
    removeDocImage(docId || 'default_doc', storageKey);
    setCustomImageUrl(null);
  };

  const handleOpenGeminiForChart = (e?: React.MouseEvent) => {
    const prompt = `Buatkan gambar grafik data atau diagram batang/lingkaran yang rapi, berdefinisi tinggi, latar belakang putih bersih untuk stimulus numerasi Kurikulum Merdeka. Data grafik diambil dari: ${url}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).catch(() => {});
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 5000);
    } catch {
      // ignore
    }
    if (!e || !(e.currentTarget instanceof HTMLAnchorElement)) {
      try {
        window.open(GEMINI_IMAGE_URL, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Popup blocked:', err);
      }
    }
  };

  return (
    <div
      onPaste={handleChartPaste}
      tabIndex={0}
      contentEditable={false}
      className="visual-chart-container my-3.5 p-3 bg-slate-50 border border-slate-300 rounded-xl text-center print:bg-white print:border-slate-400 print:my-2 not-prose shadow-2xs focus:outline-none"
    >
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200 print:border-slate-300">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[0.82rem] uppercase tracking-wide">
          <BarChart3 className="w-4 h-4 text-sky-600" />
          <span>Grafik Data Stimulus Numerasi</span>
        </div>

        {/* Teacher Controls */}
        <div className="flex flex-wrap items-center gap-1.5 no-print text-xs">
          <a
            href={GEMINI_IMAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenGeminiForChart}
            title="Buka Google Gemini untuk membuat alternatif grafik visual"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md font-medium text-[11px] transition-colors cursor-pointer border border-blue-400/40 no-underline"
          >
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>{copiedPrompt ? 'Prompt Disalin!' : 'Buat di Gemini'}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-80" />
          </a>

          <label
            title="Unggah gambar grafik dari komputer Anda atau tempel (Ctrl+V)"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-medium text-[11px] transition-colors cursor-pointer border border-slate-300"
          >
            <Upload className="w-3 h-3 text-slate-600" />
            <span>{customImageUrl ? 'Ganti Grafik' : 'Unggah'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <button
            type="button"
            onClick={() => setIsUrlModalOpen((v) => !v)}
            title="Ganti URL gambar grafik"
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-medium text-[11px] transition-colors cursor-pointer border border-slate-300"
          >
            <LinkIcon className="w-3 h-3 text-slate-600" />
            <span>Ganti URL</span>
          </button>

          {customImageUrl && (
            <button
              type="button"
              onClick={handleRemoveChart}
              title="Reset ke grafik asli"
              className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-[11px] transition-colors cursor-pointer border border-rose-200"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Reset</span>
            </button>
          )}

          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Buka grafik ukuran penuh di tab baru"
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-md text-[11px] transition-colors border border-slate-300"
          >
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={() => setShowChart((v) => !v)}
            title={showChart ? 'Sembunyikan grafik' : 'Tampilkan grafik'}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-md text-[11px] transition-colors cursor-pointer border border-slate-300"
          >
            {showChart ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* URL Input Modal */}
      {isUrlModalOpen && (
        <div className="mb-3 p-2 bg-white border border-sky-300 rounded-lg flex items-center gap-2 no-print shadow-xs text-left">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Tempel URL grafik (https://...)"
            className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={handleSaveCustomUrl}
            className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-md hover:bg-sky-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUrlModalOpen(false)}
            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Batal
          </button>
        </div>
      )}

      {/* Image Renderer */}
      {showChart && (
        <div className="relative my-1">
          {chartStatus === 'loading' && (
            <div className="w-full h-44 sm:h-52 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-600 gap-2 no-print">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span className="text-xs font-medium">Sedang memproses grafik data numerasi...</span>
            </div>
          )}

          {chartStatus === 'error' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex flex-col items-center gap-1.5 my-2">
              <div className="flex items-center gap-1 font-semibold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Grafik online sedang dalam proses render atau koneksi terhalang.</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Anda dapat menggunakan tombol <strong>Unggah</strong> di atas untuk memasukkan gambar bagan langsung dari komputer.
              </p>
            </div>
          )}

          <img
            src={activeUrl}
            alt="Grafik Data Stimulus Numerasi"
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={() => setChartStatus('loaded')}
            onError={() => setChartStatus('error')}
            className={`max-w-full sm:max-w-md max-h-72 mx-auto rounded-lg shadow-2xs border border-slate-200 bg-white print:max-h-60 print:shadow-none print:border-slate-400 ${
              chartStatus === 'loading' ? 'hidden' : 'block'
            }`}
          />
        </div>
      )}

      <div className="text-[0.76rem] text-slate-500 font-sans italic mt-1.5 flex items-center justify-center gap-1.5 print:text-slate-600">
        <span className="text-sm">📊</span>
        <span>Grafik Stimulus Data Numerasi (QuickChart)</span>
      </div>
    </div>
  );
};

// ==========================================
// 5. OPTION VISUAL BLOCK (FOR MULTIPLE CHOICE)
// ==========================================

interface OptionVisualBlockProps {
  optionLetter: string;
  description: string;
  docId?: string;
  blockKey?: string;
}

export const OptionVisualBlock: React.FC<OptionVisualBlockProps> = ({
  optionLetter,
  description,
  docId,
  blockKey,
}) => {
  const cleanDesc = description.replace(/^["']|["']$/g, '').trim();
  const storageKey = useMemo(() => {
    return blockKey || `option_${optionLetter}_${cleanDesc.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, [blockKey, optionLetter, cleanDesc]);

  const [customImageUrl, setCustomImageUrl] = useState<string | null>(() => {
    return getDocImage(docId || 'default_doc', storageKey);
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getDocImage(docId || 'default_doc', storageKey);
    if (saved) setCustomImageUrl(saved);
  }, [docId, storageKey]);

  const handleOpenGemini = (e?: React.MouseEvent) => {
    const prompt = `Buatkan gambar ilustrasi buku pelajaran Kurikulum Merdeka berlatar belakang putih bersih untuk pilihan jawaban ${optionLetter}: "${cleanDesc}".`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).catch(() => {});
      }
    } catch {
      // ignore
    }
    if (!e || !(e.currentTarget instanceof HTMLAnchorElement)) {
      try {
        window.open(GEMINI_IMAGE_URL, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Popup blocked:', err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await optimizeImage(file, 600, 500);
      setCustomImageUrl(optimized);
      saveDocImage(docId || 'default_doc', storageKey, optimized);
    } catch (err) {
      console.error('Gagal memproses gambar opsi:', err);
    }
    e.target.value = '';
  };

  return (
    <div
      className={`my-1.5 inline-block text-left not-prose ${customImageUrl ? 'has-image' : 'no-image print:hidden'}`}
      contentEditable={false}
    >
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-1 bg-sky-50 border border-sky-300 rounded-md text-[0.82rem] text-sky-950 no-print print:hidden">
        <span className="font-bold text-sky-800">Opsi {optionLetter}:</span>
        <span className="italic">&quot;{cleanDesc}&quot;</span>
        <a
          href={GEMINI_IMAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenGemini}
          title="Buat gambar opsi ini di Google Gemini (Prompt otomatis tersalin)"
          className="ml-1 text-[10px] text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
        >
          Buat di Gemini
        </a>
        <label
          title="Unggah gambar untuk opsi ini"
          className="text-[10px] text-sky-700 hover:text-sky-900 underline font-semibold cursor-pointer inline-flex items-center"
        >
          <span>{customImageUrl ? 'Ganti' : 'Unggah'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
        {customImageUrl && (
          <button
            type="button"
            onClick={() => {
              removeDocImage(docId || 'default_doc', storageKey);
              setCustomImageUrl(null);
            }}
            title="Hapus gambar opsi"
            className="text-[10px] text-rose-600 hover:underline cursor-pointer"
          >
            Hapus
          </button>
        )}
      </div>

      {customImageUrl && (
        <div className="my-1">
          <img
            src={customImageUrl}
            alt={`Opsi ${optionLetter}`}
            className="max-h-40 rounded border border-slate-300 object-contain bg-white"
          />
        </div>
      )}
    </div>
  );
};

// ==========================================
// 6. ITEM VISUAL BLOCK (FOR MATCHING QUESTIONS)
// ==========================================

interface ItemVisualBlockProps {
  itemId: string;
  description: string;
  docId?: string;
  blockKey?: string;
}

export const ItemVisualBlock: React.FC<ItemVisualBlockProps> = ({
  itemId,
  description,
  docId,
  blockKey,
}) => {
  const cleanDesc = description.replace(/^["']|["']$/g, '').trim();
  const storageKey = useMemo(() => {
    return blockKey || `item_${itemId}_${cleanDesc.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, [blockKey, itemId, cleanDesc]);

  const [customImageUrl, setCustomImageUrl] = useState<string | null>(() => {
    return getDocImage(docId || 'default_doc', storageKey);
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getDocImage(docId || 'default_doc', storageKey);
    if (saved) setCustomImageUrl(saved);
  }, [docId, storageKey]);

  const handleOpenGemini = (e?: React.MouseEvent) => {
    const prompt = `Buatkan gambar ilustrasi buku pelajaran Kurikulum Merdeka berlatar belakang putih bersih untuk item ${itemId}: "${cleanDesc}".`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).catch(() => {});
      }
    } catch {
      // ignore
    }
    if (!e || !(e.currentTarget instanceof HTMLAnchorElement)) {
      try {
        window.open(GEMINI_IMAGE_URL, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Popup blocked:', err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await optimizeImage(file, 600, 500);
      setCustomImageUrl(optimized);
      saveDocImage(docId || 'default_doc', storageKey, optimized);
    } catch (err) {
      console.error('Gagal memproses gambar item:', err);
    }
    e.target.value = '';
  };

  return (
    <div
      className={`my-1 inline-block text-left not-prose ${customImageUrl ? 'has-image' : 'no-image print:hidden'}`}
      contentEditable={false}
    >
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-300 rounded text-[0.8rem] text-emerald-950 no-print print:hidden">
        <span className="font-bold text-emerald-800">Item {itemId}:</span>
        <span className="italic">&quot;{cleanDesc}&quot;</span>
        <a
          href={GEMINI_IMAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenGemini}
          title="Buat gambar item ini di Google Gemini (Prompt otomatis tersalin)"
          className="ml-1 text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
        >
          Buat di Gemini
        </a>
        <label
          title="Unggah gambar untuk item ini"
          className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer inline-flex items-center"
        >
          <span>{customImageUrl ? 'Ganti' : 'Unggah'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
        {customImageUrl && (
          <button
            type="button"
            onClick={() => {
              removeDocImage(docId || 'default_doc', storageKey);
              setCustomImageUrl(null);
            }}
            title="Hapus gambar item"
            className="text-[10px] text-rose-600 hover:underline cursor-pointer"
          >
            Hapus
          </button>
        )}
      </div>

      {customImageUrl && (
        <div className="my-1">
          <img
            src={customImageUrl}
            alt={`Item ${itemId}`}
            className="max-h-40 rounded border border-slate-300 object-contain bg-white"
          />
        </div>
      )}
    </div>
  );
};

