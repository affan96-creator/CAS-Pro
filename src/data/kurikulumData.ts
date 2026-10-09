import { JenjangPendidikan, CPItem, FormState } from '../types';
import cpDataJson from './cpData.json';

export const JENJANG_OPTIONS: JenjangPendidikan[] = ['SD', 'SMP', 'SMA', 'SMK'];

export const MAPEL_BY_JENJANG: Record<JenjangPendidikan, string[]> = {
  SD: [
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Matematika',
    'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    'Pendidikan Jasmani Olahraga dan Kesehatan',
    'Bahasa Inggris',
    'Koding Dan Kecerdasan Artifisial',
    'Seni Rupa',
    'Seni Musik',
    'Seni Tari',
    'Seni Teater',
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Pendidikan Agama Kristen dan Budi Pekerti',
    'Pendidikan Agama Katolik dan Budi Pekerti',
    'Pendidikan Agama Hindu dan Budi Pekerti',
    'Pendidikan Agama Buddha dan Budi Pekerti',
    'Pendidikan Agama Khonghucu dan Budi Pekerti',
    'Bahasa Daerah / Muatan Lokal',
  ],
  SMP: [
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Matematika',
    'Ilmu Pengetahuan Alam (IPA)',
    'Ilmu Pengetahuan Sosial (IPS)',
    'Bahasa Inggris',
    'Informatika',
    'Koding Dan Kecerdasan Artifisial',
    'Pendidikan Jasmani Olahraga dan Kesehatan',
    'Seni Rupa',
    'Seni Musik',
    'Seni Tari',
    'Seni Teater',
    'Prakarya Kerajinan',
    'Prakarya Budi Daya',
    'Prakarya Pengolahan',
    'Prakarya Rekayasa',
    'Prakarya dan Kewirausahaan Budi Daya',
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Pendidikan Agama Kristen dan Budi Pekerti',
    'Pendidikan Agama Katolik dan Budi Pekerti',
    'Pendidikan Agama Hindu dan Budi Pekerti',
    'Pendidikan Agama Buddha dan Budi Pekerti',
    'Pendidikan Agama Khonghucu dan Budi Pekerti',
    'Muatan Lokal / Bahasa Daerah',
  ],
  SMA: [
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Bahasa Indonesia (Tingkat Lanjut)',
    'Matematika',
    'Matematika (Tingkat Lanjut)',
    'Bahasa Inggris',
    'Bahasa Inggris (Tingkat Lanjut)',
    'Ilmu Pengetahuan Alam (IPA)',
    'Fisika',
    'Kimia',
    'Biologi',
    'Informatika',
    'Koding Dan Kecerdasan Artifisial',
    'Ilmu Pengetahuan Sosial (IPS)',
    'Sejarah',
    'Sejarah (Tingkat Lanjut)',
    'Geografi',
    'Ekonomi',
    'Sosiologi',
    'Antropologi',
    'Pendidikan Jasmani Olahraga dan Kesehatan',
    'Seni Rupa',
    'Seni Musik',
    'Seni Tari',
    'Seni Teater',
    'Prakarya Kerajinan',
    'Prakarya Budi Daya',
    'Prakarya Pengolahan',
    'Prakarya Rekayasa',
    'Prakarya dan Kewirausahaan Kerajinan',
    'Prakarya dan Kewirausahaan Budi Daya',
    'Prakarya dan Kewirausahaan Pengolahan',
    'Prakarya dan Kewirausahaan Rekayasa',
    'Bahasa Arab',
    'Bahasa Jepang',
    'Bahasa Jerman',
    'Bahasa Korea',
    'Bahasa Mandarin',
    'Bahasa Prancis',
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Pendidikan Agama Kristen dan Budi Pekerti',
    'Pendidikan Agama Katolik dan Budi Pekerti',
    'Pendidikan Agama Hindu dan Budi Pekerti',
    'Pendidikan Agama Buddha dan Budi Pekerti',
    'Pendidikan Agama Khonghucu dan Budi Pekerti',
  ],
  SMK: [
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Matematika',
    'Bahasa Inggris',
    'Sejarah',
    'Projek Ilmu Pengetahuan Alam dan Sosial',
    'Ekonomi',
    'Informatika',
    'Koding Dan Kecerdasan Artifisial',
    'Pendidikan Jasmani Olahraga dan Kesehatan',
    'Seni Rupa',
    'Seni Musik',
    'Seni Tari',
    'Seni Teater',
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Pendidikan Agama Kristen dan Budi Pekerti',
    'Pendidikan Agama Katolik dan Budi Pekerti',
    'Pendidikan Agama Hindu dan Budi Pekerti',
    'Pendidikan Agama Buddha dan Budi Pekerti',
    'Pendidikan Agama Khonghucu dan Budi Pekerti',
    'Dasar-dasar Pengembangan Perangkat Lunak & Gim (PPLG)',
    'Dasar-dasar Teknik Jaringan Komputer & Telekomunikasi (TJKT)',
    'Dasar-dasar Desain Komunikasi Visual (DKV)',
    'Dasar-dasar Akuntansi & Keuangan Lembaga (AKL)',
    'Dasar-dasar Manajemen Perkantoran & Layanan Bisnis',
    'Dasar-dasar Teknik Otomotif (TKR/TSM)',
    'Dasar-dasar Teknik Ketenagalistrikan & Elektronika',
    'Dasar-dasar Kuliner / Tata Boga',
    'Dasar-dasar Perhotelan',
    'Projek Kreatif dan Kewirausahaan (PKK)',
    'Konsentrasi Keahlian / Kejuruan',
  ],
};

export const FASE_KELAS_BY_JENJANG: Record<JenjangPendidikan, { label: string; value: string }[]> = {
  SD: [
    { label: 'Fase A (Kelas 1 SD)', value: 'Fase A (Kelas 1)' },
    { label: 'Fase A (Kelas 2 SD)', value: 'Fase A (Kelas 2)' },
    { label: 'Fase B (Kelas 3 SD)', value: 'Fase B (Kelas 3)' },
    { label: 'Fase B (Kelas 4 SD)', value: 'Fase B (Kelas 4)' },
    { label: 'Fase C (Kelas 5 SD)', value: 'Fase C (Kelas 5)' },
    { label: 'Fase C (Kelas 6 SD)', value: 'Fase C (Kelas 6)' },
  ],
  SMP: [
    { label: 'Fase D (Kelas 7 SMP)', value: 'Fase D (Kelas 7)' },
    { label: 'Fase D (Kelas 8 SMP)', value: 'Fase D (Kelas 8)' },
    { label: 'Fase D (Kelas 9 SMP)', value: 'Fase D (Kelas 9)' },
    { label: 'Fase D (Kelas 7, 8 & 9 SMP)', value: 'Fase D (Kelas 7, 8 & 9)' },
  ],
  SMA: [
    { label: 'Fase E (Kelas 10 SMA)', value: 'Fase E (Kelas 10)' },
    { label: 'Fase F (Kelas 11 SMA)', value: 'Fase F (Kelas 11)' },
    { label: 'Fase F (Kelas 12 SMA)', value: 'Fase F (Kelas 12)' },
    { label: 'Fase F (Kelas 11 & 12 SMA)', value: 'Fase F (Kelas 11 & 12)' },
  ],
  SMK: [
    { label: 'Fase E (Kelas 10 SMK)', value: 'Fase E (Kelas 10)' },
    { label: 'Fase F (Kelas 11 SMK)', value: 'Fase F (Kelas 11)' },
    { label: 'Fase F (Kelas 12 SMK)', value: 'Fase F (Kelas 12)' },
    { label: 'Fase F (Kelas 11 & 12 SMK)', value: 'Fase F (Kelas 11 & 12)' },
  ],
};

export const DIMENSI_PROFIL_LULUSAN = [
  'Keimanan dan Ketakwaan terhadap Tuhan YME',
  'Kewargaan',
  'Kreativitas',
  'Penalaran Kritis',
  'Kemandirian',
  'Kolaborasi',
  'Komunikasi',
  'Kesehatan',
];

export const DIGITALISASI_DEFAULT_OPTIONS = [
  'PID (Papan Interaktif Digital / Smartboard)',
  'Infocus / LCD Proyektor',
  'Laptop Guru / Murid',
  'Chromebook / Tablet Belajar',
  'Platform Merdeka Mengajar (PMM)',
  'Canva for Education',
  'Quizizz / Kahoot / Mentimeter',
  'Google Classroom / Workspace',
];

// Capaian Pembelajaran (CP) Data from Google Spreadsheet (SD, SMP, SMA, SMK)
export const CP_CATALOG: CPItem[] = cpDataJson as CPItem[];

/**
 * Memeriksa apakah mata pelajaran termasuk rumpun Pendidikan Agama dan Budi Pekerti
 * Berlaku untuk semua agama: Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu, dll.
 */
export function isMataPelajaranAgama(mapelName?: string): boolean {
  if (!mapelName) return false;
  const lower = mapelName.toLowerCase();
  return lower.includes('agama') || lower.includes('budi pekerti');
}

/**
 * Mengembalikan rujukan regulasi CP resmi:
 * - Mata Pelajaran Agama & Budi Pekerti: Kepka BKPDM No. 020 Tahun 2026
 * - Mata Pelajaran Lainnya: BSKAP No. 046/H/KR/2025
 */
export function getCpReferenceShort(mapelName?: string): string {
  if (isMataPelajaranAgama(mapelName)) {
    return 'Kepka BKPDM No. 020 Tahun 2026';
  }
  return 'BSKAP No. 046/H/KR/2025';
}

export function getCpReferenceFull(mapelName?: string): string {
  if (isMataPelajaranAgama(mapelName)) {
    return 'Keputusan Kepala BKPDM No. 020 Tahun 2026';
  }
  return 'Keputusan BSKAP No. 046/H/KR/2025';
}

/**
 * Memeriksa kecocokan nama Mata Pelajaran antara form input dan data CP di katalog
 */
export function isMapelMatch(formMapel?: string, cpMapel?: string): boolean {
  if (!formMapel || !cpMapel) return false;
  const a = formMapel.trim().toLowerCase();
  const b = cpMapel.trim().toLowerCase();
  if (a === b) return true;

  // Bersihkan teks di dalam tanda kurung untuk pencocokan akronim/singkatan (misal: "Ilmu Pengetahuan Alam (IPA)" vs "IPA")
  const cleanA = a.replace(/\s*\([^)]*\)/g, '').trim();
  const cleanB = b.replace(/\s*\([^)]*\)/g, '').trim();
  if (cleanA && cleanB) {
    if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      return true;
    }
  }

  // Cek jika singkatan di dalam kurung cocok (misal IPAS, IPA, IPS, PJOK)
  const bracketA = a.match(/\(([^)]+)\)/)?.[1]?.trim().toLowerCase();
  const bracketB = b.match(/\(([^)]+)\)/)?.[1]?.trim().toLowerCase();
  if (bracketA && (bracketA === b || cleanB === bracketA)) return true;
  if (bracketB && (bracketB === a || cleanA === bracketB)) return true;

  return false;
}

/**
 * Mengekstrak nama Fase (misal: "Fase A", "Fase B", dst) dari string faseKelas
 */
export function getFaseFromFaseKelas(faseKelas?: string): string | null {
  if (!faseKelas) return null;
  const match = faseKelas.match(/Fase\s+([A-F])/i);
  return match ? `Fase ${match[1].toUpperCase()}` : null;
}

/**
 * Memeriksa apakah suatu CP cocok persis dengan Mata Pelajaran dan Fase/Kelas yang dipilih guru
 */
export function isCpMatchingFaseKelas(
  cp: { fase?: string; kelas?: string },
  formFaseKelas?: string
): boolean {
  if (!formFaseKelas) return true;

  const formFase = getFaseFromFaseKelas(formFaseKelas);
  const cpFase = getFaseFromFaseKelas(cp.fase);

  // 1. Jika form menentukan Fase dan CP memiliki Fase, Fase HARUS sama persis
  if (formFase && cpFase && formFase !== cpFase) {
    return false;
  }

  // 2. Ekstrak angka kelas dari pilihan guru (misal "Fase B (Kelas 4)" -> [4], "Kelas 7, 8 & 9" -> [7, 8, 9])
  const formClassNums = (formFaseKelas.match(/\d+/g) || []).map(Number);
  const cpClassNums = ((cp.kelas || '').match(/\d+/g) || []).map(Number);

  // 3. Jika CP memiliki pembatasan angka kelas spesifik dan guru memilih kelas spesifik:
  if (cpClassNums.length > 0 && formClassNums.length > 0) {
    const hasOverlap = formClassNums.some((num) => cpClassNums.includes(num));
    if (!hasOverlap) {
      return false;
    }
  }

  return true;
}

export const SAMPLE_PRESETS: { name: string; data: FormState }[] = [
  {
    name: 'SD: Agama Islam - SD Negeri Kajulangko (AFFAN, S.Pd.I,)',
    data: {
      jenjang: 'SD',
      namaSekolah: 'SD Negeri Kajulangko',
      namaGuru: 'AFFAN, S.Pd.I,',
      nipGuru: '19890614 201402 1 003',
      jabatan: 'Guru Mata Pelajaran',
      namaKepalaSekolah: 'Drs. H. Bambang Sudarmono, M.Pd.',
      nipKepalaSekolah: '19700315 199503 1 002',
      tempatTtd: 'Kajulangko',
      namaMapel: 'Pendidikan Agama Islam',
      faseKelas: 'Fase B (Kelas 4)',
      semester: 'Ganjil',
      tahunPelajaran: '2025/2026',
      alokasiWaktu: '3 JP (3 x 35 Menit)',
      jumlahPertemuan: '1 Pertemuan',
      capaianPembelajaran:
        'Peserta didik memahami beberapa surah pendek, ayat Al-Qur’an dan hadis tentang keragaman sebagai sunnatullah, mengenal rukun iman, akhlak terpuji kepada sesama dan lingkungan sekitar.',
      materiPembelajaran: 'Keragaman sebagai Sunnatullah dan Sikap Menghargai Perbedaan',
      tujuanPembelajaran:
        '1. Peserta didik mampu menjelaskan pesan pokok keragaman sebagai ketetapan Allah Swt. (sunnatullah) dengan baik.\n2. Peserta didik mampu mendemonstrasikan perilaku saling menghargai dan bertoleransi dalam kehidupan sehari-hari.\n3. Peserta didik mampu menyajikan contoh nyata pengamalan sikap inklusif dan kolaboratif antar sesama teman di sekolah.',
      profilLulusan: ['Keimanan & Ketakwaan', 'Kewargaan', 'Kolaborasi', 'Penalaran Kritis'],
      digitalisasi: ['PID (Papan Interaktif Digital / Smartboard)', 'Chromebook / Tablet Belajar', 'Platform Merdeka Mengajar (PMM)'],
      digitalisasiLainnya: 'Aplikasi Al-Quran Digital & Video Animasi Edukasi Karakter',
    },
  },
  {
    name: 'SD: IPAS - SD Negeri 1 Merdeka (Rista Kasaraeng, SPd)',
    data: {
      jenjang: 'SD',
      namaSekolah: 'SD Negeri 1 Merdeka',
      namaGuru: 'Rista Kasaraeng, SPd',
      nipGuru: '19880512 201201 2 004',
      jabatan: 'Guru Kelas',
      namaKepalaSekolah: 'Drs. H. Bambang Sudarmono, M.Pd.',
      nipKepalaSekolah: '19700315 199503 1 002',
      tempatTtd: 'Merdeka',
      namaMapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      faseKelas: 'Fase B (Kelas 4)',
      semester: 'Ganjil',
      tahunPelajaran: '2025/2026',
      alokasiWaktu: '2 JP (2 x 35 Menit)',
      jumlahPertemuan: '1 Pertemuan',
      capaianPembelajaran:
        'Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada manusia (pancaindra). Peserta didik dapat membuat simulasi menggunakan bagan/alat bantu sederhana tentang siklus hidup makhluk hidup dan upaya pelestariannya.',
      materiPembelajaran: 'Struktur dan Fungsi Bagian Tumbuhan serta Proses Fotosintesis',
      tujuanPembelajaran:
        '1. Melalui pengamatan spesimen nyata dan video interaktif, peserta didik dapat mengidentifikasi bagian-bagian tubuh tumbuhan beserta fungsinya dengan tepat.\n2. Melalui percobaan sederhana, peserta didik mampu mendemonstrasikan proses fotosintesis pada daun dengan penuh rasa ingin tahu.\n3. Peserta didik dapat mempresentasikan kesimpulan hubungan bentuk akar dan daun terhadap fungsi tumbuhan secara kolaboratif.',
      profilLulusan: ['Penalaran Kritis', 'Kreativitas', 'Kolaborasi'],
      digitalisasi: ['PID (Papan Interaktif Digital / Smartboard)', 'Chromebook / Tablet Belajar', 'Platform Merdeka Mengajar (PMM)'],
      digitalisasiLainnya: 'PhET Interactive Simulations & Plant Net',
    },
  },
  {
    name: 'SMP: IPA Fase D (Kelas 7, 8 & 9) - Ekosistem & Interaksi Makhluk Hidup',
    data: {
      jenjang: 'SMP',
      namaSekolah: 'SMP Negeri 5 Cendekia',
      namaGuru: 'Ahmad Fauzi, M.Pd.',
      nipGuru: '19840217 200902 1 003',
      jabatan: 'Guru Mata Pelajaran',
      namaKepalaSekolah: 'Dra. Hj. Nuraini, M.Si.',
      nipKepalaSekolah: '19681104 199412 2 001',
      tempatTtd: 'Bandung',
      namaMapel: 'Ilmu Pengetahuan Alam (IPA)',
      faseKelas: 'Fase D (Kelas 7, 8 & 9)',
      semester: 'Ganjil',
      tahunPelajaran: '2025/2026',
      alokasiWaktu: '3 JP (3 x 40 Menit)',
      jumlahPertemuan: '1 Pertemuan',
      capaianPembelajaran:
        'Peserta didik memahami proses identifikasi pewarisan sifat, penerapan bioteknologi, sistem organisasi kehidupan mulai dari tingkat sel hingga organisme, serta interaksi antar komponen penyusun ekosistem di lingkungan sekitarnya.',
      materiPembelajaran: 'Rantai Makanan, Jaring-jaring Makanan, dan Keseimbangan Ekosistem',
      tujuanPembelajaran:
        '1. Peserta didik mampu menganalisis peran komponen biotik dan abiotik dalam suatu ekosistem secara kritis.\n2. Melalui simulasi digital, peserta didik mampu merumuskan jaring-jaring makanan dan memprediksi dampak perubahan populasi terhadap keseimbangan ekosistem.\n3. Peserta didik menyajikan ide pelestarian lingkungan lokal secara komunikatif dalam format infografis digital.',
      profilLulusan: ['Penalaran Kritis', 'Kewargaan', 'Kolaborasi', 'Komunikasi'],
      digitalisasi: ['Infocus / LCD Proyektor', 'Laptop Guru / Murid', 'Canva for Education', 'Quizizz / Kahoot / Mentimeter'],
      digitalisasiLainnya: 'Google Earth & BioDigital Human/Ecosystem',
    },
  },
  {
    name: 'SMA: Informatika Fase E (Kelas 10) - Berpikir Komputasional & Algoritma',
    data: {
      jenjang: 'SMA',
      namaSekolah: 'SMA Negeri 1 Prestasi Mandiri',
      namaGuru: 'Dewi Lestari, S.Kom., M.T.',
      nipGuru: '19910923 201801 2 005',
      jabatan: 'Guru Mata Pelajaran',
      namaKepalaSekolah: 'Dr. Ir. Hendra Gunawan, M.Ed.',
      nipKepalaSekolah: '19720819 199802 1 001',
      tempatTtd: 'Surabaya',
      namaMapel: 'Informatika',
      faseKelas: 'Fase E (Kelas 10)',
      semester: 'Ganjil',
      tahunPelajaran: '2025/2026',
      alokasiWaktu: '2 JP (2 x 45 Menit)',
      jumlahPertemuan: '1 Pertemuan',
      capaianPembelajaran:
        'Peserta didik mampu menerapkan berpikir komputasional untuk menghasilkan banyak solusi dari persoalan dengan data diskrit bervolume tidak kecil pada kehidupan sehari-hari maupun dalam bidang lain.',
      materiPembelajaran: 'Dekomposisi Masalah dan Algoritma Searching & Sorting',
      tujuanPembelajaran:
        '1. Peserta didik mampu menguraikan struktur masalah kompleks menjadi sub-komponen terkelola dengan prinsip dekomposisi komputasional.\n2. Peserta didik mampu merancang dan membandingkan efisiensi algoritma Linear Search vs Binary Search secara logis.\n3. Peserta didik mampu mengimplementasikan dan menguji alur logika algoritma ke dalam representasi pseudocode/flowchart interaktif.',
      profilLulusan: ['Penalaran Kritis', 'Kemandirian', 'Kreativitas'],
      digitalisasi: ['PID (Papan Interaktif Digital / Smartboard)', 'Laptop Guru / Murid', 'Google Classroom / Workspace'],
      digitalisasiLainnya: 'Python Replit & Flowgorithm Simulator',
    },
  },
  {
    name: 'SMK: PPLG Fase E (Kelas 10) - Dasar Rekayasa Perangkat Lunak',
    data: {
      jenjang: 'SMK',
      namaSekolah: 'SMK Negeri 2 Teknologi Industri',
      namaGuru: 'Rian Pratama, S.Kom.',
      nipGuru: '19930415 201903 1 007',
      jabatan: 'Guru Mata Pelajaran',
      namaKepalaSekolah: 'Drs. H. Mulyadi, M.M.',
      nipKepalaSekolah: '19670512 199303 1 004',
      tempatTtd: 'Semarang',
      namaMapel: 'Dasar-dasar Pengembangan Perangkat Lunak & Gim (PPLG)',
      faseKelas: 'Fase E (Kelas 10)',
      semester: 'Ganjil',
      tahunPelajaran: '2025/2026',
      alokasiWaktu: '4 JP (4 x 45 Menit)',
      jumlahPertemuan: '1 Pertemuan',
      capaianPembelajaran:
        'Peserta didik mampu memahami proses bisnis pada bidang industri pengembangan perangkat lunak dan gim, perkembangan teknologi, serta dasar-dasar pemrograman berorientasi objek.',
      materiPembelajaran: 'Algoritma Pemrograman Dasar, Variabel, dan Struktur Kontrol Logika',
      tujuanPembelajaran:
        '1. Peserta didik mampu menganalisis alur logika pemrograman terstruktur dalam memecahkan kebutuhan sistem aplikasi.\n2. Peserta didik mampu menulis kode program logika percabangan dan perulangan dengan sintaks yang bersih dan terstandar.\n3. Peserta didik mampu mendebug dan memvalidasi luaran program secara kolaboratif sesuai spesifikasi industri.',
      profilLulusan: ['Penalaran Kritis', 'Kreativitas', 'Kemandirian', 'Kolaborasi'],
      digitalisasi: ['Laptop Guru / Murid', 'Chromebook / Tablet Belajar', 'Google Classroom / Workspace'],
      digitalisasiLainnya: 'VS Code Web, GitHub Classroom, & Replit',
    },
  },
];
