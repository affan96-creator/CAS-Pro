/**
 * Utilitas pemformatan tanggal dan waktu lokal Indonesia untuk Cipta Ajar Suit Pro.
 * Mendeteksi zona waktu (WIB, Wita, WIT) secara otomatis berdasarkan sistem/laptop pengguna.
 */

/**
 * Mendeteksi zona waktu Indonesia (WIB, Wita, WIT) secara dinamis
 * dari pengaturan waktu lokal pada browser/laptop pengguna.
 */
export function detectLocalIndonesianTimezone(date: Date = new Date()): string {
  try {
    const timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();

    // 1. Deteksi berbasis nama IANA Timezone Indonesia
    if (
      timeZone.includes('makassar') ||
      timeZone.includes('ujung_pandang') ||
      timeZone.includes('bali') ||
      timeZone.includes('denpasar') ||
      timeZone.includes('manado') ||
      timeZone.includes('palu') ||
      timeZone.includes('kendari') ||
      timeZone.includes('gorontalo') ||
      timeZone.includes('mataram') ||
      timeZone.includes('kupang') ||
      timeZone.includes('banjarmasin') ||
      timeZone.includes('samarinda') ||
      timeZone.includes('balikpapan')
    ) {
      return 'Wita';
    }

    if (
      timeZone.includes('jayapura') ||
      timeZone.includes('ambon') ||
      timeZone.includes('ternate') ||
      timeZone.includes('manokwari') ||
      timeZone.includes('sorong') ||
      timeZone.includes('merauke')
    ) {
      return 'WIT';
    }

    if (
      timeZone.includes('jakarta') ||
      timeZone.includes('pontianak') ||
      timeZone.includes('surabaya') ||
      timeZone.includes('bandung') ||
      timeZone.includes('semarang') ||
      timeZone.includes('medan') ||
      timeZone.includes('palembang')
    ) {
      return 'WIB';
    }

    // 2. Deteksi berbasis offset menit UTC perangkat (akurasi langsung dari jam laptop)
    // UTC+7 (WIB)  -> getTimezoneOffset() bernilai -420 menit
    // UTC+8 (WITA) -> getTimezoneOffset() bernilai -480 menit
    // UTC+9 (WIT)  -> getTimezoneOffset() bernilai -540 menit
    const offset = date.getTimezoneOffset();

    if (offset <= -451 && offset >= -510) {
      return 'Wita'; // UTC+8: Waktu Indonesia Tengah (Sulawesi, Bali, NTB, NTT, Kalsel, Kaltim, Kaltara)
    }
    if (offset <= -511 && offset >= -570) {
      return 'WIT';  // UTC+9: Waktu Indonesia Timur (Maluku, Papua)
    }
    if (offset <= -391 && offset >= -450) {
      return 'WIB';  // UTC+7: Waktu Indonesia Barat (Jawa, Sumatra, Kalbar, Kalteng)
    }

    // 3. Fallback offset jika berada di luar batas toleransi di atas
    const offsetHours = -offset / 60;
    if (offsetHours === 7) return 'WIB';
    if (offsetHours === 8) return 'Wita';
    if (offsetHours === 9) return 'WIT';

    // Jika di luar Indonesia (misal pengguna sedang di luar negeri)
    const sign = offsetHours >= 0 ? '+' : '';
    return `UTC${sign}${offsetHours}`;
  } catch {
    return 'Wita';
  }
}

/**
 * Memformat waktu pembuatan dokumen sesuai format yang diminta:
 * Format: DD/MM/YYYY; HH.MM [Zona Waktu]
 * Contoh hasil: 09/09/2026; 18.00 Wita
 */
export function formatDocumentCreationTime(dateInput: string | Date | number): string {
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    const tz = detectLocalIndonesianTimezone(d);

    return `${day}/${month}/${year}; ${hours}.${minutes} ${tz}`;
  } catch {
    return '';
  }
}
