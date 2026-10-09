import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import {
  sanitizeDocumentContent,
  replacePesertaDidikWithMurid,
  formatFaseKelasKop,
} from "./src/utils/cleanRppm";
import {
  parseSpreadsheetCSV,
  FALLBACK_SPREADSHEET_KONTROL,
  SpreadsheetKontrolRow,
} from "./src/data/spreadsheetKontrolData";

dotenv.config();

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateWithFallback(
  ai: GoogleGenAI,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // Ordered fallback models: modern Gemini 3 series with high availability
  const candidateModels = [
    { name: "gemini-3.8-flash", thinkingLevel: ThinkingLevel.LOW },
    { name: "gemini-3.1-flash-lite", thinkingLevel: ThinkingLevel.MINIMAL },
    { name: "gemini-flash-latest", thinkingLevel: undefined },
  ];
  let lastError: any = null;

  for (const candidate of candidateModels) {
    const { name: modelName, thinkingLevel } = candidate;
    // Try up to 2 attempts per candidate
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[AI Generator] Requesting model: ${modelName} (attempt ${attempt}/2)...`);
        
        const config: any = {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        };

        if (thinkingLevel !== undefined) {
          config.thinkingConfig = { thinkingLevel };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config,
        });

        if (response.text && response.text.trim().length > 0) {
          console.log(`[AI Generator] Successfully generated output with ${modelName}`);
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[AI Generator] Model ${modelName} attempt ${attempt} error:`, errMsg);

        // If the error is 503 / UNAVAILABLE / high demand, immediately break to next candidate model
        const isUnavailable =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          err?.status === 503 ||
          err?.status === "UNAVAILABLE";

        if (isUnavailable) {
          console.log(`[AI Generator] Model ${modelName} is currently unavailable/high demand. Switching immediately to next fallback candidate...`);
          break; // Don't waste time repeating attempt on the same overloaded cluster
        }

        // Brief backoff for transient errors
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
  }

  // If all failed, provide a clean friendly Indonesian message
  let friendlyErrMsg = "Layanan Gemini AI sedang mengalami lonjakan beban sementara. Silakan klik tombol 'Coba Lagi' atau tunggu beberapa saat.";
  if (lastError?.message) {
    try {
      const parsed = JSON.parse(lastError.message);
      if (parsed.error?.message) {
        friendlyErrMsg = `Server Gemini AI sedang padat (${parsed.error.message}). Silakan coba klik tombol generate kembali.`;
      }
    } catch {
      friendlyErrMsg = `Gagal memproses dokumen: ${lastError.message}`;
    }
  }
  throw new Error(friendlyErrMsg);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Allow iframe embedding across Google Sites, Canvas LMS, Chrome, etc.
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Explicitly remove X-Frame-Options to allow embedding anywhere
    res.removeHeader("X-Frame-Options");
    // Explicitly allow frame-ancestors for Google Sites, Google Docs, Canvas, and all web platforms
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors * https: http: 'self' https://sites.google.com https://*.google.com https://*.googleusercontent.com https://docs.google.com https://drive.google.com https://*.chrome.com https://*.instructure.com;"
    );

    // Fast response for CORS preflight OPTIONS requests
    if (_req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  // Health check API
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Generator endpoint for Kurikulum Merdeka
  app.post("/api/generate", async (req, res) => {
    try {
      const { type, formData, asesmenConfig } = req.body;
      if (!type || !formData) {
        return res.status(400).json({ error: "Parameter type dan formData wajib diisi." });
      }

      const ai = getGeminiClient();

      const {
        jenjang,
        namaSekolah,
        namaGuru,
        nipGuru,
        jabatan,
        namaKepalaSekolah,
        nipKepalaSekolah,
        tempatTtd,
        tanggalTtd = "14 Juli 2025",
        namaMapel,
        faseKelas,
        semester,
        tahunPelajaran,
        alokasiWaktu,
        jumlahPertemuan,
        capaianPembelajaran,
        materiPembelajaran,
        tujuanPembelajaran,
        profilLulusan = [],
        digitalisasi = [],
        digitalisasiLainnya = "",
      } = formData;

      const digitalToolsCombined = [
        ...digitalisasi,
        ...(digitalisasiLainnya ? [digitalisasiLainnya] : []),
      ].join(", ") || "Infocus, Laptop, Platform Digital";

      const profilLulusanList = profilLulusan.length > 0
        ? profilLulusan.join(", ")
        : "Penalaran Kritis, Kreativitas, Kolaborasi, Kemandirian";

      const isAgama =
        (namaMapel || "").toLowerCase().includes("agama") ||
        (namaMapel || "").toLowerCase().includes("budi pekerti");
      const regulasiCpShort = isAgama
        ? "Kepka BKPDM No. 020 Tahun 2026"
        : "BSKAP No. 046/H/KR/2025";
      const regulasiCpFull = isAgama
        ? "Keputusan Kepala BKPDM No. 020 Tahun 2026"
        : "Keputusan BSKAP No. 046/H/KR/2025";

      const lowerMapel = (namaMapel || "").toLowerCase();
      const lowerMateri = (materiPembelajaran || "").toLowerCase();
      const lowerCapaian = (capaianPembelajaran || "").toLowerCase();
      const lowerTujuan = (tujuanPembelajaran || "").toLowerCase();

      const isPai =
        lowerMapel.includes("islam") ||
        (lowerMapel.includes("agama") && (lowerMapel.includes("islam") || lowerMateri.includes("islam") || lowerCapaian.includes("islam"))) ||
        lowerMapel.includes("pai") ||
        lowerMapel.includes("al-qur'an") ||
        lowerMapel.includes("quran") ||
        lowerMapel.includes("bahasa arab") ||
        lowerMapel.includes("btq");

      const isHijaiyahMateri =
        lowerMateri.includes("hijai") ||
        lowerCapaian.includes("hijai") ||
        lowerTujuan.includes("hijai") ||
        lowerMateri.includes("harakat") ||
        lowerCapaian.includes("harakat") ||
        lowerTujuan.includes("harakat") ||
        lowerMateri.includes("fathah") ||
        lowerMateri.includes("kasrah") ||
        lowerMateri.includes("dhammah") ||
        lowerMateri.includes("dammah") ||
        lowerMateri.includes("sukun") ||
        lowerMateri.includes("tanwin") ||
        lowerMateri.includes("tasydid") ||
        lowerMateri.includes("syaddah") ||
        lowerMateri.includes("makhraj") ||
        lowerMateri.includes("makharijul") ||
        lowerMateri.includes("tajwid");

      const isPaiOrHijaiyah = isPai || isHijaiyahMateri;

      const hijaiyahPromptInstruction = isPaiOrHijaiyah
        ? `
ATURAN BAKU PENULISAN HURUF HIJAIYAH & HARAKAT (STANDAR RESMI PENDIDIKAN AGAMA ISLAM):
PENTING & WAJIB DIPATUHI:
Mata pelajaran ini adalah Pendidikan Agama Islam dan/atau materinya berkaitan dengan Huruf Hijaiyah / Al-Qur'an.
Anda WAJIB mematuhi kaidah penulisan berikut:

1. GUNAKAN AKSARA HURUF HIJAIYAH ASLI PADA LEMBAR SOAL:
   - Jika soal atau stimulus berkaitan dengan huruf hijaiyah (huruf tunggal, huruf bersambung di awal/tengah/akhir kata, kata/kalimat, maupun simbol harakat), WAJIB MENGGUNAKAN AKSARA HURUF HIJAIYAH ARAB ASLI (seperti: ا, ب, ت, ث, ج, ح, خ, د, ذ, ر, ز, س, ش, ص, ض, ط, ظ, ع, غ, ف, ق, ك, ل, م, ن, و, هـ, لا, ء, ي).
   - DILARANG KERAS MENGGUNAKAN EJAAN ABJAD BIASA / LATIN untuk merujuk pada bentuk fisik huruf hijaiyah!
     * SALAH BESAR (DILARANG): "Manakah di bawah ini yang merupakan huruf hijaiyah ba? A. alif  B. ba  C. ta  D. tsa"
     * BENAR (WAJIB): "Manakah di bawah ini yang merupakan huruf hijaiyah ب ? A. ا  B. ب  C. ت  D. ث"

2. GUNAKAN TULISAN TANDA HARAKAT ARAB ASLI:
   - Jika materi atau soal berkaitan dengan tanda baca harakat (fathah, kasrah, dhammah, sukun, tasydid/syaddah, fathatain, kasratain, dammatain):
     * WAJIB MENULISKAN TANDA HARAKAT ARAB ASLI yang terpasang pada hurufnya atau simbol harakat itu sendiri:
       - Fathah: ـَ (contoh huruf: اَ, بَ, تَ, ثَ, جَ, dst.)
       - Kasrah: ـِ (contoh huruf: اِ, بِ, تِ, ثِ, جِ, dst.)
       - Dhammah: ـُ (contoh huruf: اُ, بُ, تُ, ثُ, جُ, dst.)
       - Sukun: ـْ (contoh huruf: اْ, بْ, تْ, ثْ, جْ, dst.)
       - Tasydid: ـّ (contoh: رَّ, كُّ, مِّ)
       - Tanwin: ـً (fathatain), ـٍ (kasratain), ـٌ (dammatain) (contoh: بً, بٍ, بٌ)
     * DILARANG KERAS menuliskan opsi pilihan jawaban berharakat dengan ejaan abjad biasa seperti "ba fathah", "ba kasroh", "ba dhommah", "bu", "bi", dsb. jika soal meminta memilih huruf yang berharakat tersebut! Pilihan jawaban WAJIB menggunakan huruf hijaiyah berharakat Arab asli.
       Contoh:
       Soal: Huruf hijaiyah berikut yang berharakat kasrah adalah...
       A. بَ
       B. بِ
       C. بُ
       D. بْ
       (Atau jika menanyakan simbol harakat: A. ـَ   B. ـِ   C. ـُ   D. ـْ)

3. PENGECUALIAN TEGAS (HANYA JIKA SOAL MEMINTA CARA MEMBACA / BUNYI LAFAL INDONESIANYA):
   - KECUALI jika soal secara eksplisit menanyakan bunyi / CARA MEMBACA / lafal / pengucapan huruf hijaiyah, MAKA pada pilihan jawaban (atau isiannya) TETAP MENULISKAN DENGAN EJAAN ABJAD INDONESIANYA!
   - Contoh yang TEPAT & WAJIB DIIKUTI:
     * Soal: Huruf جَ jika dibaca berbunyi . . .
       A. ja
       B. ji
       C. ju
       D. ba
       (Perhatikan: Huruf di pokok soal tetap menggunakan aksara hijaiyah Arab asli berharakat 'جَ', sedangkan pilihan jawaban A, B, C, D menggunakan abjad Indonesia 'ja', 'ji', 'ju', 'ba' karena menanyakan CARA MEMBACA).
     * Contoh kebalikannya (menuliskan bunyi lafal ke huruf hijaiyah):
       Soal: Lafal "tsa" jika ditulis dalam huruf hijaiyah berharakat fathah adalah . . .
       A. تَ
       B. ثَ
       C. جَ
       D. حَ
       (Pilihan jawaban WAJIB menggunakan huruf hijaiyah Arab asli berharakat).

4. SOAL MERANGKAI DAN MEMISAHKAN HURUF BERSAMBUNG:
   - Jika soal tentang merangkai atau memisahkan huruf, WAJIB menggunakan aksara hijaiyah Arab berharakat asli:
     * Soal: Huruf-huruf كَ - تَ - بَ jika dirangkai bersambung menjadi . . .
       A. كَتَبَ
       B. كُتِبَ
       C. كَاتِبَ
       D. مَكْتَبَ
     * Soal: Kata عَمِلَ jika dipisahkan menurut huruf-huruf penyusunnya adalah . . .
       A. عَ - مِ - لَ
       B. عَ - نِ - لَ
       C. غَ - مِ - لَ
       D. فَ - مِ - لَ

5. PADA SOAL MENJODOHKAN (MATCHING) & BENAR-SALAH:
   - Gunakan aksara hijaiyah Arab dan tanda harakat asli pada premis dan opsi jawaban atau pernyataan:
     Contoh Menjodohkan:
     | Premis (Pernyataan / Masalah) | Pilihan Jawaban (Opsi) |
     | :--- | :--- |
     | 1. Bentuk huruf berharakat fathah | A. بَ |
     | 2. Bentuk huruf berharakat kasrah | B. بِ |
     | 3. Bentuk huruf berharakat dhammah | C. بُ |
     | | D. بْ |
     | | E. بً |
     (Atau jika premis menanyakan lafal bacaan: Premis 1. Huruf تِ -> Opsi: A. ti, B. tsu, C. ja, dst.)
   - Contoh Benar-Salah:
     | No | Pernyataan | Benar | Salah |
     | :---: | :--- | :---: | :---: |
     | 1. | Huruf دَ berharakat fathah dan menghasilkan bunyi "da". | | |
     | 2. | Huruf رِ berharakat kasrah dan menghasilkan bunyi "ri". | | |
     | 3. | Huruf سُ berharakat dhammah dan menghasilkan bunyi "su". | | |

6. PADA KISI-KISI, KUNCI JAWABAN & PEMBAHASAN:
   - Seluruh kisi-kisi dan kunci jawaban WAJIB menampilkan huruf hijaiyah Arab asli berharakat lengkap, lalu memberikan pembahasan cara membaca dan maknanya dalam bahasa Indonesia yang runtut.`
        : "";

      let systemPrompt = "";
      let userPrompt = "";

      if (type === "rppm") {
        // Enforce replacement of "peserta didik" with "murid" from user form inputs
        const rppmCapaian = replacePesertaDidikWithMurid(capaianPembelajaran || "-");
        const rppmTujuan = replacePesertaDidikWithMurid(tujuanPembelajaran || "Tujuan Pembelajaran");
        const rppmMateri = replacePesertaDidikWithMurid(materiPembelajaran || "Materi Pembelajaran");

        // Evaluasi jumlah pertemuan dari form input
        const matchJumlah = (jumlahPertemuan || "").match(/(\d+)/);
        const totalPertemuan = matchJumlah ? Math.max(1, parseInt(matchJumlah[1], 10)) : 1;
        const isMultiPertemuan = totalPertemuan > 1;

        // Ambil daftar dimensi profil lulusan yang dipilih dari form
        const activeDimensiList = (Array.isArray(profilLulusan) && profilLulusan.length > 0)
          ? profilLulusan
          : ["Penalaran Kritis", "Kolaborasi", "Kemandirian"];

        let rubrikSikapTemplateRows = "";
        activeDimensiList.forEach((dimensi, idx) => {
          rubrikSikapTemplateRows += `| ${idx + 1} | **${dimensi}**: [Indikator sikap operasional teramati terkait materi ${materiPembelajaran}] | [Deskripsi capaian Baru Berkembang (1) padat] | [Deskripsi capaian Layak (2) padat] | [Deskripsi capaian Cakap (3) padat] | [Deskripsi capaian Mahir (4) padat] |\n`;
        });

        systemPrompt = `Anda adalah Pakar Pengembang Kurikulum Merdeka Nasional Kemendikbudristek RI dan Guru Penggerak Senior. 
Tugas Anda adalah menyusun dokumen "Rencana Pelaksanaan Pembelajaran Mendalam (RPPM)" yang sangat komprehensif, akademis, operasional, berkesadaran, bermakna, dan menggembirakan sesuai standar Kurikulum Merdeka terbaru (${regulasiCpFull}).
Format dokumen HARUS menggunakan Markdown yang sangat rapi, terstruktur, lengkap tanpa placeholder ringkas/singkatan kosong, dan siap cetak. Gunakan Bahasa Indonesia baku dan profesional.
PENTING:
- PENGGUNAAN ISTILAH SUBJEK BELAJAR (WAJIB MENGGUNAKAN KATA 'MURID'):
  Seluruh dokumen RPPM WAJIB menggunakan istilah "Murid" / "murid", dan DILARANG KERAS menggunakan istilah "Peserta Didik" / "peserta didik". Semua rujukan terhadap subjek pembelajar (baik di Capaian Pembelajaran, Tujuan Pembelajaran, Identifikasi Murid, Desain Pembelajaran, Pengalaman Belajar, Asesmen, maupun Rubrik) WAJIB dituliskan dengan kata "Murid" atau "murid". Jika guru menginput kata "peserta didik" di formulir, ubah seluruhnya menjadi "murid" di dalam dokumen RPPM.
- ATURAN KETAT TABEL RUBRIK PENILAIAN SIKAP (DIMENSI PROFIL LULUSAN):
  Wajib menguraikan SELURUH dimensi Profil Lulusan yang dipilih guru pada formulir input (${activeDimensiList.join(", ")}).
  Jumlah baris pada tabel Rubrik Penilaian Sikap HARUS TEPAT SAMA dengan jumlah dimensi yang dipilih guru, yaitu TEPAT ${activeDimensiList.length} baris penilaian!
  Jika guru memilih 3 dimensi, WAJIB muncul tepat 3 baris untuk ketiga dimensi tersebut. Jika guru memilih 4 dimensi, WAJIB muncul tepat 4 baris, dan seterusnya.
  DILARANG KERAS hanya memunculkan 1 atau 2 baris jika guru memilih 3 atau lebih dimensi. Setiap dimensi yang dipilih guru WAJIB memiliki baris penilaian tersendiri dengan format 6 kolom:
  '| [Nomor] | **[Nama Dimensi]**: [Indikator sikap operasional teramati] | [Baru Berkembang (1)] | [Layak (2)] | [Cakap (3)] | [Mahir (4)] |'.
- ATURAN KHUSUS BAGIAN D. PENGALAMAN BELAJAR & JUMLAH PERTEMUAN:
  1. JIKA JUMLAH PERTEMUAN HANYA 1 PERTEMUAN:
     DILARANG KERAS mencantumkan judul atau penjelasan "Pertemuan 1" atau "Pertemuan ke berapa".
     Langsung sajikan '## D. Pengalaman Belajar' diikuti dengan:
     - '### 1. KEGIATAN AWAL (opsional) (Prinsip: Berkesadaran, Bermakna, Menggembirakan)'
     - '### 2. KEGIATAN INTI (Prinsip: Berkesadaran, Bermakna, Menyenangkan)'
     - '### 3. KEGIATAN PENUTUP (Prinsip: Berkesadaran, Bermakna, Menggembirakan)'
  2. JIKA JUMLAH PERTEMUAN LEBIH DARI 1 PERTEMUAN (misal: 2 Pertemuan, 3 Pertemuan, dst):
     WAJIB membagi dan merinci langkah pembelajaran per pertemuan secara berurutan:
     '### Pertemuan 1: [Fokus/Sub-materi Pertemuan 1]', '### Pertemuan 2: [Fokus/Sub-materi Pertemuan 2]', dst. hingga Pertemuan ${totalPertemuan}.
     Setiap pertemuan WAJIB merinci 3 tahapan lengkap:
     - 1. KEGIATAN AWAL (opsional) (Prinsip: Berkesadaran, Bermakna, Menggembirakan)
     - 2. KEGIATAN INTI (Prinsip: Berkesadaran, Bermakna, Menyenangkan)
     - 3. KEGIATAN PENUTUP (Prinsip: Berkesadaran, Bermakna, Menggembirakan)
  3. KEDALAMAN PEDAGOGIS PADA SETIAP TAHAP KEGIATAN:
     - KEGIATAN AWAL: Pembuka dari proses pembelajaran yang bertujuan mempersiapkan murid sebelum memasuki inti pembelajaran. Wajib memuat orientasi yang bermakna, apersepsi yang kontekstual, dan motivasi yang menggembirakan. Tuliskan prinsip pembelajaran yang digunakan (misal: berkesadaran, bermakna, menggembirakan).
     - KEGIATAN INTI: Murid aktif terlibat dalam pengalaman belajar Memahami, Mengaplikasi, dan Merefleksi dengan prinsip berkesadaran, bermakna, menyenangkan:
       * Memahami: Kegiatan pembelajaran yang memfasilitasi murid terlibat aktif mengonstruksi pengetahuan agar dapat memahami secara mendalam konsep atau materi dari berbagai sumber dan konteks, dirinci menjadi Pengetahuan Esensial, Pengetahuan Aplikatif, dan Pengetahuan Nilai dan Karakter. Tuliskan prinsip pembelajaran yang digunakan (berkesadaran, bermakna, dan/atau menggembirakan).
       * Mengaplikasi: Kegiatan yang mengondisikan pengalaman belajar yang menunjukkan aktivitas murid mengaplikasi pemahaman secara kontekstual atau kehidupan nyata (hidup, kehidupan, dan/atau penghidupan) untuk pendalaman pengetahuan dan pengembangan kompetensi. Tuliskan prinsip pembelajaran yang digunakan (berkesadaran, bermakna, dan/atau menggembirakan).
       * Merefleksi: Kegiatan yang memfasilitasi murid untuk:
         a. mengevaluasi dan memaknai proses serta hasil dari tindakan atau praktik nyata yang telah mereka lakukan dan menentukan tindak lanjut ke depan.
         b. mengelola proses belajarnya secara mandiri, dengan meneruskan dan mengembangkan strategi belajar yang berhasil dan memperbaiki yang belum berhasil dengan tetap meningkatkan motivasi belajar dan kepercayaan diri.
         Tuliskan prinsip pembelajaran yang digunakan (berkesadaran, bermakna, dan/atau menggembirakan).
     - KEGIATAN PENUTUP: Tahap akhir proses pembelajaran yang bertujuan memberikan umpan balik konstruktif kepada murid atas pengalaman belajar yang telah dilakukan, menyimpulkan pembelajaran bersama murid, dan murid terlibat dalam perencanaan pembelajaran selanjutnya. Tuliskan prinsip pembelajaran yang digunakan (misal: berkesadaran, bermakna, dan menggembirakan).
- DILARANG KERAS menyertakan bagan alur teks ASCII / diagram pohon alur (seperti teks 'ALUR PEMBELAJARAN MENDALAM', ranting ├──, └──, atau ringkasan flowchart teks sejenis) di bawah 'D. Pengalaman Belajar'. Cukup sajikan narasi poin-poin kegiatan pembelajaran operasional dan langsung beralih ke '## E. Asesmen Pembelajaran'.
- ATURAN KETAT FORMAT TABEL MARKDOWN:
  Semua bagian yang memerlukan tabel (Tabel Rancangan & Teknik Asesmen, Tabel Rubrik Penilaian Sikap, Tabel Rubrik Penilaian Kinerja, Tabel Kisi-Kisi, Lembar Pengesahan, dsb) WAJIB disajikan sebagai TABEL MARKDOWN GFM ASLI yang valid:
  1. Baris Judul Kolom (Header) diawali dan diakhiri tanda pipa '|'.
  2. Baris Pembatas Alignment (Separator baris kedua) WAJIB SELALU DITULIS TEPAT DI BAWAH JUDUL KOLOM (misalnya: '| :---: | :--- | :--- | :--- | :--- | :--- |').
  3. Setiap baris data WAJIB berada pada BARIS BARU TERSENDIRI dengan tanda newline (enter).
  4. DILARANG KERAS menggabungkan baris tabel menjadi satu baris atau menggunakan tanda '||' atau tag '<br>'.
  5. Berikan satu baris kosong sebelum dan sesudah setiap tabel agar tabel ter-render dengan sempurna.
  6. PROPORSIONAL LEBAR KERTAS A4: Tabel Rubrik (Sikap, Kinerja, Asesmen) WAJIB menggunakan format tabel 6 kolom: '| No | Aspek & Indikator Penilaian | Baru Berkembang (1) | Layak (2) | Cakap (3) | Mahir (4) |'. Tuliskan deskripsi capaian kriteria secara padat, lugas, dan operasional agar tabel pas dengan lebar kertas A4 (tidak terpotong / melebihi margin kertas).
- DILARANG KERAS menggunakan tag HTML seperti <br>, <br/>, atau tag HTML apapun dalam seluruh dokumen (termasuk pada tabel lembar pengesahan). Gunakan format Markdown murni.
- DILARANG KERAS menggunakan format rumus LaTeX / math block seperti $$\\text{...}$$, $$, \\frac, atau \\text. Tuliskan rumus perhitungan skor/nilai sebagai teks biasa yang bersih dan mudah dibaca, misalnya: 'Nilai Akhir = (Skor Perolehan / Skor Maksimal) x 100'.${isPaiOrHijaiyah ? `\n- ATURAN KHUSUS PENDIDIKAN AGAMA ISLAM & HURUF HIJAIYAH:\n  Jika materi memuat Huruf Hijaiyah / Al-Qur'an, sajikan aksara huruf hijaiyah Arab asli berharakat lengkap (seperti: اَ, بَ, تَ, ثَ dan harakat fathah (ـَ), kasrah (ـِ), dhammah (ـُ)) pada materi esensial, contoh kegiatan pembelajaran, dan rubrik penilaian, bukan ejaan abjad biasa.` : ''}`;

        // Rancang bagian D. Pengalaman Belajar secara dinamis berdasarkan jumlah pertemuan
        let pengalamanBelajarPrompt = "";
        if (isMultiPertemuan) {
          pengalamanBelajarPrompt = `## D. Pengalaman Belajar
*(Jumlah Pertemuan: ${totalPertemuan} Pertemuan. Pembelajaran dirancang dalam ${totalPertemuan} pertemuan yang berkesinambungan dan runtut. WAJIB sajikan setiap pertemuan dengan nomor pertemuan yang jelas: "### Pertemuan 1: [Fokus/Topik Bahasan]", "### Pertemuan 2: [Fokus/Topik Bahasan]", dst. hingga Pertemuan ${totalPertemuan}. Di setiap pertemuan, wajib memuat secara lengkap tahap Kegiatan Awal, Kegiatan Inti, dan Kegiatan Penutup):*
`;
          for (let p = 1; p <= totalPertemuan; p++) {
            pengalamanBelajarPrompt += `
### Pertemuan ${p}: [Tuliskan Fokus Sub-Materi / Tujuan Spesifik Pertemuan ${p}]

#### 1. KEGIATAN AWAL (opsional) (Prinsip: Berkesadaran, Bermakna, Menggembirakan)
Pembuka dari proses pembelajaran yang bertujuan untuk mempersiapkan murid sebelum memasuki inti pembelajaran. Kegiatan dalam tahap ini meliputi:
- **Orientasi yang Bermakna**: Pembiasaan positif, doa bersama, pengelolaan emosi / kesadaran diri (*mindfulness*), dan pengecekan kesiapan belajar murid (berkesadaran).
- **Apersepsi yang Kontekstual**: Menghubungkan pengetahuan awal atau pengalaman nyata murid dengan materi baru melalui pertanyaan pemantik kontekstual yang merangsang rasa ingin tahu (bermakna).
- **Motivasi yang Menggembirakan**: Ice breaking / stimulus menarik, penyampaian tujuan pembelajaran, penjelasan manfaat esensial materi bagi kehidupan sehari-hari, serta garis besar skenario aktivitas (menggembirakan).

#### 2. KEGIATAN INTI (Prinsip: Berkesadaran, Bermakna, Menyenangkan)
Pada tahap ini, murid aktif terlibat dalam pengalaman belajar memahami, mengaplikasi, dan merefleksi. Guru menerapkan prinsip pembelajaran berkesadaran, bermakna, menyenangkan untuk mencapai tujuan pembelajaran:
- **Memahami (Prinsip: Berkesadaran, Bermakna, Menggembirakan)**:
  Kegiatan pembelajaran yang memfasilitasi murid untuk terlibat aktif mengonstruksi pengetahuan agar dapat memahami secara mendalam konsep atau materi dari berbagai sumber dan konteks menggunakan media ${digitalToolsCombined}. Uraikan secara operasional:
  * **Pengetahuan Esensial**: [Kegiatan eksplorasi konsep kunci, prinsip pokok, dan fakta mendalam materi]
  * **Pengetahuan Aplikatif**: [Mengkaji penerapan konsep tersebut dalam konteks kehidupan praktis atau pemecahan masalah nyata]
  * **Pengetahuan Nilai dan Karakter**: [Internalisasi nilai moral, keteladanan, etika, dan dimensi profil lulusan (${profilLulusanList}) yang melekat pada materi]
- **Mengaplikasi (Prinsip: Berkesadaran, Bermakna, Menggembirakan)**:
  Kegiatan yang mengondisikan pengalaman belajar yang menunjukkan aktivitas murid mengaplikasi pemahaman secara kontekstual atau kehidupan nyata (hidup, kehidupan, dan/atau penghidupan). Proses mengaplikasi ini merupakan bagian dari pendalaman pengetahuan untuk menghasilkan pengembangan kompetensi melalui studi kasus, simulasi terbimbing, proyek kolaboratif, atau pemecahan masalah autentik.
- **Merefleksi (Prinsip: Berkesadaran, Bermakna, Menggembirakan)**:
  Kegiatan yang mampu memfasilitasi murid untuk:
  a. Mengevaluasi dan memaknai proses serta hasil dari tindakan atau praktik nyata yang telah mereka lakukan dan menentukan tindak lanjut ke depan.
  b. Mengelola proses belajarnya secara mandiri, dengan meneruskan dan mengembangkan strategi belajar yang berhasil dan memperbaiki yang belum berhasil dengan tetap meningkatkan motivasi belajar dan kepercayaan diri.

#### 3. KEGIATAN PENUTUP (Prinsip: Berkesadaran, Bermakna, Menggembirakan)
Tahap akhir dalam proses pembelajaran yang bertujuan memberikan umpan balik yang konstruktif kepada murid atas pengalaman belajar yang telah dilakukan, menyimpulkan pembelajaran, dan murid terlibat dalam perencanaan pembelajaran selanjutnya:
- **Pemberian Umpan Balik Konstruktif**: Penguatan dan apresiasi atas proses dan capaian belajar murid (berkesadaran).
- **Menyimpulkan Pembelajaran**: Guru bersama murid merangkum benang merah konsep dan pemaknaan esensial materi (bermakna).
- **Perencanaan Pembelajaran Selanjutnya**: Melibatkan murid dalam merencanakan tindak lanjut / persiapan pertemuan berikutnya, diakhiri dengan doa penutup dan salam (menggembirakan).
`;
          }
        } else {
          pengalamanBelajarPrompt = `## D. Pengalaman Belajar
*(Perhatian: Karena jumlah pertemuan di formulir adalah 1 Pertemuan, DILARANG KERAS menuliskan label atau penjelasan 'Pertemuan 1' atau 'Pertemuan ke berapa'. Langsung sajikan langkah pembelajaran berikut):*

### 1. KEGIATAN AWAL (opsional) (Prinsip: Berkesadaran, Bermakna, Menggembirakan)
Pembuka dari proses pembelajaran yang bertujuan untuk mempersiapkan murid sebelum memasuki inti pembelajaran. Kegiatan dalam tahap ini meliputi:
- **Orientasi yang Bermakna**: Pembiasaan positif, doa bersama, pengelolaan emosi / kesadaran diri (*mindfulness*), dan pengecekan kesiapan belajar murid (berkesadaran).
- **Apersepsi yang Kontekstual**: Menghubungkan pengetahuan awal atau pengalaman nyata murid dengan materi baru melalui pertanyaan pemantik kontekstual yang merangsang rasa ingin tahu (bermakna).
- **Motivasi yang Menggembirakan**: Ice breaking / stimulus menarik, penyampaian tujuan pembelajaran, penjelasan manfaat esensial materi bagi kehidupan sehari-hari, serta garis besar skenario aktivitas (menggembirakan).

### 2. KEGIATAN INTI (Prinsip: Berkesadaran, Bermakna, Menyenangkan)
Pada tahap ini, murid aktif terlibat dalam pengalaman belajar memahami, mengaplikasi, dan merefleksi. Guru menerapkan prinsip pembelajaran berkesadaran, bermakna, menyenangkan untuk mencapai tujuan pembelajaran:
- **Memahami (Prinsip: Berkesadaran, Bermakna, Menggembirakan)**:
  Kegiatan pembelajaran yang memfasilitasi murid untuk terlibat aktif mengonstruksi pengetahuan agar dapat memahami secara mendalam konsep atau materi dari berbagai sumber dan konteks menggunakan media ${digitalToolsCombined}. Uraikan secara operasional:
  * **Pengetahuan Esensial**: [Kegiatan eksplorasi konsep kunci, prinsip pokok, dan fakta mendalam materi]
  * **Pengetahuan Aplikatif**: [Mengkaji penerapan konsep tersebut dalam konteks kehidupan praktis atau pemecahan masalah nyata]
  * **Pengetahuan Nilai dan Karakter**: [Internalisasi nilai moral, keteladanan, etika, dan dimensi profil lulusan (${profilLulusanList}) yang melekat pada materi]
- **Mengaplikasi (Prinsip: Berkesadaran, Bermakna, Menggembirakan)**:
  Kegiatan yang mengondisikan pengalaman belajar yang menunjukkan aktivitas murid mengaplikasi pemahaman secara kontekstual atau kehidupan nyata (hidup, kehidupan, dan/atau penghidupan). Proses mengaplikasi ini merupakan bagian dari pendalaman pengetahuan untuk menghasilkan pengembangan kompetensi melalui studi kasus, simulasi terbimbing, proyek kolaboratif, atau pemecahan masalah autentik.
- **Merefleksi (Prinsip: Berkesadaran, Bermakna, Menggembirakan)**:
  Kegiatan yang mampu memfasilitasi murid untuk:
  a. Mengevaluasi dan memaknai proses serta hasil dari tindakan atau praktik nyata yang telah mereka lakukan dan menentukan tindak lanjut ke depan.
  b. Mengelola proses belajarnya secara mandiri, dengan meneruskan dan mengembangkan strategi belajar yang berhasil dan memperbaiki yang belum berhasil dengan tetap meningkatkan motivasi belajar dan kepercayaan diri.

### 3. KEGIATAN PENUTUP (Prinsip: Berkesadaran, Bermakna, Menggembirakan)
Tahap akhir dalam proses pembelajaran yang bertujuan memberikan umpan balik yang konstruktif kepada murid atas pengalaman belajar yang telah dilakukan, menyimpulkan pembelajaran, dan murid terlibat dalam perencanaan pembelajaran selanjutnya:
- **Pemberian Umpan Balik Konstruktif**: Penguatan dan apresiasi atas proses dan capaian belajar murid (berkesadaran).
- **Menyimpulkan Pembelajaran**: Guru bersama murid merangkum benang merah konsep dan pemaknaan esensial materi (bermakna).
- **Perencanaan Pembelajaran Selanjutnya**: Melibatkan murid dalam merencanakan tindak lanjut / refleksi diri lanjutan, diakhiri dengan doa penutup dan salam (menggembirakan).`;
        }

        userPrompt = `Buatkan Dokumen Rencana Pelaksanaan Pembelajaran Mendalam (RPPM) lengkap dengan rincian berikut:

IDENTITAS DATA GURU & PEMBELAJARAN:
- Satuan Pendidikan: ${namaSekolah || "Satuan Pendidikan"}
- Nama Guru / Penyusun: ${namaGuru || "Guru Mata Pelajaran"}
- NIP Guru: ${nipGuru || "-"}
- Jabatan: ${jabatan || "Guru Mata Pelajaran"}
- Nama Kepala Sekolah: ${namaKepalaSekolah || "Kepala Sekolah"}
- NIP Kepala Sekolah: ${nipKepalaSekolah || "-"}
- Tempat Penandatanganan: ${tempatTtd || "Indonesia"}
- Jenjang: ${jenjang}
- Mata Pelajaran: ${namaMapel}
- Rujukan Regulasi CP: ${regulasiCpFull}
- Fase / Kelas: ${faseKelas}
- Semester: ${semester}
- Tahun Pelajaran: ${tahunPelajaran || "2025/2026"}
- Alokasi Waktu: ${alokasiWaktu || "2 JP (2 x 40 Menit)"}
- Jumlah Pertemuan: ${jumlahPertemuan || "1 Pertemuan"}
- Capaian Pembelajaran (CP): ${rppmCapaian} (Rujukan Regulasi: ${regulasiCpShort})
- Materi Pokok / Pembelajaran: ${rppmMateri}
- Tujuan Pembelajaran (TP): ${rppmTujuan}
- Dimensi Profil Lulusan / Pelajar Pancasila: ${profilLulusanList}
- Pemanfaatan Digitalisasi Pembelajaran: ${digitalToolsCombined}

STRUKTUR DOKUMEN YANG WAJIB DIIKUTI PERSIS:

# RENCANA PELAKSANAAN PEMBELAJARAN MENDALAM
### (RPPM)

## A. Identitas Sekolah

| Informasi | : | Keterangan |
| :--- | :---: | :--- |
| **Nama Satuan Pendidikan** | : | ${namaSekolah || "SD Negeri Kaiulangko"} |
| **Nama Penyusun** | : | ${namaGuru || "Siti Rahmawati, S.Pd., Gr."} |
| **Mata Pelajaran** | : | ${namaMapel} |
| **Fase / Kelas / Semester** | : | ${faseKelas} / Semester ${semester} |
| **Materi Pembelajaran** | : | ${rppmMateri} |
| **Alokasi Waktu** | : | ${alokasiWaktu || "3 JP (3 x 35 Menit)"} (${jumlahPertemuan || "1 Pertemuan"}) |
| **Tahun Pelajaran** | : | ${tahunPelajaran || "2026/2027"} |

## B. Identifikasi
- **Murid**: Tuliskan identifikasi kesiapan murid sebelum belajar (pengetahuan awal/prasyarat, gaya belajar, minat, latar belakang sosial-emosional, dan kebutuhan belajar berdiferensiasi konten/proses/produk).
- **Materi Pelajaran**: Analisis mendalam materi pelajaran mencakup jenis pengetahuan (faktual, konseptual, prosedural, metakognitif), relevansi kontekstual dengan kehidupan nyata murid di Indonesia, tingkat kesulitan materi, struktur hierarki konsep, serta integrasi nilai moral/karakter.
- **Dimensi Profil Lulusan**: ${profilLulusanList} (Berikan deskripsi singkat bagaimana dimensi ini diinternalisasikan dalam materi ini).

## C. Desain Pembelajaran
- **Tujuan Pembelajaran**: Tuliskan rincian Tujuan Pembelajaran (TP) yang jelas mencakup kompetensi dan konten materi.
- **Praktik Pedagogis**: Tentukan Model/Strategi/Metode pembelajaran yang sangat tepat (misalnya: Problem-Based Learning (PBL), Project-Based Learning (PjBL), Inkuiri Terbimbing, Discovery Learning, atau Teaching at the Right Level (TaRL)) yang mengintegrasikan pemanfaatan media digital: ${digitalToolsCombined}.
- **Lingkungan Pembelajaran**: Uraikan rancangan budaya belajar yang aman, nyaman, inklusif, dan saling memuliakan (budaya kelas positif), baik pada ruang fisik maupun ruang virtual/daring.
- **Kemitraan Pembelajaran (opsional)**: Tuliskan bentuk kolaborasi nyata (misal kemitraan antar murid, orang tua siswa, komunitas belajar, dunia industri/praktisi).
- **Pemanfaatan Digital (opsional)**: Uraikan pemanfaatan spesifik teknologi digital (${digitalToolsCombined}) untuk menunjang interaktivitas, asesmen digital, eksplorasi materi, dan kolaborasi murid.

${pengalamanBelajarPrompt}

*(PERHATIAN: Setelah poin Kegiatan Penutup selesai, LANGSUNG lanjutkan ke "## E. Asesmen Pembelajaran". JANGAN membuat diagram pohon teks, bagan alur ASCII, atau tulisan beranting seperti "ALUR PEMBELAJARAN MENDALAM" atau ranting ├──, └──).*

## E. Asesmen Pembelajaran

### 1. Tabel Rancangan & Teknik Asesmen
Sajikan tabel pemetaan instrumen dan teknik asesmen secara lengkap (Asesmen Diagnostik/Awal, Asesmen Formatif/Proses, dan Asesmen Sumatif/Akhir) dengan format tabel Markdown:
| No | Jenis Asesmen | Teknik Asesmen | Bentuk Instrumen | Waktu Pelaksanaan | Keterangan / Fokus Penilaian |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | Asesmen Diagnostik (Awal) | Tes Lisan / Observasi Awal | Tanya Jawab Pemantik Kesiapan Belajar | Awal Pembelajaran | Mengidentifikasi kesiapan awal murid |
| 2 | Asesmen Formatif (Proses) | Observasi Diskusi & Kinerja LKPD | Lembar Observasi Kinerja & Partisipasi | Selama Proses Belajar | Memberikan umpan balik langsung |
| 3 | Asesmen Sumatif (Akhir) | Tes Tertulis / Penugasan Akhir | Soal Pilihan Ganda / Esai Reflektif | Akhir Pembelajaran | Mengukur ketercapaian Tujuan Pembelajaran |

### 2. Tabel Rubrik Penilaian Sikap (Dimensi Profil Lulusan)

PENTING & WAJIB DIPATUHI:
Guru telah memilih ${activeDimensiList.length} dimensi profil lulusan pada formulir (${activeDimensiList.join(", ")}).
Anda WAJIB menyajikan tabel rubrik penilaian sikap dengan TEPAT ${activeDimensiList.length} baris penilaian untuk SEMUA dimensi yang dipilih tersebut tanpa ada yang terlewat! Setiap dimensi memiliki 4 kriteria capaian operasional materi "${materiPembelajaran}" (WAJIB format tabel 6 kolom utuh, sesuaikan dengan lebar kertas A4):

| No | Dimensi & Indikator Sikap | Baru Berkembang (1) | Layak (2) | Cakap (3) | Mahir (4) |
| :---: | :--- | :--- | :--- | :--- | :--- |
${rubrikSikapTemplateRows.trim()}

### 3. Tabel Rubrik Penilaian Kinerja & Penguasaan Konsep

Sajikan tabel rubrik penilaian unjuk kerja / pemahaman konsep murid (WAJIB format tabel 6 kolom utuh, sesuaikan dengan lebar kertas A4 agar tidak melebihi margin kertas):
| No | Aspek & Indikator Penilaian | Baru Berkembang (1) | Layak (2) | Cakap (3) | Mahir (4) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Penguasaan Konsep & Pemahaman Fakta**: [Indikator capaian pemahaman konsep ${materiPembelajaran}] | [Deskripsi level 1 padat terukur] | [Deskripsi level 2 padat terukur] | [Deskripsi level 3 padat terukur] | [Deskripsi level 4 padat terukur] |
| 2 | **Keterampilan Prosedural & Penerapan**: [Indikator aplikasi kontekstual] | [Deskripsi level 1 padat] | [Deskripsi level 2 padat] | [Deskripsi level 3 padat] | [Deskripsi level 4 padat] |
| 3 | **Komunikasi & Argumentasi Logis**: [Indikator penyampaian ide/karya] | [Deskripsi level 1 padat] | [Deskripsi level 2 padat] | [Deskripsi level 3 padat] | [Deskripsi level 4 padat] |

Pedoman Penskoran:
Nilai Akhir = (Total Skor Perolehan / Total Skor Maksimal) x 100

---

| **Mengetahui,** | **${tempatTtd || "Jakarta"}, ${tanggalTtd}** |
| :--- | :--- |
| **Kepala ${namaSekolah || "SD Negeri Cipta Cendekia 01"}** | **${jabatan || "Guru Kelas"}** |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| **${namaKepalaSekolah || "Drs. H. Bambang Sujatmiko, M.Pd."}** | **${namaGuru || "Siti Rahmawati, S.Pd., Gr."}** |
| NIP. ${nipKepalaSekolah || "-"} | NIP. ${nipGuru || "-"} |

Pastikan isi dokumen sangat detail, langsung menyatu dengan materi "${materiPembelajaran}", dan menggunakan bahasa Indonesia yang rapi.${isPaiOrHijaiyah ? ` Khusus materi Pendidikan Agama Islam / Huruf Hijaiyah, sajikan aksara huruf hijaiyah Arab asli berharakat lengkap (seperti: اَ, بَ, تَ, ثَ, كَتَبَ), bukan ejaan abjad biasa.` : ""}`;
      } else if (type === "asesmen") {
        const jenisAsesmenStr = asesmenConfig?.jenisAsesmen || "Asesmen Formatif";
        const levelKognitifStr = asesmenConfig?.levelKognitif?.join(" dan ") || "MOTS dan HOTS";
        const isSumatif = (jenisAsesmenStr || "").toLowerCase().includes("sumatif");
        const formattedFaseKelas = formatFaseKelasKop(faseKelas);

        // Build question types requirements
        const questionSpecs: string[] = [];
        let totalSoalCount = 0;

        if (asesmenConfig) {
          if (asesmenConfig.soalPG?.enabled && asesmenConfig.soalPG.jumlahSoal > 0) {
            const opsiLabel = asesmenConfig.soalPG.jumlahOpsi === 3 ? "A, B, C" : asesmenConfig.soalPG.jumlahOpsi === 5 ? "A, B, C, D, E" : "A, B, C, D";
            questionSpecs.push(`- **Pilihan Ganda (PG)**: ${asesmenConfig.soalPG.jumlahSoal} butir soal, setiap soal memiliki ${asesmenConfig.soalPG.jumlahOpsi} opsi pilihan jawaban (${opsiLabel}). Berikan stimulus kontekstual.`);
            totalSoalCount += asesmenConfig.soalPG.jumlahSoal;
          }
          if (asesmenConfig.soalPGK?.enabled && asesmenConfig.soalPGK.jumlahSoal > 0) {
            questionSpecs.push(`- **Pilihan Ganda Kompleks (PGK)**: ${asesmenConfig.soalPGK.jumlahSoal} butir soal, peserta didik memilih lebih dari 1 pernyataan yang benar berdasarkan stimulus.`);
            totalSoalCount += asesmenConfig.soalPGK.jumlahSoal;
          }
          if (asesmenConfig.soalIsianSingkat?.enabled && asesmenConfig.soalIsianSingkat.jumlahSoal > 0) {
            questionSpecs.push(`- **Isian Singkat (Short Answer)**: ${asesmenConfig.soalIsianSingkat.jumlahSoal} butir soal, menuntut jawaban ringkas berupa fakta, istilah, atau angka.`);
            totalSoalCount += asesmenConfig.soalIsianSingkat.jumlahSoal;
          }
          if (asesmenConfig.soalUraian?.enabled && asesmenConfig.soalUraian.jumlahSoal > 0) {
            questionSpecs.push(`- **Uraian / Esai (Essay)**: ${asesmenConfig.soalUraian.jumlahSoal} butir soal analitis mendalam, menuntut penalaran kritis, argumentasi, atau solusi inovatif.`);
            totalSoalCount += asesmenConfig.soalUraian.jumlahSoal;
          }
          if (asesmenConfig.soalBenarSalah?.enabled && asesmenConfig.soalBenarSalah.jumlahSoal > 0) {
            questionSpecs.push(`- **Benar / Salah (True or False)**: ${asesmenConfig.soalBenarSalah.jumlahSoal} paket butir soal berstimulus, setiap nomor soal memuat tepat 2 atau 3 pernyataan (tabel 4 kolom: No, Pernyataan, Benar, Salah).`);
            totalSoalCount += asesmenConfig.soalBenarSalah.jumlahSoal;
          }
          if (asesmenConfig.soalMenjodohkan?.enabled && asesmenConfig.soalMenjodohkan.jumlahSoal > 0) {
            questionSpecs.push(`- **Menjodohkan (Matching)**: ${asesmenConfig.soalMenjodohkan.jumlahSoal} paket butir soal berstimulus. Disusun dalam tabel 2 kolom seimbang (50% kiri - 50% kanan): Kolom Kiri memuat daftar pernyataan/masalah (Premis: 1, 2, 3) dan Kolom Kanan memuat daftar pilihan jawaban (Opsi: A, B, C, D, E). KHUSUS SOAL MENJODOHKAN: TIDAK PERLU DAN DILARANG MENGGUNAKAN GAMBAR PADA OPSI PILIHAN MAUPUN PREMIS! CUKUP MENGGUNAKAN KALIMAT / PERNYATAAN TEKS SAJA LENGKAP. Jumlah opsi HARUS LEBIH BANYAK daripada premis (memuat 1-2 opsi ekstra sebagai distraktor) untuk meminimalkan tebakan acak.`);
            totalSoalCount += asesmenConfig.soalMenjodohkan.jumlahSoal;
          }
        }

        const questionTypesList: string[] = [];
        if (asesmenConfig?.soalPG?.enabled && asesmenConfig.soalPG.jumlahSoal > 0) questionTypesList.push(`${asesmenConfig.soalPG.jumlahSoal} PG`);
        if (asesmenConfig?.soalPGK?.enabled && asesmenConfig.soalPGK.jumlahSoal > 0) questionTypesList.push(`${asesmenConfig.soalPGK.jumlahSoal} PGK`);
        if (asesmenConfig?.soalIsianSingkat?.enabled && asesmenConfig.soalIsianSingkat.jumlahSoal > 0) questionTypesList.push(`${asesmenConfig.soalIsianSingkat.jumlahSoal} Isian`);
        if (asesmenConfig?.soalUraian?.enabled && asesmenConfig.soalUraian.jumlahSoal > 0) questionTypesList.push(`${asesmenConfig.soalUraian.jumlahSoal} Uraian`);
        if (asesmenConfig?.soalBenarSalah?.enabled && asesmenConfig.soalBenarSalah.jumlahSoal > 0) questionTypesList.push(`${asesmenConfig.soalBenarSalah.jumlahSoal} Benar/Salah`);
        if (asesmenConfig?.soalMenjodohkan?.enabled && asesmenConfig.soalMenjodohkan.jumlahSoal > 0) questionTypesList.push(`${asesmenConfig.soalMenjodohkan.jumlahSoal} Menjodohkan`);
        const distributionSummary = questionTypesList.length > 0 ? questionTypesList.join(", ") : "Pilihan Ganda & Uraian";

        if (questionSpecs.length === 0) {
          questionSpecs.push("- **Pilihan Ganda (PG)**: 5 butir soal dengan 4 opsi pilihan jawaban (A, B, C, D).");
          questionSpecs.push("- **Uraian / Esai (Essay)**: 2 butir soal HOTS penalaran kritis.");
          totalSoalCount = 7;
        }

        // Hitung minimal 30% dari jumlah soal yang ada wajib menggunakan soal bergambar
        const minGambarCount = Math.max(2, Math.ceil(totalSoalCount * 0.3));

        systemPrompt = `Anda adalah Pakar Evaluasi dan Asesmen Pendidikan Kurikulum Merdeka Indonesia.
Tugas Anda adalah menyusun Perangkat Asesmen & Rubrik Penilaian (${jenisAsesmenStr}) yang komprehensif, berbasis ${levelKognitifStr}, autentik, dan sesuai standar ${regulasiCpFull}.
Format dokumen HARUS menggunakan Markdown yang sangat rapi dan terstruktur.

PENTING - STANDAR PENULISAN SOAL RESMI:
1. SOAL PILIHAN GANDA (PG):
   Setiap butir soal Pilihan Ganda HARUS mengikuti susunan berikut (SATU BARIS PER OPSI):
   
   Soal Nomor [X]
   
   Stimulus: [Teks narasi stimulus kontekstual berbasis fenomena kehidupan nyata / studi kasus]
   
   [Kalimat pokok soal / pertanyaan yang jelas]
   
     A. [Pilihan jawaban A]
     B. [Pilihan jawaban B]
     C. [Pilihan jawaban C]
     D. [Pilihan jawaban D]
     (E. [Pilihan jawaban E] jika 5 opsi)
   
   * DILARANG KERAS menggabungkan pilihan A, B, C, D dalam satu baris. Setiap pilihan jawaban wajib berada di baris baru tersendiri.

2. SOAL PILIHAN GANDA KOMPLEKS (PGK):
   Setiap butir soal Pilihan Ganda Kompleks HARUS mengikuti susunan berikut:
   
   Soal Nomor [X]
   
   Stimulus:
   
   [Teks narasi stimulus kontekstual, investigasi murid, atau fenomena nyata]
   
   Tentukan pernyataan-pernyataan di bawah ini yang **BENAR** dengan memberikan tanda centang pada kotak yang sesuai! *(Pilihan jawaban benar lebih dari satu)*
   
     [ ] [Pernyataan 1 yang diuji kebenarannya]
     [ ] [Pernyataan 2 yang diuji kebenarannya]
     [ ] [Pernyataan 3 yang diuji kebenarannya]
     [ ] [Pernyataan 4 yang diuji kebenarannya]
     [ ] [Pernyataan 5 yang diuji kebenarannya]
   
   * Gunakan kotak centang [ ] di awal setiap baris pernyataan (satu baris per pernyataan).

3. SOAL MENJODOHKAN (MATCHING):
   Setiap butir paket soal Menjodohkan HARUS disusun dengan memisahkan daftar pernyataan/masalah di kolom kiri (**Premis**) dan daftar pilihan jawaban di kolom kanan (**Pilihan Jawaban (Opsi)**) dalam format tabel 2 kolom Markdown yang seimbang dan simetris (50% kiri - 50% kanan):
   
   Soal Nomor [X]
   
   Stimulus:
   [Teks narasi stimulus kontekstual, studi kasus, infografis, data fenomena nyata, atau ilustrasi]
   
   Pasangkanlah pernyataan/masalah pada kolom **Premis** dengan pilihan jawaban yang paling tepat pada kolom **Pilihan Jawaban (Opsi)**!
   
   | Premis (Pernyataan / Masalah) | Pilihan Jawaban (Opsi) |
   | :--- | :--- |
   | 1. [Teks Pernyataan/Masalah 1] | A. [Teks Pilihan Jawaban A] |
   | 2. [Teks Pernyataan/Masalah 2] | B. [Teks Pilihan Jawaban B] |
   | 3. [Teks Pernyataan/Masalah 3] | C. [Teks Pilihan Jawaban C] |
   | | D. [Teks Pilihan Jawaban D (Distraktor / Pengecoh)] |
   | | E. [Teks Pilihan Jawaban E (Distraktor / Pengecoh)] |
   
    * ATURAN BAKU PENYUSUNAN SOAL MENJODOHKAN:
      - PEMISAHAN KOLOM: Kolom kiri diberi judul "Premis (Pernyataan / Masalah)" dan kolom kanan diberi judul "Pilihan Jawaban (Opsi)".
      - KHUSUS SOAL MENJODOHKAN: DILARANG KERAS MENGGUNAKAN GAMBAR PADA OPSI PILIHAN MAUPUN PREMIS! Seluruh butir premis dan opsi pilihan jawaban WAJIB MURNI MENGGUNAKAN KALIMAT / PERNYATAAN TEKS SAJA yang jelas, lugas, dan padat tanpa tag gambar.
      - JUMLAH OPSI LEBIH BANYAK DARI PREMIS (MINIMALKAN TEBAKAN ACAK): Jumlah pilihan jawaban pada kolom kanan WAJIB LEBIH BANYAK daripada daftar pernyataan di kolom kiri (misal jika Premis ada 3 butir (1, 2, 3), maka Pilihan Jawaban ada 4 atau 5 butir (A, B, C, D, E); jika Premis ada 4 butir, maka Pilihan Jawaban ada 5 atau 6 butir). Pilihan jawaban ekstra berfungsi sebagai distraktor/pengecoh yang homogen dan masuk akal untuk meminimalkan tebakan acak oleh murid.
      - STRUKTUR TABEL 2 KOLOM RAPI: Pada baris opsi ekstra/distraktor yang tidak memiliki premis di kiri, sel kolom kiri dibiarkan kosong "| |" agar tabel tetap tepat 2 kolom Markdown yang simetris dan rapi.
      - KESEIMBANGAN TABEL: Pastikan proporsi kolom seimbang (50% kiri dan 50% kanan). Tepat 2 kolom tanpa membuat kolom kosong tambahan di luar tabel.
      - Penomoran premis menggunakan angka (1., 2., 3.) dan opsi jawaban menggunakan huruf kapital (A., B., C., D., E.).
      - Setiap tabel Menjodohkan ditutup dengan baris kosong ganda (enter ganda) sebelum melanjutkan ke butir soal berikutnya.

4. SOAL BENAR / SALAH (TRUE OR FALSE):
   Setiap butir paket soal Benar/Salah HARUS disajikan dalam format tabel matriks pernyataan terstruktur lengkap dengan stimulus kontekstual:
   
   Soal Nomor [X]
   
   Stimulus:
   [Teks narasi stimulus kontekstual, bacaan studi kasus, data fenomena nyata, tabel, atau cerita inspiratif]
   
   Berdasarkan teks/informasi di atas, tentukan kebenaran setiap pernyataan berikut dengan memberi tanda centang (✓) pada kolom **Benar** atau **Salah**!
   
   | No | Pernyataan | Benar | Salah |
   | :---: | :--- | :---: | :---: |
   | 1. | [Teks pernyataan 1 yang diuji kebenarannya berdasarkan stimulus] | | |
   | 2. | [Teks pernyataan 2 yang diuji kebenarannya berdasarkan stimulus] | | |
   | 3. | [Teks pernyataan 3 yang diuji kebenarannya berdasarkan stimulus] | | |
   
   * PENTING & ATURAN PEMISAHAN TABEL:
     - JUMLAH PERNYATAAN: Setiap butir paket soal Benar/Salah memuat tepat 2 atau 3 pernyataan saja (DILARANG MEMBUAT 4 PERNYATAAN ATAU LEBIH).
     - Nomor urut soal HARUS ditulis di luar tabel: "Soal Nomor [X]".
     - Di dalam tabel matriks, kolom "No" HANYA berisi nomor urut pernyataan untuk paket soal tersebut, dan WAJIB SELALU DIMULAI DARI ANGKA 1 (1., 2., 3.). DILARANG KERAS memulai dari angka 2 atau melompati nomor 1!
     - Baris pemisah separator tabel (| :---: | :--- | :---: | :---: |) HANYA dituliskan SATU KALI tepat di bawah baris judul kolom. DILARANG membuat separator ganda atau menuliskan (:---:) sebagai baris data pernyataan!
     - Wajib menggunakan tabel Markdown tepat 4 kolom: "No", "Pernyataan", "Benar", "Salah".
     - Kolom "Benar" dan "Salah" pada naskah soal DIKOSONGKAN (atau diberi spasi kosong) agar murid dapat memberi tanda centang (✓).
     - DILARANG KERAS: Jangan pernah memasukkan nomor soal berikutnya (misalnya "Soal Nomor 4"), teks stimulus berikutnya, atau judul "Kunci Jawaban" ke dalam baris/sel tabel Benar Salah sebelumnya!
     - Setiap tabel Benar Salah HARUS ditutup dengan sempurna, lalu berikan 2 baris kosong (enter ganda) sebelum beralih ke butir soal berikutnya atau sebelum masuk ke tajuk bab "## IV. Kunci Jawaban, Pembahasan Lengkap & Pedoman Penskoran".
     - DILARANG menuliskan soal Benar/Salah hanya sebagai teks biasa tanpa tabel. Wajib menggunakan format tabel matriks 4 kolom di atas.

5. KETENTUAN TEKNIS DOKUMEN:
   - DILARANG KERAS menggunakan tag HTML seperti <br>, <br/>, atau tag HTML apapun dalam seluruh dokumen. Gunakan format Markdown murni.
   - DILARANG KERAS menggunakan format rumus LaTeX / math block seperti $$\\text{...}$$, $$, \\frac, atau \\text. Tuliskan rumus perhitungan skor sebagai teks biasa yang bersih, misalnya: Nilai Akhir = (Total Skor Perolehan / Total Skor Maksimal) x 100.
   - ATURAN KOP LEMBAR SOAL PESERTA DIDIK:
     1. Ganti 'Nomor Absen / Kelas' menjadi 'Fase / Kelas' dengan isian adaptif (misalnya: ${formattedFaseKelas}).
     2. Isian 'Alokasi Waktu' WAJIB diisi titik-titik saja (. . .) sama persis dengan isian 'Hari / Tanggal' agar dapat diisi secara manual oleh murid saat asesmen berlangsung.
     3. PENTING: Jika Jenis Asesmen yang dipilih adalah SUMATIF, DILARANG KERAS memunculkan baris 'Materi Pokok' pada Kop Soal Peserta Didik!
   - Dokumen disusun menjadi 2 bagian utama: Bagian Perangkat Guru (Rancangan, Kisi-Kisi, Kunci & Rubrik, Tanda Tangan) diikuti Bagian Lembar Soal Siswa setelah Tanda Tangan.

6. ATURAN WAJIB PEMBUATAN SOAL BERGAMBAR & STIMULUS VISUAL (MINIMAL 30% DARI JUMLAH SOAL):
   PENTING & WAJIB:
   - PERSENTASE MINIMAL SOAL BERGAMBAR:
     Dari total ${totalSoalCount} butir soal yang dibuat, MINIMAL ${minGambarCount} BUTIR SOAL (minimal 30% dari keseluruhan soal) WAJIB MENYERTAKAN STIMULUS VISUAL (Gambar / Bagan / Diagram / Grafik / Ilustrasi Edukatif) dengan tag [GAMBAR_STIMULUS: "Deskripsi rinci visual, objek, tahapan, angka, dan tata letak"] atau [CHART_URL: ...] jika grafik statistik.
   - BENTUK SOAL YANG DAPAT DIBERI GAMBAR:
     Soal bergambar dapat ditambahkan pada butir soal: Pilihan Ganda (PG), Pilihan Ganda Kompleks (PGK), Isian Singkat, Uraian / Esai, dan Benar / Salah. Pastikan butir Soal Nomor 1 dan Soal Nomor 2 serta soal-soal lainnya memiliki gambar stimulus kontekstual hingga mencapai minimal ${minGambarCount} butir soal (minimal 30%).
   - ATURAN KHUSUS SOAL MENJODOHKAN (MATCHING):
     KHUSUS SOAL MENJODOHKAN, TIDAK PERLU DAN DILARANG MENGGUNAKAN GAMBAR PADA OPSI PILIHAN JAWABAN MAUPUN PREMIS! Seluruh butir premis dan opsi pilihan jawaban soal Menjodohkan CUKUP MENGGUNAKAN KALIMAT / PERNYATAAN TEKS SAJA secara lengkap dan padat tanpa tag gambar.
   - ATURAN WAJIB MENGIKUTI PERTANYAAN SOAL (BERLAKU UNTUK SEMUA MATA PELAJARAN):
     Setiap kali membuat butir soal yang membutuhkan gambar stimulus, deskripsi di dalam tag [GAMBAR_STIMULUS: "..."] WAJIB MENGIKUTI PERTANYAAN SOALNYA SECARA PRESISI agar gambar yang nantinya dibuat guru di Google Gemini sesuai persis dengan apa yang ditanyakan pada butir soal tersebut.
     * Matematika: Tampilkan bangun geometri, diagram pecahan berarsir, grafik batang/garis, sudut, atau bangun ruang dengan ukuran angka dan label yang PERSIS sama dengan data yang ditanyakan pada soal.
     * IPAS / Sains: Tampilkan organ tubuh, rantai makanan, daur hidup hewan/tumbuhan, rangkaian listrik, magnet, atau tata surya dengan fokus penunjuk/panah pada bagian yang ditanyakan pada soal.
     * Bahasa Indonesia: Tampilkan denah rute perjalanan, alur infografis petunjuk kerja, atau ilustrasi adegan cerita yang menjadi bahan pertanyaan soal membaca/literasi.
     * Pendidikan Agama Islam (PAI): Tampilkan aksara kaligrafi huruf hijaiyah bersambung/berharakat lengkap atau tata cara ibadah yang ditanyakan pada butir soal.
     * Pendidikan Pancasila / PKn: Tampilkan lambang/simbol sila Pancasila, denah lingkungan sekolah, atau perilaku musyawarah/gotong royong yang ditanyakan pada soal.
     * PJOK & Seni: Tampilkan posisi tubuh dalam olahraga, pola gerak, atau ragam hias motif nusantara dan alat musik yang ditanyakan pada soal.

   Gunakan format penulisan gambar sebagai berikut:
   1. GAMBAR STIMULUS UTAMA SOAL:
      - Jika berbentuk Grafik/Chart Data: Gunakan URL QuickChart langsung agar dapat dirender sebagai gambar, dengan format:
        [CHART_URL: https://quickchart.io/chart?c={type:'bar',data:{labels:['Label1','Label2'],datasets:[{label:'Judul',data:[10,20]}]}}]
      - Jika berbentuk Ilustrasi/Denah/Geometri/Infografis/Bagan Daur Hidup: Tuliskan deskripsi rinci yang WAJIB MENGIKUTI PERTANYAAN SOAL SECARA PRESISI dengan tag:
        [GAMBAR_STIMULUS: "Deskripsi rinci visual, angka, bentuk, skala, tahapan, dan tata letak objek yang harus ditampilkan mengikuti pertanyaan butir soal"]

   2. GAMBAR PADA OPSI JAWABAN (Pilihan Ganda / PG Kompleks):
      - Jika opsi jawaban berupa visual (misal: bentuk bangun datar, jaring-jaring bangun ruang, diagram pecahan, grafik fungsi, atau sudut), sertakan tag gambar di setiap opsi:
        A. [GAMBAR_OPSI_A: "Deskripsi gambar opsi A"]
        B. [GAMBAR_OPSI_B: "Deskripsi gambar opsi B"]
        C. [GAMBAR_OPSI_C: "Deskripsi gambar opsi C"]
        D. [GAMBAR_OPSI_D: "Deskripsi gambar opsi D"]
        (dst.)

   3. SOAL MENJODOHKAN (MATCHING):
      - KHUSUS SOAL MENJODOHKAN: DILARANG menggunakan gambar pada opsi pilihan maupun premis! Cukup gunakan kalimat/pernyataan teks saja secara lengkap dan padat.

   4. GAMBAR PADA ISIAN SINGKAT & URAIAN:
      - Jika soal memerlukan pembacaan denah, diagram, peta, bangun geometri, atau tabel visual sebelum siswa menjawab, WAJIB sertakan [GAMBAR_STIMULUS: "..."] tepat di atas teks pertanyaan yang merinci objek sesuai pertanyaan soal.

   5. KETENTUAN DESKRIPSI GAMBAR & KERAHASIAAN SOAL (BERLAKU UNTUK SEMUA MATA PELAJARAN):
      - Pastikan setiap deskripsi gambar ditulis SANGAT SPESIFIK dan MENGIKUTI PERTANYAAN SOAL (mencakup skala, ukuran, label angka, sudut, warna, posisi objek, dan tanda penunjuk seperti huruf X atau angka 1 yang ditanyakan pada butir soal) agar prompt yang disalin ke Gemini Gambar menghasilkan visual yang 100% selaras dengan pertanyaan soal. Ini berlaku untuk SEMUA MATA PELAJARAN (IPAS, Matematika, Bahasa Indonesia, PAI, PPKn, PJOK, Seni Budaya, dsb).
      - ATURAN MUTLAK KERAHASIAAN SOAL (ANTI-BOCOR JAWABAN): DILARANG KERAS membocorkan atau menuliskan jawaban benar di dalam deskripsi tag [GAMBAR_STIMULUS: "..."]! Gambar berfungsi murni sebagai stimulus observasi akademis yang belum terpecahkan bagi siswa. Jika pertanyaan menanyakan nama bagian yang ditunjuk huruf X, deskripsikan objek dengan tanda panah berlabel huruf 'X', DILARANG menuliskan nama organ/konsep jawaban di gambar. Jika soal matematika menanyakan luas/volume/sudut, deskripsikan hanya ukuran dimensi bangun yang diketahui (panjang, tinggi, dll), JANGAN menuliskan hasil perhitungan atau rumusnya di gambar!

7. ${hijaiyahPromptInstruction || `ATURAN MATAPELAJARAN AGAMA ISLAM & HIJAIYAH: Jika soal berkaitan dengan huruf hijaiyah atau harakat, gunakan aksara Arab asli berharakat lengkap (seperti: اَ, بَ, تَ, ثَ, كَتَبَ), bukan ejaan abjad biasa, kecuali jika soalnya meminta cara membaca (tetap abjad Indonesia).`}

Dokumen berisi:
1. Rancangan Asesmen (${jenisAsesmenStr})
2. Tabel Kisi-Kisi Soal yang selaras dengan Capaian & Tujuan Pembelajaran
3. Kunci Jawaban & Pembahasan Mendalam untuk setiap butir soal
4. Rubrik Penilaian & Pedoman Penskoran 4 level (Perlu Bimbingan, Cukup, Baik, Sangat Baik)
5. Lembar Pengesahan Resmi (Tanda Tangan)
6. Naskah Soal Lengkap untuk Peserta Didik (Dilengkapi KOP Lembar Soal & Identitas Siswa pada lembar baru)`;

        userPrompt = `Buatkan Dokumen Lengkap Asesmen & Rubrik Penilaian untuk:
- Satuan Pendidikan: ${namaSekolah || "Satuan Pendidikan"}
- Nama Guru: ${namaGuru || "Guru"} (NIP: ${nipGuru || "-"})
- Nama Kepala Sekolah: ${namaKepalaSekolah || "Kepala Sekolah"} (NIP: ${nipKepalaSekolah || "-"})
- Tempat Penandatanganan: ${tempatTtd || "Indonesia"}
- Jenjang: ${jenjang} | Mata Pelajaran: ${namaMapel}
- Rujukan Regulasi CP: ${regulasiCpFull}
- Fase / Kelas / Semester: ${faseKelas} / Semester ${semester}
- Materi Pokok: ${materiPembelajaran}
- Tujuan Pembelajaran: ${tujuanPembelajaran}
- Capaian Pembelajaran: ${capaianPembelajaran} (Rujukan Regulasi: ${regulasiCpShort})
- Dimensi Profil Lulusan: ${profilLulusanList}
- Fokus Jenis Asesmen: **${jenisAsesmenStr}**
- Target Level Kognitif: **${levelKognitifStr}**${isPaiOrHijaiyah ? `
- PERHATIAN KHUSUS PENDIDIKAN AGAMA ISLAM & HURUF HIJAIYAH (WAJIB DIPATUHI):
  1. Seluruh butir soal, stimulus, kisi-kisi, kunci jawaban, dan pilihan jawaban WAJIB MENGGUNAKAN AKSARA HURUF HIJAIYAH ARAB ASLI BERHARAKAT LENGKAP (misalnya: اَ, بَ, تَ, ثَ, جَ, كَتَبَ, عَمِلَ, خَلَقَ) dan tanda harakat Arab asli (fathah ـَ, kasrah ـِ, dhammah ـُ, sukun ـْ, tasydid ـّ, tanwin ـً ـٍ ـٌ).
  2. DILARANG KERAS menggunakan ejaan abjad biasa/latin untuk huruf hijaiyah (jangan menulis "ba", "ta", "tsa", "ba kasroh", dsb di opsi pilihan jawaban!).
  3. PENGECUALIAN MUTLAK: Hanya jika butir soal meminta CARA MEMBACA / lafal pengucapan dari huruf hijaiyah, maka opsi pilihan jawaban tetap ditulis dengan abjad Indonesia (contoh: Huruf جَ dibaca: A. ja  B. ji  C. ju  D. ba).` : ""}
- ATURAN WAJIB SOAL BERGAMBAR & STIMULUS VISUAL (SEMUA MATA PELAJARAN):
  1. MINIMAL 30% DARI JUMLAH SOAL WAJIB MENGGUNAKAN GAMBAR: Dari total ${totalSoalCount} butir soal, MINIMAL ${minGambarCount} BUTIR SOAL WAJIB MEMILIKI STIMULUS GAMBAR ([GAMBAR_STIMULUS: "Deskripsi rinci visual yang WAJIB MENGIKUTI PERTANYAAN BUTIR SOAL secara presisi"] atau [CHART_URL: ...] jika grafik statistik).
  2. Bentuk soal lain (Pilihan Ganda, PGK, Isian Singkat, Uraian/Esai, Benar/Salah) dapat ditambahkan soal bergambar. Butir Soal Nomor 1 dan Soal Nomor 2 serta soal lainnya wajib memiliki gambar stimulus hingga mencapai minimal ${minGambarCount} butir soal.
  3. KHUSUS SOAL MENJODOHKAN: TIDAK PERLU MENGGUNAKAN GAMBAR PADA OPSI PILIHAN MAUPUN PREMIS. CUKUP MENGGUNAKAN KALIMAT/PERNYATAAN TEKS SAJA!
  4. Untuk soal yang menuntut interpretasi data/grafik: gunakan [CHART_URL: ...].
  5. Untuk ilustrasi/denah/geometri/infografis/bagan: gunakan [GAMBAR_STIMULUS: "..."]. Pastikan deskripsi gambar menyebutkan dengan jelas objek, bagian/sudut, atau tanda penunjuk panah/huruf X yang ditanyakan pada butir soal agar prompt yang disalin ke Gemini Gambar menghasilkan visual yang 100% tepat. DILARANG KERAS menyertakan kunci jawaban/hasil perhitungan/label nama jawaban dalam deskripsi gambar agar kerahasiaan soal terjaga.
  6. DILARANG KERAS menempatkan tag [GAMBAR_STIMULUS] atau stimulus visual apapun pada bagian Petunjuk Pengerjaan Soal atau KOP Soal! Tag stimulus gambar HANYA boleh diletakkan pada butir-butir soal peserta didik (misalnya di bawah Soal Nomor 1, Soal Nomor 2, dst.).
- Komposisi Tipe & Jumlah Soal (Total ${totalSoalCount} Butir Soal):
${questionSpecs.join("\n")}

SUSUN DOKUMEN DENGAN FORMAT LENGKAP SEBAGAI BERIKUT:

# Perangkat ${jenisAsesmenStr} & Rubrik Penilaian Pembelajaran

## I. Rancangan & Karakteristik ${jenisAsesmenStr}
- Tujuan dan fungsi utama asesmen ini dalam siklus pembelajaran.
- Teknik & instrumen asesmen yang digunakan (tes tertulis, observasi proses, kinerja/portofolio).
- Pemetaan level kognitif (${levelKognitifStr}) dan integrasi dimensi Profil Lulusan (${profilLulusanList}).

## II. Kisi-Kisi Penulisan Soal Asesmen

| Informasi Identitas | : | Keterangan |
| :--- | :---: | :--- |
| **Nama Satuan Pendidikan** | : | ${namaSekolah || "SD Negeri Cipta Cendekia 01"} |
| **Mata Pelajaran** | : | ${namaMapel || "Ilmu Pengetahuan Alam dan Sosial (IPAS)"} |
| **Kelas / Fase / Semester** | : | ${faseKelas} / Semester ${semester} |
| **Materi Pokok** | : | ${materiPembelajaran} |
| **Alokasi Waktu** | : | ${alokasiWaktu || "2 x 35 Menit"} |
| **Jumlah & Bentuk Soal** | : | ${totalSoalCount} Butir (${distributionSummary}) |
| **Tahun Pelajaran** | : | ${tahunPelajaran || "2024/2025"} |
| **Nama Penyusun** | : | ${namaGuru || "Guru Mata Pelajaran"} |

### Tabel Matriks Kisi-Kisi Penulisan Soal
Sajikan tabel kisi-kisi penulisan soal yang mencakup seluruh ${totalSoalCount} butir soal dengan format tabel Markdown utuh, rapi, dan proporsional untuk kertas A4 (satu baris per butir soal).
PENTING: Tuliskan Capaian Pembelajaran/Elemen dan Indikator Soal secara padat, lugas, dan operasional (tidak menyalin kalimat panjang yang berulang-ulang) agar isi sel tabel pas, proporsional, dan tidak meluap dari lembar kertas A4:
| No | Capaian Pembelajaran / Elemen | Materi Pokok | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | [Elemen / Capaian ringkas operasional] | ${materiPembelajaran} | [Indikator terukur, misal: Disajikan teks/data, murid dapat...] | C3 / C4 | PG | 1 |
(Isi tabel secara lengkap untuk semua butir soal 1 sampai ${totalSoalCount}, satu baris per butir soal).

## III. Kunci Jawaban, Pembahasan Lengkap & Pedoman Penskoran

### 1. Kunci Jawaban dan Pembahasan Lengkap
Tuliskan kunci jawaban dan pembahasan mendalam untuk seluruh butir soal secara sistematis.
(Khusus butir soal Menjodohkan, tuliskan kunci pasangan yang tepat antara nomor Premis dan huruf Opsi, misal Premis 1 - Opsi C, Premis 2 - Opsi A, Premis 3 - Opsi E, serta jelaskan analisis/pembahasan materi untuk setiap pasangan dan jelaskan mengapa opsi ekstra merupakan distraktor/pengecoh).
(Khusus butir soal Benar/Salah, sajikan kunci dan analisis bukti/fakta dalam tabel 4 kolom: | No | Pernyataan | Kunci | Pembahasan & Analisis |. PENTING: Setiap tabel kunci jawaban harus ditutup dengan baris kosong ganda sebelum melanjutkan ke butir soal berikutnya atau ke Pedoman Penskoran).

### 2. Pedoman Penskoran dan Konversi Nilai Akhir
Sajikan tabel pedoman penskoran dengan tepat 4 kolom (DILARANG membuat kolom kosong tambahan di sebelah kanan!):
| No. Soal | Bentuk Soal | Kriteria Penilaian & Penskoran | Skor Maksimal |
| :---: | :--- | :--- | :---: |
| 1 | Pilihan Ganda | Jawaban Benar = 10, Jawaban Salah = 0 | 10 |
(Lengkapi untuk seluruh bentuk soal di atas, misalnya untuk Benar/Salah: Tiap pernyataan tepat = 2.5, total 10 poin)

Rumus Konversi Nilai Akhir:
Nilai Akhir = (Total Skor Perolehan / Total Skor Maksimal) x 100

## IV. Rubrik Penilaian Performa, Sikap & Dimensi Profil Lulusan
Buatkan tabel rubrik penilaian berdimensi Profil Lulusan (${profilLulusanList}) dengan 4 skala capaian (format tabel Markdown utuh):
| No | Aspek / Indikator Penilaian | Perlu Bimbingan (1) | Cukup (2) | Baik (3) | Sangat Baik (4) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | [Dimensi Profil Lulusan 1] | [Deskripsi level 1] | [Deskripsi level 2] | [Deskripsi level 3] | [Deskripsi level 4] |
| 2 | [Dimensi Profil Lulusan 2] | [Deskripsi level 1] | [Deskripsi level 2] | [Deskripsi level 3] | [Deskripsi level 4] |

| **Mengetahui,** | **${tempatTtd || "Jakarta"}, ${tanggalTtd}** |
| :--- | :--- |
| **Kepala ${namaSekolah || "SD Negeri Cipta Cendekia 01"}** | **${jabatan || "Guru Kelas"}** |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| **${namaKepalaSekolah || "Drs. H. Bambang Sujatmiko, M.Pd."}** | **${namaGuru || "Siti Rahmawati, S.Pd., Gr."}** |
| NIP. ${nipKepalaSekolah || "-"} | NIP. ${nipGuru || "-"} |

# NASKAH SOAL ASESMEN PEMBELAJARAN
### (${jenisAsesmenStr.toUpperCase()})

## 📌 Lembar Soal Peserta Didik

| Informasi | : | Keterangan |
| :--- | :---: | :--- |
| **Nama Satuan Pendidikan** | : | ${namaSekolah || "SD Negeri Cipta Cendekia 01"} |
| **Nama Peserta Didik** | : | .................................................... |
| **Fase / Kelas** | : | ${formattedFaseKelas} |
| **Mata Pelajaran** | : | ${namaMapel || "Ilmu Pengetahuan Alam dan Sosial (IPAS)"} |${!isSumatif ? `\n| **Materi Pokok** | : | ${materiPembelajaran} |` : ""}
| **Hari / Tanggal** | : | .................................................... |
| **Alokasi Waktu** | : | .................................................... |

---

### 📝 Petunjuk Pengerjaan Soal:
1. Berdoalah sebelum mulai mengerjakan soal.
2. Tuliskan nama lengkap pada kolom identitas di atas.
3. Bacalah setiap pertanyaan dan stimulus dengan cermat dan teliti.
4. Dahulukan menjawab pertanyaan yang kamu anggap paling mudah.
5. Periksa kembali seluruh jawabanmu dengan saksama sebelum diserahkan kepada guru.

---

Tuliskan seluruh naskah soal secara lengkap untuk siswa, terpisah per bagian, dengan stimulus kontekstual (studi kasus, kutipan, infografis, data eksperimen, atau masalah kehidupan nyata):
${questionSpecs.map((s, idx) => `### Bagian ${String.fromCharCode(65 + idx)}: ${s.replace(/^- \*\*/, "").replace(/\*\*:.*$/, "")}`).join("\n")}
*(Pastikan semua butir nomor soal 1 sampai ${totalSoalCount} dituliskan secara utuh dan lengkap, bukan rangkuman).*`;
      } else if (type === "lkpd") {
        systemPrompt = `Anda adalah Ahli Desain Bahan Ajar dan Lembar Kerja Peserta Didik (LKPD) Interaktif Kurikulum Merdeka.
Tugas Anda adalah merancang LKPD yang sangat menarik, kontekstual, merangsang nalar kritis (HOTS), memfasilitasi kerja kolaboratif, dan menyenangkan bagi murid.
Format dokumen HARUS menggunakan Markdown terstruktur yang siap dicetak dan dibagikan langsung kepada peserta didik.
PENTING:
- DILARANG KERAS membuat bingkai kotak seni ASCII (+---, |, atau diagram teks berbingkai karakter) ataupun menyajikan wacana dalam kotak kode/monospace di bawah 'Stimulus Kontekstual'. Jangan pernah membingkai cerita dengan karakter ASCII. Sajikan wacana langsung sebagai paragraf narasi biasa yang bersih atau kutipan blockquote Markdown '> '.
- DILARANG KERAS menggunakan tag HTML seperti <br>, <br/>, atau tag HTML apapun dalam seluruh dokumen (termasuk lembar pengesahan). Gunakan format Markdown murni.
- DILARANG KERAS menggunakan format rumus LaTeX / math block seperti $$\\text{...}$$, $$, \\frac, atau \\text. Tuliskan rumus penskoran sebagai teks biasa yang bersih, misalnya: Nilai = (Skor Perolehan / Skor Maksimal) x 100.${isPaiOrHijaiyah ? `\n- ATURAN KHUSUS PENDIDIKAN AGAMA ISLAM & HURUF HIJAIYAH:\n  Jika materi memuat Huruf Hijaiyah / Al-Qur'an, sajikan teks stimulus, kartu aktivitas siswa, tabel pengamatan huruf, dan latihan membaca/menulis menggunakan aksara huruf hijaiyah Arab asli berharakat lengkap (seperti: كَتَبَ, عَمِلَ, خَلَقَ, huruf tunggal berharakat اَ, بَ, تَ, ثَ), bukan ejaan abjad biasa, kecuali jika lembar kerja meminta siswa menuliskan cara membacanya dalam abjad Indonesia.` : ''}`;

        userPrompt = `Buatkan Dokumen Lembar Kerja Peserta Didik (LKPD) yang menarik dan operasional untuk:
- Satuan Pendidikan: ${namaSekolah || "Satuan Pendidikan"}
- Nama Guru: ${namaGuru || "Guru"} (NIP: ${nipGuru || "-"})
- Nama Kepala Sekolah: ${namaKepalaSekolah || "Kepala Sekolah"} (NIP: ${nipKepalaSekolah || "-"})
- Tempat Penandatanganan: ${tempatTtd || "Indonesia"}
- Jenjang: ${jenjang} | Mata Pelajaran: ${namaMapel}
- Fase / Kelas / Semester: ${faseKelas} / Semester ${semester}
- Materi Pokok: ${materiPembelajaran}
- Tujuan Pembelajaran: ${tujuanPembelajaran}
- Capaian Pembelajaran: ${capaianPembelajaran}
- Dimensi Profil Lulusan: ${profilLulusanList}
- Media Digital yang Dimanfaatkan: ${digitalToolsCombined}${isPaiOrHijaiyah ? `
- PERHATIAN KHUSUS LKPD PAI & HURUF HIJAIYAH:
  Seluruh stimulus bacaan, kartu pengamatan huruf, dan tabel latihan wajib menyajikan aksara huruf hijaiyah Arab asli berharakat lengkap (seperti: بَ, بِ, بُ, كَتَبَ), kecuali saat meminta siswa menuliskan lafal/cara bacanya dalam abjad Indonesia.` : ""}

SUSUN DOKUMEN LKPD DENGAN STRUKTUR BERIKUT:

# ▶ LEMBAR KERJA PESERTA DIDIK
### (LKPD)

## 📌 Identitas Peserta Didik

| Informasi | : | Keterangan |
| :--- | :---: | :--- |
| **Kelompok / Nama Anggota** | : | ................................................................ |
| **Kelas / Fase** | : | ${faseKelas} |
| **Mata Pelajaran** | : | ${namaMapel} |
| **Materi Pokok** | : | ${materiPembelajaran} |
| **Alokasi Waktu** | : | ${alokasiWaktu || "3 JP (3 x 35 Menit)"} |

---

## 🎯 Judul Aktivitas: "[Buatkan Judul Aktivitas yang Kreatif, Menantang & Menggembirakan]"

## 💡 Tujuan Aktivitas Belajar
(Tuliskan tujuan belajar spesifik yang ingin dicapai murid melalui LKPD ini).

## 📋 Petunjuk Pengerjaan
1. Berdoalah sebelum memulai kegiatan belajar.
2. Bacalah stimulus/wacana kontekstual dengan saksama dan teliti.
3. Diskusikan setiap pertanyaan bersama teman kelompokmu dengan mengedepankan sikap saling menghargai.
4. Manfaatkan perangkat digital (${digitalToolsCombined}) atau sumber referensi belajar yang tersedia.
5. Tuliskan hasil analisis kelompok pada lembar jawaban yang telah disediakan.

---

## 📖 Stimulus Kontekstual
(Tuliskan cerita pendek naratif atau studi kasus kontekstual yang kaya data dan relevan dengan materi "${materiPembelajaran}". Tulis langsung sebagai narasi teks biasa atau blockquote markdown '> '. PERHATIAN: DILARANG KERAS menggunakan format bingkai kotak seni ASCII '+---', '|', atau kode blok monospace berbingkai).

---

## 🧩 Bagian 1: Eksplorasi Konsep & Nalar Kritis (Aktivitas Mandiri / Awal)
(Sajikan 3 pertanyaan pemantik analitis berdasarkan stimulus di atas untuk membimbing murid memahami konsep esensial).
1. [Pertanyaan Analisis 1]
2. [Pertanyaan Analisis 2]
3. [Pertanyaan Analisis 3]

---

## 🔬 Bagian 2: Investigasi & Kolaborasi Pemecahan Masalah (Aktivitas Kelompok)
(Sajikan instruksi kerja eksperimen mini, studi komparasi data, atau pemecahan masalah kelompok yang membutuhkan kolaborasi nyata dan penggunaan teknologi digital).
### Tabel Pengamatan / Lembar Analisis Kelompok

| No | Aspek yang Diamati / Variabel | Hasil Pengamatan / Analisis | Keterangan |
| :---: | :--- | :--- | :--- |
| 1 | [Variabel / Aspek Pengamatan 1] | ... | ... |
| 2 | [Variabel / Aspek Pengamatan 2] | ... | ... |
| 3 | [Variabel / Aspek Pengamatan 3] | ... | ... |

- Pertanyaan Sintesis Kelompok:
  (2 pertanyaan tantangan pemecahan masalah nyata yang mendorong kreativitas murid dalam merumuskan solusi).

---

## 🚀 Bagian 3: Kesimpulan & Aksi Nyata
(Fasilitasi murid merumuskan kesimpulan besar dan rencana aksi nyata sederhana yang bisa dilakukan di sekolah atau rumah).

---

## 🪞 Lembar Refleksi Diri Murid
- *Tiga hal baru yang saya pahami hari ini adalah:* ...................................................
- *Hal yang paling menyenangkan saat berdiskusi:* ...................................................
- *Tantangan yang saya hadapi dan cara mengatasinya:* .............................................

---

## 📊 Rubrik Penilaian Kinerja LKPD

Sajikan tabel rubrik penilaian kinerja LKPD secara LENGKAP dengan deskriptor capaian operasional untuk setiap skala skor:
| No | Kriteria / Aspek Penilaian | Skor 1 (Kurang) | Skor 2 (Cukup) | Skor 3 (Baik) | Skor 4 (Sangat Baik) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | Pemahaman Konsep Materi | Murid belum memahami konsep esensial materi pembelajaran | Murid memahami sebagian konsep dengan bimbingan berkala | Murid memahami konsep materi dengan tepat dan mandiri | Murid menguasai konsep secara mendalam, luas, dan analitis |
| 2 | Keterampilan Investigasi & Pengumpulan Data | Pengumpulan data tidak runtut dan belum sesuai instruksi | Mengumpulkan data sebagian dan membutuhkan panduan | Mengumpulkan data penyelidikan secara cermat dan sistematis | Mengumpulkan data secara akurat, komprehensif, dan kritis |
| 3 | Kolaborasi & Kerjasama Kelompok | Pasif dalam diskusi dan pembagian peran kelompok | Cukup aktif namun membutuhkan dorongan dari teman/guru | Bekerjasama aktif dan bertanggung jawab atas tugasnya | Sangat aktif, memimpin inisiatif, dan saling memuliakan |
| 4 | Kualitas Analisis & Penyajian Solusi | Jawaban belum runtut dan argumen kurang logis | Jawaban cukup lengkap namun analisis masih sederhana | Analisis logis, runtut, dan menyajikan solusi yang tepat | Analisis kritis mendalam, inovatif, dan solutif kontekstual |

### Pedoman Penskoran:
- Skor Maksimal: 16
- Perhitungan Nilai: Nilai Akhir = (Total Skor Perolehan / 16) x 100
- Kategori Capaian:
  - 86 - 100 : Sangat Baik (A)
  - 71 - 85  : Baik (B)
  - 56 - 70  : Cukup (C)
  - < 56     : Perlu Bimbingan (D)

---

| **Mengetahui,** | **${tempatTtd || "Jakarta"}, ${tanggalTtd}** |
| :--- | :--- |
| **Kepala ${namaSekolah || "SD Negeri Cipta Cendekia 01"}** | **${jabatan || "Guru Kelas"}** |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| &nbsp; | &nbsp; |
| **${namaKepalaSekolah || "Drs. H. Bambang Sujatmiko, M.Pd."}** | **${namaGuru || "Siti Rahmawati, S.Pd., Gr."}** |
| NIP. ${nipKepalaSekolah || "-"} | NIP. ${nipGuru || "-"} |`;
      } else {
        return res.status(400).json({ error: "Tipe dokumen tidak valid." });
      }

      let markdownOutput = await generateWithFallback(ai, systemPrompt, userPrompt);

      if (typeof markdownOutput === "string") {
        markdownOutput = sanitizeDocumentContent(markdownOutput, type, formData);
      }

      res.json({
        success: true,
        type,
        content: markdownOutput,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error generating document:", err);
      res.status(500).json({
        error: err?.message || "Terjadi kesalahan saat menghubungi layanan Gemini AI.",
      });
    }
  });

  // API Route to fetch live Google Sheets KONTROL data in real-time
  let cachedSpreadsheetData: SpreadsheetKontrolRow[] | null = null;
  let lastSpreadsheetFetchTime = 0;
  // Sangat singkat (3 detik) untuk memastikan perubahan di Google Spreadsheet terbaca secara real-time
  const SPREADSHEET_CACHE_TTL_MS = 3 * 1000;

  app.get("/api/spreadsheet-control", async (req, res) => {
    // Header anti-cache untuk client
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const forceRefresh = req.query.refresh === "true" || Boolean(req.query.t);
    const now = Date.now();

    if (
      !forceRefresh &&
      cachedSpreadsheetData &&
      now - lastSpreadsheetFetchTime < SPREADSHEET_CACHE_TTL_MS
    ) {
      return res.json({
        success: true,
        source: "cache",
        updatedAt: lastSpreadsheetFetchTime,
        data: cachedSpreadsheetData,
      });
    }

    try {
      // Tambahkan timestamp `_cb` agar Google Visualization API tidak mengembalikan cache statis
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/11ge9fae0Lyopjvm2IzXKYJxgyasYx6ptsLZpcd4-6X4/gviz/tq?tqx=out:csv&sheet=KONTROL&_cb=${now}`;
      const response = await fetch(spreadsheetUrl, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "User-Agent": "Cipta-Ajar-Suit-Pro/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Google Sheets responded with status ${response.status}`);
      }

      const csvText = await response.text();
      const parsedData = parseSpreadsheetCSV(csvText);

      if (parsedData && parsedData.length > 0) {
        cachedSpreadsheetData = parsedData;
        lastSpreadsheetFetchTime = now;
        return res.json({
          success: true,
          source: "live",
          updatedAt: lastSpreadsheetFetchTime,
          data: parsedData,
        });
      } else {
        throw new Error("Data spreadsheet kosong atau format tidak sesuai.");
      }
    } catch (err: any) {
      console.warn("Gagal mengambil data live spreadsheet, menggunakan data cadangan:", err?.message || err);
      return res.json({
        success: true,
        source: "fallback",
        updatedAt: lastSpreadsheetFetchTime || Date.now(),
        data: cachedSpreadsheetData || FALLBACK_SPREADSHEET_KONTROL,
        warning: "Menggunakan data cadangan resmi.",
      });
    }
  });

  // Explicit favicon route ensuring PNG is always served fresh
  app.get(["/favicon.ico", "/favicon.png"], (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "image/png");
    res.sendFile(path.join(process.cwd(), "public", "favicon.png"));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
