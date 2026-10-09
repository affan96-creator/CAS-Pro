import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toCanvas } from 'html-to-image';

/**
 * Standardized Regular Expressions for Section II (Kisi-Kisi Penulisan Soal),
 * Section III (Naskah Soal) and Section IV (Kunci Jawaban, Pembahasan & Pedoman Penskoran).
 */
export const KISI_KISI_REGEX =
  /(?:(?:II|2|[bB]agian\s*(?:II|2))[.:\s][^\n]*kisi-kisi|tabel\s*matriks\s*kisi-kisi|kisi-kisi\s*penulisan\s*soal|matriks\s*kisi-kisi)/i;

export const NASKAH_SOAL_REGEX =
  /(?:(?:III|3|[bB]agian\s*(?:III|3))[.:\s][^\n]*naskah\s*soal|naskah\s*soal\s*(?:asesmen|formatif|sumatif|awal|diagnostik|lengkap)?|(?:butir\s*soal\s*asesmen))/i;

export const KUNCI_JAWABAN_REGEX =
  /(?:(?:IV|4|[bB]agian\s*(?:IV|4))[.:\s][^\n]*kunci\s*jawaban|kunci\s*jawaban[^\n]*(?:pembahasan|pedoman|penskoran|rubrik|skor)?|(?:kunci\s*jawaban\s*(?:dan|&)\s*pembahasan))/i;

/**
 * Interface for PDF Generation progress callback (optional)
 */
export interface PdfExportProgress {
  status: 'idle' | 'capturing' | 'slicing' | 'compiling' | 'completed' | 'error';
  progress: number;
  message: string;
}

/**
 * Scans a 2D canvas context for a clean horizontal whitespace band.
 * Searches upwards from targetY within searchWindow pixels.
 * Looks for consecutive rows of pure/near-white margin so slicing happens
 * cleanly between paragraphs, table rows, or section breaks, not across text lines.
 */
function findCleanSlicePoint(
  ctx: CanvasRenderingContext2D | null,
  width: number,
  targetY: number,
  searchWindow: number
): number {
  if (!ctx) return targetY;

  try {
    const startY = Math.max(0, Math.floor(targetY - searchWindow));
    const endY = Math.min(ctx.canvas.height - 1, Math.floor(targetY));
    const heightToScan = endY - startY;

    if (heightToScan <= 5) return targetY;

    const imgData = ctx.getImageData(0, startY, width, heightToScan);
    const data = imgData.data;

    const xStart = Math.floor(width * 0.05);
    const xEnd = Math.floor(width * 0.95);

    let bestGapY = -1;
    let maxConsecutiveWhite = 0;
    let currentConsecutiveWhite = 0;
    let currentGapEndY = -1;

    // Scan from bottom (targetY) upwards towards startY
    for (let relY = heightToScan - 1; relY >= 0; relY--) {
      let isCleanRow = true;
      const rowOffset = relY * width * 4;

      for (let x = xStart; x < xEnd; x += 6) {
        const pIdx = rowOffset + x * 4;
        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];
        const a = data[pIdx + 3];

        // Content pixel detected if opacity > 25 and not white/light grey
        if (a > 25 && (r < 242 || g < 242 || b < 242)) {
          isCleanRow = false;
          break;
        }
      }

      if (isCleanRow) {
        if (currentConsecutiveWhite === 0) {
          currentGapEndY = relY;
        }
        currentConsecutiveWhite++;

        // If we find a solid gap of at least 4 rows of white margin near targetY, pick it!
        if (currentConsecutiveWhite >= 4 && bestGapY === -1) {
          bestGapY = startY + Math.floor((currentGapEndY + relY) / 2);
          return bestGapY;
        }
      } else {
        if (currentConsecutiveWhite > maxConsecutiveWhite) {
          maxConsecutiveWhite = currentConsecutiveWhite;
          bestGapY = startY + Math.floor((currentGapEndY + (relY + 1)) / 2);
        }
        currentConsecutiveWhite = 0;
      }
    }

    if (bestGapY !== -1 && maxConsecutiveWhite >= 2) {
      return bestGapY;
    }
  } catch (err) {
    console.warn('Whitespace scan skipped:', err);
  }

  return targetY;
}

/**
 * Detects whether a page slice is completely empty / white space.
 * Prevents blank pages from ever being added to the PDF document.
 */
function isSliceVisuallyBlank(canvas: HTMLCanvasElement): boolean {
  if (canvas.height < 45) return true;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  try {
    const scanTop = Math.min(3, Math.floor(canvas.height / 4));
    const scanHeight = canvas.height - scanTop * 2;
    if (scanHeight <= 5) return true;

    const data = ctx.getImageData(0, scanTop, canvas.width, scanHeight).data;
    let nonWhiteCount = 0;
    for (let i = 0; i < data.length; i += 24) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 30 && (r < 240 || g < 240 || b < 240)) {
        nonWhiteCount++;
        if (nonWhiteCount > 25) return false;
      }
    }
    return nonWhiteCount <= 25;
  } catch {
    return false;
  }
}

/**
 * Scans the rendered canvas to find the pure white gap between a preceding table
 * and the subsequent section heading (e.g., between the Kisi-Kisi table bottom
 * and the Section III "Naskah Soal Asesmen" heading).
 *
 * Guarantees that:
 * 1. The preceding table is 100% complete and cleanly closed on the current page
 *    (including its bottom border line and a clean bottom margin).
 * 2. The next page starts STRICTLY after the table has completely ended,
 *    eliminating any orphan bottom border line or column divider ticks from ever
 *    appearing at the top of the next page.
 */
/**
 * Scans the rendered canvas to find the pure white gap immediately PRECEDING a section heading
 * (such as Section III "Naskah Soal Asesmen" or Section IV "Kunci Jawaban, Pembahasan & Pedoman Penskoran").
 *
 * Guarantees that:
 * 1. The current page ends cleanly BEFORE the section heading starts, in pure white space
 *    (cleanCutY < headingTopY).
 * 2. If a table precedes the section (e.g. Kisi-Kisi table), the table is 100% complete
 *    with its bottom border line and a clean bottom margin on the current page.
 * 3. The new page starts in the white space immediately before the section heading
 *    (nextPageStartY <= headingTopY, nextPageStartY >= cleanCutY + 2),
 *    so the entire section heading, its text, and its underline start at the top of the next page.
 * 4. Zero orphan headings, zero split headings, and zero stray lines at the top or bottom of pages.
 */
function findSectionBreakGap(
  ctx: CanvasRenderingContext2D | null,
  canvasWidth: number,
  canvasHeight: number,
  approxBreakY: number,
  tableBottomHint?: number
): { cleanCutY: number; nextPageStartY: number } {
  // Baseline fallback values (always strictly before approxBreakY)
  const defaultCutY = tableBottomHint
    ? Math.min(approxBreakY - 12, tableBottomHint + 12)
    : approxBreakY - 14;
  const defaultNextY = Math.max(defaultCutY + 2, approxBreakY - 4);

  if (!ctx) {
    return { cleanCutY: defaultCutY, nextPageStartY: defaultNextY };
  }

  try {
    const xStart = Math.round(canvasWidth * 0.04);
    const xEnd = Math.round(canvasWidth * 0.96);

    // STEP 1: Find the exact Y coordinate where the heading's dark text pixels begin on the canvas.
    // We scan a narrow vertical window around approxBreakY [-35, +45].
    let exactHeadingTopY = approxBreakY;
    const testStart = Math.max(0, approxBreakY - 35);
    const testEnd = Math.min(canvasHeight - 1, approxBreakY + 45);
    const testHeight = testEnd - testStart + 1;

    if (testHeight > 5) {
      const testData = ctx.getImageData(0, testStart, canvasWidth, testHeight).data;
      for (let relY = 0; relY < testHeight; relY++) {
        const rowOff = relY * canvasWidth * 4;
        let darkCount = 0;
        for (let x = xStart; x < xEnd; x += 4) {
          const p = rowOff + x * 4;
          if (testData[p + 3] > 25 && (testData[p] < 235 || testData[p + 1] < 235 || testData[p + 2] < 235)) {
            darkCount++;
            if (darkCount >= 4) break;
          }
        }
        if (darkCount >= 4) {
          exactHeadingTopY = testStart + relY;
          break;
        }
      }
    }

    // STEP 2: Scan the area STRICTLY ABOVE exactHeadingTopY to find the pure white gap
    // between the preceding content (table or questions) and the heading.
    // CRITICAL: endScanY NEVER enters or goes below exactHeadingTopY!
    const startScanY = tableBottomHint
      ? Math.max(0, Math.min(tableBottomHint - 25, exactHeadingTopY - 200))
      : Math.max(0, exactHeadingTopY - 180);
    const endScanY = Math.max(startScanY + 5, exactHeadingTopY - 1);
    const scanHeight = endScanY - startScanY + 1;

    if (scanHeight < 10) {
      return { cleanCutY: defaultCutY, nextPageStartY: defaultNextY };
    }

    const imgData = ctx.getImageData(0, startScanY, canvasWidth, scanHeight).data;

    // Check each horizontal row in the scan area
    const isCleanWhiteRow = new Uint8Array(scanHeight);

    for (let relY = 0; relY < scanHeight; relY++) {
      const rowOffset = relY * canvasWidth * 4;
      let darkCount = 0;

      for (let x = xStart; x < xEnd; x += 4) {
        const pIdx = rowOffset + x * 4;
        const a = imgData[pIdx + 3];
        if (a > 25) {
          const r = imgData[pIdx];
          const g = imgData[pIdx + 1];
          const b = imgData[pIdx + 2];
          // Content pixel (table border or text letter)
          if (r < 238 || g < 238 || b < 238) {
            darkCount++;
            if (darkCount >= 2) {
              break;
            }
          }
        }
      }

      if (darkCount < 2) {
        isCleanWhiteRow[relY] = 1;
      }
    }

    // STEP 3: Find candidate white gaps (contiguous runs of clean white rows)
    interface WhiteGap {
      startRel: number;
      endRel: number;
      len: number;
    }
    const gaps: WhiteGap[] = [];
    let curStart = -1;

    for (let relY = 0; relY < scanHeight; relY++) {
      if (isCleanWhiteRow[relY] === 1) {
        if (curStart === -1) curStart = relY;
      } else {
        if (curStart !== -1) {
          const len = relY - curStart;
          if (len >= 4) {
            gaps.push({ startRel: curStart, endRel: relY - 1, len });
          }
          curStart = -1;
        }
      }
    }
    if (curStart !== -1) {
      const len = scanHeight - curStart;
      if (len >= 4) {
        gaps.push({ startRel: curStart, endRel: scanHeight - 1, len });
      }
    }

    if (gaps.length > 0) {
      // The best gap is the one immediately preceding the heading (closest to endScanY)
      // or closest to tableBottom if tableBottomHint is provided:
      let bestGap: WhiteGap;
      if (tableBottomHint) {
        const relTableBottom = tableBottomHint - startScanY;
        const postTableGaps = gaps.filter((g) => g.endRel >= relTableBottom);
        if (postTableGaps.length > 0) {
          bestGap = postTableGaps[0];
        } else {
          bestGap = gaps[gaps.length - 1];
        }
      } else {
        bestGap = gaps[gaps.length - 1];
      }

      const gapAbsStart = startScanY + bestGap.startRel;
      const gapAbsEnd = startScanY + bestGap.endRel;
      const gapLen = bestGap.len;

      let cleanCutY: number;
      if (tableBottomHint && gapAbsStart <= tableBottomHint + 4) {
        // Table bottom border is fully closed on this page with safe margin:
        cleanCutY = Math.max(tableBottomHint + 10, gapAbsStart + Math.min(14, Math.floor(gapLen * 0.4)));
      } else {
        // Safe cut in the white space after preceding questions:
        cleanCutY = gapAbsStart + Math.min(14, Math.max(6, Math.floor(gapLen * 0.35)));
      }

      // Enforce strict safety boundary: cleanCutY MUST be strictly above the heading!
      cleanCutY = Math.min(cleanCutY, exactHeadingTopY - 8);

      // Next page starts strictly right before the heading (skipping all post-table whitespace/residue):
      const nextPageStartY = Math.max(cleanCutY + 2, exactHeadingTopY - 6);

      return { cleanCutY, nextPageStartY };
    }
  } catch (err) {
    console.warn('findSectionBreakGap error, using safe fallback:', err);
  }

  return { cleanCutY: defaultCutY, nextPageStartY: defaultNextY };
}

/**
 * Exports a DOM element as a High-Security Protected Rasterized PDF.
 *
 * Security Feature ("Pengamanan Tingkat Tinggi"):
 * - Each A4 page is rasterized into pure flattened image data (zero raw text stream).
 * - When opened in Microsoft Word ("Open with Word") or converted via PDF-to-Word tools,
 *   the result in Word is STRICTLY AN UNEDITABLE PHOTO/IMAGE per page.
 * - Teachers/users cannot alter words, questions, rubrics, or official signatures in Word.
 *
 * Page Formatting ("Rapi & Terstruktur"):
 * - Uses standard official A4 margins (Top: 20mm, Bottom: 20mm, Left: 15mm, Right: 15mm).
 * - Section III (Naskah Soal Asesmen) starts at the top of a new sheet (lembar baru),
 *   cleanly separated from the preceding Kisi-Kisi table without any blank pages in between.
 * - Section IV (Kunci Jawaban & Rubrik) and headings are kept together with their tables
 *   on the same page to avoid wasted paper.
 */
export async function downloadProtectedPdf(
  element: HTMLElement,
  filename: string,
  onProgress?: (progress: PdfExportProgress) => void
): Promise<boolean> {
  try {
    onProgress?.({
      status: 'capturing',
      progress: 20,
      message: 'Menyiapkan dokumen...',
    });

    let canvas: HTMLCanvasElement | null = null;
    interface AvoidBox {
      top: number;
      bottom: number;
    }

    interface TableRowBox {
      top: number;
      bottom: number;
      isLastInTable: boolean;
      tableTop: number;
      tableBottom: number;
    }

    const avoidBoxes: AvoidBox[] = [];
    const tableBoxes: AvoidBox[] = [];
    const tableRowBoxes: TableRowBox[] = [];
    const headingBoxes: AvoidBox[] = [];
    let clonedParentHeight = 0;
    let kisiKisiTop: number | null = null;
    let naskahSoalTop: number | null = null;
    let kunciJawabanTop: number | null = null;

    // Measure avoidBoxes, tables, headings & section breaks on actual DOM element as fallback
    const isLkpdDoc =
      element.getAttribute('data-doc-type') === 'lkpd' ||
      element.classList.contains('document-type-lkpd');

    const fallbackAvoidBoxes: AvoidBox[] = [];
    const fallbackTableBoxes: AvoidBox[] = [];
    const fallbackTableRowBoxes: TableRowBox[] = [];
    const fallbackHeadingBoxes: AvoidBox[] = [];
    let fallbackKisiKisiRatio: number | null = null;
    let fallbackNaskahSoalRatio: number | null = null;
    let fallbackKunciJawabanRatio: number | null = null;

    try {
      const realParentRect = element.getBoundingClientRect();
      if (realParentRect.height > 0) {
        element.querySelectorAll(
          '.signature-container, .signature-locked-section, [data-signature="true"], [data-avoid-break="true"]'
        ).forEach((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (r.height > 20) {
            fallbackAvoidBoxes.push({
              top: (r.top - realParentRect.top) / realParentRect.height,
              bottom: (r.bottom - realParentRect.top) / realParentRect.height,
            });
          }
        });

        // Fallback detection for tables
        element.querySelectorAll<HTMLElement>('table, .table-wrapper, .kisi-kisi-table, [data-table="true"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > 15) {
            fallbackTableBoxes.push({
              top: (r.top - realParentRect.top) / realParentRect.height,
              bottom: (r.bottom - realParentRect.top) / realParentRect.height,
            });
          }
        });

        // Fallback detection for table rows
        element.querySelectorAll<HTMLTableRowElement>('table tr, .table-wrapper tr').forEach((tr) => {
          const r = tr.getBoundingClientRect();
          if (r.height > 6) {
            const parentTable = tr.closest('table');
            const tblRect = parentTable ? parentTable.getBoundingClientRect() : null;
            const isLastInTable = tr.nextElementSibling === null;
            fallbackTableRowBoxes.push({
              top: (r.top - realParentRect.top) / realParentRect.height,
              bottom: (r.bottom - realParentRect.top) / realParentRect.height,
              isLastInTable,
              tableTop: tblRect ? (tblRect.top - realParentRect.top) / realParentRect.height : (r.top - realParentRect.top) / realParentRect.height,
              tableBottom: tblRect ? (tblRect.bottom - realParentRect.top) / realParentRect.height : (r.bottom - realParentRect.top) / realParentRect.height,
            });
          }
        });

        // Fallback detection for headings (h1, h2, h3, [data-heading="true"])
        element.querySelectorAll<HTMLElement>('h1, h2, h3, [data-heading="true"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > 10) {
            fallbackHeadingBoxes.push({
              top: (r.top - realParentRect.top) / realParentRect.height,
              bottom: (r.bottom - realParentRect.top) / realParentRect.height,
            });
          }
        });

        // Hanya deteksi pemisahan Section II, III, IV jika BUKAN dokumen LKPD
        if (!isLkpdDoc) {
          // Fallback detection for Section II (Kisi-Kisi Penulisan Soal)
          const realKisi = element.querySelector<HTMLElement>(
            '[data-section-kisi="true"], [data-kisi-heading="true"], .section-kisi-kisi, #section-kisi-kisi'
          );
          if (realKisi) {
            const r = realKisi.getBoundingClientRect();
            if (r.height > 0) {
              fallbackKisiKisiRatio = (r.top - realParentRect.top) / realParentRect.height;
            }
          }
          if (fallbackKisiKisiRatio === null) {
            element.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-heading="true"], p strong, p b').forEach((el) => {
              if (fallbackKisiKisiRatio === null) {
                const text = el.textContent || '';
                if (KISI_KISI_REGEX.test(text)) {
                  const r = el.getBoundingClientRect();
                  if (r.height > 0) {
                    fallbackKisiKisiRatio = (r.top - realParentRect.top) / realParentRect.height;
                  }
                }
              }
            });
          }
          if (fallbackKisiKisiRatio === null) {
            const firstKisiTable = element.querySelector<HTMLElement>('[data-kisi="true"], .kisi-kisi-table, [data-kisi-wrapper="true"]');
            if (firstKisiTable) {
              const r = firstKisiTable.getBoundingClientRect();
              if (r.height > 0) {
                fallbackKisiKisiRatio = Math.max(0, (r.top - realParentRect.top - 15) / realParentRect.height);
              }
            }
          }

          // Fallback detection for Section III / Lembar Soal (Naskah Soal)
          const realNaskah = element.querySelector<HTMLElement>(
            '[data-section-soal="true"], [data-section-naskah="true"], .naskah-soal-page-section, .section-naskah-soal, #section-naskah-soal'
          );
          if (realNaskah) {
            const r = realNaskah.getBoundingClientRect();
            if (r.height > 0) {
              fallbackNaskahSoalRatio = (r.top - realParentRect.top) / realParentRect.height;
            }
          }
          if (fallbackNaskahSoalRatio === null) {
            element.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-heading="true"], p strong, p b').forEach((el) => {
              if (fallbackNaskahSoalRatio === null) {
                const text = el.textContent || '';
                if (NASKAH_SOAL_REGEX.test(text)) {
                  const r = el.getBoundingClientRect();
                  if (r.height > 0) {
                    fallbackNaskahSoalRatio = (r.top - realParentRect.top) / realParentRect.height;
                  }
                }
              }
            });
          }

          // Fallback detection for Section IV (Kunci Jawaban)
          const realKunci = element.querySelector<HTMLElement>('[data-section-kunci="true"], .section-kunci-jawaban, #section-kunci-jawaban');
          if (realKunci) {
            const r = realKunci.getBoundingClientRect();
            if (r.height > 0) {
              fallbackKunciJawabanRatio = (r.top - realParentRect.top) / realParentRect.height;
            }
          }
          if (fallbackKunciJawabanRatio === null) {
            element.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-heading="true"], p strong, p b').forEach((el) => {
              if (fallbackKunciJawabanRatio === null) {
                const text = el.textContent || '';
                if (KUNCI_JAWABAN_REGEX.test(text)) {
                  const r = el.getBoundingClientRect();
                  if (r.height > 0) {
                    fallbackKunciJawabanRatio = (r.top - realParentRect.top) / realParentRect.height;
                  }
                }
              }
            });
          }
        }
      }
    } catch (measureErr) {
      console.warn('Real DOM measurement warning:', measureErr);
    }

    // Primary Engine: html2canvas with isolated clone and strict anti-taint settings
    try {
      canvas = await html2canvas(element, {
        scale: 1.8, // Crisp high-definition text rendering (~200+ DPI equivalent on A4)
        useCORS: true,
        allowTaint: false, // CRITICAL: NEVER taint canvas so toDataURL/getImageData never throw
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          // Hide non-printable badges & banners FIRST before measuring layout coordinates
          clonedElement.querySelectorAll('.no-print, .lock-indicator-badge').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });

          // Bersihkan stimulus visual soal yang memiliki gambar agar hasil cetak PDF bersih rapi (tanpa teks header/keterangan)
          // Dan jika dengan sengaja tidak diberikan gambar, HAPUS TOTAL seluruh stimulus agar tidak muncul di cetakan PDF
          clonedElement.querySelectorAll('.visual-stimulus-wrapper, [data-stimulus-block="true"]').forEach((wrapper) => {
            const hasImg = wrapper.querySelector('img') !== null;
            if (hasImg) {
              wrapper.querySelectorAll('.stimulus-header-bar, .stimulus-caption-box, [data-stimulus-header="true"], [data-stimulus-caption="true"]').forEach((el) => {
                (el as HTMLElement).style.display = 'none';
              });
              const htmlWrap = wrapper as HTMLElement;
              htmlWrap.style.border = 'none';
              htmlWrap.style.borderWidth = '0';
              htmlWrap.style.backgroundColor = 'transparent';
              htmlWrap.style.boxShadow = 'none';
              htmlWrap.style.padding = '0';
              htmlWrap.style.margin = '8px 0';
              const img = wrapper.querySelector('img');
              if (img) {
                img.style.border = 'none';
                img.style.boxShadow = 'none';
              }
            } else {
              // Soal sengaja tidak diberikan gambar -> hapus total dari lembar cetak PDF
              (wrapper as HTMLElement).style.display = 'none';
              wrapper.remove();
            }
          });

          // Hapus juga option/item visual block atau banner Gemini tanpa gambar
          clonedElement.querySelectorAll('.inline-block, .visual-chart-container').forEach((el) => {
            if (el.querySelector('a[href*="gemini"]') || el.textContent?.includes('Buat di Gemini')) {
              if (!el.querySelector('img')) {
                (el as HTMLElement).style.display = 'none';
                el.remove();
              }
            }
          });

          clonedElement.style.width = '794px';
          clonedElement.style.maxWidth = '794px';
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.margin = '0 auto';
          clonedElement.style.padding = '24px 36px'; // Tidy uniform inner padding

          // Format all tables in clonedElement to guarantee exact visual parity with the web application (Image 1 & Image 2)
          clonedElement.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
            const isIdentity = table.classList.contains('identity-table') || table.getAttribute('data-identity') === 'true';
            const isSignature =
              table.classList.contains('signature-table') ||
              table.getAttribute('data-signature') === 'true' ||
              table.closest('.signature-container') !== null ||
              table.closest('.signature-locked-section') !== null;

            if (isSignature) {
              table.style.border = 'none';
              table.style.borderWidth = '0';
              table.style.borderCollapse = 'collapse';
              table.querySelectorAll<HTMLElement>('tr, th, td').forEach((cell) => {
                cell.style.border = 'none';
                cell.style.borderWidth = '0';
                cell.style.outline = 'none';
                cell.style.backgroundColor = 'transparent';
              });
              return;
            }
            if (isIdentity) return;

            const tableText = (table.textContent || '').trim();
            const firstTr = table.querySelector('tr');
            const cellsInFirstRow = firstTr ? Array.from(firstTr.querySelectorAll('th, td')) : [];
            let colCount = cellsInFirstRow.length;

            // Check and prune completely empty columns across all rows of the table
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length >= 2) {
              const maxCells = Math.max(...rows.map((r) => r.children.length));
              const emptyCols: number[] = [];
              for (let c = 0; c < maxCells; c++) {
                let allEmpty = true;
                for (const row of rows) {
                  const cell = row.children[c];
                  if (!cell) continue;
                  const text = cell.textContent?.replace(/\u00a0|&nbsp;/gi, '').trim() || '';
                  if (text !== '') {
                    allEmpty = false;
                    break;
                  }
                }
                if (allEmpty) emptyCols.push(c);
              }
              if (emptyCols.length > 0) {
                rows.forEach((row) => {
                  for (let i = emptyCols.length - 1; i >= 0; i--) {
                    const cIdx = emptyCols[i];
                    if (row.children[cIdx]) {
                      row.removeChild(row.children[cIdx]);
                    }
                  }
                });
                colCount = Math.max(...rows.map((r) => r.children.length));
              }
            }

            const isKisiKisi =
              table.classList.contains('kisi-kisi-table') ||
              table.getAttribute('data-kisi') === 'true' ||
              tableText.includes('Level Kognitif') ||
              tableText.includes('Kisi-Kisi') ||
              (tableText.includes('Bentuk Soal') && (tableText.includes('Indikator') || tableText.includes('Capaian')));

            const isPenskoran =
              !isKisiKisi &&
              (table.classList.contains('penskoran-table') ||
                table.getAttribute('data-penskoran') === 'true' ||
                tableText.includes('Pedoman Penskoran') ||
                tableText.includes('Konversi Nilai Akhir') ||
                (tableText.includes('Bentuk Soal') &&
                  tableText.includes('Skor Maksimal') &&
                  (tableText.includes('Kriteria') || tableText.includes('Penskoran'))));

            const isMatching =
              !isKisiKisi &&
              !isPenskoran &&
              (table.classList.contains('matching-table') ||
                table.getAttribute('data-matching') === 'true' ||
                colCount === 2 ||
                tableText.includes('Kolom A') ||
                tableText.includes('Kolom B') ||
                tableText.includes('Menjodohkan') ||
                tableText.includes('Premis') ||
                tableText.includes('Karakteristik Sambung'));

            const isRubric =
              !isKisiKisi &&
              !isPenskoran &&
              !isMatching &&
              (table.classList.contains('rubric-table') ||
                table.getAttribute('data-rubric') === 'true' ||
                tableText.includes('Aspek Penilaian') ||
                tableText.includes('Perlu Bimbingan') ||
                tableText.includes('Sangat Baik') ||
                tableText.includes('Rubrik') ||
                tableText.includes('Kinerja') ||
                tableText.includes('Sikap') ||
                tableText.includes('Berkembang') ||
                tableText.includes('Layak') ||
                tableText.includes('Cakap') ||
                tableText.includes('Mahir') ||
                tableText.includes('Kriteria') ||
                (colCount >= 5 && (tableText.includes('Skor') || (tableText.includes('Baik') && tableText.includes('Cukup')))));

            // Standardize root table styling
            table.style.width = '100%';
            table.style.maxWidth = '100%';
            table.style.tableLayout = 'fixed';
            table.style.borderCollapse = 'collapse';
            table.style.boxSizing = 'border-box';
            table.style.fontSize = '10.5px';
            table.style.lineHeight = '1.35';
            table.style.marginTop = '8px';
            table.style.marginBottom = '14px';

            let colWidths: string[] = [];
            let colAligns: ('left' | 'center' | 'right')[] = [];

            if (isKisiKisi) {
              if (colCount === 6) {
                colWidths = ['4.5%', '26%', '43%', '10.5%', '9%', '7%'];
                colAligns = ['center', 'left', 'left', 'center', 'center', 'center'];
              } else {
                // Default 7-column Kisi-Kisi matrix matching Gambar 1
                colWidths = ['4.5%', '23%', '16%', '34.5%', '9%', '7.5%', '5.5%'];
                colAligns = ['center', 'left', 'left', 'left', 'center', 'center', 'center'];
              }
            } else if (isMatching && colCount === 2) {
              // Soal Menjodohkan: seimbang 50% Kolom A dan 50% Kolom B
              colWidths = ['50%', '50%'];
              colAligns = ['left', 'left'];
            } else if (isPenskoran) {
              // Tabel Pedoman Penskoran: Kolom Skor Maksimal dibuat kompak & rapi (~14%), No (8%), Bentuk Soal (22%), Kriteria (56%)
              if (colCount === 4) {
                colWidths = ['8%', '22%', '56%', '14%'];
                colAligns = ['center', 'left', 'left', 'center'];
              } else if (colCount === 3) {
                colWidths = ['10%', '74%', '16%'];
                colAligns = ['center', 'left', 'center'];
              } else {
                colWidths = ['8%', '22%', '56%', '14%'];
                colAligns = ['center', 'left', 'left', 'center'];
              }
            } else if (isRubric) {
              if (colCount === 5) {
                colWidths = ['5%', '26%', '23%', '23%', '23%'];
                colAligns = ['center', 'left', 'left', 'left', 'left'];
              } else if (colCount === 7) {
                colWidths = ['4.5%', '21.5%', '14.8%', '14.8%', '14.8%', '14.8%', '14.8%'];
                colAligns = ['center', 'left', 'left', 'left', 'left', 'left', 'left'];
              } else {
                // Default 6-column Rubric table matching Gambar 2
                colWidths = ['5%', '23%', '18%', '18%', '18%', '18%'];
                colAligns = ['center', 'left', 'left', 'left', 'left', 'left'];
              }
            }

            // Create or replace colgroup
            if (colWidths.length > 0) {
              let colgroup = table.querySelector('colgroup');
              if (!colgroup) {
                colgroup = _clonedDoc.createElement('colgroup');
                table.insertBefore(colgroup, table.firstChild);
              }
              colgroup.innerHTML = '';
              colWidths.forEach((w) => {
                const col = _clonedDoc.createElement('col');
                col.style.width = w;
                colgroup.appendChild(col);
              });
            }

            // Style all thead th and first tr th
            table.querySelectorAll<HTMLTableCellElement>('thead th, tr:first-child th').forEach((th, idx) => {
              th.style.backgroundColor = '#f1f5f9';
              th.style.border = '1px solid #334155';
              th.style.padding = '5px 4px';
              th.style.fontWeight = '700';
              th.style.fontSize = '10.5px';
              th.style.lineHeight = '1.25';
              th.style.textAlign = 'center';
              th.style.verticalAlign = 'middle';
              th.style.boxSizing = 'border-box';
              th.style.color = '#0f172a';
              if (colWidths[idx]) {
                th.style.width = colWidths[idx];
              }
            });

            // Style all body rows and data cells
            table.querySelectorAll<HTMLTableRowElement>('tbody tr, tr').forEach((tr, trIdx) => {
              if (tr.querySelector('th') && trIdx === 0) return;

              tr.querySelectorAll<HTMLTableCellElement>('td').forEach((td, colIdx) => {
                td.style.border = '1px solid #cbd5e1';
                td.style.padding = '5px 5.5px';
                td.style.fontSize = '10.5px';
                td.style.lineHeight = '1.35';
                td.style.verticalAlign = 'top';
                td.style.wordBreak = 'normal';
                td.style.overflowWrap = 'break-word';
                td.style.hyphens = 'none';
                td.style.whiteSpace = 'normal';
                td.style.boxSizing = 'border-box';
                td.style.color = '#0f172a';

                if (colWidths[colIdx]) {
                  td.style.width = colWidths[colIdx];
                }
                if (colAligns[colIdx]) {
                  td.style.textAlign = colAligns[colIdx];
                }

                // Specific formatting for Kisi-Kisi matrix
                if (isKisiKisi) {
                  if (colIdx === 0) {
                    td.style.textAlign = 'center';
                    td.style.fontWeight = '500';
                  } else if ((colWidths.length === 7 && colIdx === 6) || (colWidths.length === 6 && colIdx === 5)) {
                    // No. Soal
                    td.style.textAlign = 'center';
                    td.style.fontWeight = '700';
                    td.style.color = '#1e40af';
                  } else if (
                    (colWidths.length === 7 && (colIdx === 4 || colIdx === 5)) ||
                    (colWidths.length === 6 && (colIdx === 3 || colIdx === 4))
                  ) {
                    // Level Kognitif & Bentuk Soal
                    td.style.textAlign = 'center';
                    td.style.fontWeight = '600';
                  }
                }

                // Specific formatting for Rubric Assessment
                if (isRubric) {
                  if (colIdx === 0) {
                    td.style.textAlign = 'center';
                    td.style.fontWeight = '600';
                  } else if (colIdx === 1) {
                    td.style.textAlign = 'left';
                    td.style.fontWeight = '600';
                  } else {
                    td.style.textAlign = 'left';
                    td.style.verticalAlign = 'top';
                  }
                }
              });
            });
          });

          const clonedParentRect = clonedElement.getBoundingClientRect();
          clonedParentHeight = clonedParentRect.height;

          // Detect signature block and keep-together sections in the cloned document
          clonedElement.querySelectorAll(
            '.signature-container, .signature-locked-section, [data-signature="true"], [data-avoid-break="true"]'
          ).forEach((el) => {
            const r = (el as HTMLElement).getBoundingClientRect();
            if (r.height > 20) {
              avoidBoxes.push({
                top: r.top - clonedParentRect.top,
                bottom: r.bottom - clonedParentRect.top,
              });
            }
          });

          // Detect all tables and table wrappers to protect table borders from orphan splitting
          clonedElement.querySelectorAll<HTMLElement>('table, .table-wrapper, .kisi-kisi-table, [data-table="true"]').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.height > 15) {
              tableBoxes.push({
                top: r.top - clonedParentRect.top,
                bottom: r.bottom - clonedParentRect.top,
              });
            }
          });

          // Detect all individual table rows to prevent slicing across row cells
          clonedElement.querySelectorAll<HTMLTableRowElement>('table tr, .table-wrapper tr').forEach((tr) => {
            const r = tr.getBoundingClientRect();
            if (r.height > 6) {
              const parentTable = tr.closest('table');
              const tblRect = parentTable ? parentTable.getBoundingClientRect() : null;
              const isLastInTable = tr.nextElementSibling === null;
              tableRowBoxes.push({
                top: r.top - clonedParentRect.top,
                bottom: r.bottom - clonedParentRect.top,
                isLastInTable,
                tableTop: tblRect ? tblRect.top - clonedParentRect.top : r.top - clonedParentRect.top,
                tableBottom: tblRect ? tblRect.bottom - clonedParentRect.top : r.bottom - clonedParentRect.top,
              });
            }
          });

          // Detect all headings to prevent orphan headings (keep headings with following content)
          clonedElement.querySelectorAll<HTMLElement>('h1, h2, h3, [data-heading="true"]').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.height > 10) {
              headingBoxes.push({
                top: r.top - clonedParentRect.top,
                bottom: r.bottom - clonedParentRect.top,
              });
            }
          });

          // Hanya deteksi pemisahan Section II, III, IV jika BUKAN dokumen LKPD
          if (!isLkpdDoc) {
            // Detect Section II (Kisi-Kisi Penulisan Soal) to start on a new sheet if needed
            const clonedKisi = clonedElement.querySelector<HTMLElement>(
              '[data-section-kisi="true"], [data-kisi-heading="true"], .section-kisi-kisi, #section-kisi-kisi'
            );
            if (clonedKisi) {
              const r = clonedKisi.getBoundingClientRect();
              if (r.height > 0) {
                kisiKisiTop = r.top - clonedParentRect.top;
              }
            }
            if (kisiKisiTop === null) {
              clonedElement.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-heading="true"], p strong, p b').forEach((el) => {
                if (kisiKisiTop === null) {
                  const text = el.textContent || '';
                  if (KISI_KISI_REGEX.test(text)) {
                    const r = el.getBoundingClientRect();
                    if (r.height > 0) {
                      kisiKisiTop = r.top - clonedParentRect.top;
                    }
                  }
                }
              });
            }
            if (kisiKisiTop === null) {
              const firstKisiTable = clonedElement.querySelector<HTMLElement>('[data-kisi="true"], .kisi-kisi-table, [data-kisi-wrapper="true"]');
              if (firstKisiTable) {
                const r = firstKisiTable.getBoundingClientRect();
                if (r.height > 0) {
                  kisiKisiTop = Math.max(0, r.top - clonedParentRect.top - 15);
                }
              }
            }

            // Detect Section III / Lembar Soal (Naskah Soal) to start on a new sheet
            const clonedNaskah = clonedElement.querySelector<HTMLElement>(
              '[data-section-soal="true"], [data-section-naskah="true"], .naskah-soal-page-section, .section-naskah-soal, #section-naskah-soal'
            );
            if (clonedNaskah) {
              const r = clonedNaskah.getBoundingClientRect();
              if (r.height > 0) {
                naskahSoalTop = r.top - clonedParentRect.top;
              }
            }
            if (naskahSoalTop === null) {
              clonedElement.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-heading="true"], p strong, p b').forEach((el) => {
                if (naskahSoalTop === null) {
                  const text = el.textContent || '';
                  if (NASKAH_SOAL_REGEX.test(text)) {
                    const r = el.getBoundingClientRect();
                    if (r.height > 0) {
                      naskahSoalTop = r.top - clonedParentRect.top;
                    }
                  }
                }
              });
            }

            // Detect Section IV (Kunci Jawaban)
            const clonedKunci = clonedElement.querySelector<HTMLElement>('[data-section-kunci="true"], .section-kunci-jawaban, #section-kunci-jawaban');
            if (clonedKunci) {
              const r = clonedKunci.getBoundingClientRect();
              if (r.height > 0) {
                kunciJawabanTop = r.top - clonedParentRect.top;
              }
            }
            if (kunciJawabanTop === null) {
              clonedElement.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-heading="true"], p strong, p b').forEach((el) => {
                if (kunciJawabanTop === null) {
                  const text = el.textContent || '';
                  if (KUNCI_JAWABAN_REGEX.test(text)) {
                    const r = el.getBoundingClientRect();
                    if (r.height > 0) {
                      kunciJawabanTop = r.top - clonedParentRect.top;
                    }
                  }
                }
              });
            }
          }
        },
      });
    } catch (primaryErr) {
      console.warn('html2canvas encountered an issue, falling back to html-to-image engine:', primaryErr);
    }

    // Secondary Engine Fallback: html-to-image (native browser SVG rendering)
    if (!canvas) {
      canvas = await toCanvas(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 1.8,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (
              node.classList?.contains('no-print') ||
              node.classList?.contains('lock-indicator-badge') ||
              node.classList?.contains('stimulus-header-bar') ||
              node.classList?.contains('stimulus-caption-box') ||
              node.getAttribute('data-stimulus-header') === 'true' ||
              node.getAttribute('data-stimulus-caption') === 'true'
            ) {
              return false;
            }
            if (
              node.classList?.contains('visual-stimulus-wrapper') ||
              node.getAttribute('data-stimulus-block') === 'true' ||
              node.classList?.contains('visual-chart-container')
            ) {
              if (!node.querySelector('img')) {
                return false;
              }
            }
          }
          return true;
        },
        skipFonts: true,
      });
    }

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas rendering produced empty output');
    }

    onProgress?.({
      status: 'slicing',
      progress: 60,
      message: 'Menyusun lembar A4 rapi...',
    });

    // Standard A4 dimensions in mm
    const a4WidthMm = 210;
    const a4HeightMm = 297;

    // Official document margins (Safe printable area with generous breathing room)
    const topMarginMm = 20; // 20 mm (2.0 cm) top margin
    const bottomMarginMm = 20; // 20 mm (2.0 cm) bottom margin
    const leftMarginMm = 15; // 15 mm (1.5 cm) left margin
    const rightMarginMm = 15; // 15 mm (1.5 cm) right margin

    const contentWidthMm = a4WidthMm - leftMarginMm - rightMarginMm; // 180 mm printable width
    const maxContentHeightMm = a4HeightMm - topMarginMm - bottomMarginMm; // 257 mm max printable height

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Convert avoid-boxes (signature blocks) into canvas pixel coordinates
    let canvasAvoidBoxes: AvoidBox[] = [];
    if (avoidBoxes.length > 0 && clonedParentHeight > 0) {
      const scaleY = canvasHeight / clonedParentHeight;
      canvasAvoidBoxes = avoidBoxes.map((b) => ({
        top: Math.round(b.top * scaleY),
        bottom: Math.round(b.bottom * scaleY),
      }));
    } else if (fallbackAvoidBoxes.length > 0) {
      canvasAvoidBoxes = fallbackAvoidBoxes.map((b) => ({
        top: Math.round(b.top * canvasHeight),
        bottom: Math.round(b.bottom * canvasHeight),
      }));
    }
    canvasAvoidBoxes.sort((a, b) => a.top - b.top);

    // Convert table boxes into canvas coordinates
    let canvasTableBoxes: AvoidBox[] = [];
    if (tableBoxes.length > 0 && clonedParentHeight > 0) {
      const scaleY = canvasHeight / clonedParentHeight;
      canvasTableBoxes = tableBoxes.map((t) => ({
        top: Math.round(t.top * scaleY),
        bottom: Math.round(t.bottom * scaleY),
      }));
    } else if (fallbackTableBoxes.length > 0) {
      canvasTableBoxes = fallbackTableBoxes.map((t) => ({
        top: Math.round(t.top * canvasHeight),
        bottom: Math.round(t.bottom * canvasHeight),
      }));
    }

    // Convert individual table rows into canvas coordinates
    let canvasTableRowBoxes: TableRowBox[] = [];
    if (tableRowBoxes.length > 0 && clonedParentHeight > 0) {
      const scaleY = canvasHeight / clonedParentHeight;
      canvasTableRowBoxes = tableRowBoxes.map((row) => ({
        top: Math.round(row.top * scaleY),
        bottom: Math.round(row.bottom * scaleY),
        isLastInTable: row.isLastInTable,
        tableTop: Math.round(row.tableTop * scaleY),
        tableBottom: Math.round(row.tableBottom * scaleY),
      }));
    } else if (fallbackTableRowBoxes.length > 0) {
      canvasTableRowBoxes = fallbackTableRowBoxes.map((row) => ({
        top: Math.round(row.top * canvasHeight),
        bottom: Math.round(row.bottom * canvasHeight),
        isLastInTable: row.isLastInTable,
        tableTop: Math.round(row.tableTop * canvasHeight),
        tableBottom: Math.round(row.tableBottom * canvasHeight),
      }));
    }
    canvasTableRowBoxes.sort((a, b) => a.top - b.top);

    // Convert heading boxes into canvas coordinates
    let canvasHeadingBoxes: AvoidBox[] = [];
    if (headingBoxes.length > 0 && clonedParentHeight > 0) {
      const scaleY = canvasHeight / clonedParentHeight;
      canvasHeadingBoxes = headingBoxes.map((h) => ({
        top: Math.round(h.top * scaleY),
        bottom: Math.round(h.bottom * scaleY),
      }));
    } else if (fallbackHeadingBoxes.length > 0) {
      canvasHeadingBoxes = fallbackHeadingBoxes.map((h) => ({
        top: Math.round(h.top * canvasHeight),
        bottom: Math.round(h.bottom * canvasHeight),
      }));
    }

    // Convert Section II (Kisi-Kisi), Section III (Naskah Soal) & Section IV (Kunci Jawaban) into canvas coordinates
    let canvasKisiKisiY: number | null = null;
    if (kisiKisiTop !== null && clonedParentHeight > 0) {
      canvasKisiKisiY = Math.round(kisiKisiTop * (canvasHeight / clonedParentHeight));
    } else if (fallbackKisiKisiRatio !== null) {
      canvasKisiKisiY = Math.round(fallbackKisiKisiRatio * canvasHeight);
    }

    let canvasNaskahSoalY: number | null = null;
    if (naskahSoalTop !== null && clonedParentHeight > 0) {
      canvasNaskahSoalY = Math.round(naskahSoalTop * (canvasHeight / clonedParentHeight));
    } else if (fallbackNaskahSoalRatio !== null) {
      canvasNaskahSoalY = Math.round(fallbackNaskahSoalRatio * canvasHeight);
    }

    let canvasKunciJawabanY: number | null = null;
    if (kunciJawabanTop !== null && clonedParentHeight > 0) {
      canvasKunciJawabanY = Math.round(kunciJawabanTop * (canvasHeight / clonedParentHeight));
    } else if (fallbackKunciJawabanRatio !== null) {
      canvasKunciJawabanY = Math.round(fallbackKunciJawabanRatio * canvasHeight);
    }

    // Explicit queue of section break targets that must start at the top of a new sheet
    interface SectionBreakTarget {
      id: string;
      y: number;
    }
    const sectionBreakQueue: SectionBreakTarget[] = [];
    // If Section II (Kisi-Kisi) exists, ensure it starts on a clean sheet (Page 2)
    // so Page 1 contains Kop Dokumen & Tabel Identitas with elegant bottom margin,
    // and the Kisi-Kisi table header is never chopped or stranded at the bottom of Page 1!
    if (canvasKisiKisiY !== null && canvasKisiKisiY > 180) {
      sectionBreakQueue.push({ id: 'kisi-kisi', y: canvasKisiKisiY });
    }
    if (canvasNaskahSoalY !== null) {
      sectionBreakQueue.push({ id: 'naskah-soal', y: canvasNaskahSoalY });
    }
    // Catatan: Bagian IV Kunci Jawaban & Pembahasan sengaja tidak dipaksa selalu pindah halaman baru,
    // agar mengalir wajar ke lembar sebelumnya jika masih ada ruang kosong,
    // dan dijaga agar tidak terpisah dari sub-bagiannya oleh canvasHeadingBoxes.
    sectionBreakQueue.sort((a, b) => a.y - b.y);

    // Maximum height per page slice in canvas pixels:
    const targetContentCanvasHeight = Math.round(canvasWidth * (maxContentHeightMm / contentWidthMm));

    // Initialize jsPDF (Portrait, A4)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Document metadata
    pdf.setProperties({
      title: filename,
      subject: 'Dokumen Perangkat Pembelajaran Resmi',
      creator: 'Sistem Pembelajaran Mendalam - Kurikulum Merdeka',
      author: 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
    });

    const ctx = canvas.getContext('2d');
    const searchWindow = Math.round(targetContentCanvasHeight * 0.18);

    // Plan page slices with smart whitespace scanning, table protection & heading keep-together
    interface PageSlice {
      startY: number;
      height: number;
    }

    const pageSlices: PageSlice[] = [];
    let currentY = 0;

    while (currentY < canvasHeight) {
      const remainingHeight = canvasHeight - currentY;
      let sliceHeight: number;
      let nextY: number;

      // Check if a section break (e.g. III. Naskah Soal or IV. Kunci Jawaban)
      // falls within the reach of this page:
      const maxPageReachY = Math.min(canvasHeight, currentY + targetContentCanvasHeight);
      // Extended reach: allow bottom margin to flex (up to ~25mm / 220px) if a table immediately precedes the section break
      // so the table finishes 100% complete on this page without stranding orphan rows:
      const extendedPageReachY = Math.min(canvasHeight, currentY + targetContentCanvasHeight + 220);

      const nextBreakIdx = sectionBreakQueue.findIndex((sb) => {
        if (sb.y <= currentY + 60) return false;
        if (sb.y <= maxPageReachY) return true;
        // If within extended reach, check if any table ends near sb.y
        if (sb.y <= extendedPageReachY) {
          const hasPrecedingTable = canvasTableBoxes.some(
            (tbl) => tbl.bottom <= sb.y + 40 && tbl.bottom >= sb.y - 600
          );
          if (hasPrecedingTable) return true;
        }
        return false;
      });

      if (nextBreakIdx !== -1) {
        const sb = sectionBreakQueue[nextBreakIdx];
        // Consume this and all preceding section breaks from the queue so they never fire again:
        sectionBreakQueue.splice(0, nextBreakIdx + 1);

        // Find any table that immediately precedes this section (e.g., Kisi-Kisi Soal table before Section III):
        const precedingTable = canvasTableBoxes
          .filter((tbl) => tbl.bottom <= sb.y + 40 && tbl.bottom >= sb.y - 500)
          .sort((a, b) => b.bottom - a.bottom)[0];

        // Use pixel-level canvas scanning to find the exact white gap between the preceding table and the section heading:
        const { cleanCutY: gapCutY, nextPageStartY: gapNextY } = findSectionBreakGap(
          ctx,
          canvasWidth,
          canvasHeight,
          sb.y,
          precedingTable?.bottom
        );

        let cleanCutY = gapCutY;

        // Table Bottom Protection: Never allow cleanCutY to cut into any table's bottom border danger zone
        for (const tbl of canvasTableBoxes) {
          if (cleanCutY >= tbl.bottom - 22 && cleanCutY <= tbl.bottom + 4) {
            cleanCutY = tbl.bottom + 10;
          }
        }

        // Safety clamp: Ensure cleanCutY always advances past currentY
        if (cleanCutY <= currentY + 40) {
          cleanCutY = Math.max(currentY + 50, sb.y - 12);
        }

        // CRITICAL: cleanCutY MUST NEVER encroach upon the section break heading sb.y!
        if (cleanCutY >= sb.y - 6) {
          cleanCutY = sb.y - 8;
        }

        // CRITICAL: nextY MUST ALWAYS start strictly right at the section heading (sb.y - 6),
        // completely skipping all post-table whitespace/residue. This guarantees that bottom borders
        // of preceding tables (e.g. Kisi-Kisi) NEVER leak or cross over to the next page!
        nextY = Math.max(cleanCutY + 4, sb.y - 6);

        sliceHeight = cleanCutY - currentY;
      } else if (remainingHeight <= targetContentCanvasHeight) {
        // Remaining content (including complete signature) fits comfortably on this page
        sliceHeight = remainingHeight;
        nextY = currentY + sliceHeight;
      } else {
        const rawTargetY = currentY + targetContentCanvasHeight;
        let cleanCutY = findCleanSlicePoint(ctx, canvasWidth, rawTargetY, searchWindow);

        // 1. TABLE INTEGRITY & ROW PROTECTION:
        // A. If any table can finish on this page with flexible bottom margin (up to 180px extension), complete it!
        for (const tbl of canvasTableBoxes) {
          if (tbl.top >= currentY - 10 && tbl.bottom <= currentY + targetContentCanvasHeight + 180) {
            if (cleanCutY >= tbl.top && cleanCutY <= tbl.bottom + 8) {
              cleanCutY = tbl.bottom + 10;
            }
          }
        }

        // B. Row Protection: NEVER cut across cells of any table row (prevents truncated text and missing bottom borders)
        for (const row of canvasTableRowBoxes) {
          if (cleanCutY > row.top && cleanCutY < row.bottom) {
            if (row.isLastInTable && row.bottom + 8 <= currentY + targetContentCanvasHeight + 180) {
              cleanCutY = row.bottom + 10;
            } else if (row.bottom + 4 <= currentY + targetContentCanvasHeight + 45) {
              cleanCutY = row.bottom + 3;
            } else {
              cleanCutY = Math.max(currentY + 60, row.top - 2);
            }
            break;
          }
        }

        // C. Table Header Protection: Never strand only the table header (or header + 1 row) at the bottom of a page
        for (const tbl of canvasTableBoxes) {
          if (tbl.top > currentY + 120 && tbl.bottom > currentY + targetContentCanvasHeight) {
            if (cleanCutY >= tbl.top - 25 && cleanCutY <= tbl.top + 95) {
              const cutBefore = findCleanSlicePoint(ctx, canvasWidth, tbl.top - 10, Math.min(80, Math.round(searchWindow * 0.5)));
              cleanCutY = Math.min(tbl.top - 8, cutBefore);
            }
          }
        }

        // 2. HEADING ORPHAN PROTECTION (Keep Heading with its Content):
        // A section heading (e.g. IV. Kunci Jawaban) must NEVER be stranded at the bottom of a page
        // with little to no content following it!
        for (const hd of canvasHeadingBoxes) {
          if (cleanCutY >= hd.top - 15 && cleanCutY <= hd.bottom + 85) {
            const cutBefore = findCleanSlicePoint(ctx, canvasWidth, hd.top - 6, Math.min(60, Math.round(searchWindow * 0.4)));
            cleanCutY = Math.min(hd.top - 4, cutBefore);
            break;
          }
        }

        // 3. SIGNATURE BLOCK & AVOID-BREAK ENFORCEMENT:
        // Ensures the signature block (Mengetahui, Tanggal, Jabatan, Ruang TTD, Nama, NIP)
        // is NEVER broken across 2 separate pages.
        for (const box of canvasAvoidBoxes) {
          if (box.top >= currentY - 5) {
            const boxFitsOnThisPage = box.bottom <= currentY + targetContentCanvasHeight;
            const cutInsideBox = cleanCutY > box.top && cleanCutY < box.bottom;
            const boundaryCrossesBox = box.top < rawTargetY && box.bottom > rawTargetY;

            if (!boxFitsOnThisPage && (boundaryCrossesBox || cutInsideBox)) {
              // Push the ENTIRE signature block to the next page by cutting cleanly before it
              const cutBefore = findCleanSlicePoint(ctx, canvasWidth, box.top - 8, Math.round(searchWindow * 0.7));
              cleanCutY = Math.min(box.top - 5, cutBefore);
              break;
            } else if (boxFitsOnThisPage && cutInsideBox) {
              // Signature block fits on this page, keep it together
              const cutAfter = findCleanSlicePoint(ctx, canvasWidth, rawTargetY, Math.round(searchWindow * 0.5));
              if (cutAfter >= box.bottom) {
                cleanCutY = cutAfter;
              } else {
                cleanCutY = Math.min(canvasHeight, box.bottom + 8);
              }
              break;
            }
          }
        }

        // Safety clamp: Ensure cleanCutY always advances significantly past currentY
        if (cleanCutY <= currentY + 120) {
          cleanCutY = Math.min(canvasHeight, currentY + targetContentCanvasHeight);
        }

        sliceHeight = cleanCutY - currentY;
        nextY = currentY + sliceHeight;
      }

      pageSlices.push({ startY: currentY, height: sliceHeight });
      currentY = nextY;
    }

    // Render slices onto jsPDF pages (Strictly skip any blank or empty pages)
    let pageIndex = 0;
    for (let i = 0; i < pageSlices.length; i++) {
      const { startY, height: sliceHeight } = pageSlices[i];

      // Skip slices that are too small (< 45px)
      if (sliceHeight < 45) continue;

      // Create slice canvas for this page
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvasWidth;
      sliceCanvas.height = Math.round(sliceHeight);
      const sliceCtx = sliceCanvas.getContext('2d');

      if (sliceCtx) {
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0,
          startY,
          canvasWidth,
          sliceHeight,
          0,
          0,
          canvasWidth,
          sliceHeight
        );

        // Secondary safeguard: Ensure the top edge of any subsequent page (page 2+)
        // does not have an orphan 1-6px horizontal line artifact separated by white space
        // before actual text content starts (e.g. Kisi-Kisi table bottom border residue):
        if (pageIndex > 0 && sliceCanvas.height > 80) {
          try {
            const scanTopRows = Math.min(60, Math.floor(sliceCanvas.height / 4));
            const topData = sliceCtx.getImageData(0, 0, sliceCanvas.width, scanTopRows).data;
            const xS = Math.round(sliceCanvas.width * 0.05);
            const xE = Math.round(sliceCanvas.width * 0.95);

            // Find if there is dark pixel activity in the first 0-35 rows
            let darkLineStart = -1;
            for (let y = 0; y <= Math.min(35, scanTopRows - 12); y++) {
              const rowOff = y * sliceCanvas.width * 4;
              let darks = 0;
              for (let x = xS; x < xE; x += 4) {
                const p = rowOff + x * 4;
                if (topData[p + 3] > 25 && (topData[p] < 235 || topData[p + 1] < 235 || topData[p + 2] < 235)) {
                  darks++;
                  if (darks >= 3) break;
                }
              }
              if (darks >= 3) {
                darkLineStart = y;
                break;
              }
            }

            if (darkLineStart >= 0) {
              // Check thickness of this top dark feature
              let darkLineEnd = darkLineStart;
              for (let y = darkLineStart + 1; y < scanTopRows; y++) {
                const rowOff = y * sliceCanvas.width * 4;
                let darks = 0;
                for (let x = xS; x < xE; x += 4) {
                  const p = rowOff + x * 4;
                  if (topData[p + 3] > 25 && (topData[p] < 235 || topData[p + 1] < 235 || topData[p + 2] < 235)) {
                    darks++;
                    if (darks >= 3) break;
                  }
                }
                if (darks >= 3) {
                  darkLineEnd = y;
                } else {
                  break;
                }
              }

              const lineThickness = darkLineEnd - darkLineStart + 1;
              // A table bottom border line (or ticks) is 1-6 pixels thick
              if (lineThickness <= 6) {
                // Check if there is a gap of at least 5 white rows right after it
                let whiteGapCount = 0;
                for (let y = darkLineEnd + 1; y < scanTopRows; y++) {
                  const rowOff = y * sliceCanvas.width * 4;
                  let darks = 0;
                  for (let x = xS; x < xE; x += 4) {
                    const p = rowOff + x * 4;
                    if (topData[p + 3] > 25 && (topData[p] < 235 || topData[p + 1] < 235 || topData[p + 2] < 235)) {
                      darks++;
                      if (darks >= 3) break;
                    }
                  }
                  if (darks < 3) {
                    whiteGapCount++;
                  } else {
                    break;
                  }
                }

                if (whiteGapCount >= 5) {
                  // Wipe the orphan border artifact clean to pure white
                  sliceCtx.fillStyle = '#ffffff';
                  sliceCtx.fillRect(0, 0, sliceCanvas.width, darkLineEnd + 2);
                }
              }
            }
          } catch {
            // Safe fallback - non-blocking
          }
        }
      }

      // Check if slice is visually blank - NEVER add empty blank pages to the PDF!
      if (isSliceVisuallyBlank(sliceCanvas)) {
        continue;
      }

      // Convert page canvas to high-quality compressed JPEG (pure raster photo)
      const pageImgData = sliceCanvas.toDataURL('image/jpeg', 0.94);

      // Add new page to PDF only when non-empty content is confirmed
      if (pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pageIndex++;

      // Proportional height of this slice in mm on the PDF page
      const sliceHeightMm = (sliceHeight / canvasWidth) * contentWidthMm;

      // Add image to A4 page with safe official margins
      pdf.addImage(
        pageImgData,
        'JPEG',
        leftMarginMm,
        topMarginMm,
        contentWidthMm,
        sliceHeightMm,
        undefined,
        'FAST'
      );
    }

    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Selesai!',
    });

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);

    return true;
  } catch (err) {
    console.error('PDF export error:', err);
    // Last-ditch emergency fallback to window.print if environment blocked canvas completely
    try {
      window.print();
      return true;
    } catch {
      return false;
    }
  }
}
