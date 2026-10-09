export type JenjangPendidikan = 'SD' | 'SMP' | 'SMA' | 'SMK';
export type JabatanGuru = 'Guru Kelas' | 'Guru Mata Pelajaran';
export type Semester = 'Ganjil' | 'Genap';
export type DocumentType = 'rppm' | 'asesmen' | 'lkpd';

export type JenisAsesmen = 'Asesmen Awal (Diagnostik)' | 'Asesmen Formatif' | 'Asesmen Sumatif';

export interface AsesmenConfig {
  jenisAsesmen: JenisAsesmen;
  soalPG: {
    enabled: boolean;
    jumlahSoal: number;
    jumlahOpsi: 3 | 4 | 5;
  };
  soalPGK: {
    enabled: boolean;
    jumlahSoal: number;
  };
  soalIsianSingkat: {
    enabled: boolean;
    jumlahSoal: number;
  };
  soalUraian: {
    enabled: boolean;
    jumlahSoal: number;
  };
  soalBenarSalah: {
    enabled: boolean;
    jumlahSoal: number;
  };
  soalMenjodohkan: {
    enabled: boolean;
    jumlahSoal: number;
  };
  levelKognitif: ('LOTS' | 'MOTS' | 'HOTS')[];
  instruksiTambahan?: string;
}

export interface FormState {
  // 1. Identitas Sekolah
  jenjang: JenjangPendidikan;
  namaSekolah: string;
  namaGuru: string;
  nipGuru: string;
  jabatan: JabatanGuru;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  tempatTtd: string;
  tanggalTtd?: string;

  // 2. Desain Pembelajaran
  namaMapel: string;
  faseKelas: string;
  semester: Semester;
  tahunPelajaran: string;
  alokasiWaktu: string;
  jumlahPertemuan: string;
  capaianPembelajaran: string;
  materiPembelajaran: string;
  tujuanPembelajaran: string;
  profilLulusan: string[];
  digitalisasi: string[];
  digitalisasiLainnya: string;
}

export interface GeneratedDoc {
  id: string;
  type: DocumentType;
  title: string;
  content: string;
  createdAt: string;
  formDataSnapshot: Partial<FormState>;
}

export interface CPItem {
  id: string;
  jenjang: JenjangPendidikan;
  mapel: string;
  fase: string;
  kelas?: string;
  elemen: string;
  deskripsi: string;
}
