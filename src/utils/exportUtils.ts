/**
 * Utility functions to export documents to Word (.doc), Markdown (.md), and clipboard.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

export async function copyRichHtmlToClipboard(
  htmlContent: string,
  plainText: string
): Promise<boolean> {
  try {
    let formattedHtml = htmlContent;

    // 1. Remove redundant "Lembar Pengesahan" heading if present
    formattedHtml = formattedHtml.replace(/<h[1-6]\b[^>]*>\s*(?:Lembar\s+)?(?:Pengesahan|Tanda\s*Tangan)\s*<\/h[1-6]>/gi, '');

    // 1b. Clean visual stimulus blocks: if has image, keep only image; if NO image, REMOVE COMPLETELY!
    formattedHtml = formattedHtml.replace(
      /<div\b[^>]*class="[^"]*visual-stimulus-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      (_fullBlock, inner) => {
        const imgMatch = inner.match(/<img\b[^>]*>/i);
        if (imgMatch) {
          return `<div class="visual-stimulus-wrapper" style="margin:10pt 0; text-align:center; border:none; background:transparent;">${imgMatch[0]}</div>`;
        }
        return '';
      }
    );
    formattedHtml = formattedHtml.replace(/<div\b[^>]*(?:class="[^"]*(?:stimulus-header-bar|stimulus-caption-box)[^"]*"|data-stimulus-[^=]+="true")[^>]*>[\s\S]*?<\/div>/gi, '');
    formattedHtml = formattedHtml.replace(/\[\s*Stimulus\s*Gambar\s*Soal\s*:[^\]]*\]/gi, '');
    formattedHtml = formattedHtml.replace(/\[\s*GAMBAR_STIMULUS[^\]]*\]/gi, '');

    // 2. Format Signature Tables as borderless for Word/Docs with clean 2-column alignment (matching image 8.png)
    formattedHtml = formattedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, _attrs, inner) => {
      if (/Mengetahui|Kepala|Guru/i.test(inner)) {
        const cleanInner = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
          const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
          if (cells.length >= 2) {
            return `<tr style="border:none;">
              <td style="border:none !important; border-width:0 !important; padding:2px 14px 2px 0; vertical-align:top; width:50%; text-align:left; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[0]}</td>
              <td style="border:none !important; border-width:0 !important; padding:2px 0 2px 20px; vertical-align:top; width:50%; text-align:left; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[1]}</td>
            </tr>`;
          }
          return _rowMatch;
        });
        return `<table class="signature-table" border="0" style="border:none !important; border-width:0 !important; border-collapse:collapse; width:100%; margin-top:20px; margin-bottom:16px; page-break-inside:avoid;">${cleanInner}</table>`;
      }
      return fullTable;
    });

    // 3. Format Identity Tables as borderless with colon alignment (images 11.png and 12.png)
    formattedHtml = formattedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, _attrs, inner) => {
      if (/Nama Satuan Pendidikan|Kelompok \/ Nama Anggota|Nama Penyusun|Materi Pokok/i.test(inner)) {
        let cleanInner = inner.replace(/<thead>[\s\S]*?<\/thead>/gi, '');
        cleanInner = cleanInner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
          const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
          if (cells.length >= 3) {
            return `<tr style="border:none;">
              <td style="border:none !important; padding:2px 6px 2px 0; vertical-align:top; width:30%; font-weight:bold;">${cells[0]}</td>
              <td style="border:none !important; padding:2px 6px; vertical-align:top; width:3%; text-align:center;">${cells[1]}</td>
              <td style="border:none !important; padding:2px 0 2px 6px; vertical-align:top; width:67%;">${cells[2]}</td>
            </tr>`;
          } else if (cells.length === 2) {
            return `<tr style="border:none;">
              <td style="border:none !important; padding:2px 6px 2px 0; vertical-align:top; width:30%; font-weight:bold;">${cells[0]}</td>
              <td style="border:none !important; padding:2px 0 2px 6px; vertical-align:top; width:70%;">${cells[1]}</td>
            </tr>`;
          }
          return _rowMatch;
        });
        return `<table class="identity-table" border="0" style="border:none !important; border-width:0 !important; border-collapse:collapse; width:100%; margin-top:6px; margin-bottom:14px;">${cleanInner}</table>`;
      }
      return fullTable;
    });

    // 4. Format Soal Benar / Salah tables with clean proportions for Word & Docs
    formattedHtml = formattedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, attrs, inner) => {
      if (!/identity-table|signature-table/i.test(attrs) && ((inner.includes('Benar') && inner.includes('Salah')) || attrs.includes('benar-salah-table'))) {
        const isAnswerTable = /Pembahasan|Alasan|Keterangan|Analisis/i.test(inner);
        const cleanInner = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
          const isHeader = /<th\b/i.test(rowCells);
          const tag = isHeader ? 'th' : 'td';
          const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
          if (cells.length === 4) {
            const widths = isAnswerTable ? ['6%', '46%', '14%', '34%'] : ['6%', '70%', '12%', '12%'];
            const aligns = isAnswerTable
              ? ['center', isHeader ? 'center' : 'justify', 'center', isHeader ? 'center' : 'justify']
              : ['center', isHeader ? 'center' : 'justify', 'center', 'center'];
            const bg = isHeader ? 'background-color:#f2f2f2; font-weight:bold;' : '';
            const formattedCells = cells.map((cell, idx) => {
              return `<${tag} style="border:1pt solid #000; padding:4pt 6pt; width:${widths[idx]}; text-align:${aligns[idx]}; vertical-align:${isHeader ? 'middle' : 'top'}; font-size:10pt; word-wrap:break-word; ${bg}">${cell}</${tag}>`;
            }).join('');
            return `<tr>${formattedCells}</tr>`;
          }
          return _rowMatch;
        });
        return `<table class="benar-salah-table" border="1" style="border:1pt solid #000; border-collapse:collapse; width:100%; table-layout:fixed; margin-top:6pt; margin-bottom:12pt;">${cleanInner}</table>`;
      }
      return fullTable;
    });

    // 5. Format Pilihan Ganda Kompleks (PGK) checkboxes into Word & Docs compatible hanging indent paragraphs
    // Ensures checkbox ballot box (&#9633;) and the statement sit horizontally on the exact same line
    formattedHtml = formattedHtml.replace(
      /<div\b[^>]*(?:class="[^"]*(?:pgk|flex)[^"]*"|data-pgk="true")[^>]*>\s*(?:<span\b[^>]*>[\s\S]*?<\/span>|&#9633;|□)\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
      '<p class="pgk-word-item" style="margin-top:3pt; margin-bottom:4pt; margin-left:24pt; text-indent:-18pt; text-align:justify; line-height:1.45; font-family:\'Times New Roman\', Times, serif; font-size:11pt;"><span class="pgk-box-symbol" style="font-family:\'Segoe UI Symbol\',\'Arial Unicode MS\',sans-serif; font-size:12pt; mso-ascii-font-family:\'Segoe UI Symbol\'; mso-hansi-font-family:\'Segoe UI Symbol\';">&#9633;</span>&nbsp;&nbsp;$1</p>'
    );
    formattedHtml = formattedHtml.replace(
      /<div\b[^>]*class="[^"]*(?:flex|pgk)[^"]*"[^>]*>\s*(?:&#9633;|□)\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
      '<p class="pgk-word-item" style="margin-top:3pt; margin-bottom:4pt; margin-left:24pt; text-indent:-18pt; text-align:justify; line-height:1.45; font-family:\'Times New Roman\', Times, serif; font-size:11pt;"><span class="pgk-box-symbol" style="font-family:\'Segoe UI Symbol\',\'Arial Unicode MS\',sans-serif; font-size:12pt; mso-ascii-font-family:\'Segoe UI Symbol\'; mso-hansi-font-family:\'Segoe UI Symbol\';">&#9633;</span>&nbsp;&nbsp;$1</p>'
    );
    formattedHtml = formattedHtml.replace(/<span\b[^>]*border-[^>]*><\/span>/gi, '&#9633; ');

    // 6. Pastikan bagian Pedoman Penskoran LKPD tidak mewarisi atribut pemaksa pindah halaman di Word / Docs
    formattedHtml = formattedHtml.replace(
      /<(?:div|h[2-4])\b[^>]*class="[^"]*pedoman-penskoran-lkpd[^"]*"[^>]*>/gi,
      '<div style="page-break-before:auto !important; break-before:auto !important; margin-top:8pt; margin-bottom:4pt;">'
    );

    if (navigator.clipboard && window.isSecureContext && typeof ClipboardItem !== 'undefined') {
      const blobHtml = new Blob([formattedHtml], { type: 'text/html' });
      const blobPlain = new Blob([plainText], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })];
      await navigator.clipboard.write(data);
      return true;
    } else {
      return copyTextToClipboard(plainText);
    }
  } catch (err) {
    console.warn('Rich copy fallback to plain text:', err);
    return copyTextToClipboard(plainText);
  }
}

export function downloadMarkdownFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadDocFile(contentHtml: string, title: string) {
  // Convert rendered HTML to Word-compatible MIME HTML document
  const wordHeader = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 21cm 29.7cm;
          margin: 2cm 2cm 2cm 2cm;
          mso-page-orientation: portrait;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000000;
        }
        h1 {
          font-size: 13pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin-top: 4pt;
          margin-bottom: 2pt;
          line-height: 1.25;
        }
        .doc-subtitle, h1 + h3 {
          font-size: 11pt;
          font-weight: bold;
          text-align: center;
          margin-top: 0;
          margin-bottom: 12pt;
          line-height: 1.25;
        }
        h2 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 12pt;
          margin-bottom: 5pt;
          border-bottom: 1pt solid #000;
        }
        h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-top: 8pt;
          margin-bottom: 3pt;
        }
        p {
          margin-bottom: 6pt;
          text-align: justify;
          text-justify: inter-word;
        }
        li {
          margin-bottom: 3pt;
          text-align: justify;
          text-justify: inter-word;
        }
        ul, ol {
          margin-left: 18pt;
          margin-bottom: 6pt;
          text-align: justify;
        }
        blockquote {
          margin: 6pt 0;
          padding-left: 12pt;
          border-left: 3pt solid #ccc;
          text-align: justify;
          text-justify: inter-word;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8pt;
          margin-bottom: 12pt;
          table-layout: fixed;
          word-wrap: break-word;
        }
        th, td {
          border: 1pt solid #000000;
          padding: 4pt 6pt;
          font-size: 10pt;
          word-wrap: break-word;
          vertical-align: top;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
        }
        /* Benar / Salah tables in Word (.doc) */
        table.benar-salah-table, table[data-benar-salah="true"] {
          font-size: 10pt;
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          margin-top: 6pt;
          margin-bottom: 12pt;
        }
        table.benar-salah-table th, table[data-benar-salah="true"] th {
          background-color: #f2f2f2;
          padding: 4pt 6pt;
          font-size: 10pt;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
        }
        table.benar-salah-table td, table[data-benar-salah="true"] td {
          padding: 4pt 6pt;
          font-size: 10pt;
          vertical-align: top;
          word-wrap: break-word;
        }
        /* Rubric tables and multi-column tables in Word (.doc) */
        table.rubric-table, table[data-rubric="true"] {
          font-size: 8.5pt;
          table-layout: fixed;
          width: 100%;
        }
        table.rubric-table th, table.rubric-table td,
        table[data-rubric="true"] th, table[data-rubric="true"] td {
          padding: 3pt 4.5pt;
          font-size: 8.5pt;
          word-wrap: break-word;
        }
        /* Kisi-kisi penulisan soal table in Word (.doc) */
        table.kisi-kisi-table, table[data-kisi="true"] {
          font-size: 8pt;
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          margin-top: 6pt;
          margin-bottom: 12pt;
        }
        table.kisi-kisi-table th, table[data-kisi="true"] th {
          background-color: #f2f2f2;
          padding: 4pt 3pt;
          font-size: 8pt;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
        }
        table.kisi-kisi-table td, table[data-kisi="true"] td {
          padding: 3pt 4pt;
          font-size: 8pt;
          vertical-align: top;
          word-wrap: break-word;
        }
        /* Borderless signature table matching Indonesian official school format (8.png) */
        table.signature-table, table[data-signature="true"] {
          border: none !important;
          border-width: 0 !important;
          border-collapse: collapse !important;
          width: 100% !important;
          margin-top: 14pt !important;
          margin-bottom: 14pt !important;
        }
        table.signature-table th, table.signature-table td,
        table[data-signature="true"] th, table[data-signature="true"] td {
          border: none !important;
          border-width: 0 !important;
          background-color: transparent !important;
          padding: 2pt 4pt !important;
          vertical-align: top !important;
        }
        /* Borderless identity table matching official format (11.png and 12.png) */
        table.identity-table, table[data-identity="true"] {
          border: none !important;
          border-width: 0 !important;
          border-collapse: collapse !important;
          width: 100% !important;
          margin-top: 6pt !important;
          margin-bottom: 12pt !important;
        }
        table.identity-table thead, table[data-identity="true"] thead {
          display: none !important;
        }
        table.identity-table th, table.identity-table td,
        table[data-identity="true"] th, table[data-identity="true"] td {
          border: none !important;
          border-width: 0 !important;
          background-color: transparent !important;
          padding: 2pt 4pt !important;
          vertical-align: top !important;
          font-size: 11pt !important;
        }
        img {
          max-width: 100% !important;
          height: auto !important;
          display: block;
          margin: 8pt auto;
        }
        .soal-image-wrapper, .visual-stimulus-wrapper, .visual-image-display {
          margin: 10pt 0;
          text-align: center;
        }
        .pgk-word-item, p.pgk-option {
          margin-top: 3pt !important;
          margin-bottom: 4pt !important;
          margin-left: 24pt !important;
          text-indent: -18pt !important;
          text-align: justify !important;
          text-justify: inter-word !important;
          line-height: 1.45 !important;
          font-family: 'Times New Roman', Times, serif !important;
          font-size: 11pt !important;
        }
        .pgk-box-symbol {
          font-family: 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif !important;
          font-size: 12pt !important;
          mso-ascii-font-family: 'Segoe UI Symbol' !important;
          mso-hansi-font-family: 'Segoe UI Symbol' !important;
        }
      </style>
    </head>
    <body>
      ${(() => {
        let processedHtml = contentHtml;

        // 1. Remove redundant "Lembar Pengesahan" heading if present
        processedHtml = processedHtml.replace(/<h[1-6]\b[^>]*>\s*(?:Lembar\s+)?(?:Pengesahan|Tanda\s*Tangan)\s*<\/h[1-6]>/gi, '');

        // 1b. Bersihkan blok stimulus visual soal: jika memiliki gambar, simpan gambarnya saja; jika TIDAK memiliki gambar, HAPUS TOTAL dari Word!
        processedHtml = processedHtml.replace(
          /<div\b[^>]*class="[^"]*visual-stimulus-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
          (_fullBlock, inner) => {
            const imgMatch = inner.match(/<img\b[^>]*>/i);
            if (imgMatch) {
              return `<div class="visual-stimulus-wrapper" style="margin:10pt 0; text-align:center; border:none; background:transparent;">${imgMatch[0]}</div>`;
            }
            return '';
          }
        );
        processedHtml = processedHtml.replace(/<div\b[^>]*(?:class="[^"]*(?:stimulus-header-bar|stimulus-caption-box)[^"]*"|data-stimulus-[^=]+="true")[^>]*>[\s\S]*?<\/div>/gi, '');
        processedHtml = processedHtml.replace(/<div\b[^>]*>\s*\[\s*Stimulus\s*Gambar\s*Soal\s*:[^\]]*\]\s*<\/div>/gi, '');
        processedHtml = processedHtml.replace(/\[\s*Stimulus\s*Gambar\s*Soal\s*:[^\]]*\]/gi, '');
        processedHtml = processedHtml.replace(/\[\s*GAMBAR_STIMULUS[^\]]*\]/gi, '');

        // 2. Tag and format signature tables as borderless in Word HTML with 2-column 50% width (matching image 8.png)
        processedHtml = processedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, attrs, inner) => {
          if (/Mengetahui|Kepala|Guru/i.test(inner)) {
            const cleanInner = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
              const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
              if (cells.length >= 2) {
                return `<tr style="border:none !important;">
                  <td style="border:none !important; border-width:0 !important; padding:2pt 12pt 2pt 0; vertical-align:top; width:50%; text-align:left; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[0]}</td>
                  <td style="border:none !important; border-width:0 !important; padding:2pt 0 2pt 18pt; vertical-align:top; width:50%; text-align:left; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[1]}</td>
                </tr>`;
              }
              return _rowMatch;
            });
            return `<table class="signature-table" data-signature="true" border="0" style="border:none !important; border-width:0 !important; border-collapse:collapse; width:100%; margin-top:18pt; margin-bottom:14pt; page-break-inside:avoid;">${cleanInner}</table>`;
          }
          return fullTable;
        });

        // 3. Format Kisi-Kisi Penulisan Soal tables with exact proportional column widths for A4 Word
        processedHtml = processedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, attrs, inner) => {
          if (/Level Kognitif/i.test(inner) && /Bentuk Soal|No\.?\s*Soal/i.test(inner)) {
            const cleanInner = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
              const isHeader = /<th\b/i.test(rowCells);
              const tag = isHeader ? 'th' : 'td';
              const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);

              if (cells.length === 7) {
                const widths = ['5%', '20%', '17%', '32%', '10%', '9%', '7%'];
                const aligns = ['center', isHeader ? 'center' : 'justify', isHeader ? 'center' : 'left', isHeader ? 'center' : 'justify', 'center', 'center', 'center'];
                const bg = isHeader ? 'background-color:#f2f2f2; font-weight:bold;' : '';

                const formattedCells = cells.map((cell, idx) => {
                  return `<${tag} style="border:1pt solid #000; padding:3pt 3.5pt; width:${widths[idx]}; text-align:${aligns[idx]}; vertical-align:${isHeader ? 'middle' : 'top'}; font-size:8pt; word-wrap:break-word; ${bg}">${cell}</${tag}>`;
                }).join('');

                return `<tr>${formattedCells}</tr>`;
              } else if (cells.length === 6) {
                const widths = ['5%', '25%', '42%', '11%', '10%', '7%'];
                const aligns = ['center', isHeader ? 'center' : 'left', isHeader ? 'center' : 'justify', 'center', 'center', 'center'];
                const bg = isHeader ? 'background-color:#f2f2f2; font-weight:bold;' : '';

                const formattedCells = cells.map((cell, idx) => {
                  return `<${tag} style="border:1pt solid #000; padding:3pt 3.5pt; width:${widths[idx]}; text-align:${aligns[idx]}; vertical-align:${isHeader ? 'middle' : 'top'}; font-size:8pt; word-wrap:break-word; ${bg}">${cell}</${tag}>`;
                }).join('');

                return `<tr>${formattedCells}</tr>`;
              }
              return _rowMatch;
            });
            return `<table class="kisi-kisi-table" data-kisi="true" border="1" style="border:1pt solid #000; border-collapse:collapse; width:100%; table-layout:fixed; margin-top:6pt; margin-bottom:12pt;">${cleanInner}</table>`;
          }
          return fullTable;
        });

        // 4. Tag and format identity tables (and Kisi-Kisi Kop) as borderless in Word HTML (11.png & 12.png)
        processedHtml = processedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, attrs, inner) => {
          if (!/Level Kognitif|Bentuk Soal/i.test(inner) && /Nama Satuan Pendidikan|Kelompok \/ Nama Anggota|Nama Penyusun|Informasi Identitas|Materi Pokok/i.test(inner)) {
            let cleanInner = inner.replace(/<thead>[\s\S]*?<\/thead>/gi, '');
            cleanInner = cleanInner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
              const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
              if (cells.length >= 3) {
                return `<tr style="border:none;">
                  <td style="border:none; padding:2pt 4pt 2pt 0; vertical-align:top; width:30%; font-weight:bold; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[0]}</td>
                  <td style="border:none; padding:2pt 4pt; vertical-align:top; width:3%; text-align:center; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[1]}</td>
                  <td style="border:none; padding:2pt 0 2pt 4pt; vertical-align:top; width:67%; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[2]}</td>
                </tr>`;
              } else if (cells.length === 2) {
                return `<tr style="border:none;">
                  <td style="border:none; padding:2pt 4pt 2pt 0; vertical-align:top; width:30%; font-weight:bold; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[0]}</td>
                  <td style="border:none; padding:2pt 0 2pt 4pt; vertical-align:top; width:70%; font-size:11pt; font-family:'Times New Roman', Times, serif;">${cells[1]}</td>
                </tr>`;
              }
              return _rowMatch;
            });
            return `<table class="identity-table" data-identity="true" border="0" style="border:none; border-collapse:collapse; width:100%; margin-top:6pt; margin-bottom:12pt;">${cleanInner}</table>`;
          }
          return fullTable;
        });

        // 5. Format Soal Menjodohkan (2 columns: 50% - 50%) in Word (.doc)
        processedHtml = processedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, attrs, inner) => {
          if (!/identity-table|signature-table/i.test(attrs) && (/Kolom A|Kolom B|Menjodohkan|Premis|Pilihan Jawaban|Opsi/i.test(inner) || attrs.includes('matching-table') || attrs.includes('data-matching'))) {
            const cleanInner = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
              const isHeader = /<th\b/i.test(rowCells);
              const tag = isHeader ? 'th' : 'td';
              const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
              if (cells.length === 2) {
                const bg = isHeader ? 'background-color:#f2f2f2; font-weight:bold;' : '';
                const cell0 = cells[0].trim() || '&nbsp;';
                const cell1 = cells[1].trim() || '&nbsp;';
                return `<tr>
                  <${tag} style="border:1pt solid #000; padding:4pt 6pt; width:50%; text-align:left; vertical-align:top; font-size:9.5pt; word-wrap:break-word; ${bg}">${cell0}</${tag}>
                  <${tag} style="border:1pt solid #000; padding:4pt 6pt; width:50%; text-align:left; vertical-align:top; font-size:9.5pt; word-wrap:break-word; ${bg}">${cell1}</${tag}>
                </tr>`;
              }
              return _rowMatch;
            });
            return `<table class="matching-table" border="1" style="border:1pt solid #000; border-collapse:collapse; width:100%; table-layout:fixed; margin-top:6pt; margin-bottom:12pt;">${cleanInner}</table>`;
          }
          return fullTable;
        });

        // 6. Format Soal Benar / Salah in Word (.doc)
        processedHtml = processedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, attrs, inner) => {
          if (!/identity-table|signature-table|kisi-kisi-table/i.test(attrs) && ((inner.includes('Benar') && inner.includes('Salah')) || attrs.includes('benar-salah-table'))) {
            const isAnswerTable = /Pembahasan|Alasan|Keterangan|Analisis/i.test(inner);
            const cleanInner = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
              const isHeader = /<th\b/i.test(rowCells);
              const tag = isHeader ? 'th' : 'td';
              const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
              if (cells.length === 4) {
                const widths = isAnswerTable ? ['6%', '46%', '14%', '34%'] : ['6%', '70%', '12%', '12%'];
                const aligns = isAnswerTable
                  ? ['center', isHeader ? 'center' : 'justify', 'center', isHeader ? 'center' : 'justify']
                  : ['center', isHeader ? 'center' : 'justify', 'center', 'center'];
                const bg = isHeader ? 'background-color:#f2f2f2; font-weight:bold;' : '';
                const formattedCells = cells.map((cell, idx) => {
                  return `<${tag} style="border:1pt solid #000; padding:4pt 6pt; width:${widths[idx]}; text-align:${aligns[idx]}; vertical-align:${isHeader ? 'middle' : 'top'}; font-size:10pt; word-wrap:break-word; ${bg}">${cell}</${tag}>`;
                }).join('');
                return `<tr>${formattedCells}</tr>`;
              } else if (cells.length === 3) {
                const widths = ['8%', '72%', '20%'];
                const aligns = ['center', isHeader ? 'center' : 'justify', 'center'];
                const bg = isHeader ? 'background-color:#f2f2f2; font-weight:bold;' : '';
                const formattedCells = cells.map((cell, idx) => {
                  return `<${tag} style="border:1pt solid #000; padding:4pt 6pt; width:${widths[idx]}; text-align:${aligns[idx]}; vertical-align:${isHeader ? 'middle' : 'top'}; font-size:10pt; word-wrap:break-word; ${bg}">${cell}</${tag}>`;
                }).join('');
                return `<tr>${formattedCells}</tr>`;
              }
              return _rowMatch;
            });
            return `<table class="benar-salah-table" data-benar-salah="true" border="1" style="border:1pt solid #000; border-collapse:collapse; width:100%; table-layout:fixed; margin-top:6pt; margin-bottom:12pt;">${cleanInner}</table>`;
          }
          return fullTable;
        });

        // 7. Format Pedoman Penskoran & Konversi Nilai Akhir in Word (.doc)
        processedHtml = processedHtml.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullTable, attrs, inner) => {
          if (/Pedoman Penskoran|Konversi Nilai Akhir|penskoran-table/i.test(attrs + inner) || (/Bentuk Soal/i.test(inner) && /Skor Maksimal/i.test(inner))) {
            const cleanInner = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowCells) => {
              const isHeader = /<th\b/i.test(rowCells);
              const tag = isHeader ? 'th' : 'td';
              const cells = [...rowCells.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);
              if (cells.length === 4) {
                const widths = ['8%', '22%', '56%', '14%'];
                const aligns = ['center', isHeader ? 'center' : 'left', isHeader ? 'center' : 'left', 'center'];
                const bg = isHeader ? 'background-color:#f2f2f2; font-weight:bold;' : '';
                const formattedCells = cells.map((cell, idx) => {
                  return `<${tag} style="border:1pt solid #000; padding:3.5pt 4pt; width:${widths[idx]}; text-align:${aligns[idx]}; vertical-align:${isHeader ? 'middle' : 'top'}; font-size:8.5pt; ${idx === 3 ? 'white-space:nowrap;' : 'word-wrap:break-word;'} ${bg}">${cell}</${tag}>`;
                }).join('');
                return `<tr>${formattedCells}</tr>`;
              }
              return _rowMatch;
            });
            return `<table class="penskoran-table" border="1" style="border:1pt solid #000; border-collapse:collapse; width:100%; table-layout:fixed; margin-top:6pt; margin-bottom:12pt;">${cleanInner}</table>`;
          }
          return fullTable;
        });

        // 7. Format Pilihan Ganda Kompleks (PGK) checkboxes into Word-native hanging indent paragraphs
        // Guarantees checkbox ballot box (&#9633;) and the statement sit horizontally on the exact same line
        processedHtml = processedHtml.replace(
          /<div\b[^>]*(?:class="[^"]*(?:pgk|flex)[^"]*"|data-pgk="true")[^>]*>\s*(?:<span\b[^>]*>[\s\S]*?<\/span>|&#9633;|□)\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
          '<p class="pgk-word-item" style="margin-top:3pt; margin-bottom:4pt; margin-left:24pt; text-indent:-18pt; text-align:justify; line-height:1.45; font-family:\'Times New Roman\', Times, serif; font-size:11pt;"><span class="pgk-box-symbol" style="font-family:\'Segoe UI Symbol\',\'Arial Unicode MS\',sans-serif; font-size:12pt; mso-ascii-font-family:\'Segoe UI Symbol\'; mso-hansi-font-family:\'Segoe UI Symbol\';">&#9633;</span>&nbsp;&nbsp;$1</p>'
        );
        processedHtml = processedHtml.replace(
          /<div\b[^>]*class="[^"]*(?:flex|pgk)[^"]*"[^>]*>\s*(?:&#9633;|□)\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
          '<p class="pgk-word-item" style="margin-top:3pt; margin-bottom:4pt; margin-left:24pt; text-indent:-18pt; text-align:justify; line-height:1.45; font-family:\'Times New Roman\', Times, serif; font-size:11pt;"><span class="pgk-box-symbol" style="font-family:\'Segoe UI Symbol\',\'Arial Unicode MS\',sans-serif; font-size:12pt; mso-ascii-font-family:\'Segoe UI Symbol\'; mso-hansi-font-family:\'Segoe UI Symbol\';">&#9633;</span>&nbsp;&nbsp;$1</p>'
        );
        processedHtml = processedHtml.replace(/<span\b[^>]*border-[^>]*><\/span>/gi, '&#9633; ');

        // 8. Strip any stray markdown separator rows (:---:) that might be embedded in HTML
        processedHtml = processedHtml.replace(/<tr>\s*(?:<td\b[^>]*>[:\-\s]+<\/td>\s*)+<\/tr>/gi, '');

        // 9. Ensure Naskah Soal Peserta Didik starts on a fresh new page in Microsoft Word (.doc)
        processedHtml = processedHtml.replace(
          /(<h[1-3]\b[^>]*>(?:#\s*)?(?:NASKAH\s*SOAL|Lembar\s*Soal\s*Peserta\s*Didik)[^<]*<\/h[1-3]>)/i,
          '<br clear="all" style="page-break-before:always; mso-break-type:section-break" />$1'
        );

        return processedHtml;
      })()}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHeader], {
    type: 'application/msword;charset=utf-8',
  });

  const cleanFilename = (title || 'Dokumen_Asesmen')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanFilename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
