/**
 * Utility to strip/hide the ASCII tree / summary box "ALUR PEMBELAJARAN MENDALAM"
 * that may appear at the bottom of section D (Pengalaman Belajar) in RPPM documents.
 */
export function removeAlurPembelajaranDiagram(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // 1. Remove markdown code blocks containing ALUR PEMBELAJARAN or tree symbols / [KEGIATAN AWAL
  cleaned = cleaned.replace(
    /```[a-zA-Z]*\s*\n[\s\S]*?(?:ALUR PEMBELAJARAN|├──|└──|├─|└─|\[KEGIATAN (?:AWAL|INTI|PENUTUP))[\s\S]*?```/gi,
    ''
  );

  // 2. Remove plain-text block starting with "ALUR PEMBELAJARAN" up until next major markdown header (e.g. ## E. Asesmen) or separator (---)
  cleaned = cleaned.replace(
    /(?:^|\n)(?:#{1,6}\s*)?[*_~`]*ALUR PEMBELAJARAN(?: MENDALAM)?[^:\n]*:?[*_~`]*\s*(?:\([^\)\n]*\))?:?\s*\n(?:[ \t]*(?:[├──└──├─└─│\[\]\-•*].*|[A-Za-z0-9()\/&:,"\->].*)\n?)*(?=\n*(?:#{1,4}\s+E\.|\n*---|##|\z))/gi,
    '\n\n'
  );

  // 3. Remove standalone blocks with [KEGIATAN AWAL...] followed by branch lines
  cleaned = cleaned.replace(
    /(?:^|\n)\[KEGIATAN (?:AWAL|PENDAHULUAN)[^\]]*\][\s\S]*?(?:(?:└──|└─)[^\n]*\n?)(?=\n*(?:#{1,4}\s+E\.|\n*---|##|\z))/gi,
    '\n\n'
  );

  // 4. Remove any remaining single lines with tree branch glyphs or bracketed alur tags
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*(?:├──|└──|├─|└─|│)[^\n]*/g, '');

  // 5. Normalize spacing (no more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Utility to strip/hide the ASCII border box / monospace code block that may
 * appear under "Stimulus Kontekstual" in LKPD documents.
 */
export function removeLkpdStimulusBox(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // 1. Remove markdown code blocks containing ASCII borders (+---) or stimulus story box
  cleaned = cleaned.replace(
    /```[a-zA-Z]*\s*\n[\s\S]*?(?:\+[ \t]*[-=]{4,}|PROYEK ROBOT|Robot Cerdas|Stimulus Kontekstual)[\s\S]*?```/gi,
    ''
  );

  // 2. Remove plain-text ASCII box starting with +---- and ending with +---- (with single or double bottom borders)
  cleaned = cleaned.replace(
    /(?:^|\n)[ \t]*\+[-=]{4,}\+?[\s\S]*?\+[-=]{4,}\+?[^\n]*(?:\n[ \t]*\+[-=]{4,}\+?[^\n]*)*/gi,
    '\n\n'
  );

  // 3. Remove any block under Stimulus Kontekstual that has ASCII border lines (+--- or non-table | pipes)
  // up until the next section (--- or ## Bagian 1)
  cleaned = cleaned.replace(
    /((?:##{1,3}\s*[^#\n]*Stimulus Kontekstual[^\n]*\n+))[\s\S]*?(?=\n*(?:---|##\s*[^#\n]*Bagian 1|\z))/gi,
    (fullMatch, headingMatch) => {
      // Check if this stimulus section contains an ASCII box (+--- or lines with leading |)
      if (/\+[-=]{4,}/.test(fullMatch) || /(?:^[ \t]*\|[^\n]*\n){2,}/m.test(fullMatch)) {
        return headingMatch.trimEnd() + '\n\n';
      }
      return fullMatch;
    }
  );

  // 4. Remove standalone single lines with +-------
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*\+[-=]{4,}\+?[^\n]*/g, '');

  // 5. If "Stimulus Kontekstual" heading is now empty before divider / Bagian 1, clean it up cleanly
  cleaned = cleaned.replace(
    /(?:##{1,3}\s*[^#\n]*Stimulus Kontekstual[^\n]*\n+)[ \t]*(?:---\n+)+(?=\s*##)/gi,
    '---\n\n'
  );

  // 6. Normalize spacing
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Replaces occurrences of "peserta didik" (case-insensitive, with variations and suffixes like -nya)
 * with "murid", particularly for RPPM documents.
 */
export function replacePesertaDidikWithMurid(text: string): string {
  if (!text) return '';
  return text.replace(/\bpeserta[\s-]+didik(nya)?\b/gi, (match, nya) => {
    const hasNya = Boolean(nya);
    if (match === match.toUpperCase()) {
      return hasNya ? 'MURIDNYA' : 'MURID';
    }
    if (match[0] === 'P') {
      return hasNya ? 'Muridnya' : 'Murid';
    }
    return hasNya ? 'muridnya' : 'murid';
  });
}

/**
 * Formats Fase and Kelas for Kop Soal, e.g.:
 * "Fase B (Kelas 4)" -> "B / 4 (Empat)"
 * "Fase A (Kelas 1)" -> "A / 1 (Satu)"
 * "Fase C (Kelas 5)" -> "C / 5 (Lima)"
 * "Fase D (Kelas 7)" -> "D / 7 (Tujuh)"
 */
export function formatFaseKelasKop(faseKelas?: string): string {
  if (!faseKelas || typeof faseKelas !== 'string') return 'B / 4 (Empat)';

  const trimmed = faseKelas.trim();
  const digitWords: Record<string, string> = {
    '1': 'Satu',
    '2': 'Dua',
    '3': 'Tiga',
    '4': 'Empat',
    '5': 'Lima',
    '6': 'Enam',
    '7': 'Tujuh',
    '8': 'Delapan',
    '9': 'Sembilan',
    '10': 'Sepuluh',
    '11': 'Sebelas',
    '12': 'Dua Belas',
  };

  const kelasToFase: Record<string, string> = {
    '1': 'A',
    '2': 'A',
    '3': 'B',
    '4': 'B',
    '5': 'C',
    '6': 'C',
    '7': 'D',
    '8': 'D',
    '9': 'D',
    '10': 'E',
    '11': 'F',
    '12': 'F',
  };

  // If already in target format like "B / 4 (Empat)"
  if (/^[A-Fa-f]\s*\/\s*\d+\s*\([^)]+\)$/.test(trimmed)) {
    return trimmed;
  }

  // Extract Fase letter if present (e.g. "Fase B", "Fase A", "B", "A")
  const faseMatch = trimmed.match(/\b(?:Fase\s+)?([A-Fa-f])\b/i);
  let faseLetter = faseMatch ? faseMatch[1].toUpperCase() : '';

  // Extract class number if present (e.g. "Kelas 4", "Kelas 4 SD", "4")
  const kelasMatch = trimmed.match(/(?:Kelas\s*)?(\d{1,2})\b/i);
  const kelasNum = kelasMatch ? kelasMatch[1] : '';

  if (!faseLetter && kelasNum && kelasToFase[kelasNum]) {
    faseLetter = kelasToFase[kelasNum];
  }

  if (faseLetter && kelasNum) {
    const spelled = digitWords[kelasNum] ? ` (${digitWords[kelasNum]})` : '';
    return `${faseLetter} / ${kelasNum}${spelled}`;
  }

  if (kelasNum) {
    const spelled = digitWords[kelasNum] ? ` (${digitWords[kelasNum]})` : '';
    return `${kelasNum}${spelled}`;
  }

  if (faseLetter) {
    return `Fase ${faseLetter}`;
  }

  return trimmed;
}

/**
 * Utility to clean unwanted LaTeX math artifacts ($$\text, \frac, \times)
 * and HTML tags (<br>, <br/>, </br>) from generated documents.
 */
export function cleanLatexAndHtmlTags(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // 1. Process LaTeX math blocks like:
  // $$\text{Nilai Akhir} = \frac{\text{Skor yang Diperoleh}}{\text{Skor Maksimal}} \times 100$$
  // Convert LaTeX fractions: \frac{num}{den} -> (num / den)
  for (let iter = 0; iter < 4; iter++) {
    cleaned = cleaned.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  }

  // Convert \text{...}, \mathrm{...}, \mathbf{...}
  for (let iter = 0; iter < 4; iter++) {
    cleaned = cleaned.replace(/\\(?:text|mathrm|mathbf|mathit|textrm)\{([^{}]+)\}/g, '$1');
  }

  // Convert common LaTeX math operators and symbols
  cleaned = cleaned
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\pm\b/g, '±')
    .replace(/\\left\s*\(/g, '(')
    .replace(/\\right\s*\)/g, ')')
    .replace(/\\left\s*\[/g, '[')
    .replace(/\\right\s*\]/g, ']')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈');

  // Strip math block delimiters $$ ... $$
  cleaned = cleaned.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_match, p1) => {
    return p1.trim();
  });

  // Strip single $ ... $ if it contains text or equals
  cleaned = cleaned.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_match, p1) => {
    return p1.trim();
  });

  // Remove any leftover stray \text, $$, \displaystyle, etc.
  cleaned = cleaned.replace(/\$\$\\text/gi, '');
  cleaned = cleaned.replace(/\$\$/g, '');
  cleaned = cleaned.replace(/\\text\{?/gi, '');
  cleaned = cleaned.replace(/\\displaystyle\b/gi, '');

  // 2. Clean HTML <br> tags:
  // First, convert any <br> between table rows or at pipe boundaries into true newlines
  cleaned = cleaned.replace(/\|\s*<br\s*\/?>\s*\|/gi, '|\n|');
  cleaned = cleaned.replace(/\|\s*<br\s*\/?>\s*$/gm, '|');
  cleaned = cleaned.replace(/\|\s*<br\s*\/?>\s*(?=[0-9A-Za-z\:\-\|])/gi, '|\n');
  cleaned = cleaned.replace(/<br\s*\/?>\s*\|/gi, '\n|');

  // Inside table lines (lines containing |)
  cleaned = cleaned.replace(/(^\|.*$)/gm, (tableLine) => {
    // If this table line is part of signature block or identity block, preserve it
    if (/(?:Mengetahui|Kepala|Guru|NIP\b|Tanda Tangan|Nama Satuan Pendidikan|Kelompok \/ Nama Anggota|Informasi)/i.test(tableLine)) {
      return tableLine;
    }
    let line = tableLine;
    // Remove repeated <br> like <br><br><br>
    line = line.replace(/(?:<br\s*\/?>\s*){2,}/gi, ' ');
    // In table cells, replace `<br>**Name**` or `<br>NIP.` with proper spacing
    line = line.replace(/<br\s*\/?>\s*(?=\*\*|NIP\b|Kepala\b|Guru\b)/gi, ', ');
    // Replace any remaining <br> in table cells with space or comma
    line = line.replace(/,\s*<br\s*\/?>/gi, ', ');
    line = line.replace(/<br\s*\/?>/gi, ' ');
    // Clean up multiple spaces inside cells
    line = line.replace(/[ \t]{2,}/g, ' ');
    return line;
  });

  // Outside tables:
  // Convert double/multiple <br> to double newlines (paragraphs)
  cleaned = cleaned.replace(/(?:<br\s*\/?>\s*){2,}/gi, '\n\n');
  // Convert single <br> to newline
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  // Remove closing or malformed </br>
  cleaned = cleaned.replace(/<\/?br\s*>/gi, '');

  // 3. Clean other stray HTML tags that may clutter the text
  cleaned = cleaned.replace(/<\/?(?:span|div|p)\b[^>]*>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 4. Normalize excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Extracts and restores question headers (e.g. "**Soal Nomor X**") and section headers
 * (e.g. "## IV. Kunci Jawaban...", "### Bagian X") that accidentally got trapped inside table cells or rows.
 * Prevents subsequent questions or answer keys from leaking into Benar/Salah question tables.
 */
export function extractLeakedHeadingsAndQuestionsFromTables(content: string): string {
  if (!content || !content.includes('|')) return content;

  const lines = content.split('\n');
  const output: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isPipeLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;

    if (!isPipeLine) {
      output.push(line);
      continue;
    }

    // Check if this line itself is NOT a legitimate table row, but an entire header enclosed in pipes
    // e.g. "| **Soal Nomor 4** |" or "| Soal Nomor 4 |" or "| ## IV. Kunci Jawaban... |"
    const isEntireLineQuestion = /^\|\s*(?:#{1,4}\s*)?(?:\*{1,2})?(?:Soal\s*(?:Nomor|No\.?)?\s*(\d+)|Butir\s*Soal\s*(\d+))(?:\*{1,2})?[:\s*]*(?:\|\s*)*$/i.test(trimmed);
    const isEntireLineHeading = /^\|\s*(?:#{1,4}\s*)?(?:(?:IV\.|Bagian\s+[A-Z]\b|1\.\s+Kunci\s+Jawaban|Kunci\s+Jawaban\s*(?:dan\s+Pembahasan|,\s*Pembahasan)?|Pedoman\s*Penskoran))[^|]*(?:\|\s*)*$/i.test(trimmed);

    if (isEntireLineQuestion) {
      const qMatch = trimmed.match(/(?:Soal\s*(?:Nomor|No\.?)?\s*(\d+)|Butir\s*Soal\s*(\d+))/i);
      const qNum = qMatch ? (qMatch[1] || qMatch[2]) : '';
      output.push('');
      output.push(`**Soal Nomor ${qNum}**`);
      output.push('');
      continue;
    }

    if (isEntireLineHeading) {
      const cleanHeading = trimmed.replace(/^\|\s*/, '').replace(/\s*\|+$/, '').trim();
      const formatted = cleanHeading.startsWith('#') ? cleanHeading : `## ${cleanHeading}`;
      output.push('');
      output.push(formatted);
      output.push('');
      continue;
    }

    // Now inspect cells within the table row to see if a cell was contaminated with a question or heading
    const cells = trimmed.split('|').slice(1, -1);
    let leakedQuestionIndex = -1;
    let leakedHeadingIndex = -1;
    let leakedMatch: RegExpMatchArray | null = null;
    let targetCellIdx = -1;

    for (let c = 0; c < cells.length; c++) {
      const cellText = cells[c];
      // Check for question header inside cell
      const qMatch = cellText.match(/(?:^|\n|[ \t]+)(?:#{1,4}\s*)?(?:\*{1,2})?(?:Soal\s*(?:Nomor|No\.?)?\s*(\d+)|Butir\s*Soal\s*(\d+))(?:\*{1,2})?[:\s*]*/i);
      if (qMatch && qMatch.index !== undefined) {
        leakedQuestionIndex = qMatch.index;
        leakedMatch = qMatch;
        targetCellIdx = c;
        break;
      }
      // Check for section heading (e.g. "## IV. Kunci Jawaban" or "Kunci Jawaban dan Pembahasan")
      const hMatch = cellText.match(/(?:^|\n|[ \t]+)(?:#{1,4}\s*)?(?:IV\.\s*Kunci\s*Jawaban|Kunci\s*Jawaban\s*(?:dan\s+Pembahasan|,\s*Pembahasan)?|Pedoman\s*Penskoran|###?\s*Bagian\s+[A-Z]\b)/i);
      if (hMatch && hMatch.index !== undefined) {
        leakedHeadingIndex = hMatch.index;
        leakedMatch = hMatch;
        targetCellIdx = c;
        break;
      }
    }

    if (leakedMatch && targetCellIdx >= 0) {
      const rawCell = cells[targetCellIdx];
      const matchIdx = leakedQuestionIndex !== -1 ? leakedQuestionIndex : leakedHeadingIndex;
      const textBefore = rawCell.slice(0, matchIdx).trim();
      const leakedText = rawCell.slice(matchIdx).trim();

      // Check if textBefore has a substantive statement (e.g. "Pernyataan 4")
      const hasPrecedingContent = textBefore.length > 3 && !/^(?:\d+\.?|[A-Za-z]\.?)$/.test(textBefore);

      if (hasPrecedingContent) {
        // Keep the clean row with textBefore
        cells[targetCellIdx] = ` ${textBefore} `;
        output.push(`| ${cells.join(' | ')} |`);
      }

      // Close the table and emit the leaked question or heading cleanly outside
      output.push('');

      if (leakedQuestionIndex !== -1) {
        const qNum = leakedMatch[1] || leakedMatch[2] || '';
        let afterQText = leakedText.slice(leakedMatch[0].length).trim();
        // If "Stimulus:" immediately follows, format nicely
        if (/^[*_~`]*Stimulus[:\s]*/i.test(afterQText)) {
          afterQText = afterQText.replace(/^[*_~`]*Stimulus[:\s]*[*_~`]*/i, '').trim();
          output.push(`**Soal Nomor ${qNum}**`);
          output.push('');
          output.push('*Stimulus:*');
          if (afterQText) output.push(afterQText);
        } else {
          output.push(`**Soal Nomor ${qNum}**`);
          if (afterQText) {
            output.push('');
            output.push(afterQText);
          }
        }
      } else {
        // Leaked heading
        let hText = leakedText;
        if (!hText.startsWith('#')) {
          hText = `## ${hText}`;
        }
        output.push(hText);
      }

      output.push('');
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

/**
 * Utility to detect, repair, and format Markdown tables in documents.
 * Fixes:
 * 1. Accidental concatenation of rows on a single line.
 * 2. Missing Markdown separator rows (| :---: | :--- | ...).
 * 3. Section headings right above tables (e.g. "1. Tabel Rancangan & Teknik Asesmen").
 * 4. Ensures clean blank lines before and after tables to prevent CommonMark/GFM table parser bleed.
 * 5. Extracts any questions or answer keys that leaked into table rows.
 */
export function repairAndNormalizeMarkdownTables(content: string): string {
  if (!content) return '';

  let text = content;

  // 0. Extract any leaked question or heading lines from tables first
  text = extractLeakedHeadingsAndQuestionsFromTables(text);

  // 1. Convert <br> at pipe boundaries into actual newlines first
  text = text.replace(/\|\s*<br\s*\/?>\s*\|/gi, '|\n|');
  text = text.replace(/\|\s*<br\s*\/?>\s*$/gm, '|');
  text = text.replace(/\|\s*<br\s*\/?>\s*(?=[0-9A-Za-z\:\-\|])/gi, '|\n');
  text = text.replace(/<br\s*\/?>\s*\|/gi, '\n|');

  // 2. Format section headers preceding tables like "1. Tabel Rancangan & Teknik Asesmen"
  text = text.replace(
    /(?:^|\n)[ \t]*(?:#{1,4}\s*)?([1-9]\.\s+Tabel\s+[^\n]+)/gi,
    '\n\n### $1\n\n'
  );

  // 3. Split rows that are accidentally joined on the SAME line:
  // e.g. "... | 10 | | 2 | Uraian ..."
  // MUST only match on the SAME line (using [ \t], NEVER \s which crosses newlines!)
  // and MUST only split when followed by a new row number/item, NEVER empty table cells!
  text = text.replace(/(\|[ \t]*[^\n|]+[ \t]*\|)[ \t]*\|[ \t]*\|[ \t]*(?=(?:\d+|[A-Za-z]\.)\s*\|)/g, '$1\n| ');
  text = text.replace(/(\|[ \t]*[^\n|]+[ \t]*\|)[ \t]*\|\|[ \t]*(?=(?:\d+|[A-Za-z]\.)\s*\|)/g, '$1\n| ');

  // 4. Ensure a blank line before any table block following non-table text
  text = text.replace(/([^\n|])\n[ \t]*(\|(?!\s*(?:Nama Satuan|Kelompok))[^\n]+\|)/g, '$1\n\n$2');

  // 5. Line-by-line inspection to verify and insert missing separator rows (| :---: | :--- | ...)
  // Also drops any duplicate consecutive separator rows so (:---:) never leaks into the table body
  const rawLines = text.split('\n');
  const processedLines: string[] = [];
  let inTable = false;
  let hasSeparatorRow = false;
  let tableHeaderCols = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    const isPipeLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;

    if (isPipeLine) {
      if (!inTable) {
        // First row of a table (Header)
        inTable = true;
        hasSeparatorRow = false;
        const cols = trimmed.split('|').slice(1, -1);
        tableHeaderCols = cols.length;
        processedLines.push(line);

        // Check if the next line is already a separator row
        const nextLine = rawLines[i + 1] ? rawLines[i + 1].trim() : '';
        const isNextSeparator = nextLine.startsWith('|') && /^[\|\s:\-]+$/.test(nextLine);

        // If not a separator, and table has at least 2 columns, insert one automatically!
        if (!isNextSeparator && tableHeaderCols >= 2) {
          const sepCols = cols.map((col, idx) => {
            const hText = col.trim().toLowerCase();
            if (idx === 0 || hText === 'no' || hText === 'skor' || hText === 'no.') {
              return ':---:';
            }
            if (col.trim() === ':') {
              return ':---:';
            }
            return ':---';
          });
          processedLines.push(`| ${sepCols.join(' | ')} |`);
          hasSeparatorRow = true;
        }
      } else {
        const isCurrentSeparator = /^[\|\s:\-]+$/.test(trimmed);
        if (isCurrentSeparator) {
          if (!hasSeparatorRow) {
            hasSeparatorRow = true;
            processedLines.push(line);
          } else {
            // DUPLICATE SEPARATOR ROW! DROP IT!
            continue;
          }
        } else {
          processedLines.push(line);
        }
      }
    } else {
      inTable = false;
      hasSeparatorRow = false;
      tableHeaderCols = 0;
      processedLines.push(line);
    }
  }

  text = processedLines.join('\n');

  // 6. Prune any empty table columns that have no function or content across the entire table
  text = pruneEmptyTableColumns(text);

  // 7. Ensure blank line after table block ends before ANY regular text or heading
  text = text.replace(/(\|[^\n]+\|)\n(?=[ \t]*[^|\n])/g, '$1\n\n');

  // 8. Final check to ensure no leaked questions remain trapped in tables
  text = extractLeakedHeadingsAndQuestionsFromTables(text);

  return text;
}

/**
 * Prunes columns that are completely empty across the entire table.
 * Specifically handles cases where a 5th column or trailing column has no content or headers,
 * as requested for Pedoman Penskoran and other tables.
 */
export function pruneEmptyTableColumns(text: string): string {
  if (!text || !text.includes('|')) return text;

  const lines = text.split('\n');
  const result: string[] = [];
  let currentTableLines: string[] = [];

  const processCurrentTable = () => {
    if (currentTableLines.length === 0) return;
    if (currentTableLines.length < 2) {
      result.push(...currentTableLines);
      currentTableLines = [];
      return;
    }

    // Parse all rows into cell arrays
    const parsedRows = currentTableLines.map((line) => {
      const trimmed = line.trim();
      const rawCells = trimmed.split('|');
      // If starts and ends with |, slice(1, -1)
      const cells = rawCells.slice(1, -1).map((c) => c.trim());
      const isSep = /^[\|\s:\-]+$/.test(trimmed);
      return { line, trimmed, cells, isSep };
    });

    // Check max column count
    const maxCols = Math.max(...parsedRows.map((r) => r.cells.length));
    if (maxCols <= 1) {
      result.push(...currentTableLines);
      currentTableLines = [];
      return;
    }

    // Check which columns are completely empty across the table (ignoring separator rows)
    const emptyColIndices: number[] = [];
    for (let c = 0; c < maxCols; c++) {
      let isEntirelyEmpty = true;
      for (const row of parsedRows) {
        if (row.isSep) continue;
        const cellValue = row.cells[c] ?? '';
        // If there's any substantive text (not empty, not just &nbsp;), column is NOT empty
        const cleanedVal = cellValue.replace(/&nbsp;/gi, '').trim();
        if (cleanedVal !== '') {
          isEntirelyEmpty = false;
          break;
        }
      }
      if (isEntirelyEmpty) {
        emptyColIndices.push(c);
      }
    }

    if (emptyColIndices.length === 0) {
      result.push(...currentTableLines);
      currentTableLines = [];
      return;
    }

    // Prune the empty columns from every row!
    for (const row of parsedRows) {
      const filteredCells = row.cells.filter((_, idx) => !emptyColIndices.includes(idx));
      if (filteredCells.length === 0) {
        continue;
      }
      result.push(`| ${filteredCells.join(' | ')} |`);
    }

    currentTableLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isPipeLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;

    if (isPipeLine) {
      currentTableLines.push(line);
    } else {
      if (currentTableLines.length > 0) {
        processCurrentTable();
      }
      result.push(line);
    }
  }

  if (currentTableLines.length > 0) {
    processCurrentTable();
  }

  return result.join('\n');
}

/**
 * Normalizes wide rubric assessment tables (e.g. 7 columns) to fit cleanly
 * within standard A4 paper width (6 columns) by combining Aspek Penilaian and
 * Indikator Ketercapaian into a single well-structured column:
 * | No | Aspek & Indikator Penilaian | Baru Berkembang (1) | Layak (2) | Cakap (3) | Mahir (4) |
 */
export function normalizeRubricTables(text: string): string {
  if (!text || !text.includes('|')) return text;

  const lines = text.split('\n');
  const result: string[] = [];
  let in7ColRubric = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      in7ColRubric = false;
      result.push(line);
      continue;
    }

    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());

    // Detect header of 7-column rubric tables (such as Tabel Rubrik Penilaian Kinerja or Sikap)
    if (
      cells.length === 7 &&
      /^(?:no|no\.)$/i.test(cells[0]) &&
      /(?:aspek|dimensi|kriteria)/i.test(cells[1]) &&
      /(?:indikator|ketercapaian)/i.test(cells[2])
    ) {
      in7ColRubric = true;
      const combinedHeader = cells[1].toLowerCase().includes('dimensi')
        ? 'Dimensi & Indikator Sikap'
        : 'Aspek & Indikator Penilaian';
      result.push(`| ${cells[0]} | ${combinedHeader} | ${cells[3]} | ${cells[4]} | ${cells[5]} | ${cells[6]} |`);
      continue;
    }

    if (in7ColRubric) {
      if (/^[\|\s:\-]+$/.test(trimmed)) {
        result.push('| :---: | :--- | :--- | :--- | :--- | :--- |');
        continue;
      }
      if (cells.length === 7) {
        const cleanAspek = cells[1].replace(/^\*\*|\*\*$/g, '').trim();
        const combined = cells[2] ? `**${cleanAspek}**: ${cells[2]}` : `**${cleanAspek}**`;
        result.push(`| ${cells[0]} | ${combined} | ${cells[3]} | ${cells[4]} | ${cells[5]} | ${cells[6]} |`);
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Helper to safely extract identity field values from markdown text
 * without picking up table column boundaries (|), colons (:), or matrix table headers.
 */
export function extractIdentityField(sourceText: string, labelPattern: RegExp): string {
  if (!sourceText) return '';
  // 1. Try 3-column markdown table row: | Label | : | Value |
  const table3ColRegex = new RegExp('(?:' + labelPattern.source + ')[*_\\s]*\\|\\s*:\\s*\\|\\s*([^|\\n\\r]+)', 'i');
  const m3 = sourceText.match(table3ColRegex);
  if (m3 && m3[1].trim() && m3[1].trim() !== ':') {
    const val = m3[1].replace(/[*_]/g, '').trim();
    if (val && !/^(?:indikator|level|bentuk|keterangan)/i.test(val)) {
      return val;
    }
  }
  // 2. Try markdown table row with pipe and colon: | Label : Value | or Label : Value
  const genericRegex = new RegExp('(?:' + labelPattern.source + ')[*_\\s]*(?:\\|\\s*)?:\\s*(?:\\|\\s*)?([^|\\n\\r]+)', 'i');
  const mg = sourceText.match(genericRegex);
  if (mg && mg[1].trim() && mg[1].trim() !== ':') {
    const val = mg[1].replace(/[*_]/g, '').trim();
    if (val && !/^(?:indikator|level|bentuk|keterangan)/i.test(val)) {
      return val;
    }
  }
  return '';
}

/**
 * Normalizes and formats the Kop Identitas Kisi-Kisi table and the Kisi-Kisi
 * Penulisan Soal table to match official Indonesian school assessment blueprints:
 * 1. Generates an official 3-column borderless Kop Identitas table right under
 *    the Kisi-Kisi section heading.
 * 2. Standardizes the 7-column / 6-column Kisi-Kisi matrix table headers, cleans up
 *    overly long repetitive CP texts into concise operational concepts, and ensures
 *    compact alignment for Level Kognitif, Bentuk Soal, and No. Soal.
 */
export function normalizeKisiKisiSectionAndKop(content: string, formData?: any): string {
  if (!content || !/Kisi-Kisi/i.test(content)) return content;
  let text = content;

  // 1. Gather metadata for the Kop Identitas Kisi-Kisi safely
  const sekolah = formData?.namaSekolah || extractIdentityField(text, /Nama\s+Satuan\s+Pendidikan|Satuan\s+Pendidikan|Nama\s+Sekolah/) || 'SD Negeri 1 Merdeka';
  const guru = formData?.namaGuru || extractIdentityField(text, /Nama\s+Penyusun|Nama\s+Guru|Guru\s+Mata\s+Pelajaran/) || 'Rista Kasaraeng, S.Pd';
  const mapel = formData?.namaMapel || extractIdentityField(text, /Mata\s+Pelajaran|Mapel/) || 'Ilmu Pengetahuan Alam dan Sosial (IPAS)';

  let faseKelasSemester = '';
  if (formData?.faseKelas && formData?.semester) {
    faseKelasSemester = `${formData.faseKelas} / Semester ${formData.semester}`;
  } else {
    const extractedFks = extractIdentityField(text, /Kelas\s*\/\s*Fase\s*\/\s*Semester|Fase\s*\/\s*Kelas\s*\/\s*Semester|Kelas\s*\/\s*Fase|Fase\s*\/\s*Kelas/);
    faseKelasSemester = extractedFks || `${formData?.faseKelas || 'Fase B (Kelas 4)'} / Semester ${formData?.semester || 'Ganjil'}`;
  }

  const materi = formData?.materiPembelajaran || extractIdentityField(text, /Materi\s+Pembelajaran|Materi\s+Pokok/) || 'Metamorfosis Hewan dan Hubungan Rantai Makanan di Lingkungan Sekitar';
  const alokasi = formData?.alokasiWaktu || extractIdentityField(text, /Alokasi\s+Waktu/) || '3 JP (3 x 35 Menit)';
  const tahun = formData?.tahunPelajaran || extractIdentityField(text, /Tahun\s+Pelajaran|Tahun\s+Ajaran/) || '2025/2026';

  const rawLines = text.split('\n');

  // 2. Find Kisi-Kisi section heading and the matrix table start line
  let kisiHeaderIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    if (/^#{1,3}\s*(?:II\.|2\.)?\s*Kisi-Kisi/i.test(rawLines[i].trim())) {
      kisiHeaderIdx = i;
      break;
    }
  }

  let matrixTableStartIdx = -1;
  if (kisiHeaderIdx !== -1) {
    for (let i = kisiHeaderIdx + 1; i < rawLines.length; i++) {
      const trimmed = rawLines[i].trim();
      if (
        trimmed.startsWith('|') &&
        (/Level(?:\s*Kognitif)?/i.test(trimmed) || /Indikator(?:\s*Soal)?/i.test(trimmed)) &&
        /(?:Bentuk(?:\s*Soal)?|No\.?\s*Soal|Capaian)/i.test(trimmed)
      ) {
        matrixTableStartIdx = i;
        break;
      }
    }

    if (matrixTableStartIdx === -1) {
      for (let i = kisiHeaderIdx + 1; i < rawLines.length; i++) {
        const trimmed = rawLines[i].trim();
        if (trimmed.startsWith('|') && /^\|\s*(?:No\.?|1)\s*\|/i.test(trimmed)) {
          matrixTableStartIdx = i;
          break;
        }
      }
    }
  }

  // 3. Count question rows and tally question types from the matrix table
  const typeCounts: Record<string, number> = {};
  let rowCount = 0;
  if (matrixTableStartIdx !== -1) {
    for (let i = matrixTableStartIdx + 1; i < rawLines.length; i++) {
      const trimmed = rawLines[i].trim();
      if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
        if (trimmed === '' && i + 1 < rawLines.length && rawLines[i + 1].trim().startsWith('|')) {
          continue;
        }
        break;
      }
      if (/^[\|\s:\-]+$/.test(trimmed)) continue;
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length >= 5 && (/^\d+$/.test(cells[0]) || /^\d+$/.test(cells[cells.length - 1]))) {
        rowCount++;
        const typeCell = cells.find((c) =>
          /^(?:PG|PGK|Pilihan Ganda|Pilihan Ganda Kompleks|Isian|Isian Singkat|Uraian|Esai|Benar\s*\/?\s*Salah|Menjodohkan)$/i.test(c)
        );
        if (typeCell) {
          let norm = 'PG';
          if (/Kompleks|PGK/i.test(typeCell)) norm = 'PGK';
          else if (/Isian/i.test(typeCell)) norm = 'Isian';
          else if (/Uraian|Esai/i.test(typeCell)) norm = 'Uraian';
          else if (/Benar/i.test(typeCell)) norm = 'Benar/Salah';
          else if (/Menjodohkan/i.test(typeCell)) norm = 'Menjodohkan';
          typeCounts[norm] = (typeCounts[norm] || 0) + 1;
        }
      }
    }
  }

  let jumlahBentukSoal = '';
  if (rowCount > 0) {
    const parts = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`);
    jumlahBentukSoal = parts.length > 0 ? `${rowCount} Butir (${parts.join(', ')})` : `${rowCount} Butir`;
  } else {
    const extractedJml = extractIdentityField(text, /Jumlah\s*&\s*Bentuk\s*Soal/);
    jumlahBentukSoal = extractedJml || '4 Butir (2 Isian)';
  }

  const cleanKopTable = `| Informasi Identitas | : | Keterangan |
| :--- | :---: | :--- |
| **Nama Satuan Pendidikan** | : | ${sekolah} |
| **Mata Pelajaran** | : | ${mapel} |
| **Kelas / Fase / Semester** | : | ${faseKelasSemester} |
| **Materi Pokok** | : | ${materi} |
| **Alokasi Waktu** | : | ${alokasi} |
| **Jumlah & Bentuk Soal** | : | ${jumlahBentukSoal} |
| **Tahun Pelajaran** | : | ${tahun} |
| **Nama Penyusun** | : | ${guru} |`;

  // 4. Reconstruct lines: eradicate all redundant kop tables and repeated titles between section header and matrix table
  let intermediateLines: string[] = [];
  if (kisiHeaderIdx !== -1 && matrixTableStartIdx !== -1) {
    const beforeSection = rawLines.slice(0, kisiHeaderIdx + 1);
    const middle = [
      '',
      cleanKopTable,
      '',
      '### Tabel Matriks Kisi-Kisi Penulisan Soal',
      '',
    ];

    // Filter subsequent lines to remove any stray duplicate Kop rows or redundant headers
    const afterMatrix = rawLines.slice(matrixTableStartIdx);
    const cleanedAfterMatrix: string[] = [];
    let passedNextSection = false;

    for (let i = 0; i < afterMatrix.length; i++) {
      const line = afterMatrix[i];
      const trimmed = line.trim();

      if (/^#{1,3}\s*(?:III\.|3\.)?\s*Naskah\s*Soal/i.test(trimmed)) {
        passedNextSection = true;
      }

      if (!passedNextSection) {
        // Drop any redundant "### Tabel Matriks Kisi-Kisi Penulisan Soal" duplicate heading
        if (i > 0 && /^#{1,4}\s*Tabel\s*Matriks\s*Kisi-Kisi/i.test(trimmed)) {
          continue;
        }
        // Drop any duplicate identity table rows
        if (
          trimmed.startsWith('|') &&
          /(?:Nama\s+Satuan\s+Pendidikan|Informasi\s+Identitas|Mata\s+Pelajaran\s*[:|]|Kelas\s*\/\s*Fase.*Semester|Alokasi\s+Waktu\s*[:|]|Jumlah\s*&\s*Bentuk\s*Soal|Tahun\s+Pelajaran\s*[:|]|Nama\s+Penyusun\s*[:|])/i.test(
            trimmed
          )
        ) {
          continue;
        }
        // Drop any stray 3-column separator lines
        if (/^\|\s*:\s*---\s*\|\s*:\s*---\s*:\s*\|\s*:\s*---\s*\|$/i.test(trimmed)) {
          continue;
        }
      }

      cleanedAfterMatrix.push(line);
    }

    intermediateLines = [...beforeSection, ...middle, ...cleanedAfterMatrix];
  } else {
    intermediateLines = rawLines;
  }

  // 5. Normalize and tidy up the Kisi-Kisi matrix table structure and text alignment
  const resultLines: string[] = [];
  let inKisiTable = false;
  let kisiCols = 0;

  for (let i = 0; i < intermediateLines.length; i++) {
    const line = intermediateLines[i];
    const trimmed = line.trim();

    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      inKisiTable = false;
      resultLines.push(line);
      continue;
    }

    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());

    // Detect header of Kisi-Kisi Table
    const isKisiHeader =
      cells.some((c) => /Level Kognitif/i.test(c)) &&
      cells.some((c) => /Bentuk Soal|No\.?\s*Soal/i.test(c)) &&
      cells.some((c) => /Capaian|Indikator/i.test(c));

    if (isKisiHeader) {
      inKisiTable = true;
      kisiCols = cells.length;

      if (kisiCols === 7) {
        resultLines.push('| No | Capaian Pembelajaran / Elemen | Materi Pokok | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal |');
        continue;
      } else if (kisiCols === 6) {
        resultLines.push('| No | Capaian Pembelajaran / Materi | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal |');
        continue;
      }
    }

    if (inKisiTable) {
      // Separator line
      if (/^[\|\s:\-]+$/.test(trimmed)) {
        if (kisiCols === 7) {
          resultLines.push('| :---: | :--- | :--- | :--- | :---: | :---: | :---: |');
        } else if (kisiCols === 6) {
          resultLines.push('| :---: | :--- | :--- | :---: | :---: | :---: |');
        } else {
          resultLines.push(line);
        }
        continue;
      }

      // Format data cells cleanly without cutting off any text
      if (kisiCols === 7 && cells.length === 7) {
        const no = cells[0].replace(/\*+/g, '').trim();
        const cp = cells[1].replace(/\*+/g, '').trim();
        const mat = cells[2].replace(/\*+/g, '').trim();
        const ind = cells[3].replace(/\*+/g, '').trim();
        const lvl = cells[4].replace(/\*+/g, '').trim();
        let bentuk = cells[5].replace(/\*+/g, '').trim();
        const noSoal = cells[6].replace(/\*+/g, '').trim();

        // Standardize common abbreviations for Bentuk Soal if detected
        if (/^Pilihan\s+Ganda\s+Kompleks$/i.test(bentuk)) bentuk = 'PGK';
        else if (/^Pilihan\s+Ganda$/i.test(bentuk)) bentuk = 'PG';
        else if (/^Isian\s+Singkat$/i.test(bentuk)) bentuk = 'Isian';
        else if (/^Esai$/i.test(bentuk)) bentuk = 'Uraian';
        else if (/^Benar\s*\/?\s*Salah$/i.test(bentuk)) bentuk = 'B-S';

        resultLines.push(`| ${no} | ${cp} | ${mat} | ${ind} | ${lvl} | ${bentuk} | ${noSoal} |`);
        continue;
      }

      if (kisiCols === 6 && cells.length === 6) {
        const no = cells[0].replace(/\*+/g, '').trim();
        const cpMat = cells[1].replace(/\*+/g, '').trim();
        const ind = cells[2].replace(/\*+/g, '').trim();
        const lvl = cells[3].replace(/\*+/g, '').trim();
        let bentuk = cells[4].replace(/\*+/g, '').trim();
        const noSoal = cells[5].replace(/\*+/g, '').trim();

        if (/^Pilihan\s+Ganda\s+Kompleks$/i.test(bentuk)) bentuk = 'PGK';
        else if (/^Pilihan\s+Ganda$/i.test(bentuk)) bentuk = 'PG';
        else if (/^Isian\s+Singkat$/i.test(bentuk)) bentuk = 'Isian';
        else if (/^Esai$/i.test(bentuk)) bentuk = 'Uraian';
        else if (/^Benar\s*\/?\s*Salah$/i.test(bentuk)) bentuk = 'B-S';

        resultLines.push(`| ${no} | ${cpMat} | ${ind} | ${lvl} | ${bentuk} | ${noSoal} |`);
        continue;
      }
    }

    resultLines.push(line);
  }

  return resultLines.join('\n');
}

/**
 * Utility to format and tidy up the signature block (Lembar Pengesahan)
 * at the bottom of RPPM, LKPD, and Soal/Asesmen, matching standard Indonesian official
 * school format (image 8.png):
 * 2-column borderless table:
 * Left:
 *   **Mengetahui,**
 *   **Kepala [Nama Satuan Pendidikan]**
 *   (blank space for signature)
 *   **[Nama Kepala Sekolah]**
 *   NIP. [NIP]
 * Right:
 *   **[Tempat], [Tanggal]**
 *   **[Jabatan Guru]**
 *   (blank space for signature)
 *   **[Nama Guru]**
 *   NIP. [NIP]
 */
export function normalizeSignatureBlock(content: string, formData?: any): string {
  if (!content) return '';

  // 1. Detect if there is a signature block anywhere in the content
  // Matches signature section whether preceded by ---, heading, plain table, or collapsed single-line pipes (18.png)
  const sigRegex = /(?:^|\n)[ \t]*(?:---[ \t]*\n*)?(?:#{1,4}[ \t]*(?:Lembar\s+)?(?:Pengesahan|Tanda\s*Tangan)[^\n]*\n*)?([ \t]*\|?[ \t]*(?:\*\*|__)?Mengetahui[\s\S]*?)(?=\n\s*(?:#{1,3}\s+[A-Z]|---\s*\n\s*#{1,3})|$)/i;

  const match = content.match(sigRegex);
  let rawText = '';
  let matchToReplace: string | null = null;

  if (match) {
    matchToReplace = match[0];
    rawText = match[1];
  } else {
    // Check if there is heading "Lembar Pengesahan" with table or text
    const headingMatch = content.match(/(?:^|\n)[ \t]*(?:---[ \t]*\n*)?(#{1,4}[ \t]*(?:Lembar\s+)?(?:Pengesahan|Tanda\s*Tangan)[\s\S]*)$/i);
    if (headingMatch) {
      matchToReplace = headingMatch[0];
      rawText = headingMatch[1];
    } else {
      // Check if there are lines containing Mengetahui near the bottom of document
      const textSigMatch = content.match(/(?:^|\n)[ \t]*(?:---[ \t]*\n*)?([ \t]*(?:\*\*|__)?Mengetahui[\s\S]*)$/i);
      if (textSigMatch) {
        matchToReplace = textSigMatch[0];
        rawText = textSigMatch[1];
      }
    }
  }

  if (!matchToReplace || !rawText) return content;

  // 1. Sekolah (e.g. Kepala SD Negeri Cipta Cendekia 01)
  let sekolah = formData?.namaSekolah;
  if (!sekolah) {
    const sekolahMatch =
      rawText.match(/Kepala\s+((?:SD|SMP|SMA|SMK|Satuan|Sekolah)[^|\n<]+)/i) ||
      rawText.match(/Kepala\s+([^|\n<]+?)(?=\s*(?:\||<br|\n))/i);
    sekolah = sekolahMatch ? sekolahMatch[1].replace(/[*_]/g, '').trim() : 'SD Negeri Cipta Cendekia 01';
  }
  if (sekolah.startsWith('Kepala ')) {
    sekolah = sekolah.replace(/^Kepala\s+/i, '');
  }
  const cleanSekolah = `Kepala ${sekolah}`;

  // 2. Tempat & Tanggal (e.g. Jakarta, 14 Juli 2025)
  let tempatTanggal = '';
  if (formData?.tempatTtd) {
    const tanggal = formData.tanggalTtd || '14 Juli 2025';
    tempatTanggal = `${formData.tempatTtd}, ${tanggal}`;
  } else {
    const ttMatch = rawText.match(/([A-Z][a-zA-Z\s]+,\s*(?:\d{1,2}\s+[A-Za-z]+\s+\d{4}|\.+|\d{4}))/);
    tempatTanggal = ttMatch ? ttMatch[1].replace(/[*_]/g, '').trim() : 'Jakarta, 14 Juli 2025';
  }

  // 3. Jabatan Guru (e.g. Guru Kelas)
  let guruRole = formData?.jabatan;
  if (!guruRole) {
    const roleMatch = rawText.match(/Guru\s+([A-Za-z\s]+?)(?=\s*(?:\||<br|\n|\*))/i);
    guruRole = roleMatch ? `Guru ${roleMatch[1].replace(/[*_]/g, '').trim()}` : 'Guru Kelas';
  } else if (!guruRole.startsWith('Guru')) {
    guruRole = `Guru ${guruRole}`;
  }

  // 4. Nama Kepala Sekolah & Guru
  let namaKepsek = formData?.namaKepalaSekolah;
  let namaGuru = formData?.namaGuru;
  if (!namaKepsek || !namaGuru) {
    // Extract non-keyword cells that look like personal names (e.g. Drs. H. Bambang Sujatmiko, M.Pd.)
    const cellCandidates = rawText
      .split('|')
      .map((c) => c.replace(/[*_]/g, '').trim())
      .filter((c) => {
        if (!c || c === '-' || c.length < 3) return false;
        if (/(?:mengetahui|kepala|guru|nip|jakarta|juli|agustus|september|oktober|november|desember|januari|februari|maret|april|mei|juni|lembar|pengesahan|tanda\s*tangan|\d{4})/i.test(c)) return false;
        return /^[A-Za-z\s\.,]{3,60}$/.test(c) && c.includes(' ');
      });

    if (!namaKepsek) namaKepsek = cellCandidates[0] || 'Drs. H. Bambang Sujatmiko, M.Pd.';
    if (!namaGuru) namaGuru = cellCandidates[1] || 'Siti Rahmawati, S.Pd., Gr.';
  }

  // 5. NIP Kepala Sekolah & NIP Guru
  let nipKepsek = formData?.nipKepalaSekolah;
  let nipGuru = formData?.nipGuru;
  if (!nipKepsek || !nipGuru) {
    const nipMatches = [...rawText.matchAll(/NIP\.?\s*([0-9\s\.\-]+)/gi)].map((m) => m[1].trim());
    if (!nipKepsek) nipKepsek = nipMatches[0] || '19680315 199403 1 005';
    if (!nipGuru) nipGuru = nipMatches[1] || '19880512 201101 2 008';
  }

  const formatNip = (val?: string) => {
    if (!val || val === '-') return 'NIP. -';
    const clean = val.replace(/^NIP\.?\s*/i, '').trim();
    return clean ? `NIP. ${clean}` : 'NIP. -';
  };

  const nipKepsekStr = formatNip(nipKepsek);
  const nipGuruStr = formatNip(nipGuru);

  // Exact structure matching Indonesian official school format:
  // 2 columns borderless, 4 empty rows for signature & stamp, clean row-by-row alignment
  // Row 1: Mengetahui & Tempat, Tanggal
  // Row 2: Kepala [Nama Satuan Pendidikan] & [Jabatan Guru] (aligned horizontally, without redundant "Kepala Sekolah")
  const cleanSignatureTable = `\n\n| **Mengetahui,** | **${tempatTanggal}** |\n| :--- | :--- |\n| **${cleanSekolah}** | **${guruRole}** |\n| &nbsp; | &nbsp; |\n| &nbsp; | &nbsp; |\n| &nbsp; | &nbsp; |\n| &nbsp; | &nbsp; |\n| **${namaKepsek}** | **${namaGuru}** |\n| ${nipKepsekStr} | ${nipGuruStr} |\n`;

  return content.replace(matchToReplace, () => cleanSignatureTable);
}

/**
 * Normalizes the RPPM document title and Section A (Identitas Sekolah)
 * to match the exact official structure in image 11.png:
 *
 * # RENCANA PELAKSANAAN PEMBELAJARAN MENDALAM
 * ### (RPPM)
 *
 * ## A. Identitas Sekolah
 *
 * | | | |
 * | :--- | :---: | :--- |
 * | **Nama Satuan Pendidikan** | : | SD Negeri 1 Merdeka |
 * | **Nama Penyusun** | : | Siti Rahmawati, S.Pd., Gr. |
 * | **Mata Pelajaran** | : | Ilmu Pengetahuan Alam dan Sosial (IPAS) |
 * | **Fase / Kelas / Semester** | : | Fase B (Kelas 4) / Semester Ganjil |
 * | **Materi Pembelajaran** | : | Metamorfosis Hewan dan Hubungan Rantai Makanan di Lingkungan Sekitar |
 * | **Alokasi Waktu** | : | 3 JP (3 x 35 Menit) (1 Pertemuan) |
 * | **Tahun Pelajaran** | : | 2026/2027 |
 */
export function normalizeRppmHeaderAndIdentity(content: string, formData?: any): string {
  if (!content) return '';

  const isRppm = /RENCANA\s+PELAKSANAAN\s+PEMBELAJARAN|\bRPPM\b|Identitas\s+Sekolah/i.test(content);
  if (!isRppm) return content;

  let cleaned = content;

  // 1. Remove any stray broken raw table strings or duplicate lines from prior failed runs:
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*---\s*\|\s*:?---+:?\s*\|[^\n]*(?:\n|$)/gi, '\n');
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*\|?\s*---\s*\|\s*:?---+:?\s*\|[^\n]*(?:\n|$)/gi, '\n');
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*\|[ \t]*\|[ \t]*\|[^\n]*\n?/g, '\n');
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*\|[ \t]*:?---+:?[ \t]*\|[^\n]*\n?/g, '\n');

  // 2. Extract metadata
  const sekolah = formData?.namaSekolah || extractIdentityField(cleaned, /Nama\s+Satuan\s+Pendidikan|Satuan\s+Pendidikan|Nama\s+Sekolah/) || 'SD Negeri 1 Merdeka';
  const guru = formData?.namaGuru || extractIdentityField(cleaned, /Nama\s+Penyusun|Nama\s+Guru/) || 'Rista Kasaraeng, S.Pd';
  const mapel = formData?.namaMapel || extractIdentityField(cleaned, /Mata\s+Pelajaran|Mapel/) || 'Ilmu Pengetahuan Alam dan Sosial (IPAS)';

  let faseKelasSemester = '';
  if (formData?.faseKelas && formData?.semester) {
    faseKelasSemester = `${formData.faseKelas} / Semester ${formData.semester}`;
  } else {
    const extractedFks = extractIdentityField(cleaned, /Fase\s*\/\s*Kelas\s*\/\s*Semester|Fase\s*\/\s*Kelas/);
    faseKelasSemester = extractedFks || `${formData?.faseKelas || 'Fase B (Kelas 4)'} / Semester ${formData?.semester || 'Ganjil'}`;
  }

  const materi = formData?.materiPembelajaran || extractIdentityField(cleaned, /Materi\s+Pembelajaran|Materi\s+Pokok/) || 'Metamorfosis Hewan dan Hubungan Rantai Makanan di Lingkungan Sekitar';

  let alokasi = '';
  if (formData?.alokasiWaktu) {
    alokasi = formData.alokasiWaktu;
    if (formData.jumlahPertemuan && !alokasi.includes('Pertemuan')) {
      alokasi = `${alokasi} (${formData.jumlahPertemuan})`;
    }
  } else {
    const extractedAlokasi = extractIdentityField(cleaned, /Alokasi\s+Waktu/);
    alokasi = extractedAlokasi || '3 JP (3 x 35 Menit) (1 Pertemuan)';
  }

  let tahun = formData?.tahunPelajaran;
  if (!tahun) {
    const m = cleaned.match(/(?:Tahun\s+Pelajaran|Tahun\s+Ajaran)\s*[:|]\s*([^|\n\r]+)/i);
    if (m) tahun = m[1].replace(/\*+/g, '').trim();
  }
  tahun = tahun || '2026/2027';

  // Clean block exactly matching 11.png
  const cleanHeader = `# RENCANA PELAKSANAAN PEMBELAJARAN MENDALAM
### (RPPM)

## A. Identitas Sekolah

| Informasi | : | Keterangan |
| :--- | :---: | :--- |
| **Nama Satuan Pendidikan** | : | ${sekolah} |
| **Nama Penyusun** | : | ${guru} |
| **Mata Pelajaran** | : | ${mapel} |
| **Fase / Kelas / Semester** | : | ${faseKelasSemester} |
| **Materi Pembelajaran** | : | ${materi} |
| **Alokasi Waktu** | : | ${alokasi} |
| **Tahun Pelajaran** | : | ${tahun} |`;

  // Deterministically find where Section B begins:
  const sectionBMatch = cleaned.match(/\n\s*#{1,3}\s*(?:B\.|Identifikasi)\b/i);
  if (sectionBMatch && sectionBMatch.index !== undefined) {
    const remainder = cleaned.slice(sectionBMatch.index).trimStart();
    return cleanHeader + '\n\n' + remainder;
  }

  const anyNextSection = cleaned.match(/\n\s*#{1,3}\s+[B-Z]\b/i);
  if (anyNextSection && anyNextSection.index !== undefined) {
    const remainder = cleaned.slice(anyNextSection.index).trimStart();
    return cleanHeader + '\n\n' + remainder;
  }

  return cleanHeader + '\n\n' + cleaned;
}

/**
 * Normalizes the LKPD document title and Identitas Peserta Didik
 * to match the exact official structure in image 12.png:
 *
 * # ▶ LEMBAR KERJA PESERTA DIDIK
 * ### (LKPD)
 *
 * ## 📌 Identitas Peserta Didik
 *
 * | | | |
 * | :--- | :---: | :--- |
 * | **Kelompok / Nama Anggota** | : | ................................................................ |
 * | **Kelas / Fase** | : | Fase B (Kelas 4) |
 * | **Mata Pelajaran** | : | Ilmu Pengetahuan Alam dan Sosial (IPAS) |
 * | **Materi Pokok** | : | Metamorfosis Hewan dan Hubungan Rantai Makanan di Lingkungan Sekitar |
 * | **Alokasi Waktu** | : | 3 JP (3 x 35 Menit) |
 */
export function normalizeLkpdHeaderAndIdentity(content: string, formData?: any): string {
  if (!content) return '';

  const isLkpd = /LEMBAR\s+KERJA\s+PESERTA\s+DIDIK|\bLKPD\b|Identitas\s+Peserta\s+Didik/i.test(content);
  if (!isLkpd) return content;

  let cleaned = content;

  // 1. Remove any stray broken raw table strings or duplicate lines from prior failed runs:
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*---\s*\|\s*:?---+:?\s*\|[^\n]*(?:\n|$)/gi, '\n');
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*\|?\s*---\s*\|\s*:?---+:?\s*\|[^\n]*(?:\n|$)/gi, '\n');
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*\|[ \t]*\|[ \t]*\|[^\n]*\n?/g, '\n');
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*\|[ \t]*:?---+:?[ \t]*\|[^\n]*\n?/g, '\n');

  // 2. Extract metadata
  let kelompok = '................................................................';
  const mKel = cleaned.match(/(?:Kelompok\s*\/\s*Nama\s*Anggota|Nama\s*Anggota\s*Kelompok)\s*[:|]\s*([^|\n\r]+)/i);
  if (mKel) {
    const val = mKel[1].replace(/\*+/g, '').trim();
    if (val.length > 5 && !val.includes('Kelompok')) kelompok = val;
  }

  let kelasFase = formData?.faseKelas;
  if (!kelasFase) {
    const m = cleaned.match(/(?:Kelas\s*\/\s*Fase|Fase\s*\/\s*Kelas)\s*[:|]\s*([^|\n\r]+)/i);
    if (m) kelasFase = m[1].replace(/\*+/g, '').trim();
  }
  kelasFase = kelasFase || 'Fase B (Kelas 4)';

  let mapel = formData?.namaMapel;
  if (!mapel) {
    const m = cleaned.match(/(?:Mata\s+Pelajaran|Mapel)\s*[:|]\s*([^|\n\r]+)/i);
    if (m) mapel = m[1].replace(/\*+/g, '').trim();
  }
  mapel = mapel || 'Ilmu Pengetahuan Alam dan Sosial (IPAS)';

  let materi = formData?.materiPembelajaran;
  if (!materi) {
    const m = cleaned.match(/(?:Materi\s+Pokok|Materi\s+Pembelajaran)\s*[:|]\s*([^|\n\r]+)/i);
    if (m) materi = m[1].replace(/\*+/g, '').trim();
  }
  materi = materi || 'Metamorfosis Hewan dan Hubungan Rantai Makanan di Lingkungan Sekitar';

  let alokasi = formData?.alokasiWaktu;
  if (!alokasi) {
    const m = cleaned.match(/(?:Alokasi\s+Waktu)\s*[:|]\s*([^|\n\r]+)/i);
    if (m) alokasi = m[1].replace(/\*+/g, '').trim();
  }
  alokasi = alokasi || '3 JP (3 x 35 Menit)';

  // Build clean header and table matching image 12.png
  const cleanHeader = `# ▶ LEMBAR KERJA PESERTA DIDIK
### (LKPD)

## 📌 Identitas Peserta Didik

| Informasi | : | Keterangan |
| :--- | :---: | :--- |
| **Kelompok / Nama Anggota** | : | ${kelompok} |
| **Kelas / Fase** | : | ${kelasFase} |
| **Mata Pelajaran** | : | ${mapel} |
| **Materi Pokok** | : | ${materi} |
| **Alokasi Waktu** | : | ${alokasi} |

---`;

  // Deterministically find where next section begins:
  const nextSectionMatch = cleaned.match(/\n\s*(?:---\s*\n+)?#{1,3}\s*(?:🎯|Judul|Tujuan|💡|Bagian|Aktivitas|[A-B]\.)/i);
  if (nextSectionMatch && nextSectionMatch.index !== undefined) {
    let remainder = cleaned.slice(nextSectionMatch.index).trimStart();
    remainder = remainder.replace(/^---\s*\n*/, '');
    return cleanHeader + '\n\n' + remainder;
  }

  return cleanHeader + '\n\n' + cleaned;
}

/**
 * Normalizes Benar/Salah (True or False) tables:
 * 1. Strips any duplicate or misplaced separator rows (:---:) in the table body.
 * 2. Guarantees that the statement rows in the 'No' column are strictly sequential starting from 1 (1., 2., 3., 4.).
 *    Fixes instances where the first row was missing or started at 2 (e.g. 2., 3., 4.).
 */
export function normalizeBenarSalahTableNumbering(content: string): string {
  if (!content || !content.includes('|')) return content;

  const lines = content.split('\n');
  const result: string[] = [];
  let inBenarSalahTable = false;
  let hasSeenSep = false;
  let rowNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isPipeLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;

    if (!isPipeLine) {
      inBenarSalahTable = false;
      hasSeenSep = false;
      rowNumber = 1;
      result.push(line);
      continue;
    }

    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());

    // Check if this line is the Header of a Benar/Salah question table
    const isBsHeader =
      cells.length === 4 &&
      /^(?:No\.?|Nomor)?$/i.test(cells[0]) &&
      /Pernyataan|Soal|Butir/i.test(cells[1]) &&
      /Benar/i.test(cells[2]) &&
      /Salah/i.test(cells[3]);

    if (isBsHeader) {
      inBenarSalahTable = true;
      hasSeenSep = false;
      rowNumber = 1;
      result.push('| No | Pernyataan | Benar | Salah |');
      continue;
    }

    if (inBenarSalahTable) {
      const isSep = /^[\|\s:\-]+$/.test(trimmed);

      // If it's a separator line
      if (isSep || /^[:\-\s]+$/.test(cells[0])) {
        if (!hasSeenSep) {
          hasSeenSep = true;
          result.push('| :---: | :--- | :---: | :---: |');
        }
        // If already seen separator, drop duplicate!
        continue;
      }

      // Check if this is a data row with 4 columns
      if (cells.length === 4) {
        // Drop rows where cells are literally separator text like :---: or empty hyphens
        if (/^[:\-\s]+$/.test(cells[0]) || (cells[0] === '' && /^[:\-\s]+$/.test(cells[1]))) {
          continue;
        }

        // The user explicitly requested maximum 2 or 3 statements per Benar/Salah question
        if (rowNumber > 3) {
          continue;
        }

        const statementText = cells[1];
        const benarCell = cells[2];
        const salahCell = cells[3];

        // Format row with sequential numbering 1., 2., 3.
        result.push(`| ${rowNumber}. | ${statementText} | ${benarCell} | ${salahCell} |`);
        rowNumber++;
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Normalizes Soal Menjodohkan (Matching questions) tables:
 * - Standardizes instruction:
 *   "Pasangkanlah pernyataan/masalah pada kolom **Premis** dengan pilihan jawaban yang paling tepat pada kolom **Pilihan Jawaban (Opsi)**!"
 * - Standardizes 2-column table header to:
 *   | Premis (Pernyataan / Masalah) | Pilihan Jawaban (Opsi) |
 *   | :--- | :--- |
 * - Balances table rows: if a distractor row only has 1 cell (e.g. "| D. [Pilihan D] |"),
 *   prepends an empty premis cell to maintain exact 2-column balance: "| | D. [Pilihan D] |"
 * - Formats premis with "1. ", "2. ", etc., and opsi with "A. ", "B. ", etc.
 * - Ensures clean closing of the table with blank lines before next content.
 */
export function normalizeMenjodohkanTable(content: string): string {
  if (!content) return '';
  let cleaned = content;

  // 1. Standardize instruction for Menjodohkan
  cleaned = cleaned.replace(
    /(?:^|\n)[ \t]*(?:Pasangkanlah\s+(?:pernyataan|konsep|butir|masalah)[^\n]*(?:Kolom\s*[AB]|respon|jawaban|premis|opsi)[^\n]*|Jodohkanlah\s+(?:pernyataan|konsep|masalah)[^\n]*|Pasangkan\s+pernyataan[^\n]*)[^\n]*/gi,
    '\n\nPasangkanlah pernyataan/masalah pada kolom **Premis** dengan pilihan jawaban yang paling tepat pada kolom **Pilihan Jawaban (Opsi)**!\n\n'
  );

  // 2. Process Menjodohkan tables row by row
  const lines = cleaned.split('\n');
  const result: string[] = [];
  let inMatchingTable = false;
  let hasSeenSep = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isPipeLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;

    if (!isPipeLine) {
      if (inMatchingTable) {
        inMatchingTable = false;
        hasSeenSep = false;
      }
      result.push(line);
      continue;
    }

    const rawCells = trimmed.split('|');
    const cells = rawCells.slice(1, -1).map((c) => c.trim());

    // Check if this row is a Menjodohkan header (2 columns)
    const isMatchingHeader =
      cells.length === 2 &&
      (/Premis|Kolom\s*A|Pernyataan|Masalah/i.test(cells[0]) &&
       /Opsi|Pilihan\s*Jawaban|Kolom\s*B|Respon|Karakteristik/i.test(cells[1]));

    if (isMatchingHeader) {
      inMatchingTable = true;
      hasSeenSep = false;
      result.push('| Premis (Pernyataan / Masalah) | Pilihan Jawaban (Opsi) |');
      continue;
    }

    if (inMatchingTable) {
      const isSep = /^[\|\s:\-]+$/.test(trimmed);
      if (isSep) {
        if (!hasSeenSep) {
          hasSeenSep = true;
          result.push('| :--- | :--- |');
        }
        continue;
      }

      // Check if table ended (e.g. non-2-column row)
      if (cells.length !== 2 && cells.length !== 1) {
        inMatchingTable = false;
        hasSeenSep = false;
        result.push(line);
        continue;
      }

      // If exactly 2 cells
      if (cells.length === 2) {
        let premisCell = cells[0];
        let opsiCell = cells[1];

        // Khusus soal menjodohkan, tidak perlu menggunakan gambar pada opsi pilihan dan premis (cukup kalimat/teks saja)
        premisCell = premisCell
          .replace(/\[\s*(?:CHART_URL|GAMBAR[A-Za-z0-9_]*|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS[A-Za-z0-9_]*|IMAGE|FIGURE)[^\]]*\]/gi, '')
          .replace(/!\[.*?\]\(.*?\)/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .trim();
        opsiCell = opsiCell
          .replace(/\[\s*(?:CHART_URL|GAMBAR[A-Za-z0-9_]*|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS[A-Za-z0-9_]*|IMAGE|FIGURE)[^\]]*\]/gi, '')
          .replace(/!\[.*?\]\(.*?\)/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .trim();

        // Format premis: if starting with number like "1", ensure "1. "
        if (/^\d+\s*[^.]/.test(premisCell)) {
          premisCell = premisCell.replace(/^(\d+)\s*/, '$1. ');
        }

        // Format opsi: if starting with letter like "A", ensure "A. "
        if (/^[A-Za-z]\s*[^.]/.test(opsiCell)) {
          opsiCell = opsiCell.replace(/^([A-Za-z])\s*/, (_m, l) => `${l.toUpperCase()}. `);
        }

        result.push(`| ${premisCell} | ${opsiCell} |`);
        continue;
      }

      // If only 1 cell inside matching table (distractor option without left premis cell)
      if (cells.length === 1) {
        let opsiCell = cells[0];
        opsiCell = opsiCell
          .replace(/\[\s*(?:CHART_URL|GAMBAR[A-Za-z0-9_]*|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS[A-Za-z0-9_]*|IMAGE|FIGURE)[^\]]*\]/gi, '')
          .replace(/!\[.*?\]\(.*?\)/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .trim();
        if (/^[A-Za-z]\s*[^.]/.test(opsiCell)) {
          opsiCell = opsiCell.replace(/^([A-Za-z])\s*/, (_m, l) => `${l.toUpperCase()}. `);
        }
        result.push(`| | ${opsiCell} |`);
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Normalizes question numbering, stimulus, and options for:
 * 1. Pilihan Ganda (PG) - matching image 15.png:
 *    - "Soal Nomor 1"
 *    - Stimulus text
 *    - Question stem
 *    - Vertical list of options A., B., C., D., E. (each on its own line)
 * 2. Pilihan Ganda Kompleks (PGK) - matching image 16.png:
 *    - "Stimulus:"
 *    - Instruction: "Tentukan pernyataan-pernyataan di bawah ini yang BENAR dengan memberikan tanda centang pada kotak yang sesuai! (Pilihan jawaban benar lebih dari satu)"
 *    - Checkboxes "[ ] " on separate lines
 * 3. Menjodohkan (Matching):
 *    - Kolom kiri Premis (1, 2, 3), Kolom kanan Pilihan Jawaban (Opsi: A, B, C, D, E)
 *    - Opsi lebih banyak daripada premis (distraktor)
 *    - Tabel 2 kolom seimbang 50% - 50%
 * 4. Benar / Salah (True or False):
 *    - Tabel matriks 4 kolom berstimulus, nomor urut mulai dari 1., max 2-3 pernyataan
 */
export function normalizeAsesmenQuestions(content: string): string {
  if (!content) return '';
  let cleaned = content;

  // 1. Normalize Soal Number header (e.g., "### Soal 1", "Soal 1:", "Soal Nomor 1") -> "**Soal Nomor X**"
  cleaned = cleaned.replace(/(?:^|\n)(?:#{2,4}\s*|\*{1,2})?(?:Soal\s*(?:Nomor|No\.?)?\s*(\d+)|Butir\s*Soal\s*(\d+))[:\s*]*(?:\*{1,2})?(?=\s*\n|$)/gi, (_m, p1, p2) => {
    const num = p1 || p2;
    return `\n\n**Soal Nomor ${num}**\n\n`;
  });

  // 2. Normalize Stimulus label: "*Stimulus:*" or "Stimulus:" followed by text
  cleaned = cleaned.replace(/(?:^|\n)(?:#{2,4}\s*)?[*_~`]*Stimulus[:\s]*[*_~`]*\s*(?=\n|[A-Z])/gi, '\n\n*Stimulus:*\n\n');

  // 3. Normalize Pilihan Ganda (PG) options A, B, C, D, E:
  // If multiple options are stuck on the same line (e.g. "A. Option 1 B. Option 2"), split them onto separate lines!
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*([A-E]\.\s+[^\n]+)/g, (fullLine) => {
    let line = fullLine;
    line = line.replace(/\s+([B-E]\.\s+)/g, '\n\n$1');
    return line;
  });

  // Clean and align options A., B., C., D., E.
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*(?:[-*•]\s*)?([A-E])\.\s*([^\n]+)/g, (_m, letter, text) => {
    // Avoid matching section titles like "A. Identitas Sekolah" or "C. Desain Pembelajaran"
    if (/Identitas|Rancangan|Kisi-Kisi|Naskah|Kunci|Rubrik|Desain|Pengalaman|Asesmen|Tujuan|Bagian/i.test(text)) {
      return `\n\n## ${letter}. ${text.trim()}`;
    }
    return `\n\n  ${letter.toUpperCase()}. ${text.trim()}`;
  });

  // 4. Normalize Pilihan Ganda Kompleks (PGK) checkboxes:
  // Turn "- [ ]", "* [ ]", "1. [ ]", "☐", or "[ ]" into uniform checkbox "  [ ] [Pernyataan]"
  cleaned = cleaned.replace(/(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:\[\s*\]|☐|\(\s*\)|\[_\])[ \t]*([^\n]+)/g, (_m, statement) => {
    return `\n\n  [ ] ${statement.trim()}`;
  });

  // Normalize PGK instruction text to match image 16.png
  cleaned = cleaned.replace(
    /(?:^|\n)[ \t]*(?:Tentukan\s+pernyataan[^\n]*benar[^\n]*|Berikan\s+tanda\s+centang[^\n]*kotak[^\n]*|Pilihlah\s+lebih\s+dari\s+satu\s+pernyataan[^\n]*)[^\n]*/gi,
    '\n\nTentukan pernyataan-pernyataan di bawah ini yang **BENAR** dengan memberikan tanda centang pada kotak yang sesuai! *(Pilihan jawaban benar lebih dari satu)*\n\n'
  );

  // 5. Normalize Soal Menjodohkan (Matching) tables (Premis vs Opsi, 50%-50% seimbang)
  cleaned = normalizeMenjodohkanTable(cleaned);

  // 6. Normalize Soal Benar / Salah (True or False) instructions & table syntax:
  // Standardize Benar/Salah instruction
  cleaned = cleaned.replace(
    /(?:^|\n)[ \t]*(?:Berdasarkan\s+(?:teks|stimulus|bacaan|informasi|data)[^\n]*(?:centang|tentukan|evaluasi)[^\n]*Benar[^\n]*Salah[^\n]*|Tentukan\s+(?:apakah\s+)?(?:kebenaran\s+)?(?:setiap\s+)?pernyataan[^\n]*Benar\s*atau\s*Salah[^\n]*|Berilah\s+tanda\s+centang[^\n]*kolom\s+Benar[^\n]*Salah[^\n]*)[^\n]*/gi,
    '\n\nBerdasarkan teks/informasi di atas, tentukan kebenaran setiap pernyataan berikut dengan memberi tanda centang (✓) pada kolom **Benar** atau **Salah**!\n\n'
  );

  // Remove any duplicate consecutive separator rows globally
  cleaned = cleaned.replace(/(\|(?:\s*:?-+:?\s*\|)+\r?\n)[ \t]*\|(?:\s*:?-+:?\s*\|)+[ \t]*/g, '$1');

  // Normalize Benar/Salah table numbering (guarantee starts at 1, max 2-3 statements, and remove duplicate separators)
  cleaned = normalizeBenarSalahTableNumbering(cleaned);

  // Extract any leaked headings or questions that entered into Benar/Salah table rows
  cleaned = extractLeakedHeadingsAndQuestionsFromTables(cleaned);

  // 7. Clean excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Universal document sanitizer that cleans RPPM, LKPD, and Asesmen.
 */
export function sanitizeDocumentContent(content: string, type?: string, formData?: any): string {
  if (!content) return '';
  // Normalize Windows CRLF line endings to LF
  let result = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip duplicate consecutive separator rows globally
  result = result.replace(/(\|(?:\s*:?-+:?\s*\|)+\n)[ \t]*\|(?:\s*:?-+:?\s*\|)+[ \t]*/g, '$1');

  // 1. Repair and normalize any broken or collapsed Markdown tables first
  result = repairAndNormalizeMarkdownTables(result);

  // Normalize rubric tables to fit cleanly within A4 paper width
  result = normalizeRubricTables(result);

  if (type === 'rppm' || (!type && /RPPM|Identitas\s+Sekolah/i.test(result))) {
    result = removeAlurPembelajaranDiagram(result);
    result = normalizeRppmHeaderAndIdentity(result, formData);
    result = replacePesertaDidikWithMurid(result);
  }
  if (type === 'lkpd' || (!type && /LKPD|Identitas\s+Peserta/i.test(result))) {
    result = removeLkpdStimulusBox(result);
    result = normalizeLkpdHeaderAndIdentity(result, formData);
  }
  if (type === 'asesmen' || (!type && /Asesmen|Rubrik|Kisi-Kisi|Pilihan Ganda|Soal Nomor/i.test(result))) {
    result = normalizeKisiKisiSectionAndKop(result, formData);
    result = normalizeAsesmenQuestions(result);
    result = normalizeBenarSalahTableNumbering(result);
    result = normalizeMenjodohkanTable(result);
  }

  // Clean LaTeX math tags ($$\text, \frac, \times) and HTML tags (<br>) from all documents
  result = cleanLatexAndHtmlTags(result);
  // Normalize and tidy up the signature block to match official standard (image 8.png)
  result = normalizeSignatureBlock(result, formData);

  // 2. Final pass of table and rubric normalization to guarantee 100% valid Markdown table syntax
  result = normalizeRubricTables(result);
  result = repairAndNormalizeMarkdownTables(result);
  // Guarantee Benar/Salah numbering starts at 1, max 2-3 statements, and zero stray separators (:---:)
  result = normalizeBenarSalahTableNumbering(result);
  result = normalizeMenjodohkanTable(result);

  // Reorder Asesmen sections so Naskah Soal is placed after the signature block with KOP Lembar Soal
  if (type === 'asesmen' || (!type && /Asesmen|Kisi-Kisi|Naskah\s*Soal|Rubrik\s*Penilaian/i.test(result))) {
    result = reorderAsesmenSectionsAndAddKopSoal(result, formData);
    result = ensureQuestionVisualStimulusTags(result, formData);
  }

  // Normalize visual stimulus tags (CHART_URL, GAMBAR_STIMULUS) so they are cleanly isolated from inline labels
  result = normalizeVisualTagsInMarkdown(result);

  // Guarantee Petunjuk Pengerjaan Soal NEVER contains any visual stimulus tags
  result = result.replace(
    /(###\s*📝\s*Petunjuk\s*Pengerjaan\s*Soal:?[\s\S]*?)(?=(?:\n[ \t]*---|\n\s*#{1,4}\s*Bagian|\n\s*#{1,4}\s*Soal|\n\s*(?:(?:\*\*|__)?(?:Bagian\s+[A-Z]|Soal\s*(?:Nomor|No\.?)?\s*1|\b1\.\s+(?!Berdoalah|Tuliskan|Bacalah|Dahulukan|Periksa)))))/i,
    (match, petunjukBlock) => {
      return petunjukBlock.replace(
        /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
        ''
      );
    }
  );

  // Final guarantee: replace any occurrence of "peserta didik" with "murid" for RPPM documents
  if (type === 'rppm' || (!type && /RPPM|Identitas\s+Sekolah/i.test(result))) {
    result = replacePesertaDidikWithMurid(result);
  }

  return result;
}

/**
 * Ensures that questions requiring visual interpretation in Asesmen
 * have active visual stimulus tags [GAMBAR_STIMULUS: "..."] for at least 30% of total questions,
 * while strictly ensuring that Menjodohkan options/premis NEVER receive image tags (text only),
 * and teacher guides (Pedoman Penskoran, Kunci Jawaban, Rubrik) NEVER receive stimulus tags.
 */
export function ensureQuestionVisualStimulusTags(content: string, formData?: any): string {
  if (!content) return '';
  const isAsesmen = /Asesmen|Kisi-Kisi|Naskah\s*Soal|Lembar\s*Soal/i.test(content);
  if (!isAsesmen) return content;

  let text = content;

  // 1. FIRST: Clean ALL stray visual tags from teacher guide sections (Kunci Jawaban, Pedoman Penskoran, Rubrik, Kisi-Kisi)
  // as well as Petunjuk Pengerjaan Soal and Kop Soal.
  // The teacher guide and Petunjuk Pengerjaan Soal MUST NEVER have visual upload blocks or stimulus cards!
  text = text.replace(
    /(###\s*📝\s*Petunjuk\s*Pengerjaan\s*Soal:?[\s\S]*?)(?=(?:\n[ \t]*---|\n\s*#{1,4}\s*Bagian|\n\s*#{1,4}\s*Soal|\n\s*(?:(?:\*\*|__)?(?:Bagian\s+[A-Z]|Soal\s*(?:Nomor|No\.?)?\s*1|\b1\.\s+(?!Berdoalah|Tuliskan|Bacalah|Dahulukan|Periksa)))))/i,
    (match, petunjukBlock) => {
      return petunjukBlock.replace(
        /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
        ''
      );
    }
  );

  const naskahStartIdx = text.search(/\n\s*#{1,3}\s*(?:NASKAH\s*SOAL|Lembar\s*Soal|Bagian\s*A:|\bSOAL\s*ASESMEN)/i);
  let prefix = '';
  let targetSearchText = text;
  if (naskahStartIdx !== -1) {
    prefix = text.slice(0, naskahStartIdx);
    targetSearchText = text.slice(naskahStartIdx);
    // Strip any stimulus tags from teacher guide (especially Pedoman Penskoran, Kunci Jawaban, etc.)
    const cleanedTeacher = prefix.replace(
      /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
      ''
    );
    prefix = cleanedTeacher;

    // CRITICAL FIX: Exclude Kop Soal and Petunjuk Pengerjaan Soal from targetSearchText!
    // If targetSearchText contains Petunjuk Pengerjaan Soal, move that entire Kop + Petunjuk block into prefix
    // (with all visual stimulus tags stripped) so that the numbered instructions (1. Berdoalah..., 2. Tuliskan nama...)
    // are NEVER mistakenly detected as Question 1 or Question 2!
    const petunjukEndMatch = targetSearchText.match(/(?:###\s*📝\s*Petunjuk\s*Pengerjaan\s*Soal:?[\s\S]*?\n[ \t]*---[ \t]*(?:\n|$))/i);
    if (petunjukEndMatch && petunjukEndMatch.index !== undefined) {
      const splitIdx = petunjukEndMatch.index + petunjukEndMatch[0].length;
      const kopAndPetunjuk = targetSearchText.slice(0, splitIdx).replace(
        /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
        ''
      );
      prefix += kopAndPetunjuk;
      targetSearchText = targetSearchText.slice(splitIdx);
    } else {
      const pIdx = targetSearchText.search(/(?:^|\n)[ \t]*(?:#{1,4}\s*)?(?:📝\s*)?Petunjuk\s*Pengerjaan\s*Soal/i);
      if (pIdx !== -1) {
        const afterP = targetSearchText.slice(pIdx);
        const nextSecMatch = afterP.match(/(?:^|\n)(?:\s*---[ \t]*\n*|\s*#{1,4}\s*(?:Bagian|[A-Z]\.|Soal)|\s*(?:\*\*|__)?(?:Bagian\s+[A-Z]|Soal\s*(?:Nomor|No\.?)?\s*1|\b1\.\s+(?!Berdoalah|Tuliskan|Bacalah|Dahulukan|Periksa)))/i);
        if (nextSecMatch && nextSecMatch.index !== undefined) {
          const splitIdx = pIdx + nextSecMatch.index;
          const kopAndPetunjuk = targetSearchText.slice(0, splitIdx).replace(
            /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
            ''
          );
          prefix += kopAndPetunjuk;
          targetSearchText = targetSearchText.slice(splitIdx);
        }
      }
    }
  } else {
    // If not yet reordered, strip visual tags from Pedoman Penskoran, Kunci Jawaban, Rubrik Penilaian, and Petunjuk
    text = text.replace(
      /(#{1,4}\s*(?:Kunci\s*Jawaban|Pembahasan|Pedoman\s*Penskoran|Rubrik\s*Penilaian)[\s\S]*?)(?=\n\s*#{1,3}\s*(?:NASKAH\s*SOAL|Lembar\s*Soal|Bagian\s*A:|\bSOAL\s*ASESMEN)|$)/gi,
      (block) => block.replace(/\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi, '')
    );
    targetSearchText = text;
  }

  // 1b. KHUSUS SOAL MENJODOHKAN: Opsi pilihan jawaban dan premis DILARANG menggunakan gambar (murni kalimat teks).
  // Clean all matching tables in targetSearchText
  targetSearchText = targetSearchText.replace(
    /(\|[\s\S]*?(?:Premis|Kolom\s*A|Masalah|Pernyataan)[\s\S]*?(?:Pilihan\s*Jawaban|Opsi|Kolom\s*B|Respon)[\s\S]*?\|[\s\S]*?)(?=\n[ \t]*(?:#{1,4}\s*|---\s*|$))/gi,
    (tableMatch) => {
      return tableMatch
        .replace(/\[\s*(?:CHART_URL|GAMBAR[A-Za-z0-9_]*|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS[A-Za-z0-9_]*|IMAGE|FIGURE)[^\]]*\]/gi, '')
        .replace(/!\[.*?\]\(.*?\)/gi, '')
        .replace(/<img[^>]*>/gi, '');
    }
  );

  // Contextual helper to build topic-relevant visual prompt aligned with the exact question
  const topicMateri = formData?.materiPembelajaran || 'materi pembelajaran';
  const getContextualDesc = (bodyText: string, qNum: string | number): string => {
    // Extract question sentence / stem from bodyText so the prompt strictly follows the question
    let questionStem = bodyText
      .replace(/^[#*_\s\d.]*(?:Soal\s*(?:Nomor|No\.?)?\s*\d+)?[:.\s-]*/i, '')
      .replace(/\[\s*(?:CHART_URL|GAMBAR[A-Za-z0-9_]*|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS[A-Za-z0-9_]*|IMAGE|FIGURE)[^\]]*\]/gi, '')
      .replace(/[*_`]/g, '')
      .trim();

    // Extract options if present
    const optionsMatch = questionStem.match(/\n\s*([A-E]\..*)/s);
    let optionsText = '';
    if (optionsMatch) {
      optionsText = optionsMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[A-E]\./i.test(l))
        .join(', ');
      questionStem = questionStem.replace(/\n\s*[A-E]\..*/s, '').trim();
    }
    questionStem = questionStem.replace(/\n\s*\|.*\|.*/s, '').trim();

    const cleanStem = questionStem.length > 180 ? questionStem.slice(0, 180) + '...' : questionStem;

    const lower = bodyText.toLowerCase();
    const mapelLower = (formData?.namaMapel || '').toLowerCase();
    let specificDetail = '';

    if (lower.includes('hijai') || lower.includes('harakat') || lower.includes('huruf arab') || lower.includes('fathah') || lower.includes('kasrah') || lower.includes('dhammah') || lower.includes('sukun') || lower.includes('tasydid') || lower.includes('tanwin')) {
      specificDetail = 'Bagan dan tabel kaligrafi aksara huruf hijaiyah berharakat lengkap (fathah, kasrah, dhammah, sukun, tasydid) yang jelas dan berdefinisi tinggi';
    } else if (lower.includes('katak') || lower.includes('amfibi') || lower.includes('berudu') || lower.includes('kecebong')) {
      specificDetail = 'Bagan metamorfosis katak amfibi dari telur di air, kecebong/berudu, katak berekor, hingga katak dewasa dengan label tahapan yang jelas';
    } else if (lower.includes('belalang') || lower.includes('tidak sempurna') || lower.includes('nimfa') || lower.includes('kecoa') || lower.includes('capung') || lower.includes('jangkrik')) {
      specificDetail = 'Bagan metamorfosis tidak sempurna belalang yang menunjukkan tahapan: telur, nimfa, dan belalang dewasa dengan label yang jelas';
    } else if (lower.includes('kupu') || lower.includes('ulat') || lower.includes('kepompong')) {
      specificDetail = 'Bagan metamorfosis sempurna kupu-kupu yang menampilkan 4 tahapan lengkap: telur pada daun, ulat (larva), kepompong (pupa), dan kupu-kupu dewasa (imago)';
    } else if (lower.includes('rantai') || lower.includes('jaring') || lower.includes('makan') || lower.includes('konsumen') || lower.includes('produsen') || lower.includes('padi')) {
      specificDetail = 'Bagan aliran energi rantai makanan ekosistem sawah: padi (produsen) -> belalang (konsumen I) -> katak (konsumen II) -> ular (konsumen III) -> elang (konsumen puncak)';
    } else if (lower.includes('nyamuk') || lower.includes('jentik')) {
      specificDetail = 'Bagan daur hidup nyamuk lengkap: telur, jentik/larva, pupa, dan nyamuk dewasa';
    } else if (lower.includes('fotosintesis') || lower.includes('klorofil') || lower.includes('daun') || lower.includes('tumbuhan')) {
      specificDetail = 'Diagram proses fotosintesis pada tumbuhan hijau dengan penyerapan cahaya matahari, air, dan karbon dioksida menghasilkan glukosa dan oksigen';
    } else if (lower.includes('tata surya') || lower.includes('planet') || lower.includes('matahari') || lower.includes('orbit')) {
      specificDetail = 'Bagan susunan tata surya dengan posisi matahari dan planet-planet secara berurutan dan terperinci';
    } else if (lower.includes('pecahan') || lower.includes('arsir') || lower.includes('lingkaran')) {
      specificDetail = 'Diagram bangun geometri terbagi secara proporsional dengan bagian terarsir jelas untuk konsep pecahan matematika';
    } else if (lower.includes('trapesium') || lower.includes('segitiga') || lower.includes('persegi') || lower.includes('geometri') || lower.includes('sudut') || lower.includes('bangun')) {
      specificDetail = 'Gambar bangun datar/geometri dengan label ukuran panjang sisi, alas, tinggi, dan sudut yang terukur jelas sesuai pertanyaan soal';
    } else if (lower.includes('balok') || lower.includes('kubus') || lower.includes('prisma') || lower.includes('tabung') || lower.includes('jaring')) {
      specificDetail = 'Gambar bangun ruang 3D / jaring-jaring bangun ruang dengan garis rusuk dan sisi yang presisi untuk soal matematika';
    } else if (lower.includes('denah') || lower.includes('rute') || lower.includes('arah') || lower.includes('kompas')) {
      specificDetail = 'Denah peta rute perjalanan dengan nama jalan, gedung penting, dan arah mata angin yang jelas';
    } else if (lower.includes('garuda') || lower.includes('pancasila') || lower.includes('sila') || lower.includes('musyawarah') || lower.includes('gotong royong')) {
      specificDetail = 'Ilustrasi nilai pengamalan Profil Pelajar Pancasila dan gotong royong warga/sekolah';
    } else if (lower.includes('jantung') || lower.includes('peredaran darah') || lower.includes('pencernaan') || lower.includes('pernapasan')) {
      specificDetail = 'Bagan organ anatomi tubuh manusia dengan label dan bagian penunjuk panah yang jelas sesuai pertanyaan soal';
    } else if (mapelLower.includes('pjok') || lower.includes('lari') || lower.includes('bola') || lower.includes('senam')) {
      specificDetail = 'Ilustrasi peragaan teknik gerak olahraga dengan posisi tubuh dan arah gerak yang tepat';
    } else if (mapelLower.includes('seni') || lower.includes('batik') || lower.includes('musik') || lower.includes('ragam hias')) {
      specificDetail = 'Ilustrasi karya seni rupa / ragam hias ornamen nusantara dengan motif detail yang jelas';
    } else {
      const descMatch = bodyText.match(/(?:gambar|bagan|diagram|grafik|ilustrasi|denah|skema)\s+([^\n.]+)/i);
      if (descMatch) {
        specificDetail = descMatch[0].trim();
      } else {
        specificDetail = `Ilustrasi edukatif konsep materi "${topicMateri}" berdefinisi tinggi`;
      }
    }

    if (cleanStem) {
      const optPart = optionsText ? ` (Pilihan: ${optionsText})` : '';
      return `Ilustrasi stimulus Soal Nomor ${qNum} untuk pertanyaan: "${cleanStem}"${optPart}. Menampilkan: ${specificDetail}`;
    }
    return `${specificDetail} untuk stimulus visual soal nomor ${qNum}`;
  };

  // Find all question headers in targetSearchText (strictly excluding instructions such as Berdoalah, Tuliskan, etc.)
  const headerRegex = /(?:^|\n)[ \t]*(?:#{1,4}\s*)?(?:\*\*|__)?(?:Soal\s*(?:Nomor|No\.?)?\s*(\d+)|\b(\d{1,2})\.\s+(?!(?:Pedoman|Kunci|Rubrik|Kisi|Tabel|Panduan|Premis|Pilihan|Petunjuk|Berdoalah|Tuliskan|Bacalah|Dahulukan|Periksa|Kerjakan|\d)))(?:\*\*|__)?/gi;
  const headers: { start: number; matchText: string; qNum: string }[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = headerRegex.exec(targetSearchText)) !== null) {
    const isStartNewline = hm[0].startsWith('\n');
    const startIdx = hm.index + (isStartNewline ? 1 : 0);
    headers.push({
      start: startIdx,
      matchText: hm[0].trim(),
      qNum: hm[1] || hm[2] || String(headers.length + 1),
    });
  }

  if (headers.length === 0) {
    return prefix ? prefix + targetSearchText : targetSearchText;
  }

  const totalQuestions = headers.length;
  // Minimal 30% dari total jumlah butir soal wajib memiliki gambar
  const minRequiredVisuals = Math.max(2, Math.ceil(totalQuestions * 0.3));

  // Build question chunks
  const beforeFirstHeader = targetSearchText.slice(0, headers[0].start);
  const chunks: { qNum: string; raw: string }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].start;
    const end = i + 1 < headers.length ? headers[i + 1].start : targetSearchText.length;
    chunks.push({
      qNum: headers[i].qNum,
      raw: targetSearchText.slice(start, end),
    });
  }

  let currentVisualCount = 0;
  for (const c of chunks) {
    if (/\[\s*(?:CHART_URL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS|IMAGE|FIGURE)/i.test(c.raw)) {
      currentVisualCount++;
    }
  }

  // Process chunks:
  // - Khusus soal Menjodohkan: opsi pilihan dan premis DILARANG menggunakan gambar (murni kalimat/teks saja).
  // - Kecuali bentuk soal lainnya (PG, PGK, Isian Singkat, Uraian, Benar/Salah): dapat ditambahkan soal bergambar.
  // - Pastikan minimal 30% dari jumlah soal yang ada menggunakan soal bergambar.
  const updatedChunks = chunks.map((c) => {
    let raw = c.raw;
    const isMenjodohkan =
      /Premis\s*\(Pernyataan|Pilihan\s*Jawaban\s*\(Opsi\)|Pasangkanlah/i.test(raw) ||
      /Menjodohkan/i.test(raw);

    if (isMenjodohkan) {
      // Khusus soal menjodohkan: opsi pilihan dan premis DILARANG menggunakan gambar (murni kalimat/teks saja)
      raw = raw
        .replace(/\[\s*(?:CHART_URL|GAMBAR[A-Za-z0-9_]*|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS[A-Za-z0-9_]*|IMAGE|FIGURE)[^\]]*\]/gi, '')
        .replace(/!\[.*?\]\(.*?\)/gi, '')
        .replace(/<img[^>]*>/gi, '');
      return raw;
    }

    const alreadyHasVisual = /\[\s*(?:CHART_URL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS|IMAGE|FIGURE)/i.test(raw);
    if (alreadyHasVisual) {
      return raw;
    }

    const isQuestion1Or2 = c.qNum === '1' || c.qNum === '2';
    const hasVisualMention = /(?:perhatikan|cermati|analisis|berdasarkan|amati)\s+(?:gambar|bagan|diagram|grafik|ilustrasi|denah|skema|foto)\b|stimulus\s+(?:visual|gambar)\b/i.test(raw);
    const needMoreToReach30Percent = currentVisualCount < minRequiredVisuals;

    if (isQuestion1Or2 || hasVisualMention || needMoreToReach30Percent) {
      const desc = getContextualDesc(raw, c.qNum);
      const injectedTag = `\n[GAMBAR_STIMULUS: "${desc}"]\n`;

      const stimLineMatch = raw.match(/(?:^|\n)[ \t]*(?:(?:\*\*|__)?Stimulus(?:\s+Visual)?:?(?:\*\*|__)?)[^\n]*/i);
      if (stimLineMatch && stimLineMatch.index !== undefined) {
        const insertPos = stimLineMatch.index + stimLineMatch[0].length;
        raw = raw.slice(0, insertPos) + '\n' + injectedTag + '\n' + raw.slice(insertPos);
      } else {
        // Insert right after the question header line
        const headerEndIdx = raw.indexOf('\n');
        if (headerEndIdx !== -1) {
          raw = raw.slice(0, headerEndIdx) + '\n' + injectedTag + raw.slice(headerEndIdx);
        } else {
          raw = raw + '\n' + injectedTag;
        }
      }
      currentVisualCount++;
    }

    return raw;
  });

  const finalSoalText = beforeFirstHeader + updatedChunks.join('');
  return prefix ? prefix + finalSoalText : finalSoalText;
}

/**
 * Normalizes visual tags (CHART_URL, GAMBAR_STIMULUS, GAMBAR, ILUSTRASI, etc.) in markdown text:
 * 1. Safely isolates inline tags (e.g. "Stimulus: [GAMBAR_STIMULUS: ...]" or "**Stimulus:** [GAMBAR: ...]") into their own paragraph blocks
 * 2. Uses bracket-depth counting so nested brackets in JSON arrays [...] are completely preserved
 * 3. Strips stray bold/italic delimiters (** or __) around tags so markdown formatting remains clean
 * 4. Maps all synonym tags (GAMBAR, ILUSTRASI, DIAGRAM, BAGAN, GAMBAR_SOAL_2) to canonical GAMBAR_STIMULUS
 */
export function normalizeVisualTagsInMarkdown(text: string): string {
  if (!text) return '';
  if (!/\[\s*(?:CHART_URL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)/i.test(text)) {
    return text;
  }

  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    const sub = text.slice(i);
    const prefixMatch = sub.match(
      /^(?:(?:\*\*|__|\*)?(?:Stimulus(?:\s+Visual)?|Perhatikan\s+gambar\s+berikut)[\s:]*(?:\*\*|__|\*)?\s*)?(?:\*\*|__|\*)?\[\s*(CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)\s*:\s*/i
    );

    if (prefixMatch) {
      let tagType = prefixMatch[1].toUpperCase();
      // Canonicalize synonyms into standard GAMBAR_STIMULUS
      if (
        tagType === 'GAMBAR' ||
        tagType === 'GAMBAR_SOAL' ||
        tagType.startsWith('GAMBAR_SOAL_') ||
        tagType.startsWith('GAMBAR_') && !tagType.startsWith('GAMBAR_OPSI_') && !tagType.startsWith('GAMBAR_ITEM_') ||
        tagType === 'ILUSTRASI' ||
        tagType === 'DIAGRAM' ||
        tagType === 'BAGAN' ||
        tagType === 'STIMULUS_GAMBAR' ||
        tagType === 'IMAGE' ||
        tagType === 'FIGURE'
      ) {
        tagType = 'GAMBAR_STIMULUS';
      }

      const prefixLen = prefixMatch[0].length;
      let depth = 1;
      let j = i + prefixLen;

      while (j < len && depth > 0) {
        if (text[j] === '[') depth++;
        else if (text[j] === ']') depth--;
        j++;
      }

      if (depth === 0) {
        const rawContent = text.slice(i + prefixLen, j - 1).trim();
        // Skip any trailing bold/italic asterisks immediately after closing bracket ]
        let afterIdx = j;
        while (afterIdx < len && (text[afterIdx] === '*' || text[afterIdx] === '_')) {
          afterIdx++;
        }

        result += `\n\n[${tagType}: ${rawContent}]\n\n`;
        i = afterIdx;
        continue;
      }
    }

    result += text[i];
    i++;
  }

  return result.replace(/\n{3,}/g, '\n\n');
}

/**
 * Normalizes Asesmen document layout according to standard Indonesian school practices:
 * 1. The Teacher's Blueprint & Scoring Guide (Rancangan, Kisi-Kisi, Kunci Jawaban & Pembahasan,
 *    Rubrik Penilaian, and Lembar Pengesahan Resmi / Tanda Tangan) comes first.
 * 2. The Student's Question Test Paper (Naskah Soal Lengkap) is placed AFTER the signature block,
 *    preceded by an official KOP Lembar Soal Peserta Didik with student identity & test instructions.
 *    This enables teachers to effortlessly duplicate/photocopy just the test sheet for learners.
 * 3. Enforces EXACTLY ONE single official KOP Lembar Soal (matching user's Image 2):
 *    - Sumatif: "Materi Pokok" is hidden from Kop Soal. Non-sumatif: "Materi Pokok" is shown.
 *    - "Nomor Absen / Kelas" is replaced with "Fase / Kelas" (e.g. B / 4 (Empat)).
 *    - "Alokasi Waktu" is replaced with dotted fill-in line (. . .) matching "Hari / Tanggal" for manual student entry.
 */
export function reorderAsesmenSectionsAndAddKopSoal(content: string, formData?: any): string {
  if (!content) return '';
  const isAsesmen = /Asesmen|Kisi-Kisi|Naskah\s*Soal|Lembar\s*Soal|Rubrik\s*Penilaian/i.test(content);
  if (!isAsesmen) return content;

  let text = content;

  // 1. Detect if Naskah Soal was placed before Kunci Jawaban or Rubrik (early)
  const earlyNaskahRegex = /(?:^|\n)[ \t]*(?:---[ \t]*\n*)?(#{1,3}\s*(?:III\.|3\.|[A-Z]\.)\s*Naskah\s*Soal[\s\S]*?)(?=\n\s*#{1,3}\s*(?:IV\.|4\.|V\.|5\.|[A-Z]\.)\s*(?:Kunci\s*Jawaban|Pembahasan|Pedoman\s*Penskoran|Rubrik))/i;
  const earlyMatch = text.match(earlyNaskahRegex);
  let earlyQuestions = '';
  if (earlyMatch && earlyMatch.index !== undefined) {
    earlyQuestions = earlyMatch[1].replace(/^#{1,3}\s*(?:III\.|3\.|[A-Z]\.)\s*Naskah\s*Soal[^\n]*\n*/i, '').trim();
    text = text.replace(earlyMatch[0], '\n');
    // Renumber subsequent Roman numerals
    text = text.replace(/#{1,3}\s*(?:IV\.|4\.)\s*Kunci\s*Jawaban/gi, '## III. Kunci Jawaban');
    text = text.replace(/#{1,3}\s*(?:V\.|5\.)\s*Rubrik\s*Penilaian/gi, '## IV. Rubrik Penilaian');
  }

  // 2. Locate the student test sheet section (Naskah Soal) at the bottom
  const bottomNaskahRegex = /\n\s*(?:---\s*\n*)?(#{1,3}\s*(?:NASKAH\s*SOAL|Lembar\s*Soal|Bagian\s*A:|\bSOAL\s*ASESMEN)[\s\S]*)$/i;
  const bottomMatch = text.match(bottomNaskahRegex);

  let teacherGuide = text;
  let rawSoalSection = earlyQuestions;

  if (bottomMatch && bottomMatch.index !== undefined) {
    teacherGuide = text.slice(0, bottomMatch.index).trim();
    rawSoalSection = (bottomMatch[1].trim() + '\n\n' + earlyQuestions).trim();
  }

  if (!rawSoalSection) {
    return teacherGuide;
  }

  // 3. Extract metadata for the single official KOP
  const sekolah = formData?.namaSekolah || extractIdentityField(text, /Nama\s+Satuan\s+Pendidikan|Satuan\s+Pendidikan|Nama\s+Sekolah/) || 'SD Negeri 1 Merdeka';
  const mapel = formData?.namaMapel || extractIdentityField(text, /Mata\s+Pelajaran|Mapel/) || 'Ilmu Pengetahuan Alam dan Sosial (IPAS)';
  const faseKelas = formData?.faseKelas || extractIdentityField(text, /Fase\s*\/\s*Kelas|Kelas\s*\/\s*Fase|Kelas/) || 'Fase B (Kelas 4)';
  const materi = formData?.materiPembelajaran || extractIdentityField(text, /Materi\s+Pembelajaran|Materi\s+Pokok/) || 'Metamorfosis Hewan dan Hubungan Rantai Makanan di Lingkungan Sekitar';

  // Detect assessment type and whether it is Sumatif
  const docStart = text.slice(0, 2500);
  const detectedJenis =
    formData?.asesmenConfig?.jenisAsesmen ||
    formData?.jenisAsesmen ||
    (docStart.match(/Asesmen\s+(Sumatif|Formatif|Diagnostik|Awal|Akhir\s+Semester)/i)?.[0]) ||
    'Sumatif';

  const isSumatif =
    /sumatif/i.test(detectedJenis) ||
    /sumatif/i.test(formData?.asesmenConfig?.jenisAsesmen || '') ||
    /sumatif/i.test(docStart);

  const formattedFaseKelas = formatFaseKelasKop(faseKelas);
  const materiPokokKopRow = !isSumatif
    ? `\n| **Materi Pokok** | : | ${materi} |`
    : '';

  // 4. CLEAN rawSoalSection to remove ALL repeated KOPs, headers, tables, and instructions:
  let cleanQuestions = rawSoalSection;

  // Extract and remove any stray image wrapper or img tag that was accidentally placed at the Kop Soal
  // before the actual questions start
  cleanQuestions = cleanQuestions.replace(/(?:^|\n)[ \t]*<div[^>]*class="[^"]*soal-image-wrapper[^"]*"[^>]*>[\s\S]*?<\/div>[ \t]*/gi, '\n');
  cleanQuestions = cleanQuestions.replace(/(?:^|\n)[ \t]*<img[^>]*>[ \t]*/gi, '\n');

  // Strip all "# NASKAH SOAL..." headings
  cleanQuestions = cleanQuestions.replace(/(?:^|\n)[ \t]*#{1,3}\s*NASKAH\s*SOAL[^\n]*/gi, '');

  // Strip stray "(ASESMEN SUMATIF)" or "### (ASESMEN ...)"
  cleanQuestions = cleanQuestions.replace(
    /(?:^|\n)[ \t]*(?:#{1,4}\s*)?\(?\s*(?:ASESMEN\s+)?(?:SUMATIF|FORMATIF|DIAGNOSTIK|AKHIR\s+SEMESTER)\s*\)?[:\s]*/gi,
    '\n'
  );

  // Strip "## 📌 Lembar Soal Peserta Didik" headings
  cleanQuestions = cleanQuestions.replace(/(?:^|\n)[ \t]*#{1,3}\s*(?:📌\s*)?Lembar\s*Soal\s*(?:Peserta\s*Didik|Murid|Siswa)[^\n]*/gi, '\n');

  // Strip all student identity tables inside soal section (including any previous Kop variations)
  cleanQuestions = cleanQuestions.replace(
    /(?:^|\n)[ \t]*\|[^\n]*(?:Nama\s+Satuan\s+Pendidikan|Nama\s+Peserta\s+Didik|Nama\s+Murid|Informasi|Fase\s*\/\s*Kelas|Nomor\s+Absen)[^\n]*\|(?:\n[ \t]*\|[^\n]*\|)*/gi,
    '\n'
  );
  cleanQuestions = cleanQuestions.replace(
    /(?:^|\n)[ \t]*\|[ \t]*Informasi[^\n]*\|[ \t]*:?[^\n]*\|[ \t]*Keterangan[^\n]*\|(?:\n[ \t]*\|[^\n]*\|)*/gi,
    '\n'
  );

  // Extract and preserve actual question content without accidentally wiping it out:
  const petunjukIdx = cleanQuestions.search(/(?:^|\n)[ \t]*(?:#{1,4}\s*)?(?:📝\s*)?Petunjuk\s*Pengerjaan\s*Soal/i);
  if (petunjukIdx !== -1) {
    const afterPetunjuk = cleanQuestions.slice(petunjukIdx);
    // 1. Look for horizontal rule (---) separating instructions from the questions
    const hrMatch = afterPetunjuk.match(/(?:^|\n)[ \t]*---[ \t]*(?:\n|$)/);
    if (hrMatch && hrMatch.index !== undefined) {
      const candidateQuestions = afterPetunjuk.slice(hrMatch.index + hrMatch[0].length).trim();
      if (candidateQuestions.length > 10) {
        cleanQuestions = candidateQuestions;
      }
    } else {
      // 2. Look for the start of sections or questions (Bagian, Pilihan Ganda, Soal 1, stimulus tag, etc.)
      const qStartMatch = afterPetunjuk.match(
        /(?:^|\n)[ \t]*(?:#{1,4}\s*(?:Bagian|[A-Z]\.|Soal|\b\d+\.)|(?:\*\*|__)?(?:Bagian\s+[A-Z]|Soal\s*(?:Nomor|No\.?)?\s*1|\b1\.)|\[\s*(?:GAMBAR|CHART|STIMULUS)|(?:\*\*|__)?Stimulus)/i
      );
      if (qStartMatch && qStartMatch.index !== undefined) {
        cleanQuestions = afterPetunjuk.slice(qStartMatch.index).trim();
      } else {
        // 3. Fallback: match after the last instruction item (e.g. 5. Periksa kembali...)
        const lastRuleMatch = afterPetunjuk.match(/(?:^|\n)\s*\d+\.\s+[^\n]*(?:diserahkan\s+kepada\s+guru|seluruh\s+jawabanmu|jawaban[^\n]*)\s*\n+/i);
        if (lastRuleMatch && lastRuleMatch.index !== undefined) {
          cleanQuestions = afterPetunjuk.slice(lastRuleMatch.index + lastRuleMatch[0].length).trim();
        }
      }
    }
  }

  // Clean remaining stray horizontal rules at the very top of questions and excessive blank lines
  cleanQuestions = cleanQuestions.replace(/^[ \t]*---[ \t]*\n*/, '').trim();
  cleanQuestions = cleanQuestions.replace(/(?:^|\n)[ \t]*---[ \t]*(?=\n)/g, '\n');
  cleanQuestions = cleanQuestions.replace(/\n{3,}/g, '\n\n').trim();

  // Safety fallback: if cleanQuestions somehow became empty or too short, recover from rawSoalSection!
  if (!cleanQuestions || cleanQuestions.length < 20) {
    let recovered = rawSoalSection
      .replace(/^[ \t]*#{1,3}\s*NASKAH\s*SOAL[^\n]*\n*/i, '')
      .replace(/^[ \t]*##[^\n]*Lembar\s*Soal[^\n]*\n*/i, '')
      .replace(/^[ \t]*\|[^\n]+\|[ \t]*\n*/gi, '')
      .trim();

    const pIdx = recovered.search(/(?:^|\n)[ \t]*(?:#{1,4}\s*)?(?:📝\s*)?Petunjuk\s*Pengerjaan\s*Soal/i);
    if (pIdx !== -1) {
      const rest = recovered.slice(pIdx);
      const divider = rest.match(/(?:^|\n)[ \t]*---[ \t]*(?:\n|$)/);
      if (divider && divider.index !== undefined) {
        recovered = rest.slice(divider.index + divider[0].length).trim();
      }
    }
    if (recovered.length > 20) {
      cleanQuestions = recovered;
    }
  }

  // 5. Construct EXACTLY ONE single official KOP conforming to standard:
  // - If Sumatif: "Materi Pokok" is hidden!
  // - "Nomor Absen / Kelas" -> "Fase / Kelas" with value adapted (e.g. B / 4 (Empat))
  // - "Alokasi Waktu" -> dots matching "Hari / Tanggal" for manual student entry
  const singleOfficialKop = `# NASKAH SOAL ASESMEN PEMBELAJARAN
### (${/asesmen/i.test(detectedJenis) ? detectedJenis.toUpperCase() : `ASESMEN ${detectedJenis.toUpperCase()}`})

## 📌 Lembar Soal Peserta Didik

| Informasi | : | Keterangan |
| :--- | :---: | :--- |
| **Nama Satuan Pendidikan** | : | ${sekolah} |
| **Nama Peserta Didik** | : | .................................................... |
| **Fase / Kelas** | : | ${formattedFaseKelas} |
| **Mata Pelajaran** | : | ${mapel} |${materiPokokKopRow}
| **Hari / Tanggal** | : | .................................................... |
| **Alokasi Waktu** | : | .................................................... |

---

### 📝 Petunjuk Pengerjaan Soal:
1. Berdoalah sebelum mulai mengerjakan soal.
2. Tuliskan nama lengkap pada kolom identitas di atas.
3. Bacalah setiap pertanyaan dan stimulus dengan cermat dan teliti.
4. Dahulukan menjawab pertanyaan yang kamu anggap paling mudah.
5. Periksa kembali seluruh jawabanmu dengan saksama sebelum diserahkan kepada guru.

---`;

  return teacherGuide.trim() + '\n\n' + singleOfficialKop + '\n\n' + cleanQuestions;
}

export interface SplitDocSections {
  topMarkdown: string;
  bodyMarkdown: string;
  signatureMarkdown: string;
  soalMarkdown?: string;
  kopSoalMarkdown?: string;
  pertanyaanMarkdown?: string;
}

/**
 * Automatically detects which question number a visual stimulus tag belongs to
 * (e.g. Soal Nomor 1, Soal Nomor 2, 1., 2., etc.) and tags it with _Q{number}
 * so that each question has its own dedicated upload area, Gemini prompt, and isolated image storage.
 */
export function enrichVisualStimulusTags(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  let currentQNum: string | null = null;
  const processedLines: string[] = [];
  let inPetunjuk = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (/Petunjuk\s*Pengerjaan\s*Soal/i.test(line)) {
      inPetunjuk = true;
    }
    if (inPetunjuk && (/^---\s*$/.test(line.trim()) || /#{1,4}\s*(?:Bagian|[A-Z]\.|Soal)/i.test(line))) {
      inPetunjuk = false;
    }

    // Detect question number headings or prefixes, e.g.:
    // "Soal Nomor 1", "**Soal Nomor 2**", "### Soal Nomor 3", "Soal No. 4", "1. Berdasarkan...", etc.
    const qMatch = !inPetunjuk && (
      line.match(/(?:^|[#*_~`\s])(?:Soal\s*(?:Nomor|No\.?)?\s*|Nomor\s+|No\.\s*)(\d+)/i) ||
      line.match(/^\s*(?:\*\*|__)?(\d{1,2})\.\s+(?!(?:Pedoman|Kunci|Rubrik|Kisi|Tabel|Panduan|Premis|Pilihan|Petunjuk|Berdoalah|Tuliskan|Bacalah|Dahulukan|Periksa|Kerjakan|\d))/i)
    );

    if (qMatch) {
      currentQNum = qMatch[1];
    }

    // Check if line contains a visual stimulus tag
    if (/\[\s*(?:GAMBAR_STIMULUS|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR)\s*:/i.test(line)) {
      // If inside Petunjuk Pengerjaan Soal, completely strip the tag!
      if (inPetunjuk) {
        continue;
      }
      const updatedLine = line.replace(
        /\[\s*(GAMBAR_STIMULUS|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR)(?:_Q\d+)?\s*:/gi,
        () => {
          return currentQNum ? `[GAMBAR_STIMULUS_Q${currentQNum}:` : `[GAMBAR_STIMULUS:`;
        }
      );
      processedLines.push(updatedLine);
    } else {
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
}

/**
 * Splits sanitized document markdown into:
 * 1. Top Section (Identitas Sekolah / Identitas Peserta Didik / Data Sekolah di atas Kisi-Kisi) -> Read-only / Locked
 * 2. Body Section (Isi Dokumen: langkah pembelajaran, petunjuk & butir soal, kunci, rubrik) -> Editable directly on sheet
 * 3. Bottom Section (Tanda Tangan resmi Kepala Sekolah & Guru) -> Read-only / Locked
 * 4. Soal Section (Naskah Soal Peserta Didik setelah tanda tangan):
 *    - kopSoalMarkdown: Official KOP & Petunjuk (Locked / Read-only - NO images can enter)
 *    - pertanyaanMarkdown: Actual questions (Editable / Stimulus blocks render directly in questions)
 */
export function splitDocForEditing(content: string, type?: string): SplitDocSections {
  if (!content) {
    return { topMarkdown: '', bodyMarkdown: '', signatureMarkdown: '', soalMarkdown: '', kopSoalMarkdown: '', pertanyaanMarkdown: '' };
  }

  let docToSplit = content;
  let soalMarkdown = '';
  let kopSoalMarkdown = '';
  let pertanyaanMarkdown = '';

  const isAsesmen = type === 'asesmen' || (!type && /Asesmen|Kisi-Kisi|Naskah\s*Soal|Matriks\s*Kisi-Kisi/i.test(content));

  // 1. For Asesmen, isolate the Naskah Soal section if placed after signature
  if (isAsesmen) {
    const naskahBottomRegex = /\n\s*(?:---\s*\n*)?(#{1,3}\s*(?:NASKAH\s*SOAL|Lembar\s*Soal|Bagian\s*A:|\bSOAL\s*ASESMEN)[\s\S]*)$/i;
    const naskahMatch = docToSplit.match(naskahBottomRegex);
    if (naskahMatch && naskahMatch.index !== undefined) {
      soalMarkdown = naskahMatch[1].trim();
      docToSplit = docToSplit.slice(0, naskahMatch.index).trim();

      // Separate Kop Soal (official header, identity table, petunjuk) from actual questions
      const petunjukDividerRegex = /(###\s*📝\s*Petunjuk\s*Pengerjaan\s*Soal:[\s\S]*?\n[ \t]*---[ \t]*\n)/i;
      const petunjukMatch = soalMarkdown.match(petunjukDividerRegex);

      if (petunjukMatch && petunjukMatch.index !== undefined) {
        const splitIdx = petunjukMatch.index + petunjukMatch[0].length;
        kopSoalMarkdown = soalMarkdown.slice(0, splitIdx).trim();
        pertanyaanMarkdown = soalMarkdown.slice(splitIdx).trim();
      } else {
        const firstQIdx = soalMarkdown.search(
          /(?:^|\n)[ \t]*(?:#{1,4}\s*(?:Bagian|[A-Z]\.|Soal\s*\d+|\b\d+\.)|(?:\*\*|__)?(?:Bagian\s+[A-Z]|Soal\s*(?:Nomor|No\.?)?\s*1|\b1\.)|\[\s*(?:GAMBAR|CHART|STIMULUS)|(?:\*\*|__)?Stimulus)/i
        );
        if (firstQIdx !== -1) {
          kopSoalMarkdown = soalMarkdown.slice(0, firstQIdx).trim();
          pertanyaanMarkdown = soalMarkdown.slice(firstQIdx).trim();
        } else {
          pertanyaanMarkdown = soalMarkdown;
        }
      }

      // If pertanyaanMarkdown is still empty, fallback to non-kop portion
      if (!pertanyaanMarkdown || pertanyaanMarkdown.trim().length === 0) {
        pertanyaanMarkdown = soalMarkdown;
      }
    } else {
      // Look for Naskah Soal anywhere in content
      const anyNaskahMatch = docToSplit.match(/(?:^|\n)[ \t]*(?:---[ \t]*\n*)?(#{1,3}\s*(?:NASKAH\s*SOAL|Lembar\s*Soal|Bagian\s*A:|\bSOAL\s*ASESMEN)[\s\S]*?)(?=\n\s*#{1,3}\s*(?:IV\.|4\.|V\.|5\.|[A-Z]\.)\s*(?:Kunci\s*Jawaban|Pembahasan|Pedoman\s*Penskoran|Rubrik)|$)/i);
      if (anyNaskahMatch && anyNaskahMatch.index !== undefined) {
        soalMarkdown = anyNaskahMatch[1].trim();
        docToSplit = docToSplit.replace(anyNaskahMatch[0], '\n');
        pertanyaanMarkdown = soalMarkdown;
      }
    }
  }

  // GUARANTEE: kopSoalMarkdown (and any Petunjuk Pengerjaan) MUST NEVER CONTAIN visual stimulus tags
  if (kopSoalMarkdown) {
    kopSoalMarkdown = kopSoalMarkdown.replace(
      /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
      ''
    );
  }

  // Enrich visual stimulus tags with question numbers
  if (pertanyaanMarkdown) {
    pertanyaanMarkdown = enrichVisualStimulusTags(pertanyaanMarkdown);
  }
  if (soalMarkdown) {
    soalMarkdown = enrichVisualStimulusTags(soalMarkdown);
  }
  if (docToSplit) {
    docToSplit = enrichVisualStimulusTags(docToSplit);
  }

  // 2. Isolate the signature block
  const sigRegex = /(?:^|\n)[ \t]*(?:---[ \t]*\n*)?(?:#{1,4}[ \t]*(?:Lembar\s+)?(?:Pengesahan|Tanda\s*Tangan)[^\n]*\n*)?([ \t]*\|?[ \t]*(?:\*\*|__)?Mengetahui[\s\S]*)$/i;

  let mainContent = docToSplit;
  let signatureMarkdown = '';

  const sigMatch = docToSplit.match(sigRegex);
  if (sigMatch && sigMatch.index !== undefined) {
    signatureMarkdown = docToSplit.slice(sigMatch.index).trim();
    mainContent = docToSplit.slice(0, sigMatch.index).trim();
  }

  let topMarkdown = '';
  let bodyMarkdown = mainContent;

  const isRppm = type === 'rppm' || (!type && /RENCANA\s+PELAKSANAAN\s+PEMBELAJARAN|\bRPPM\b|Identitas\s+Sekolah/i.test(mainContent));
  const isLkpd = type === 'lkpd' || (!type && /LEMBAR\s+KERJA\s+PESERTA\s+DIDIK|\bLKPD\b|Identitas\s+Peserta\s+Didik/i.test(mainContent));

  if (isRppm) {
    const sectionBMatch = mainContent.match(/\n\s*#{1,3}\s*(?:B\.|Identifikasi|[B-Z]\.)[^\n]*/i);
    if (sectionBMatch && sectionBMatch.index !== undefined) {
      topMarkdown = mainContent.slice(0, sectionBMatch.index).trim();
      bodyMarkdown = mainContent.slice(sectionBMatch.index).trim();
    }
  } else if (isLkpd) {
    const identitasIdx = mainContent.search(/\n\s*#{1,3}\s*[^#\n]*Identitas\s+Peserta\s+Didik/i);
    if (identitasIdx !== -1) {
      const afterIdentitas = mainContent.slice(identitasIdx);
      const nextHeadingMatch = afterIdentitas.match(/\n\s*#{1,3}\s+(?!(?:📌\s*)?Identitas\s+Peserta\s+Didik)[^\n]+/i);
      if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
        const splitPoint = identitasIdx + nextHeadingMatch.index;
        topMarkdown = mainContent.slice(0, splitPoint).trim();
        bodyMarkdown = mainContent.slice(splitPoint).trim();
      }
    }
  } else if (isAsesmen) {
    const kisiMatrixHeaderMatch = mainContent.match(/\n\s*#{1,4}\s*Tabel\s*Matriks\s*Kisi-Kisi[^\n]*/i);
    if (kisiMatrixHeaderMatch && kisiMatrixHeaderMatch.index !== undefined) {
      topMarkdown = mainContent.slice(0, kisiMatrixHeaderMatch.index).trim();
      bodyMarkdown = mainContent.slice(kisiMatrixHeaderMatch.index).trim();
    } else {
      const matrixTableMatch = mainContent.match(/\n\s*\|[^\n]*Level\s*Kognitif[^\n]*\|/i);
      if (matrixTableMatch && matrixTableMatch.index !== undefined) {
        topMarkdown = mainContent.slice(0, matrixTableMatch.index).trim();
        bodyMarkdown = mainContent.slice(matrixTableMatch.index).trim();
      }
    }
  }

  if (!topMarkdown) {
    bodyMarkdown = mainContent;
  }

  // Double guarantee: ensure that Pedoman Penskoran and teacher's guide (bodyMarkdown)
  // NEVER contain visual stimulus tags or upload blocks
  bodyMarkdown = bodyMarkdown.replace(
    /\[\s*(?:CHART_URL|GAMBAR_STIMULUS|GAMBAR_OPSI_[A-E]|GAMBAR_ITEM_[A-Za-z0-9_]+|GAMBAR_SOAL_\d+|GAMBAR_\d+|GAMBAR_SOAL|GAMBAR|ILUSTRASI|DIAGRAM|BAGAN|STIMULUS_GAMBAR|IMAGE|FIGURE)[^\]]*\]/gi,
    ''
  );

  return {
    topMarkdown,
    bodyMarkdown,
    signatureMarkdown,
    soalMarkdown,
    kopSoalMarkdown,
    pertanyaanMarkdown: pertanyaanMarkdown || soalMarkdown,
  };
}

