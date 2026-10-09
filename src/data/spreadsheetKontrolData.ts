export interface SpreadsheetKontrolRow {
  namaSekolah: string;
  namaGuru: string;
  kontrolJabatanGuru: 'Guru Kelas' | 'Guru Mata Pelajaran';
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK';
  mataPelajaran: string[];
  rawMataPelajaran: string;
}

export const SPREADSHEET_ID = '11ge9fae0Lyopjvm2IzXKYJxgyasYx6ptsLZpcd4-6X4';
export const SHEET_NAME = 'KONTROL';
export const SPREADSHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

/**
 * Normalizes string for robust comparison (handles whitespace, punctuation, accents, casing)
 */
export function normalizeName(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes teacher name strictly following user requirement:
 * - Tanda koma (,) dan titik (.) WAJIB SAMA (tidak dihilangkan dan harus cocok persis).
 * - Huruf besar dan huruf kecil tetap terbaca sama (case-insensitive).
 * - Spasi ganda/spasi di sekitar tanda baca dirapikan.
 */
export function normalizeTeacherName(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits raw subject cell into clean individual subject strings.
 * Handles quoted substrings like "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)".
 */
export function parseSubjects(raw: string): string[] {
  if (!raw) return [];
  const list: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"' || char === '“' || char === '”') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      const clean = current
        .trim()
        .replace(/^["“”']+|["“”']+$/g, '')
        .trim();
      if (clean) list.push(clean);
      current = '';
    } else {
      current += char;
    }
  }

  const cleanEnd = current
    .trim()
    .replace(/^["“”']+|["“”']+$/g, '')
    .trim();
  if (cleanEnd) list.push(cleanEnd);

  return list;
}

/**
 * Parses CSV text returned from Google Sheets
 */
export function parseSpreadsheetCSV(csvText: string): SpreadsheetKontrolRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentVal.trim());
      currentVal = '';
      if (row.length > 0 && row.some((c) => c !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }

  if (rows.length <= 1) return [];

  // Skip header row
  return rows.slice(1).map((r) => {
    const namaSekolah = (r[0] || '').trim();
    const namaGuru = (r[1] || '').trim();
    const rawJabatan = (r[2] || '').trim();
    const kontrolJabatanGuru: 'Guru Kelas' | 'Guru Mata Pelajaran' =
      rawJabatan.toLowerCase().includes('mata pelajaran')
        ? 'Guru Mata Pelajaran'
        : 'Guru Kelas';
    const jenjang = ((r[3] || 'SD').trim().toUpperCase() as 'SD' | 'SMP' | 'SMA' | 'SMK') || 'SD';
    const rawMataPelajaran = (r[4] || '').trim();
    const mataPelajaran = parseSubjects(rawMataPelajaran);

    return {
      namaSekolah,
      namaGuru,
      kontrolJabatanGuru,
      jenjang,
      mataPelajaran,
      rawMataPelajaran,
    };
  }).filter(row => row.namaSekolah && row.namaGuru);
}

/**
 * Pre-cached official data from Spreadsheet KONTROL (28 entries)
 * Used as immediate offline fallback and instant initial render.
 */
export const FALLBACK_SPREADSHEET_KONTROL: SpreadsheetKontrolRow[] = [
  {
    namaSekolah: 'SD Negeri 1 Merdeka',
    namaGuru: 'Rista Kasaraeng, SPd',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kalemba',
    namaGuru: 'Rista Kasaraeng, SPd',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Agama Islam'],
    rawMataPelajaran: 'Pendidikan Agama Islam'
  },
  {
    namaSekolah: 'SD Negeri 1 Ampana Kota',
    namaGuru: 'Rista Kasaraeng, SPd',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Agama Islam'],
    rawMataPelajaran: 'Pendidikan Agama Islam'
  },
  {
    namaSekolah: 'SD Negeri Kalemba',
    namaGuru: 'Bariyah Abd. Rahman Baso Jasa, S.Pd',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Agama Islam'],
    rawMataPelajaran: 'Pendidikan Agama Islam'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'NAJRI, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'RUKIA ALMAHDALI, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'RUAIDAH ISHAK, S.Pd.SD,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'ARIATI M. RAWE, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'SRI HARTATI PANJILI, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Matematika',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Ilmu Pengetahuan Alam dan Sosial (IPAS), Matematika, Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'IKRIMA SUDIN, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'NURJANI H. PUNGKE, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'FERAWATI, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'AFFAN, S.Pd.I,',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Agama Islam'],
    rawMataPelajaran: 'Pendidikan Agama Islam'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'NURLAN ISHAK, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'RAHMAWATI T. ADAM, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'IKRAM SUDIN, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'SALWA, S.Ag,',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Agama Islam'],
    rawMataPelajaran: 'Pendidikan Agama Islam'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'RUSLAN ABD. HARIS LAKI, S.Pd,',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)'],
    rawMataPelajaran: '"Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)"'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'DIAN LESTARI, S.Pd,',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Pendidikan Pancasila',
      'Seni Rupa'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Pendidikan Pancasila, Seni Rupa'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'RISTA KASARAENG, S.Pd,',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Agama Islam'],
    rawMataPelajaran: 'Pendidikan Agama Islam'
  },
  {
    namaSekolah: 'SD Negeri Kajulangko',
    namaGuru: 'MUAMMAR MS.',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Bahasa Inggris'],
    rawMataPelajaran: 'Bahasa Inggris'
  },
  {
    namaSekolah: 'SD Negeri Sabo',
    namaGuru: 'Siti Suryanti, S.Pd',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: ['Pendidikan Agama Islam'],
    rawMataPelajaran: 'Pendidikan Agama Islam'
  },
  {
    namaSekolah: 'SD Negeri 1 Merdeka',
    namaGuru: 'Fidhal, S.Pd',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa',
      'Seni Musik',
      'Seni Tari',
      'Seni Teater'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa, Seni Musik, Seni Tari, Seni Teater'
  },
  {
    namaSekolah: 'SD Negeri 1 Merdeka',
    namaGuru: 'Fidhal, S.Pd',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SD',
    mataPelajaran: [
      'Pendidikan Agama Islam',
      'Pendidikan Agama Kristen',
      'Pendidikan Agama Katolik',
      'Pendidikan Agama Hindu',
      'Pendidikan Agama Buddha',
      'Pendidikan Agama Khonghucu',
      'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
      'Bahasa Inggris',
      'Muatan Lokal'
    ],
    rawMataPelajaran: 'Pendidikan Agama Islam, Pendidikan Agama Kristen, Pendidikan Agama Katolik, Pendidikan Agama Hindu, Pendidikan Agama Buddha, Pendidikan Agama Khonghucu, "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", Bahasa Inggris, Muatan Lokal'
  },
  {
    namaSekolah: 'SMP Negeri 1 Merdeka',
    namaGuru: 'Fidhal, S.Pd',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SMP',
    mataPelajaran: ['Bahasa Inggris'],
    rawMataPelajaran: 'Bahasa Inggris'
  },
  {
    namaSekolah: 'SD Negeri Sabo',
    namaGuru: 'Suharmin Patji Baka, S.Pd',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa',
      'Seni Musik',
      'Seni Tari',
      'Seni Teater',
      'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
      'Bahasa Inggris'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa, Seni Musik, Seni Tari, Seni Teater, "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", Bahasa Inggris'
  },
  {
    namaSekolah: 'SD Negeri Sumoli',
    namaGuru: 'Widya Agista Eka Pradita, S.E',
    kontrolJabatanGuru: 'Guru Kelas',
    jenjang: 'SD',
    mataPelajaran: [
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      'Pendidikan Pancasila',
      'Seni Rupa',
      'Seni Musik',
      'Seni Tari',
      'Seni Teater'
    ],
    rawMataPelajaran: 'Bahasa Indonesia, Matematika, Ilmu Pengetahuan Alam dan Sosial (IPAS), Pendidikan Pancasila, Seni Rupa, Seni Musik, Seni Tari, Seni Teater'
  },
  {
    namaSekolah: 'SMP Negeri 5 Ampana Tete',
    namaGuru: 'Yusni, S.Pd',
    kontrolJabatanGuru: 'Guru Mata Pelajaran',
    jenjang: 'SMP',
    mataPelajaran: ['Bahasa Indonesia'],
    rawMataPelajaran: 'Bahasa Indonesia'
  }
];

/**
 * Extract unique schools from spreadsheet rows
 */
export function getUniqueSchools(rows: SpreadsheetKontrolRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    if (r.namaSekolah) set.add(r.namaSekolah.trim());
  });
  return Array.from(set).sort();
}

/**
 * Extract teachers for a given school (or all if no school provided)
 */
export function getTeachersForSchool(
  rows: SpreadsheetKontrolRow[],
  schoolName?: string
): { namaGuru: string; jabatan: string; jenjang: string; mapelCount: number }[] {
  const filtered = schoolName
    ? rows.filter(
        (r) =>
          normalizeName(r.namaSekolah) === normalizeName(schoolName) ||
          r.namaSekolah.toLowerCase() === schoolName.toLowerCase()
      )
    : rows;

  const map = new Map<string, { namaGuru: string; jabatan: string; jenjang: string; mapelCount: number }>();
  filtered.forEach((r) => {
    const key = `${r.namaGuru}__${r.kontrolJabatanGuru}`;
    if (!map.has(key)) {
      map.set(key, {
        namaGuru: r.namaGuru,
        jabatan: r.kontrolJabatanGuru,
        jenjang: r.jenjang,
        mapelCount: r.mataPelajaran.length,
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Match a school and teacher against the spreadsheet data.
 * - School: compared flexibly (case-insensitive)
 * - Teacher: strictly requires matching commas (,) and periods (.) as requested, case-insensitive
 */
export function findMatchingRow(
  rows: SpreadsheetKontrolRow[],
  schoolName: string,
  teacherName: string,
  jabatan?: string
): SpreadsheetKontrolRow | undefined {
  const normSchool = normalizeName(schoolName);
  const normGuru = normalizeTeacherName(teacherName);

  if (!normSchool || !normGuru) return undefined;

  const matches = rows.filter((r) => {
    const sMatch =
      normalizeName(r.namaSekolah) === normSchool ||
      r.namaSekolah.trim().toLowerCase() === schoolName.trim().toLowerCase();
    const gMatch = normalizeTeacherName(r.namaGuru) === normGuru;
    return sMatch && gMatch;
  });

  if (matches.length === 0) return undefined;

  if (jabatan && matches.length > 1) {
    const normJabatan = jabatan.toLowerCase();
    const exact = matches.find(
      (m) => m.kontrolJabatanGuru.toLowerCase() === normJabatan
    );
    if (exact) return exact;
  }

  return matches[0];
}

/**
 * Check if the entered school is registered in the spreadsheet.
 */
export function isSchoolRegistered(
  rows: SpreadsheetKontrolRow[],
  schoolName: string
): boolean {
  const normSchool = normalizeName(schoolName);
  if (!normSchool) return false;
  return rows.some(
    (r) =>
      normalizeName(r.namaSekolah) === normSchool ||
      r.namaSekolah.trim().toLowerCase() === schoolName.trim().toLowerCase()
  );
}

/**
 * Check if the entered teacher is registered in the spreadsheet.
 * Strictly respects commas (,) and periods (.) while case-insensitive.
 */
export function isTeacherRegistered(
  rows: SpreadsheetKontrolRow[],
  teacherName: string,
  schoolName?: string
): boolean {
  const normTeacher = normalizeTeacherName(teacherName);
  if (!normTeacher) return false;

  if (schoolName && normalizeName(schoolName)) {
    return Boolean(findMatchingRow(rows, schoolName, teacherName));
  }

  return rows.some((r) => normalizeTeacherName(r.namaGuru) === normTeacher);
}

/**
 * Detects if a teacher's typed letters match a registered teacher
 * but the punctuation (comma or period) does not match.
 * Returns the correct official name from the spreadsheet to guide the user.
 */
export function findTeacherWithPunctuationMismatch(
  rows: SpreadsheetKontrolRow[],
  teacherName: string,
  schoolName?: string
): string | undefined {
  const normOnlyLetters = normalizeName(teacherName);
  if (!normOnlyLetters || normOnlyLetters.length < 3) return undefined;

  const candidatePool = schoolName && normalizeName(schoolName)
    ? rows.filter((r) => normalizeName(r.namaSekolah) === normalizeName(schoolName))
    : rows;

  const candidate = candidatePool.find(
    (r) =>
      normalizeName(r.namaGuru) === normOnlyLetters &&
      normalizeTeacherName(r.namaGuru) !== normalizeTeacherName(teacherName)
  );

  return candidate ? candidate.namaGuru : undefined;
}

/**
 * Check if the entered school and teacher are valid according to the spreadsheet.
 */
export function isValidSchoolAndTeacher(
  rows: SpreadsheetKontrolRow[],
  schoolName: string,
  teacherName: string
): boolean {
  return Boolean(findMatchingRow(rows, schoolName, teacherName));
}

/**
 * Get the subject list for a specific school, teacher, and optional jabatan.
 */
export function getSubjectsForTeacher(
  rows: SpreadsheetKontrolRow[],
  schoolName: string,
  teacherName: string,
  jabatan?: string
): string[] {
  const matched = findMatchingRow(rows, schoolName, teacherName, jabatan);
  if (matched && matched.mataPelajaran.length > 0) {
    return matched.mataPelajaran;
  }
  return [];
}
