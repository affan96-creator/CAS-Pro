import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Edit3,
  Check,
  Sparkles,
  BookOpen,
  FileCheck,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RotateCcw,
  Lock,
  Printer,
  Clock,
  FileDown,
} from 'lucide-react';
import { GeneratedDoc } from '../types';
import { sanitizeDocumentContent, splitDocForEditing } from '../utils/cleanRppm';
import { formatDocumentCreationTime } from '../utils/dateFormat';
import { downloadDocFile } from '../utils/exportUtils';
import {
  StimulusVisualBlock,
  ChartVisualBlock,
  OptionVisualBlock,
  ItemVisualBlock,
} from './StimulusVisualBlock';
import {
  optimizeImage,
  getDocHtmlEdits,
  saveDocHtmlEdits,
  clearDocHtmlEdits,
  saveDocImage,
  removeDocImage,
  hashString,
} from '../utils/imageStorage';

interface DocumentPreviewProps {
  currentDoc: GeneratedDoc | null;
  isLoading: boolean;
  activeType: string | null;
  error?: string | null;
  onRetry?: () => void;
  onUpdateContent?: (newContent: string) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  currentDoc,
  isLoading,
  activeType,
  error,
  onRetry,
  onUpdateContent,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editedBodyHtml, setEditedBodyHtml] = useState<string | null>(() => {
    return currentDoc?.id ? getDocHtmlEdits(currentDoc.id)?.editedBodyHtml ?? null : null;
  });
  const [editedSoalHtml, setEditedSoalHtml] = useState<string | null>(() => {
    return currentDoc?.id ? getDocHtmlEdits(currentDoc.id)?.editedSoalHtml ?? null : null;
  });
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [isSoalDragging, setIsSoalDragging] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const soalRef = useRef<HTMLDivElement>(null);

  // Sync or reset edited HTML when document changes
  useEffect(() => {
    if (currentDoc?.id !== lastDocId) {
      setLastDocId(currentDoc?.id || null);
      if (currentDoc?.id) {
        const savedEdits = getDocHtmlEdits(currentDoc.id);
        if (savedEdits) {
          setEditedBodyHtml(savedEdits.editedBodyHtml);
          setEditedSoalHtml(savedEdits.editedSoalHtml);
        } else {
          setEditedBodyHtml(null);
          setEditedSoalHtml(null);
        }
      } else {
        setEditedBodyHtml(null);
        setEditedSoalHtml(null);
      }
      setIsEditing(false);
    }
  }, [currentDoc?.id, lastDocId]);

  // Clean up any legacy shared keys from older sessions so they don't bleed between questions
  useEffect(() => {
    if (currentDoc?.id) {
      removeDocImage(currentDoc.id, 'soal_stimulus_img');
      removeDocImage(currentDoc.id, 'soal_img_2');
      removeDocImage(currentDoc.id, 'soal_img_custom');
    }
  }, [currentDoc?.id]);

  // Ensure RPPM diagram and LKPD ASCII stimulus box are stripped/hidden, and signature is tidy
  const displayContent = currentDoc
    ? sanitizeDocumentContent(currentDoc.content, currentDoc.type, currentDoc.formDataSnapshot)
    : '';

  // Split document into:
  // - Top (Identitas - Locked)
  // - Body (Isi Dokumen - Editable)
  // - Signature (Tanda Tangan - Locked)
  // - Soal (Naskah Soal: Kop Soal Locked, Pertanyaan Soal Editable)
  const {
    topMarkdown,
    bodyMarkdown,
    signatureMarkdown,
    soalMarkdown,
    kopSoalMarkdown,
    pertanyaanMarkdown,
  } = splitDocForEditing(displayContent, currentDoc?.type);

  // Helper to sanitize any dirty or corrupted Kop Soal images out of editedSoalHtml
  const sanitizeEditedQuestionsHtml = (rawHtml: string): string => {
    if (!rawHtml) return '';
    let cleaned = rawHtml;
    // Strip old default educational illustrations/SVGs (e.g. old butterfly/frog cards)
    cleaned = cleaned.replace(/<div\b[^>]*class="[^"]*(?:educational-graphic-card|instant-visual-display|sequence-diagram-box)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, '');
    cleaned = cleaned.replace(/<div\b[^>]*class="[^"]*(?:educational-graphic-card|instant-visual-display|sequence-diagram-box)[^"]*"[\s\S]*?<\/div>/gi, '');
    // Strip any stray image wrapper at the very start
    cleaned = cleaned.replace(/^\s*(?:<div[^>]*class="[^"]*soal-image-wrapper[^"]*"[^>]*>[\s\S]*?<\/div>\s*)+/i, '');
    cleaned = cleaned.replace(/^\s*(?:<img[^>]*>\s*)+/i, '');
    // Strip any stray image wrapper dumped at the very end of questions
    cleaned = cleaned.replace(/(?:<div[^>]*class="[^"]*soal-image-wrapper[^"]*"[^>]*>[\s\S]*?<\/div>\s*)+$/i, '');
    // Strip duplicated Kop Soal headers from inside questions container
    cleaned = cleaned.replace(/<h1\b[^>]*>[\s\S]*?NASKAH\s*SOAL[\s\S]*?<\/h1>/gi, '');
    cleaned = cleaned.replace(/<div\b[^>]*class="[^"]*doc-subtitle[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    cleaned = cleaned.replace(/<div\b[^>]*>\s*<h2\b[^>]*>[\s\S]*?Lembar\s*Soal\s*Peserta\s*Didik[\s\S]*?<\/h2>\s*<\/div>/gi, '');
    cleaned = cleaned.replace(/<table\b[^>]*class="[^"]*identity-table[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');
    cleaned = cleaned.replace(/<h3\b[^>]*>[\s\S]*?Petunjuk\s*Pengerjaan\s*Soal[\s\S]*?<\/h3>[\s\S]*?<hr\b[^>]*>/gi, '');
    return cleaned.trim();
  };

  // Helper to determine if an edited questions HTML string contains actual questions
  const hasValidQuestions = (html: string | null): boolean => {
    if (!html) return false;
    const cleaned = sanitizeEditedQuestionsHtml(html);
    const textOnly = cleaned.replace(/<[^>]*>/g, '').trim();
    return textOnly.length > 30 && /(?:soal|\b\d+\.|\b[A-E]\.|\bBagian\s+[A-Z]|Pilihan|Uraian|Menjodohkan|Benar|Stimulus|Gambar)/i.test(textOnly);
  };

  // One-time auto-recovery: If editedSoalHtml previously had an image stuck in Kop Soal,
  // recover that image dataUrl and safely place it into question stimulus storage,
  // so the user does NOT lose their uploaded image, while completely cleaning the Kop Soal!
  useEffect(() => {
    if (editedSoalHtml && currentDoc?.id) {
      // Purge old default educational illustrations/SVGs immediately
      if (
        editedSoalHtml.includes('educational-graphic-card') ||
        editedSoalHtml.includes('Lepidoptera') ||
        editedSoalHtml.includes('Metamorfosis Sempurna Kupu-Kupu')
      ) {
        setEditedSoalHtml(null);
        saveDocHtmlEdits(currentDoc.id, { editedBodyHtml, editedSoalHtml: null });
        return;
      }

      const cleaned = sanitizeEditedQuestionsHtml(editedSoalHtml);
      // If the saved edit has no actual questions (e.g. was just Kop Soal), reset it so markdown questions show
      if (!hasValidQuestions(cleaned)) {
        setEditedSoalHtml(null);
        saveDocHtmlEdits(currentDoc.id, { editedBodyHtml, editedSoalHtml: null });
      } else if (cleaned !== editedSoalHtml) {
        setEditedSoalHtml(cleaned || null);
        saveDocHtmlEdits(currentDoc.id, { editedBodyHtml, editedSoalHtml: cleaned || null });
      }
    }
  }, [currentDoc?.id]);

  const handleToggleEdit = () => {
    if (isEditing) {
      // Exiting edit mode: sync edited HTML from DOM
      const newBody = bodyRef.current ? bodyRef.current.innerHTML : editedBodyHtml;
      const newSoal = soalRef.current ? soalRef.current.innerHTML : editedSoalHtml;
      setEditedBodyHtml(newBody);
      setEditedSoalHtml(newSoal);
      if (currentDoc?.id) {
        saveDocHtmlEdits(currentDoc.id, { editedBodyHtml: newBody, editedSoalHtml: newSoal });
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleResetText = () => {
    if (window.confirm('Kembalikan isi teks ke versi asli yang dibuat oleh AI?')) {
      if (currentDoc?.id) {
        clearDocHtmlEdits(currentDoc.id);
      }
      setEditedBodyHtml(null);
      setEditedSoalHtml(null);
    }
  };

  const handleBlur = () => {
    // CRITICAL: Only sync innerHTML if the user is actively in edit mode!
    // Never allow background or focus-blur to serialize live React components into static HTML!
    if (!isEditing) return;
    const newBody = bodyRef.current ? bodyRef.current.innerHTML : editedBodyHtml;
    const newSoal = soalRef.current ? soalRef.current.innerHTML : editedSoalHtml;
    if (bodyRef.current) setEditedBodyHtml(newBody);
    if (soalRef.current) setEditedSoalHtml(newSoal);
    if (currentDoc?.id) {
      saveDocHtmlEdits(currentDoc.id, { editedBodyHtml: newBody, editedSoalHtml: newSoal });
    }
  };

  const handleBodyInput = () => {
    if (bodyRef.current) {
      const html = bodyRef.current.innerHTML;
      setEditedBodyHtml(html);
      if (currentDoc?.id) {
        saveDocHtmlEdits(currentDoc.id, { editedBodyHtml: html, editedSoalHtml });
      }
    }
  };

  const handleSoalInput = () => {
    if (soalRef.current) {
      const html = soalRef.current.innerHTML;
      setEditedSoalHtml(html);
      if (currentDoc?.id) {
        saveDocHtmlEdits(currentDoc.id, { editedBodyHtml, editedSoalHtml: html });
      }
    }
  };

  // Helper to handle pasted or dropped images into a specific question stimulus block
  const handlePastedImage = async (file: File, targetStorageKey?: string) => {
    if (!currentDoc?.id || !targetStorageKey) return;
    try {
      const optimized = await optimizeImage(file);
      saveDocImage(currentDoc.id, targetStorageKey, optimized);
      window.dispatchEvent(
        new CustomEvent('doc-image-updated', {
          detail: { dataUrl: optimized, storageKey: targetStorageKey },
        })
      );
    } catch (err) {
      console.error('Gagal menempelkan gambar:', err);
    }
  };

  // Direct paste handler on question sheet (soalRef)
  const handleSoalPaste = async (e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement | null;
    const stimulusWrapper = target?.closest('[data-storage-key]') as HTMLElement | null;
    const targetKey = stimulusWrapper?.getAttribute('data-storage-key') || undefined;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        const file = items[i].getAsFile();
        if (file && targetKey) {
          handlePastedImage(file, targetKey);
        }
        return;
      }
    }
  };

  // Direct drop handler on question sheet (soalRef)
  const handleSoalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSoalDragging(false);

    const target = e.target as HTMLElement | null;
    const stimulusWrapper = target?.closest('[data-storage-key]') as HTMLElement | null;
    const targetKey = stimulusWrapper?.getAttribute('data-storage-key') || undefined;

    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/') && targetKey) {
      handlePastedImage(file, targetKey);
    }
  };

  // Paper level paste handler (captures paste if not inside contenteditable inputs)
  const handlePaperPaste = async (e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement;
    const stimulusWrapper = target.closest('[data-storage-key]') as HTMLElement | null;
    const targetKey = stimulusWrapper?.getAttribute('data-storage-key') || undefined;

    if (!targetKey) {
      return;
    }
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          handlePastedImage(file, targetKey);
        }
        break;
      }
    }
  };

  // Listen for delete events from inline image delete buttons
  useEffect(() => {
    const handleUpdate = () => {
      if (isEditing && soalRef.current) {
        const newHtml = soalRef.current.innerHTML;
        setEditedSoalHtml(newHtml);
        if (currentDoc?.id) {
          saveDocHtmlEdits(currentDoc.id, {
            editedBodyHtml,
            editedSoalHtml: newHtml,
          });
        }
      }
    };
    window.addEventListener('soal-content-updated', handleUpdate);
    return () => window.removeEventListener('soal-content-updated', handleUpdate);
  }, [currentDoc?.id, editedBodyHtml, isEditing]);

  // Delegated file upload listener for soalRef so that ANY file input (even inside dangerouslySetInnerHTML)
  // triggers image upload cleanly and without fail for its specific question
  useEffect(() => {
    const soalEl = soalRef.current;
    if (!soalEl) return;

    const handleDelegatedFileChange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.type === 'file' && target.files && target.files[0]) {
        const file = target.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          const stimulusWrapper = target.closest('[data-storage-key]') as HTMLElement | null;
          const targetKey = stimulusWrapper?.getAttribute('data-storage-key') || undefined;
          if (targetKey) {
            await handlePastedImage(file, targetKey);
          }
          target.value = '';
        }
      }
    };

    soalEl.addEventListener('change', handleDelegatedFileChange, true);
    return () => {
      soalEl.removeEventListener('change', handleDelegatedFileChange, true);
    };
  }, [currentDoc?.id]);

  const handlePrintPreview = () => {
    if (!currentDoc || !paperRef.current) return;

    // If currently editing, sync DOM content before printing
    if (isEditing) {
      if (bodyRef.current) {
        setEditedBodyHtml(bodyRef.current.innerHTML);
      }
      if (soalRef.current) {
        setEditedSoalHtml(soalRef.current.innerHTML);
      }
      setIsEditing(false);
    }

    const prevTitle = document.title;
    const typePrefix = currentDoc.type === 'rppm' ? 'RPPM' : currentDoc.type === 'asesmen' ? 'Asesmen' : 'LKPD';
    const mapel = currentDoc.formDataSnapshot?.namaMapel || '';
    const kelas = currentDoc.formDataSnapshot?.faseKelas || '';
    const sekolah = currentDoc.formDataSnapshot?.namaSekolah || '';
    const printTitle = [typePrefix, mapel, kelas, sekolah].filter(Boolean).join(' - ');

    document.title = printTitle || prevTitle;

    const restoreTitle = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    // Give React a small tick to finalize state
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn('Direct window.print() failed, attempting fallback iframe print:', err);
        try {
          const printIframe = document.createElement('iframe');
          printIframe.style.position = 'fixed';
          printIframe.style.right = '0';
          printIframe.style.bottom = '0';
          printIframe.style.width = '0';
          printIframe.style.height = '0';
          printIframe.style.border = '0';
          document.body.appendChild(printIframe);

          const iframeDoc = printIframe.contentWindow?.document;
          if (iframeDoc && paperRef.current) {
            iframeDoc.open();
            const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
              .map((el) => el.outerHTML)
              .join('\n');
            iframeDoc.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${printTitle || currentDoc.title || 'Dokumen'}</title>
                  ${styles}
                </head>
                <body class="bg-white p-0 m-0">
                  ${paperRef.current.outerHTML}
                </body>
              </html>
            `);
            iframeDoc.close();
            setTimeout(() => {
              printIframe.contentWindow?.focus();
              printIframe.contentWindow?.print();
              setTimeout(() => {
                if (document.body.contains(printIframe)) {
                  document.body.removeChild(printIframe);
                }
              }, 1000);
            }, 300);
          }
        } catch (fallbackErr) {
          console.error('Print preview fallback error:', fallbackErr);
        }
      }
      setTimeout(restoreTitle, 3000);
    }, 150);
  };

  const handleDownloadWord = () => {
    if (!paperRef.current || !currentDoc) return;
    try {
      // Clone element lembar dokumen agar banner edit teks (.no-print) tidak ikut terbawa ke file Word
      const clone = paperRef.current.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.no-print').forEach((el) => el.remove());

      // Bersihkan blok stimulus soal:
      // 1. Jika memiliki gambar: bersihkan banner header & keterangan teks agar hanya gambar yang tampil rapi
      // 2. Jika TIDAK memiliki gambar (dengan sengaja tidak diberikan gambar): HAPUS TOTAL wrapper dari file Word!
      clone.querySelectorAll('.visual-stimulus-wrapper, [data-stimulus-block="true"]').forEach((wrapper) => {
        const hasImg = wrapper.querySelector('img') !== null;
        if (hasImg) {
          wrapper.querySelectorAll('.stimulus-header-bar, .stimulus-caption-box, [data-stimulus-header="true"], [data-stimulus-caption="true"]').forEach((el) => el.remove());
          (wrapper as HTMLElement).style.border = 'none';
          (wrapper as HTMLElement).style.backgroundColor = 'transparent';
          (wrapper as HTMLElement).style.padding = '0';
          (wrapper as HTMLElement).style.margin = '10pt 0';
        } else {
          // Sengaja tidak diberikan gambar -> hapus dari file Word
          wrapper.remove();
        }
      });

      // Bersihkan juga kontrol/badge gambar opsi, item, atau chart tanpa img dari file Word
      clone.querySelectorAll('.inline-block, .visual-chart-container').forEach((el) => {
        if (el.querySelector('a[href*="gemini"]') || el.textContent?.includes('Buat di Gemini')) {
          if (!el.querySelector('img')) {
            el.remove();
          }
        }
      });

      // Transform PGK (Pilihan Ganda Kompleks) checkbox items for Word so the box and sentence align horizontally on the exact same line
      clone.querySelectorAll('[data-pgk="true"], .pgk-checkbox-item').forEach((pgkEl) => {
        const textEl = pgkEl.querySelector('.pgk-text') || pgkEl.querySelector('div');
        const textHtml = textEl ? textEl.innerHTML : pgkEl.innerHTML.replace(/<span\b[^>]*><\/span>/gi, '');
        const p = document.createElement('p');
        p.className = 'pgk-word-item';
        p.setAttribute(
          'style',
          'margin-top: 3pt; margin-bottom: 4pt; margin-left: 24pt; text-indent: -18pt; text-align: justify; line-height: 1.45; font-family: "Times New Roman", Times, serif; font-size: 11pt;'
        );
        p.innerHTML = `<span class="pgk-box-symbol" style="font-family: \'Segoe UI Symbol\', \'Arial Unicode MS\', sans-serif; font-size: 12pt; mso-ascii-font-family: \'Segoe UI Symbol\'; mso-hansi-font-family: \'Segoe UI Symbol\';">&#9633;</span>&nbsp;&nbsp;${textHtml.trim()}`;
        pgkEl.replaceWith(p);
      });

      // Also transform any flex-based checkbox items that might exist in clone
      clone.querySelectorAll('.flex').forEach((flexEl) => {
        const span = flexEl.querySelector('span');
        const innerDiv = flexEl.querySelector('div');
        if (span && innerDiv && (span.className.includes('border') || span.style.border || span.className.includes('w-4'))) {
          const textHtml = innerDiv.innerHTML;
          const p = document.createElement('p');
          p.className = 'pgk-word-item';
          p.setAttribute(
            'style',
            'margin-top: 3pt; margin-bottom: 4pt; margin-left: 24pt; text-indent: -18pt; text-align: justify; line-height: 1.45; font-family: "Times New Roman", Times, serif; font-size: 11pt;'
          );
          p.innerHTML = `<span class="pgk-box-symbol" style="font-family: \'Segoe UI Symbol\', \'Arial Unicode MS\', sans-serif; font-size: 12pt; mso-ascii-font-family: \'Segoe UI Symbol\'; mso-hansi-font-family: \'Segoe UI Symbol\';">&#9633;</span>&nbsp;&nbsp;${textHtml.trim()}`;
          flexEl.replaceWith(p);
        }
      });

      const docTitle =
        currentDoc.title ||
        `Asesmen_${currentDoc.formDataSnapshot?.namaMapel || 'Kurikulum_Merdeka'}`;

      downloadDocFile(clone.innerHTML, docTitle);
    } catch (err) {
      console.error('Gagal mengunduh dokumen Word:', err);
    }
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'rppm':
        return { label: 'RPPM Mendalam', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'asesmen':
        return { label: 'Asesmen & Rubrik', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'lkpd':
        return { label: 'LKPD Siswa', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      default:
        return { label: 'Dokumen', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  /**
   * Helper to detect and wrap Arabic / Huruf Hijaiyah text with dedicated
   * styling for large, crisp, legible harakat rendering.
   */
  const ARABIC_SEQUENCE_REGEX = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s\u0640\u064B-\u065F\u0670\u200C\u200D]+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]*)*)/;

  const wrapArabicInText = (text: string): React.ReactNode => {
    if (!text || !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
      return text;
    }
    const parts = text.split(ARABIC_SEQUENCE_REGEX);
    if (parts.length <= 1) return text;
    return parts.map((part, idx) => {
      if (idx % 2 === 1 && part) {
        return (
          <span
            key={`ar-${idx}`}
            className="arabic-hijaiyah"
            lang="ar"
            dir="rtl"
            data-arabic="true"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  /**
   * Mapping of question numbers to question text stems (used to tailor Gemini image prompts to match the specific question)
   */
  const questionTextsMap = useMemo(() => {
    const raw = pertanyaanMarkdown || soalMarkdown || '';
    if (!raw) return {};

    const map: Record<string, string> = {};
    const lines = raw.split('\n');
    let currentQNum: string | null = null;
    let currentQTextLines: string[] = [];
    let currentQOptions: string[] = [];

    const flush = () => {
      if (currentQNum && currentQTextLines.length > 0) {
        let text = currentQTextLines.join(' ');
        text = text
          .replace(/\[\s*(?:CHART_URL|GAMBAR[A-Za-z0-9_]*|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS[A-Za-z0-9_]*|IMAGE|FIGURE)[^\]]*\]/gi, '')
          .replace(/[*_`]/g, '')
          .replace(/(?:Kunci\s*(?:Jawaban)?|Jawaban|Pembahasan|Skor|Rubrik|Pedoman)\s*:[^\n]*/gi, '')
          .trim();
        // NOTE: We deliberately do NOT append multiple-choice options (A. ..., B. ...) here
        // to prevent leaking the correct answer option into the Gemini Image prompt!
        // The question stem alone provides complete context for the required visual stimulus.
        if (text) {
          map[currentQNum] = text;
        }
      }
    };

    let inPetunjuk = false;
    for (const line of lines) {
      if (/Petunjuk\s*Pengerjaan\s*Soal/i.test(line)) {
        inPetunjuk = true;
        continue;
      }
      if (inPetunjuk && (/^---\s*$/.test(line.trim()) || /#{1,4}\s*(?:Bagian|[A-Z]\.|Soal)/i.test(line))) {
        inPetunjuk = false;
      }
      if (inPetunjuk) continue;

      const qMatch =
        line.match(/(?:^|[#*_~`\s])(?:Soal\s*(?:Nomor|No\.?)?\s*|Nomor\s+|No\.\s*)(\d+)/i) ||
        line.match(/^\s*(?:\*\*|__)?(\d{1,2})\.\s+(?!(?:Pedoman|Kunci|Rubrik|Kisi|Tabel|Panduan|Premis|Pilihan|Petunjuk|Berdoalah|Tuliskan|Bacalah|Dahulukan|Periksa|Kerjakan|\d))/i) ||
        line.match(/^\s*(?:\*\*|__)?(\d{1,2})\)\s+/i);

      if (qMatch) {
        flush();
        currentQNum = qMatch[1];
        currentQTextLines = [];
        currentQOptions = [];
        const lineContent = line
          .replace(/^[#*_\s\d.]*(?:Soal\s*(?:Nomor|No\.?)?\s*\d+)?[:.\s-]*/i, '')
          .trim();
        if (lineContent) {
          currentQTextLines.push(lineContent);
        }
      } else if (currentQNum) {
        if (/^#{1,4}\s+/i.test(line) || /^---\s*$/.test(line.trim())) {
          flush();
          currentQNum = null;
        } else if (/^\s*(?:Kunci(?:\s*Jawaban)?|Jawaban|Pembahasan|Skor|Rubrik|Pedoman\s*Penskoran)\s*:/i.test(line)) {
          // Immediately flush and clear when reaching answer keys or scoring guidelines
          flush();
          currentQNum = null;
        } else if (/^\s*([A-E]\.\s+[^\n]+)/i.test(line)) {
          const optMatch = line.trim().match(/^([A-E]\.\s+[^\n]+)/i);
          if (optMatch && currentQOptions.length < 5) {
            currentQOptions.push(optMatch[1].replace(/[*_`]/g, '').trim());
          }
        } else if (line.trim() && !/\[\s*(?:CHART_URL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS)/i.test(line)) {
          if (currentQTextLines.length < 5) {
            currentQTextLines.push(line.trim());
          }
        }
      }
    }
    flush();

    return map;
  }, [pertanyaanMarkdown, soalMarkdown]);

  /**
   * Helper to parse and render visual stimulus tags:
   * - [CHART_URL: https://quickchart.io/...] -> live QuickChart image
   * - [GAMBAR_STIMULUS: "..."] -> visual illustration / geometry / denah card
   * - [GAMBAR_OPSI_A: "..."] -> visual option badge
   * - [GAMBAR_ITEM_A1: "..."] -> visual item badge for matching questions
   */
  const parseVisualNodes = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') {
      if (!/\[\s*(?:CHART_URL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)/i.test(node)) {
        return wrapArabicInText(node);
      }

      const elements: React.ReactNode[] = [];
      let i = 0;
      let lastIndex = 0;
      const len = node.length;

      while (i < len) {
        // Look for '[' followed by tag identifier
        if (node[i] === '[') {
          const sub = node.slice(i);
          const tagMatch = sub.match(
            /^\[\s*(CHART_URL|GAMBAR_STIMULUS(?:_Q\d+)?|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)\s*:\s*/i
          );
          if (tagMatch) {
            const rawTagType = tagMatch[1].toUpperCase();
            let tagType = rawTagType;
            let detectedQNum: string | undefined = undefined;

            const qMatch = rawTagType.match(/_Q(\d+)/) || rawTagType.match(/_(\d+)/);
            if (qMatch) {
              detectedQNum = qMatch[1];
            } else {
              const preceding = node.slice(0, i);
              const prevQMatches = [...preceding.matchAll(/(?:^|[#*_~`\s])(?:Soal\s*(?:Nomor|No\.?)?\s*|Nomor\s+|No\.\s*|\b)(\d{1,2})[\s.:)]/gi)];
              if (prevQMatches.length > 0) {
                detectedQNum = prevQMatches[prevQMatches.length - 1][1];
              }
            }

            if (
              tagType.startsWith('GAMBAR_STIMULUS') ||
              tagType === 'GAMBAR' ||
              tagType === 'GAMBAR_SOAL' ||
              tagType.startsWith('GAMBAR_SOAL_') ||
              (tagType.startsWith('GAMBAR_') && !tagType.startsWith('GAMBAR_OPSI_') && !tagType.startsWith('GAMBAR_ITEM_')) ||
              tagType === 'ILUSTRASI' ||
              tagType === 'DIAGRAM' ||
              tagType === 'BAGAN' ||
              tagType === 'STIMULUS_GAMBAR' ||
              tagType === 'IMAGE' ||
              tagType === 'FIGURE'
            ) {
              tagType = 'GAMBAR_STIMULUS';
            }

            const tagPrefixLen = tagMatch[0].length;
            const contentStart = i + tagPrefixLen;

            // Track bracket depth so nested arrays [...] in QuickChart don't prematurely close the tag
            let depth = 1;
            let j = contentStart;
            while (j < len && depth > 0) {
              if (node[j] === '[') depth++;
              else if (node[j] === ']') depth--;
              j++;
            }

            if (depth === 0) {
              // Found full closing tag
              if (i > lastIndex) {
                elements.push(wrapArabicInText(node.slice(lastIndex, i)));
              }

              const rawVal = node.slice(contentStart, j - 1).trim();
              const val = rawVal.replace(/^["']|["']$/g, '').trim();

              const hash = hashString(val);
              const descSlug = val.slice(0, 30).toLowerCase().replace(/[^a-z0-9]/g, '_');
              const qPart = detectedQNum ? `soal_${detectedQNum}_` : '';
              const blockHash = `stimulus_${qPart}${descSlug}_${hash}`;
              const questionLabel = detectedQNum ? `Soal Nomor ${detectedQNum}` : undefined;
              const questionText = detectedQNum ? questionTextsMap[detectedQNum] : undefined;

              if (tagType === 'CHART_URL') {
                const chartHash = `chart_${descSlug}_${hash}`;
                elements.push(
                  <ChartVisualBlock
                    key={`chart-${currentDoc?.id || 'd'}-${chartHash}`}
                    url={val}
                    docId={currentDoc?.id}
                    blockKey={chartHash}
                  />
                );
              } else if (tagType === 'GAMBAR_STIMULUS') {
                elements.push(
                  <StimulusVisualBlock
                    key={`stimulus-${currentDoc?.id || 'd'}-${blockHash}`}
                    description={val}
                    docId={currentDoc?.id}
                    blockKey={blockHash}
                    questionNumber={detectedQNum}
                    questionLabel={questionLabel}
                    questionText={questionText}
                    subject={currentDoc?.formDataSnapshot?.namaMapel}
                    topic={currentDoc?.formDataSnapshot?.materiPembelajaran}
                    onImageChange={(newUrl) => {
                      if (currentDoc?.id) {
                        if (newUrl) {
                          saveDocImage(currentDoc.id, blockHash, newUrl);
                        } else {
                          removeDocImage(currentDoc.id, blockHash);
                        }
                      }
                    }}
                  />
                );
              } else if (tagType.startsWith('GAMBAR_OPSI_')) {
                const optionLetter = tagType.replace('GAMBAR_OPSI_', '');
                const optHash = `opt_${optionLetter}_${descSlug}_${hash}`;
                elements.push(
                  <OptionVisualBlock
                    key={`opt-${currentDoc?.id || 'd'}-${optHash}`}
                    optionLetter={optionLetter}
                    description={val}
                    docId={currentDoc?.id}
                    blockKey={optHash}
                  />
                );
              } else if (tagType.startsWith('GAMBAR_ITEM_')) {
                const itemId = tagType.replace('GAMBAR_ITEM_', '');
                const itemHash = `item_${itemId}_${descSlug}_${hash}`;
                elements.push(
                  <ItemVisualBlock
                    key={`item-${currentDoc?.id || 'd'}-${itemHash}`}
                    itemId={itemId}
                    description={val}
                    docId={currentDoc?.id}
                    blockKey={itemHash}
                  />
                );
              }

              i = j;
              lastIndex = j;
              continue;
            }
          }
        }
        i++;
      }

      if (lastIndex < node.length) {
        elements.push(wrapArabicInText(node.slice(lastIndex)));
      }
      return elements.length > 0 ? elements : wrapArabicInText(node);
    }

    if (Array.isArray(node)) {
      return React.Children.map(node, (child) => parseVisualNodes(child));
    }

    if (React.isValidElement(node) && (node.props as any)?.children) {
      return React.cloneElement(node, {
        ...(node.props as any),
        children: parseVisualNodes((node.props as any).children),
      });
    }

    return node;
  };

  // Shared markdown render components
  const markdownComponents = {
    img: ({ src, alt, ...props }: any) => (
      <div className="my-3 text-center" contentEditable={false}>
        <img
          src={src}
          alt={alt || 'Gambar Stimulus Soal'}
          className="max-w-full sm:max-w-md max-h-72 mx-auto rounded-lg border border-slate-300 shadow-2xs object-contain bg-white print:max-h-64 print:shadow-none print:border-slate-400"
          {...props}
        />
        {alt && (
          <div className="text-[11px] text-slate-500 italic mt-1 font-sans">
            {alt}
          </div>
        )}
      </div>
    ),
    h1: ({ children, ...props }: any) => (
      <h1
        className="text-center font-bold text-[1.1rem] sm:text-[1.2rem] uppercase tracking-wide text-slate-900 mb-0.5 mt-1 leading-snug"
        {...props}
      >
        {children}
      </h1>
    ),
    h3: ({ children, ...props }: any) => {
      const extractNodeText = (node: any): string => {
        if (!node) return '';
        if (typeof node === 'string' || typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(extractNodeText).join('');
        if (typeof node === 'object' && node.props && node.props.children) {
          return extractNodeText(node.props.children);
        }
        return '';
      };
      const text = extractNodeText(children);
      if (text.includes('(RPPM)') || text.includes('(LKPD)') || text.trim().startsWith('(')) {
        return (
          <div className="doc-subtitle text-center font-bold text-[0.95rem] sm:text-base text-slate-900 mb-4 -mt-0.5 leading-snug">
            {children}
          </div>
        );
      }
      const isAsesmenDoc = currentDoc?.type === 'asesmen';
      const isLkpdDoc = currentDoc?.type === 'lkpd';

      // Khusus Dokumen LKPD: Bagian Pedoman Penskoran tidak boleh dipaksa pindah halaman jika halaman atas masih cukup
      if (isLkpdDoc && /pedoman\s*penskoran/i.test(text)) {
        return (
          <div
            className="pedoman-penskoran-lkpd mt-3 mb-1.5 break-before-auto print:break-before-auto"
            data-heading="true"
            data-pedoman-lkpd="true"
          >
            <h3
              className="font-bold text-[0.95rem] sm:text-[1.02rem] text-slate-900"
              {...props}
            >
              {children}
            </h3>
          </div>
        );
      }

      // Hanya dokumen Asesmen yang menerapkan penandaan bagian Naskah Soal & Kunci Jawaban
      const isNaskahSoal =
        isAsesmenDoc &&
        /^\s*(?:(?:III|3|[bB]agian\s*(?:III|3)|C)[.:\s]|\*{1,2}(?:III|3|[bB]agian\s*(?:III|3)|C)[.:\s])[^\n]*(?:naskah\s*soal|butir\s*soal)/i.test(text);
      const isKunciJawaban =
        isAsesmenDoc &&
        /^\s*(?:(?:IV|4|[bB]agian\s*(?:IV|4)|D)[.:\s]|\*{1,2}(?:IV|4|[bB]agian\s*(?:IV|4)|D)[.:\s])[^\n]*kunci\s*jawaban/i.test(text);
      const isKisiKisiHeading =
        isAsesmenDoc &&
        /(?:(?:II|2|[bB]agian\s*(?:II|2)|B|b)[.:\s][^\n]*kisi-kisi|tabel\s*matriks|kisi-kisi\s*penulisan\s*soal|kisi-kisi\s*soal|kisi-kisi\s*asesmen|kisi-kisi)/i.test(text);

      if (isNaskahSoal || isKunciJawaban) {
        return (
          <div
            className={`mt-6 mb-2.5 break-after-avoid ${isNaskahSoal ? 'section-naskah-soal' : ''} ${isKunciJawaban ? 'section-kunci-jawaban' : ''}`}
            data-heading="true"
            data-section-naskah={isNaskahSoal ? 'true' : undefined}
            data-section-kunci={isKunciJawaban ? 'true' : undefined}
          >
            <h3
              className="font-bold text-[1rem] sm:text-[1.08rem] text-slate-900 pb-1 border-b-[1.5px] border-slate-900 w-full inline-block"
              {...props}
            >
              {children}
            </h3>
          </div>
        );
      }

      if (isKisiKisiHeading) {
        return (
          <div
            className="mt-6 mb-2.5 break-after-avoid section-kisi-kisi"
            data-heading="true"
            data-section-kisi="true"
            data-kisi-heading="true"
          >
            <h3
              className="font-bold text-[0.98rem] sm:text-[1.05rem] text-slate-900 pb-1 border-b-[1.5px] border-slate-900 w-full inline-block"
              {...props}
            >
              {children}
            </h3>
          </div>
        );
      }

      return (
        <h3
          className="font-bold text-[0.95rem] sm:text-[1.02rem] text-slate-900 mt-3 mb-1.5"
          data-heading="true"
          {...props}
        >
          {children}
        </h3>
      );
    },
    h2: ({ children, ...props }: any) => {
      // Extract text content from children nodes
      const extractNodeText = (node: any): string => {
        if (!node) return '';
        if (typeof node === 'string' || typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(extractNodeText).join('');
        if (typeof node === 'object' && node.props && node.props.children) {
          return extractNodeText(node.props.children);
        }
        return '';
      };

      const text = extractNodeText(children);
      const isAsesmenDoc = currentDoc?.type === 'asesmen';
      const isLkpdDoc = currentDoc?.type === 'lkpd';

      // Khusus Dokumen LKPD: Bagian Pedoman Penskoran tidak boleh dipaksa pindah halaman
      if (isLkpdDoc && /pedoman\s*penskoran/i.test(text)) {
        return (
          <div
            className="pedoman-penskoran-lkpd mt-3 mb-1.5 break-before-auto print:break-before-auto"
            data-heading="true"
            data-pedoman-lkpd="true"
          >
            <h2
              className="font-bold text-[0.98rem] sm:text-[1.04rem] text-slate-900"
              {...props}
            >
              {children}
            </h2>
          </div>
        );
      }

      // Hanya dokumen Asesmen yang menerapkan penandaan bagian Naskah Soal & Kunci Jawaban
      const isNaskahSoal =
        isAsesmenDoc &&
        /^\s*(?:(?:III|3|[bB]agian\s*(?:III|3)|C)[.:\s]|\*{1,2}(?:III|3|[bB]agian\s*(?:III|3)|C)[.:\s])[^\n]*(?:naskah\s*soal|butir\s*soal)/i.test(text);
      const isKunciJawaban =
        isAsesmenDoc &&
        /^\s*(?:(?:IV|4|[bB]agian\s*(?:IV|4)|D)[.:\s]|\*{1,2}(?:IV|4|[bB]agian\s*(?:IV|4)|D)[.:\s])[^\n]*kunci\s*jawaban/i.test(text);
      const isKisiKisiHeading =
        isAsesmenDoc &&
        /(?:(?:II|2|[bB]agian\s*(?:II|2)|B|b)[.:\s][^\n]*kisi-kisi|tabel\s*matriks|kisi-kisi\s*penulisan\s*soal|kisi-kisi\s*soal|kisi-kisi\s*asesmen|kisi-kisi)/i.test(text);

      if (isKisiKisiHeading) {
        return (
          <div
            className="mt-6 mb-2.5 break-after-avoid section-kisi-kisi"
            data-heading="true"
            data-section-kisi="true"
            data-kisi-heading="true"
          >
            <h2
              className="font-bold text-[1rem] sm:text-[1.08rem] text-slate-900 pb-1 border-b-[1.5px] border-slate-900 w-full inline-block"
              {...props}
            >
              {children}
            </h2>
          </div>
        );
      }

      return (
        <div
          className={`mt-6 mb-2.5 break-after-avoid ${isNaskahSoal ? 'section-naskah-soal' : ''} ${isKunciJawaban ? 'section-kunci-jawaban' : ''}`}
          data-heading="true"
          data-section-naskah={isNaskahSoal ? 'true' : undefined}
          data-section-kunci={isKunciJawaban ? 'true' : undefined}
        >
          <h2
            className="font-bold text-[1rem] sm:text-[1.08rem] text-slate-900 pb-1 border-b-[1.5px] border-slate-900 w-full inline-block"
            {...props}
          >
            {children}
          </h2>
        </div>
      );
    },
    p: ({ children, ...props }: any) => {
      // Check if it's a PGK checkbox item ([ ] Pernyataan, ☐ Pernyataan, etc.)
      let startsWithCheckbox = false;
      let remainingContent = children;
      const checkboxRegex = /^\s*(?:\[\s*\]|☐|[-*•]\s*\[\s*\]|[-*•]\s*☐)\s*/;

      if (Array.isArray(children) && typeof children[0] === 'string' && checkboxRegex.test(children[0])) {
        startsWithCheckbox = true;
        const first = children[0].replace(checkboxRegex, '');
        remainingContent = [first, ...children.slice(1)];
      } else if (typeof children === 'string' && checkboxRegex.test(children)) {
        startsWithCheckbox = true;
        remainingContent = children.replace(checkboxRegex, '');
      }

      if (startsWithCheckbox) {
        return (
          <div
            className="pgk-checkbox-item flex items-start gap-3 my-2 ml-4 sm:ml-6 text-[0.95rem] text-slate-800 leading-relaxed text-justify"
            data-pgk="true"
          >
            <span
              className="pgk-box inline-block w-4 h-4 mt-0.5 border-[1.5px] border-slate-700 rounded-xs bg-white shrink-0"
              aria-hidden="true"
            />
            <div className="pgk-text flex-1 text-justify">{parseVisualNodes(remainingContent)}</div>
          </div>
        );
      }

      // Check if it's a Multiple Choice Option (A., B., C., D., E.)
      let isOption = false;
      if (Array.isArray(children) && typeof children[0] === 'string' && /^\s*[A-E]\.\s+/.test(children[0])) {
        isOption = true;
      } else if (typeof children === 'string' && /^\s*[A-E]\.\s+/.test(children)) {
        isOption = true;
      }

      if (isOption) {
        return (
          <p className="my-1.5 ml-4 sm:ml-6 text-[0.95rem] text-slate-800 leading-relaxed font-normal text-justify" {...props}>
            {parseVisualNodes(children)}
          </p>
        );
      }

      const hasBlockVisual =
        (typeof children === 'string' && /\[\s*(?:GAMBAR_STIMULUS|CHART_URL)/i.test(children)) ||
        (Array.isArray(children) &&
          children.some(
            (c) => typeof c === 'string' && /\[\s*(?:GAMBAR_STIMULUS|CHART_URL)/i.test(c)
          ));

      if (hasBlockVisual) {
        return (
          <div className="mb-2.5 text-slate-900 leading-relaxed text-justify" {...props}>
            {parseVisualNodes(children)}
          </div>
        );
      }

      return <p className="mb-2.5 text-slate-900 leading-relaxed text-justify" {...props}>{parseVisualNodes(children)}</p>;
    },
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc ml-6 mb-3 space-y-1 text-slate-900 text-justify" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal ml-6 mb-3 space-y-1 text-slate-900 text-justify" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-justify leading-relaxed mb-1.5 text-slate-900" {...props}>
        {parseVisualNodes(children)}
      </li>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-slate-300 pl-4 my-2.5 italic text-slate-700 text-justify" {...props}>
        {parseVisualNodes(children)}
      </blockquote>
    ),
    hr: ({ ...props }: any) => (
      <hr className="my-6 border-t border-slate-300 print:my-3 print:break-after-avoid" {...props} />
    ),
    table: ({ node, children, ...props }: any) => {
      let isSig = false;
      let isIdentity = false;
      let isKisiKisi = false;
      let isRubric = false;
      let isMatching = false;
      let isPenskoran = false;
      let isBenarSalah = false;
      let isBenarSalahAnswer = false;
      let colCount = 0;
      let nodeStr = '';

      try {
        const findFirstTr = (n: any): any => {
          if (!n) return null;
          if (n.tagName === 'tr' || n.type === 'tableRow') return n;
          if (Array.isArray(n.children)) {
            for (const child of n.children) {
              const res = findFirstTr(child);
              if (res) return res;
            }
          }
          return null;
        };

        const firstTr = findFirstTr(node);
        if (firstTr && Array.isArray(firstTr.children)) {
          colCount = firstTr.children.filter((c: any) => c.tagName === 'th' || c.tagName === 'td' || c.type === 'tableCell').length;
        }

        // Also extract colCount from React children if not found from AST
        if (!colCount && children) {
          const childrenArray = React.Children.toArray(children);
          for (const child of childrenArray) {
            if (child && typeof child === 'object' && 'props' in child) {
              const innerRows = React.Children.toArray((child as any).props?.children);
              for (const row of innerRows) {
                if (row && typeof row === 'object' && 'props' in row) {
                  const cells = React.Children.toArray((row as any).props?.children);
                  if (cells.length > 0) {
                    colCount = cells.length;
                    break;
                  }
                }
              }
              if (colCount > 0) break;
            }
          }
        }

        nodeStr = JSON.stringify(node || '');

        // Also extract text from React children to guarantee 100% detection even if AST node is not serialized
        const extractTextFromReactChildren = (n: any): string => {
          if (!n) return '';
          if (typeof n === 'string') return n;
          if (typeof n === 'number') return String(n);
          if (Array.isArray(n)) return n.map(extractTextFromReactChildren).join(' ');
          if (n.props?.children) return extractTextFromReactChildren(n.props.children);
          return '';
        };

        const childrenText = extractTextFromReactChildren(children);
        const combinedText = (nodeStr + ' ' + childrenText);

        isSig =
          combinedText.includes('Mengetahui') ||
          (combinedText.includes('Kepala') && (combinedText.includes('NIP.') || combinedText.includes('NIP'))) ||
          combinedText.includes('Lembar Pengesahan');

        // Identify official administrative identity blocks (RPPM, LKPD, Asesmen Kisi-Kisi Kop, and Lembar Soal Siswa)
        // Must NEVER be hijacked into matching question tables or rubric tables
        isIdentity =
          !isSig &&
          (combinedText.includes('Nama Satuan Pendidikan') ||
           combinedText.includes('Satuan Pendidikan') ||
           combinedText.includes('Informasi Identitas') ||
           combinedText.includes('Kelompok / Nama Anggota') ||
           combinedText.includes('Nama Peserta Didik') ||
           combinedText.includes('Lembar Soal Peserta Didik') ||
           combinedText.includes('Fase / Kelas') ||
           (combinedText.includes('Nama Penyusun') && (combinedText.includes('Mata Pelajaran') || combinedText.includes('Alokasi Waktu')))) &&
          !combinedText.includes('Level Kognitif') &&
          !combinedText.includes('Indikator Soal') &&
          (colCount <= 4 || colCount === 0);

        isKisiKisi =
          !isSig &&
          !isIdentity &&
          (combinedText.includes('Level Kognitif') ||
           (combinedText.includes('Bentuk Soal') &&
             (combinedText.includes('Indikator') || combinedText.includes('Capaian') || combinedText.includes('No. Soal'))));

        // If it's a Kisi-Kisi table and colCount was not detected via DOM AST, determine standard count
        if (isKisiKisi && (!colCount || colCount === 0)) {
          if (combinedText.includes('Materi Pokok') && combinedText.includes('Indikator')) {
            colCount = 7;
          } else {
            colCount = 6;
          }
        }

        const isPenskoran =
          !isSig &&
          !isIdentity &&
          !isKisiKisi &&
          (combinedText.includes('Pedoman Penskoran') ||
            combinedText.includes('Konversi Nilai Akhir') ||
            (combinedText.includes('Bentuk Soal') &&
              combinedText.includes('Skor Maksimal') &&
              (combinedText.includes('Kriteria') || combinedText.includes('Penskoran'))));

        const hasMatchingKeywords =
          !isIdentity &&
          (combinedText.includes('Premis') ||
           combinedText.includes('Pilihan Jawaban') ||
           combinedText.includes('Kolom A') ||
           combinedText.includes('Kolom B') ||
           combinedText.includes('Karakteristik Sambung') ||
           (combinedText.includes('Menjodohkan') && !combinedText.includes('Jumlah & Bentuk Soal')));

        if (hasMatchingKeywords && colCount === 0) {
          colCount = 2;
        }

        isMatching =
          !isSig &&
          !isIdentity &&
          !isKisiKisi &&
          !isPenskoran &&
          (hasMatchingKeywords || (colCount === 2 && !combinedText.includes('Aspek Penilaian')));

        const isBenarSalahRaw =
          !isKisiKisi &&
          !isIdentity &&
          !isPenskoran &&
          !isMatching &&
          ((nodeStr.includes('Benar') && nodeStr.includes('Salah')) ||
           (nodeStr.includes('Pernyataan') && (nodeStr.includes('Benar') || nodeStr.includes('Salah'))));

        isBenarSalah = isBenarSalahRaw && (colCount === 4 || colCount === 3);
        isBenarSalahAnswer =
          isBenarSalah &&
          (nodeStr.includes('Pembahasan') ||
           nodeStr.includes('Alasan') ||
           nodeStr.includes('Keterangan') ||
           nodeStr.includes('Analisis'));

        isRubric =
          !isKisiKisi &&
          !isIdentity &&
          !isPenskoran &&
          !isMatching &&
          !isBenarSalah &&
          (nodeStr.includes('Rubrik') ||
            nodeStr.includes('Aspek Penilaian') ||
            nodeStr.includes('Perlu Bimbingan') ||
            nodeStr.includes('Sangat Baik') ||
            nodeStr.includes('Kinerja') ||
            nodeStr.includes('Sikap') ||
            nodeStr.includes('Berkembang') ||
            nodeStr.includes('Layak') ||
            nodeStr.includes('Cakap') ||
            nodeStr.includes('Mahir') ||
            nodeStr.includes('Kriteria') ||
            (colCount >= 5 && (nodeStr.includes('Skor') || (nodeStr.includes('Baik') && nodeStr.includes('Cukup')))));

        if (isRubric && (!colCount || colCount === 0)) {
          if (nodeStr.includes('Perlu Bimbingan') || (nodeStr.includes('Cukup') && nodeStr.includes('Sangat Baik'))) {
            colCount = 6;
          } else {
            colCount = 6;
          }
        }
      } catch {
        // Safe fallback
      }

      if (isIdentity) {
        return (
          <table
            className="identity-table border-none border-collapse w-full my-3 text-slate-900"
            data-identity="true"
            style={{ border: 'none', borderCollapse: 'collapse', width: '100%' }}
            {...props}
          >
            {children}
          </table>
        );
      }
      if (isSig) {
        const stripBordersFromCells = (node: React.ReactNode): React.ReactNode => {
          return React.Children.map(node, (child) => {
            if (!React.isValidElement(child)) return child;
            const childProps = (child.props as any) || {};
            const newChildren = childProps.children ? stripBordersFromCells(childProps.children) : childProps.children;
            const isCell = child.type === 'td' || child.type === 'th' || (typeof child.type === 'string' && (child.type === 'td' || child.type === 'th'));
            return React.cloneElement(child, {
              ...childProps,
              style: {
                ...(childProps.style || {}),
                border: 'none',
                borderWidth: 0,
                outline: 'none',
                backgroundColor: 'transparent',
              },
              children: newChildren,
            });
          });
        };

        return (
          <div
            className="signature-container signature-locked-section my-6 print:my-4 print:break-inside-avoid break-inside-avoid"
            data-signature="true"
            data-avoid-break="true"
          >
            <table
              className="signature-table border-none border-collapse w-full text-slate-900"
              data-signature="true"
              data-avoid-break="true"
              style={{ border: 'none', borderWidth: 0, borderCollapse: 'collapse', width: '100%' }}
              {...props}
            >
              {stripBordersFromCells(children)}
            </table>
          </div>
        );
      }

      const tableClasses = [
        'content-table',
        'border-collapse',
        'w-full',
        'text-slate-900',
        isRubric ? 'rubric-table' : '',
        isKisiKisi ? 'kisi-kisi-table' : '',
        isMatching ? 'matching-table' : '',
        isPenskoran ? 'penskoran-table' : '',
        isBenarSalah ? 'benar-salah-table' : '',
      ]
        .filter(Boolean)
        .join(' ');

      // Generate exact colgroup proportions matching official app layout (image 1 & image 2)
      let colgroupElement = null;
      const isMatchingTable = isMatching;
      const isPenskoranTable = isPenskoran;
      const isBenarSalahTable = isBenarSalah;

      if (isKisiKisi) {
        if (colCount === 6) {
          colgroupElement = (
            <colgroup>
              <col style={{ width: '4.5%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '43%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '7%' }} />
            </colgroup>
          );
        } else {
          // Default 7-column Kisi-Kisi matrix
          colgroupElement = (
            <colgroup>
              <col style={{ width: '4.5%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '34.5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '7.5%' }} />
              <col style={{ width: '5.5%' }} />
            </colgroup>
          );
        }
      } else if (isMatchingTable && (colCount === 2 || !colCount)) {
        // Soal Menjodohkan (Matching): 50% Premis, 50% Opsi - seimbang sempurna
        colgroupElement = (
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
        );
      } else if (isBenarSalahTable) {
        // Soal Benar / Salah (True or False) berstimulus & Kunci Pembahasan
        if (isBenarSalahAnswer && colCount === 4) {
          // Kunci Jawaban & Pembahasan (No, Pernyataan, Kunci, Pembahasan)
          colgroupElement = (
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '46%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '34%' }} />
            </colgroup>
          );
        } else if (colCount === 4) {
          // Naskah Soal Siswa (No, Pernyataan, Benar, Salah)
          colgroupElement = (
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '70%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
          );
        } else if (colCount === 3) {
          colgroupElement = (
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '72%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
          );
        }
      } else if (isPenskoranTable) {
        // Tabel Pedoman Penskoran & Konversi Nilai Akhir:
        // Skor Maksimal dibuat kompak & rapi (~14%), No (8%), Bentuk Soal (22%), Kriteria (56%)
        if (colCount === 4) {
          colgroupElement = (
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '56%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
          );
        } else if (colCount === 3) {
          colgroupElement = (
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '74%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
          );
        } else {
          colgroupElement = (
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '56%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
          );
        }
      } else if (isRubric) {
        if (colCount === 5) {
          colgroupElement = (
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '23%' }} />
            </colgroup>
          );
        } else if (colCount === 7) {
          colgroupElement = (
            <colgroup>
              <col style={{ width: '4.5%' }} />
              <col style={{ width: '21.5%' }} />
              <col style={{ width: '14.8%' }} />
              <col style={{ width: '14.8%' }} />
              <col style={{ width: '14.8%' }} />
              <col style={{ width: '14.8%' }} />
              <col style={{ width: '14.8%' }} />
            </colgroup>
          );
        } else {
          // Default 6-column Rubric table: No, Aspek Penilaian, Perlu Bimbingan (1), Cukup (2), Baik (3), Sangat Baik (4)
          colgroupElement = (
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
          );
        }
      }

      return (
        <div
          className="table-wrapper my-3 w-full max-w-full overflow-x-auto print:overflow-visible"
          data-table-wrapper="true"
          data-kisi-wrapper={isKisiKisi ? 'true' : undefined}
          data-rubric-wrapper={isRubric ? 'true' : undefined}
          data-section-kisi={isKisiKisi ? 'true' : undefined}
        >
          <table
            className={tableClasses}
            data-table="true"
            data-columns={colCount || (isKisiKisi ? 7 : isRubric ? 6 : isMatchingTable ? 2 : isPenskoranTable ? 4 : isBenarSalahTable ? 4 : undefined)}
            data-rubric={isRubric ? 'true' : undefined}
            data-kisi={isKisiKisi ? 'true' : undefined}
            data-matching={isMatchingTable ? 'true' : undefined}
            data-penskoran={isPenskoranTable ? 'true' : undefined}
            data-benar-salah={isBenarSalahTable ? 'true' : undefined}
            data-section-kisi={isKisiKisi ? 'true' : undefined}
            style={{ tableLayout: isKisiKisi || isRubric || isMatchingTable || isPenskoranTable || isBenarSalahTable ? 'fixed' : undefined, width: '100%' }}
            {...props}
          >
            {colgroupElement}
            {children}
          </table>
        </div>
      );
    },
    tr: ({ children, ...props }: any) => {
      // Filter out any stray separator rows (:---:) that might be erroneously parsed as tbody rows
      try {
        const rowChildren = React.Children.toArray(children);
        if (rowChildren.length > 0) {
          const isStraySeparatorRow = rowChildren.every((child: any) => {
            const childContent = child?.props?.children;
            if (typeof childContent === 'string') {
              return /^[:\-\s]+$/.test(childContent.trim());
            }
            if (Array.isArray(childContent) && typeof childContent[0] === 'string') {
              return /^[:\-\s]+$/.test(childContent[0].trim());
            }
            return false;
          });

          if (isStraySeparatorRow) {
            return null;
          }
        }
      } catch {
        // Fallback to normal render
      }

      return (
        <tr data-table-row="true" className="break-inside-avoid print:break-inside-avoid" {...props}>
          {children}
        </tr>
      );
    },
    th: ({ children, style, ...props }: any) => (
      <th
        style={{
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, style, ...props }: any) => (
      <td
        style={{
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        {parseVisualNodes(children)}
      </td>
    ),
  };

  // Dedicated renderer for official KOP Soal and Petunjuk Pengerjaan Soal:
  // Strictly DOES NOT execute parseVisualNodes, guaranteeing that image upload boxes or stimulus blocks
  // NEVER appear on Petunjuk Pengerjaan Soal or student identity tables!
  const kopMarkdownComponents = useMemo(() => ({
    ...markdownComponents,
    p: ({ children, ...props }: any) => (
      <p className="mb-2 text-slate-900 leading-relaxed text-justify" {...props}>
        {wrapArabicInText(children)}
      </p>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-justify leading-relaxed mb-1.5 text-slate-900" {...props}>
        {wrapArabicInText(children)}
      </li>
    ),
    td: ({ children, style, ...props }: any) => (
      <td
        style={{
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        {wrapArabicInText(children)}
      </td>
    ),
  }), [markdownComponents]);

  const cleanKopSoal = useMemo(() => {
    return (kopSoalMarkdown || '').replace(
      /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
      ''
    );
  }, [kopSoalMarkdown]);

  return (
    <div
      className={`document-preview-container flex flex-col bg-slate-100/90 rounded-2xl lg:rounded-none border border-slate-300/80 lg:border-y-0 shadow-sm lg:shadow-none overflow-hidden transition-all print:border-none print:shadow-none print:bg-transparent ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-slate-900/95 p-4 sm:p-8' : 'min-h-[620px] lg:min-h-0 h-full'
      }`}
    >
      {/* Top Action Toolbar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 no-print shadow-xs shrink-0">
        {/* Left: Document Info */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-700">Pratinjau Dokumen</span>
            {currentDoc && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  getDocTypeBadge(currentDoc.type).color
                }`}
              >
                {getDocTypeBadge(currentDoc.type).label}
              </span>
            )}
          </div>
          {currentDoc && (
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-full font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Waktu Pembuatan: <strong className="text-slate-700 font-semibold">{formatDocumentCreationTime(currentDoc.createdAt)}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center flex-wrap gap-1.5">
          {currentDoc && (
            <>
              {/* Reset to Original AI text button if edits made */}
              {editedBodyHtml && (
                <button
                  id="btn-reset-edited-text"
                  type="button"
                  onClick={handleResetText}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                  title="Kembalikan isi teks ke versi asli sebelum diedit"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Teks</span>
                </button>
              )}

              {/* Direct Manual Editing Toggle Button */}
              <button
                id="btn-toggle-edit-mode"
                type="button"
                onClick={handleToggleEdit}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs cursor-pointer ${
                  isEditing
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                    : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-300 hover:border-amber-400'
                }`}
                title={isEditing ? 'Selesai Mengedit Teks' : 'Edit Isi Teks Langsung pada Lembar Dokumen'}
              >
                {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-amber-600" />}
                <span>{isEditing ? 'Selesai Edit' : 'Edit Teks'}</span>
              </button>

              {/* Unduh Word KHUSUS Dokumen Asesmen (RPPM & LKPD tidak dimunculkan) */}
              {currentDoc.type === 'asesmen' && (
                <button
                  id="btn-download-word"
                  type="button"
                  onClick={handleDownloadWord}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-xs transition-all cursor-pointer ring-1 ring-blue-600/50"
                  title="Unduh dokumen Asesmen dalam format Microsoft Word (.doc)"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-100" />
                  <span>Unduh Word</span>
                </button>
              )}

              {/* Print PDF Button */}
              <button
                id="btn-print-preview-pdf"
                type="button"
                onClick={handlePrintPreview}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white shadow-xs transition-all cursor-pointer ring-1 ring-emerald-600/50"
                title="Print Preview / Cetak PDF (Buka pratinjau cetak untuk mencetak atau simpan sebagai file PDF A4 resmi)"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-100" />
                <span>Print PDF</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                id="btn-toggle-fullscreen"
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="document-preview-scroll flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible overscroll-contain">
        {isLoading ? (
          /* Loading State with Pedagogical animation */
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 text-center my-auto border border-sky-100 space-y-5">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-sky-100 animate-ping opacity-60"></div>
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 via-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Merancang {activeType === 'rppm' ? 'RPPM Mendalam' : activeType === 'asesmen' ? 'Perangkat Asesmen & Rubrik' : 'LKPD Siswa'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Gemini AI sedang menyusun dokumen Kurikulum Merdeka yang komprehensif, berkesadaran, bermakna, dan menyenangkan...
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto space-y-2">
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Standar Kurikulum Merdeka Terapan:
              </span>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Prinsip: Berkesadaran, Bermakna, Menggembirakan
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Siklus Belajar: Memahami, Mengaplikasi, Merefleksi
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  Integrasi Dimensi Profil Lulusan & Digitalisasi
                </li>
              </ul>
            </div>
          </div>
        ) : currentDoc ? (
          /* Rendered White Paper Document (A4 Feel) with Direct Editing */
          <div
            ref={paperRef}
            data-doc-type={currentDoc.type}
            onPaste={handlePaperPaste}
            className={`document-paper document-type-${currentDoc.type} w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-12 sm:px-14 shadow-2xl rounded-sm border border-slate-200 text-slate-900 bg-white`}
          >
            {/* Edit Mode Helper Notification Banner */}
            {isEditing && (
              <div className="no-print mb-4 p-3 rounded-lg bg-amber-50/95 border border-amber-300 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex items-start gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Mode Edit Teks Aktif:</span> Anda dapat langsung mengklik dan mengedit teks isi dokumen (tujuan pembelajaran, butir soal, pilihan jawaban, kunci, rubrik, dll.) di lembar ini.
                    <div className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 inline text-amber-600" />
                      Bagian data Identitas resmi dan Tanda Tangan dikunci agar format administratif tetap akurat dan terstandar.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEdit}
                  className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Selesai Edit</span>
                </button>
              </div>
            )}

            {/* 1. Top Section: School / Student Identity (LOCKED / PROTECTED) */}
            {topMarkdown && (
              <div
                className={`document-identity-section relative ${
                  isEditing ? 'select-none cursor-not-allowed opacity-95' : ''
                }`}
                contentEditable={false}
                suppressContentEditableWarning
                title={isEditing ? 'Bagian Identitas Resmi Terkunci (Tidak dapat diedit)' : undefined}
              >
                {isEditing && (
                  <div className="no-print flex justify-end mb-1">
                    <span className="lock-indicator-badge inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-500 font-sans font-medium select-none">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Data Identitas Resmi (Terkunci)
                    </span>
                  </div>
                )}
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {topMarkdown}
                </ReactMarkdown>
              </div>
            )}

            {/* 2. Main Body Section: Document Content (DIRECTLY EDITABLE ON PAPER) */}
            <div
              ref={bodyRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={handleBlur}
              onInput={handleBodyInput}
              onPaste={handleSoalPaste}
              className={`document-body-section transition-all ${
                isEditing ? 'is-editing-mode my-2' : ''
              }`}
            >
              {editedBodyHtml ? (
                <div dangerouslySetInnerHTML={{ __html: editedBodyHtml }} />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {bodyMarkdown}
                </ReactMarkdown>
              )}
            </div>

            {/* 3. Bottom Section: Official Signature Block (LOCKED / PROTECTED) */}
            {signatureMarkdown && (
              <div
                className={`signature-container signature-locked-section relative my-6 print:my-4 print:break-inside-avoid break-inside-avoid ${
                  isEditing ? 'select-none cursor-not-allowed opacity-95' : ''
                }`}
                data-signature="true"
                data-avoid-break="true"
                contentEditable={false}
                suppressContentEditableWarning
                title={isEditing ? 'Bagian Tanda Tangan Resmi Terkunci (Tidak dapat diedit)' : undefined}
              >
                {isEditing && (
                  <div className="no-print flex justify-end mb-1">
                    <span className="lock-indicator-badge inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-500 font-sans font-medium select-none">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Tanda Tangan Resmi (Terkunci)
                    </span>
                  </div>
                )}
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {signatureMarkdown}
                </ReactMarkdown>
              </div>
            )}

            {/* 4. Student Test Paper / Naskah Soal Peserta Didik (NEW PAGE / LEMBAR BARU) */}
            {soalMarkdown && (
              <div
                className="naskah-soal-page-section print:break-before-page break-before-page mt-10 pt-6 border-t-2 border-dashed border-sky-300 print:border-none print:mt-0 print:pt-0"
                data-section-naskah="true"
                data-section-soal="true"
              >
                {/* Lembar Soal Page Break Indicator (Clean, No Upload Button) */}
                <div className="no-print mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600 shadow-2xs">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800 text-xs sm:text-[13px]">
                    📄 Lembar Halaman Baru: Naskah Soal Peserta Didik
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Otomatis Halaman Baru saat Cetak PDF &amp; Word
                  </span>
                </div>

                {/* 4a. Official KOP Soal & Student Identity (LOCKED / PROTECTED - NEVER CONTAMINATED BY IMAGES) */}
                {kopSoalMarkdown && (
                  <div
                    className="document-kop-soal-section relative select-none"
                    contentEditable={false}
                    suppressContentEditableWarning
                    title={isEditing ? 'KOP Soal dan Petunjuk Resmi Terkunci (Sesuai Standar Resmi)' : undefined}
                  >
                    {isEditing && (
                      <div className="no-print flex justify-end mb-1">
                        <span className="lock-indicator-badge inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-500 font-sans font-medium select-none">
                          <Lock className="w-3 h-3 text-slate-400" />
                          KOP Soal Resmi (Terkunci)
                        </span>
                      </div>
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={kopMarkdownComponents}>
                      {cleanKopSoal}
                    </ReactMarkdown>
                  </div>
                )}

                {/* 4b. Question Items (EDITABLE / INTERACTIVE) */}
                <div
                  ref={soalRef}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onInput={handleSoalInput}
                  onPaste={handleSoalPaste}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsSoalDragging(true);
                  }}
                  onDragLeave={() => setIsSoalDragging(false)}
                  onDrop={handleSoalDrop}
                  tabIndex={0}
                  className={`document-soal-section transition-all focus:outline-none ${
                    isEditing ? 'is-editing-mode my-2' : ''
                  } ${
                    isSoalDragging ? 'ring-2 ring-sky-500 bg-sky-50/20' : ''
                  }`}
                >
                  {isEditing && editedSoalHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeEditedQuestionsHtml(editedSoalHtml) }} />
                  ) : editedSoalHtml && hasValidQuestions(editedSoalHtml) ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeEditedQuestionsHtml(editedSoalHtml) }} />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {pertanyaanMarkdown || soalMarkdown}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          /* Error State with Retry Button */
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-rose-200 p-8 text-center my-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Gagal Menghasilkan Dokumen
              </h3>
              <p className="text-xs text-rose-600 font-medium">
                {error}
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Data isian formulir Anda tetap tersimpan aman. Silakan coba kembali untuk memulai pembuatan dokumen otomatis dengan AI.
              </p>
            </div>

            {onRetry && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-500/20 transition-all hover:scale-105 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Coba Generate Lagi</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center my-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mx-auto">
              <FileCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Dokumen Siap Dihasilkan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Lengkapi formulir <strong>Identitas Sekolah</strong> dan <strong>Desain Pembelajaran</strong> di sebelah kiri, lalu klik salah satu tombol aksi di bawah:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                <span className="text-xs font-bold text-blue-900 block">1. Buat RPPM</span>
                <p className="text-[11px] text-blue-700 leading-snug">
                  RPPM Mendalam lengkap dengan prinsip Memahami, Mengaplikasi, Merefleksi & TTD resmi.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1">
                <span className="text-xs font-bold text-purple-900 block">2. Buat LKPD</span>
                <p className="text-[11px] text-purple-700 leading-snug">
                  Lembar Kerja Siswa interaktif dengan stimulus kontekstual, nalar kritis & refleksi.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <span className="text-xs font-bold text-emerald-900 block">3. Buat Asesmen</span>
                <p className="text-[11px] text-emerald-700 leading-snug">
                  Asesmen Diagnostik, Kisi-kisi, 5 Soal PG HOTS, 2 Esai, Pembahasan & Rubrik 4 Skala.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-900 block">4. Buat MPI</span>
                <p className="text-[11px] text-amber-700 leading-snug">
                  Aplikasi Media Pembelajaran Interaktif lengkap dengan 6 struktur & navigasi via Gemini Canvas.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 pt-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Didukung oleh Google Gemini 3.7 Flash • Standar Kurikulum Merdeka BSKAP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
