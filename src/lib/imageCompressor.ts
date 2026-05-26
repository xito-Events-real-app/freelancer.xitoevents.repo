/**
 * Client-side image compression utility.
 * Resizes and compresses images to a target size range (200-300 KB).
 * Automatically converts HEIC/HEIF files to JPEG.
 */
import heic2any from 'heic2any';

// Hard cap is 200KB. We aim slightly below it so JPEG encoder variance
// across browsers never pushes us over the wire-cap.
const HARD_CAP = 200 * 1024;        // 200 KB — must never be exceeded
const TARGET_MAX = 190 * 1024;      // aim under this
const TARGET_MIN = 120 * 1024;      // don't waste quality going way below
const MAX_DIMENSION = 1600;

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  const ext = file.name.toLowerCase().split('.').pop();
  return ext === 'heic' || ext === 'heif';
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  return new File([resultBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      quality
    );
  });
}

export async function compressImage(file: File): Promise<File> {
  // Convert HEIC/HEIF to JPEG first
  let processedFile = file;
  if (isHeic(file)) {
    processedFile = await convertHeicToJpeg(file);
  }

  const img = await loadImage(processedFile);

  // Start with original dims, capped at MAX_DIMENSION
  let width = img.width;
  let height = img.height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const renderAt = (w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  };

  renderAt(width, height);

  // Outer loop: if quality search can't get us under HARD_CAP, shrink dims
  // and try again. Bounded so we never loop forever.
  let bestBlob: Blob | null = null;
  for (let pass = 0; pass < 6; pass++) {
    // Binary search quality at current dimensions
    let lo = 0.3;
    let hi = 0.92;
    let candidate: Blob | null = null;

    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2;
      const blob = await canvasToBlob(canvas, q);
      if (blob.size > TARGET_MAX) {
        hi = q;
      } else if (blob.size < TARGET_MIN) {
        lo = q;
        candidate = blob;
      } else {
        candidate = blob;
        break;
      }
      if (!candidate || blob.size <= TARGET_MAX) candidate = blob;
    }

    // Final low-quality probe to guarantee a result
    if (!candidate) candidate = await canvasToBlob(canvas, 0.4);

    if (candidate.size <= HARD_CAP) {
      bestBlob = candidate;
      break;
    }

    // Still too big — shrink and retry
    const scale = Math.sqrt(HARD_CAP / candidate.size) * 0.92;
    width = Math.max(320, Math.round(width * scale));
    height = Math.max(320, Math.round(height * scale));
    renderAt(width, height);
    bestBlob = candidate; // keep latest as fallback
  }

  // Last resort: very low quality at small size
  if (!bestBlob || bestBlob.size > HARD_CAP) {
    renderAt(Math.min(width, 800), Math.min(height, 800));
    bestBlob = await canvasToBlob(canvas, 0.5);
    if (bestBlob.size > HARD_CAP) {
      renderAt(640, Math.round((640 / width) * height));
      bestBlob = await canvasToBlob(canvas, 0.5);
    }
  }

  URL.revokeObjectURL(img.src);

  return new File(
    [bestBlob],
    processedFile.name.replace(/\.[^.]+$/, '.jpg'),
    { type: 'image/jpeg' },
  );
}
