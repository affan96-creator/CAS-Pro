import { safeLocalStorage } from './safeStorage';

const memoryImageStore = new Map<string, string>();

/**
 * Optimizes and compresses an image (File or Base64 Data URL)
 * to prevent localStorage quota issues and ensure fast rendering/printing.
 * Scales down large images to a maximum dimension while maintaining quality.
 */
export async function optimizeImage(
  fileOrDataUrl: File | string,
  maxWidth = 1000,
  maxHeight = 900,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImg = (src: string) => {
      const img = new Image();
      // Only set crossOrigin for remote HTTP/HTTPS URLs; data: and blob: URLs should not have crossOrigin set
      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Use image/jpeg to compress drastically (e.g. 5MB -> 100KB)
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          if (optimizedDataUrl && optimizedDataUrl.length > 50) {
            resolve(optimizedDataUrl);
          } else {
            resolve(src);
          }
        } catch (err) {
          console.warn('Image optimization canvas error, fallback to original:', err);
          resolve(src);
        }
      };
      img.onerror = (err) => {
        console.warn('Failed to load image for optimization, fallback to raw src:', err);
        resolve(src);
      };
      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImg(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          processImg(result);
        } else {
          reject(new Error('Gagal membaca file gambar'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

function getStorageKey(docId: string, imageKey: string): string {
  const safeDoc = (docId || 'default_doc').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeKey = (imageKey || 'img').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `cipta_doc_img_${safeDoc}_${safeKey}`;
}

/**
 * Generates a stable numeric-alphanumeric hash for strings
 * to create deterministic and unique storage keys per question/stimulus.
 */
export function hashString(str: string): string {
  if (!str) return '0';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Saves an image to persistent storage (safeLocalStorage + memory fallback).
 */
export function saveDocImage(docId: string, imageKey: string, dataUrl: string): void {
  const key = getStorageKey(docId, imageKey);
  memoryImageStore.set(key, dataUrl);
  try {
    safeLocalStorage.setItem(key, dataUrl);
  } catch (err) {
    console.warn('LocalStorage quota reached when saving image, kept in memory cache:', err);
  }
}

/**
 * Retrieves an image from persistent storage.
 */
export function getDocImage(docId: string, imageKey: string): string | null {
  const key = getStorageKey(docId, imageKey);
  const mem = memoryImageStore.get(key);
  if (mem) return mem;

  try {
    const stored = safeLocalStorage.getItem(key);
    if (stored) {
      memoryImageStore.set(key, stored);
      return stored;
    }
  } catch (_e) {
    // fallback
  }
  return null;
}

/**
 * Removes an image from persistent storage.
 */
export function removeDocImage(docId: string, imageKey: string): void {
  const key = getStorageKey(docId, imageKey);
  memoryImageStore.delete(key);
  try {
    safeLocalStorage.removeItem(key);
  } catch (_e) {
    // fallback
  }
}

/**
 * Persists HTML edits for a document (body & soal).
 */
export function saveDocHtmlEdits(
  docId: string,
  edits: { editedBodyHtml: string | null; editedSoalHtml: string | null }
): void {
  if (!docId) return;
  const key = `cipta_doc_edits_${docId}`;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(edits));
  } catch (err) {
    console.warn('Failed to save document HTML edits:', err);
  }
}

/**
 * Retrieves saved HTML edits for a document.
 */
export function getDocHtmlEdits(
  docId: string
): { editedBodyHtml: string | null; editedSoalHtml: string | null } | null {
  if (!docId) return null;
  const key = `cipta_doc_edits_${docId}`;
  try {
    const raw = safeLocalStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_e) {
    // fallback
  }
  return null;
}

/**
 * Clears saved HTML edits for a document.
 */
export function clearDocHtmlEdits(docId: string): void {
  if (!docId) return;
  const key = `cipta_doc_edits_${docId}`;
  try {
    safeLocalStorage.removeItem(key);
  } catch (_e) {
    // fallback
  }
}
