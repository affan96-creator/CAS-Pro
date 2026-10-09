import { FormState, GeneratedDoc } from '../types';

/**
 * Extracts relevant core pedagogical sections from generated RPPM markdown.
 */
function extractRppmCoreActivities(rppmContent?: string): {
  memahami: string;
  mengaplikasikan: string;
  merefleksikan: string;
  kegiatanIntiRaw: string;
} {
  if (!rppmContent) {
    return {
      memahami: '',
      mengaplikasikan: '',
      merefleksikan: '',
      kegiatanIntiRaw: '',
    };
  }

  // Look for Kegiatan Inti or Pembelajaran section
  const kegiatanIntiMatch = rppmContent.match(
    /(?:Kegiatan Inti|KEGIATAN INTI|Kegiatan Pembelajaran)[\s\S]*?(?=(?:Kegiatan Penutup|IV\.|\n##\s|$))/i
  );
  const kegiatanIntiRaw = kegiatanIntiMatch ? kegiatanIntiMatch[0].trim() : '';

  // Extract Memahami
  const memahamiMatch = rppmContent.match(
    /(?:Memahami|Aktivitas Memahami|Tahap Memahami)[\s\S]*?(?=(?:Mengaplikasi|Tahap Mengaplikasi|Merefleksi|Tahap Merefleksi|\n###|\n##|$))/i
  );
  const memahami = memahamiMatch ? memahamiMatch[0].trim() : '';

  // Extract Mengaplikasikan
  const aplikasiMatch = rppmContent.match(
    /(?:Mengaplikasi|Aktivitas Mengaplikasi|Tahap Mengaplikasi)[\s\S]*?(?=(?:Merefleksi|Tahap Merefleksi|\n###|\n##|$))/i
  );
  const mengaplikasikan = aplikasiMatch ? aplikasiMatch[0].trim() : '';

  // Extract Merefleksikan
  const refleksiMatch = rppmContent.match(
    /(?:Merefleksi|Aktivitas Merefleksi|Tahap Merefleksi)[\s\S]*?(?=(?:Kegiatan Penutup|\n###|\n##|$))/i
  );
  const merefleksikan = refleksiMatch ? refleksiMatch[0].trim() : '';

  return { memahami, mengaplikasikan, merefleksikan, kegiatanIntiRaw };
}

/**
 * Extracts relevant stimulus, tasks, and reflection from generated LKPD markdown.
 */
function extractLkpdHighlights(lkpdContent?: string): {
  stimulus: string;
  aktivitas: string;
} {
  if (!lkpdContent) {
    return { stimulus: '', aktivitas: '' };
  }

  const stimulusMatch = lkpdContent.match(
    /(?:Stimulus|Ayo Mengamati|Mari Membaca|Kasus|Cerita)[\s\S]*?(?=(?:Aktivitas|Lembar Kerja|Kegiatan|Latihan|\n##|$))/i
  );
  const stimulus = stimulusMatch ? stimulusMatch[0].trim() : '';

  const aktivitasMatch = lkpdContent.match(
    /(?:Aktivitas Siswa|Langkah Kerja|Mari Mencoba|Mari Berdiskusi)[\s\S]*?(?=(?:Refleksi|Kesimpulan|\n##|$))/i
  );
  const aktivitas = aktivitasMatch ? aktivitasMatch[0].trim() : '';

  return { stimulus, aktivitas };
}

/**
 * Generates the complete, structured prompt for Google Gemini Canvas to create
 * an interactive Media Pembelajaran Interaktif (MPI) application.
 */
export function generateMpiPrompt(
  formData: FormState,
  rppmDoc?: GeneratedDoc | null,
  lkpdDoc?: GeneratedDoc | null
): string {
  const { namaMapel, faseKelas, jenjang, namaSekolah, namaGuru, materiPembelajaran, tujuanPembelajaran, alokasiWaktu, profilLulusan } = formData;
  
  const rppmParts = extractRppmCoreActivities(rppmDoc?.content);
  const lkpdParts = extractLkpdHighlights(lkpdDoc?.content);

  const profilText = Array.isArray(profilLulusan) && profilLulusan.length > 0
    ? profilLulusan.join(', ')
    : 'Bernalar Kritis, Mandiri, Kreatif, Gotong Royong';

  let kegiatanIntiSection = '';
  if (rppmParts.memahami || rppmParts.mengaplikasikan || rppmParts.merefleksikan) {
    kegiatanIntiSection = `
a. Tahap Memahami (Konsep & Eksplorasi):
${rppmParts.memahami ? rppmParts.memahami.substring(0, 450) : '- Siswa mengamati konsep dan fakta materi, mengeksplorasi contoh interaktif.'}

b. Tahap Mengaplikasikan (Penerapan & Aktivitas Interaktif):
${rppmParts.mengaplikasikan ? rppmParts.mengaplikasikan.substring(0, 450) : '- Siswa mempraktikkan konsep melalui simulasi atau kartu kerja interaktif.'}

c. Tahap Merefleksikan (Evaluasi & Penguatan):
${rppmParts.merefleksikan ? rppmParts.merefleksikan.substring(0, 400) : '- Siswa menyimpulkan makna pembelajaran dan mengukur pemahamannya.'}`;
  } else if (rppmParts.kegiatanIntiRaw) {
    kegiatanIntiSection = `\n${rppmParts.kegiatanIntiRaw.substring(0, 900)}`;
  } else {
    kegiatanIntiSection = `
- Memahami: Siswa menyimak penjelasan materi kontekstual dengan media visual interaktif.
- Mengaplikasikan: Siswa melakukan latihan/simulasi interaktif berbasis masalah sehari-hari.
- Merefleksikan: Siswa menarik kesimpulan dan mengerjakan kuis evaluasi pemahaman.`;
  }

  let lkpdSection = '';
  if (lkpdParts.stimulus || lkpdParts.aktivitas) {
    lkpdSection = `
4. KONTEKS AKTIVITAS SISWA DARI LKPD:
- Stimulus Kontekstual: ${lkpdParts.stimulus ? lkpdParts.stimulus.substring(0, 350) : 'Studi kasus kontekstual kehidupan sehari-hari'}
- Aktivitas Inti Siswa: ${lkpdParts.aktivitas ? lkpdParts.aktivitas.substring(0, 350) : 'Eksplorasi mandiri dan pemecahan masalah interaktif'}`;
  }

  const isPaiOrHijaiyah =
    (namaMapel || '').toLowerCase().includes('islam') ||
    (namaMapel || '').toLowerCase().includes('agama') ||
    (materiPembelajaran || '').toLowerCase().includes('hijai') ||
    (materiPembelajaran || '').toLowerCase().includes('harakat') ||
    (tujuanPembelajaran || '').toLowerCase().includes('hijai');

  const hijaiyahSpecialRule = isPaiOrHijaiyah
    ? `
- KHUSUS PENDIDIKAN AGAMA ISLAM & MATERI HURUF HIJAIYAH:
  * Seluruh kartu huruf, bahan bacaan, latihan interaktif, dan kuis WAJIB MENGGUNAKAN AKSARA HURUF HIJAIYAH ARAB ASLI BERHARAKAT LENGKAP (misal: اَ, بَ, تَ, ثَ, جَ, كَتَبَ, عَمِلَ) menggunakan font Arab (Amiri / Noto Naskh Arabic) dengan ukuran besar (font-size 2.5rem - 3.5rem) agar tanda harakat (fathah, kasrah, dhammah, sukun, tasydid) terbaca jelas dan indah.
  * DILARANG KERAS menggunakan ejaan abjad biasa untuk huruf hijaiyah.
  * Pengecualian hanya jika kuis meminta murid menebak cara membaca huruf hijaiyah ke dalam abjad Indonesia.`
    : '';

  return `Buatkan aplikasi web interaktif tunggal (Single-File HTML5/CSS3/JavaScript murni mandiri / standalone) untuk Media Pembelajaran Interaktif (MPI) Kurikulum Merdeka yang dirancang untuk pembelajaran di kelas dan DAPAT DIUNDUH SERTA BISA DIGUNAKAN WALAUPUN TANPA MENGGUNAKAN JARINGAN INTERNET (100% OFFLINE PENUH TANPA KONEKSI APAPUN) dengan rincian spesifik berikut:

============================================================
INFORMASI & IDENTITAS MEDIA PEMBELAJARAN
============================================================
- Mata Pelajaran: ${namaMapel || 'Mata Pelajaran'}
- Topik / Materi Utama: ${materiPembelajaran || 'Materi Pokok'}
- Jenjang & Kelas/Fase: ${jenjang || 'SD/SMP/SMA'} / ${faseKelas || 'Fase B'}
- Alokasi Waktu: ${alokasiWaktu || '2 x 35 Menit'}
- Satuan Pendidikan: ${namaSekolah || 'Sekolah'}
- Pengembang / Guru Penyusun: ${namaGuru || 'Guru'}
- Dimensi Profil Lulusan: ${profilText}${hijaiyahSpecialRule}

============================================================
PERSYARATAN WAJIB OFFLINE & STANDALONE (BISA DIGUNAKAN TANPA INTERNET)
============================================================
PERINTAH KRUSIAL & MUTLAK:
Aplikasi MPI ini setelah dibuat di Gemini Canvas harus dapat diunduh (disimpan sebagai file .html mandiri) oleh guru atau siswa, dan DAPAT BERFUNGSI SEMPURNA 100% WALAUPUN TANPA MENGGUNAKAN JARINGAN INTERNET (OFFLINE PENUH / MODE PESAWAT / TANPA WIFI & TANPA PAKET DATA).

Ketentuan Teknis Wajib Offline:
1. STANDALONE SINGLE-FILE (.html): Seluruh struktur HTML, tata letak & desain CSS (di dalam tag <style>...</style>), serta seluruh fungsi interaktivitas, pergantian halaman, dan logika kuis JavaScript (di dalam tag <script>...</script>) wajib berada di dalam satu file .html tunggal tanpa file terpisah.
2. BEBAS DEPENDENSI CDN & LIBRARY ONLINE: DILARANG KERAS mengandalkan link CDN internet (seperti Bootstrap CDN, Tailwind CDN, Google Fonts online, FontAwesome, jQuery CDN, React CDN, Axios, dsb) yang akan rusak/error jika tidak ada sinyal internet. Gunakan CSS standard modern (Flexbox, CSS Grid, CSS Variables) dan font sistem bawaan perangkat (system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif).
3. IKON & ILUSTRASI 100% LOKAL (INLINE SVG & EMOJI): DILARANG memuat gambar dari URL internet (<img src="https://...">) yang akan gagal muncul saat offline. Seluruh ikon navigasi (Home, Back, Next, Menu, Bintang Skor, Centang, Silang, Audio, Petunjuk, Reset) dan ilustrasi konsep edukasi wajib dibuat menggunakan INLINE SVG MURNI (<svg>...</svg>) atau simbol Unicode/Emoji agar tampil tajam dan langsung muncul tanpa koneksi internet.
4. EFEK AUDIO SINTESIS LOKAL (OFFLINE WEB AUDIO API): Jika menyediakan efek suara (misal saat kuis benar/salah atau tombol navigasi diklik), gunakan Web Audio API murni bawaan browser secara sintetis lokal (AudioContext oscillator/chimes bawaan browser, BUKAN memuat file .mp3 dari URL internet) sehingga suara tetap berbunyi saat offline.
5. PENYIMPANAN SKOR & PROGRES LOKAL: Gunakan variabel JavaScript lokal atau LocalStorage peramban untuk menyimpan skor dan progres belajar kuis siswa tanpa membutuhkan server backend atau koneksi internet.
6. SIAP DIJALANKAN DI DAERAH 3T & KELAS TANPA WIFI: Pastikan saat file .html ini diunduh dan dibuka langsung (klik ganda file di File Explorer atau browser Chrome, Edge, Safari, Firefox di laptop, komputer lab, atau HP guru/siswa) dalam kondisi TANPA KONEKSI INTERNET / MODE PESAWAT, seluruh fitur (halaman awal, menu navigasi, kartu materi, kuis interaktif, dan animasi skor) berjalan 100% normal dan lancar.
7. TOMBOL SIMPAN / UNDUH APLIKASI (.html): Sediakan tombol atau panduan di dalam aplikasi yang memudahkan guru mengunduh/menyimpan file HTML ini untuk dibagikan kepada siswa melalui flashdisk atau bluetooth tanpa membutuhkan kuota internet.

============================================================
FOKUS PEDAGOGIS (BERDASARKAN HASIL RPPM & LKPD)
============================================================
1. TUJUAN PEMBELAJARAN:
${tujuanPembelajaran || `Melalui media pembelajaran interaktif ini, peserta didik mampu memahami konsep ${materiPembelajaran || 'pembelajaran'}, mengaplikasikannya dalam kehidupan sehari-hari, serta berpikir kritis dan mandiri.`}

2. MATERI PEMBELAJARAN:
${materiPembelajaran || 'Materi pembelajaran kontekstual sesuai capaian pembelajaran Kurikulum Merdeka.'}

3. LANGKAH-LANGKAH KEGIATAN INTI (RPPM):${kegiatanIntiSection}
${lkpdSection}

============================================================
STRUKTUR WAJIB APLIKASI MPI (MEDIA PEMBELAJARAN INTERAKTIF)
============================================================
Aplikasi harus memuat 6 halaman / bagian terintegrasi:

1. Halaman Awal (Judul & Identitas):
   - Memuat judul program pembelajaran interaktif yang menarik, ceria, dan ramah siswa.
   - Gambar atau ilustrasi latar belakang tematik yang relevan dengan topik "${materiPembelajaran || namaMapel}".
   - Identitas pembuat yang jelas (Nama Guru: ${namaGuru || 'Guru Penyusun'}, Satuan Pendidikan: ${namaSekolah || 'Sekolah'}).
   - Tombol "Mulai (Start)" dengan animasi menarik untuk masuk ke Halaman Menu Utama.

2. Halaman Menu Utama:
   - Berisi dashboard navigasi utama yang menarik dan intuitif.
   - Pilihan menu utama berupa tombol/ikon besar:
     * Petunjuk Penggunaan
     * Kompetensi / Tujuan Pembelajaran
     * Materi Pembelajaran
     * Evaluasi / Kuis Interaktif
     * Profil & Referensi

3. Bagian Pendahuluan & Tujuan:
   - Menjelaskan deskripsi singkat topik pembelajaran yang menyenangkan.
   - Sasaran kelas/fase (${faseKelas || 'Siswa'}).
   - Tujuan pembelajaran yang ingin dicapai siswa dijabarkan secara jelas dan bertahap.

4. Bagian Materi Pembelajaran:
   - Menyajikan isi materi yang dipecah menjadi beberapa sub-materi modular / kartu belajar bertahap.
   - Didukung oleh teks penjelasan yang komunikatif, ilustrasi visual/diagram SVG atau kartu interaktif, serta narasi audio/animasi interaktif berbasis web.
   - Alur materi mengikuti siklus belajar: Memahami konsep dasar hingga Mengaplikasikannya dalam konteks nyata.

5. Bagian Evaluasi / Kuis Interaktif:
   - Menyediakan 5 hingga 10 butir soal latihan / tes formatif interaktif (pilihan ganda dengan tombol pilihan klik langsung).
   - Dilengkapi umpan balik (feedback) langsung pada setiap jawaban (benar/salah disertai penjelasan ringkas).
   - Menampilkan skor akhir otomatis, animasi bintang/penghargaan, dan evaluasi hasil belajar siswa.
   - Tombol "Ulangi Kuis" (Reset Kuis).

6. Halaman Penutup / Referensi:
   - Berisi rangkuman intisari materi dan pesan penutup motivasional untuk siswa.
   - Daftar pustaka dan sumber referensi materi/media.
   - Tombol "Kembali ke Menu Utama" atau "Mulai Ulang (Restart)".

============================================================
KOMPONEN PENDUKUNG NAVIGASI WAJIB
============================================================
- Tombol Navigasi: Sediakan tombol navigasi yang konsisten di setiap halaman:
  * Tombol Home (Kembali ke menu utama)
  * Tombol Back (Kembali ke halaman sebelumnya)
  * Tombol Next (Lanjut ke halaman berikutnya)
- Petunjuk Penggunaan: Halaman khusus atau pop-up modal interaktif yang menjelaskan fungsi setiap tombol navigasi dan cara berinteraksi dengan media ini.

============================================================
STANDAR TAMPILAN & KUALITAS KODE (100% OFFLINE TANPA INTERNET)
============================================================
- Antarmuka visual modern, responsif, warna harmonis yang ramah anak, dan nyaman dioperasikan di layar laptop/komputer maupun tablet/smartphone.
- Seluruh navigasi antar-halaman, logika penilaian kuis otomatis, tombol kembali/lanjut, dan pop-up petunjuk harus berfungsi 100% tanpa error eksternal.
- STANDALONE, DAPAT DIUNDUH & 100% OFFLINE: File HTML hasil generate harus dapat langsung diunduh (disimpan lokal sebagai .html) dan dibuka langsung tanpa koneksi internet sama sekali (100% offline-ready di lab komputer, laptop kelas, atau HP siswa).
- Hasilkan kode aplikasi lengkap (Single-File HTML utuh mandiri) yang langsung siap dipratinjau, dijalankan di Gemini Canvas, dan diunduh untuk digunakan secara offline.`;
}
