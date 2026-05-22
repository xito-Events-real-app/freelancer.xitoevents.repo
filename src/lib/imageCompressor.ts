/**
 * Client-side image compression utility.
 * Resizes and compresses images to a target size range (200-300 KB).
 * Automatically converts HEIC/HEIF files to JPEG.
 */
import heic2any from 'heic2any';

const TARGET_MIN = 200 * 1024; // 200 KB
const TARGET_MAX = 300 * 1024; // 300 KB
const MAX_DIMENSION = 1200;

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

  // If already small enough, return as-is
  if (processedFile.size <= TARGET_MAX) {
    return processedFile;
  }

  const img = await loadImage(processedFile);

  // Calculate dimensions
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(img.src);

  // Binary search for the right quality
  let lo = 0.1;
  let hi = 0.92;
  let bestBlob = await canvasToBlob(canvas, hi);

  // If even max quality is under target, return it
  if (bestBlob.size <= TARGET_MAX) {
    return new File([bestBlob], processedFile.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  }

  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, mid);

    if (blob.size > TARGET_MAX) {
      hi = mid;
    } else if (blob.size < TARGET_MIN) {
      lo = mid;
    } else {
      bestBlob = blob;
      break;
    }
    bestBlob = blob;
  }

  // If still too large after iterations, do one more pass with smaller dimensions
  if (bestBlob.size > TARGET_MAX) {
    const scale = Math.sqrt(TARGET_MAX / bestBlob.size) * 0.9;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    bestBlob = await canvasToBlob(canvas, 0.7);
  }

  return new File([bestBlob], processedFile.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}
