import type { Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

/**
 * One shared Tesseract worker, created on first use. The wasm core and English model are fetched from
 * the CDN the first time (a few MB, then cached); the screenshot itself is only ever read in the
 * browser, never uploaded.
 */
async function getWorker(onProgress?: (status: string, progress: number) => void): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('eng', 1, {
        logger: (message) => onProgress?.(message.status, message.progress),
      }),
    );
  }
  return workerPromise;
}

/** Scale small screenshots up: Tesseract reads game fonts far better at ~1600px wide. */
async function prepare(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(3, Math.max(1, 1600 / bitmap.width));
  if (scale === 1) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob ?? file;
}

export async function recognizeText(
  file: Blob,
  onProgress?: (status: string, progress: number) => void,
): Promise<string> {
  const worker = await getWorker(onProgress);
  const image = await prepare(file);
  const { data } = await worker.recognize(image);
  return data.text;
}
