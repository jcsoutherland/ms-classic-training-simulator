import { createWorker, PSM, type Worker } from 'tesseract.js';
import type { RawImage } from './rawImage';

const SCALE = 4;
const DIGITS = '0123456789,~%.[] ';

export class TextReader {
  private worker: Promise<Worker> | null = null;

  async readNumber(image: RawImage): Promise<string> {
    return this.read(image, DIGITS);
  }

  async readText(image: RawImage): Promise<string> {
    return this.read(image, '');
  }

  async close(): Promise<void> {
    if (!this.worker) return;
    const worker = await this.worker;
    await worker.terminate();
    this.worker = null;
  }

  private async read(image: RawImage, whitelist: string): Promise<string> {
    const worker = await this.ready();
    await worker.setParameters({ tessedit_char_whitelist: whitelist, tessedit_pageseg_mode: PSM.SINGLE_LINE });
    const { data } = await worker.recognize(enlarge(image));
    return data.text.trim();
  }

  private ready(): Promise<Worker> {
    this.worker ??= createWorker('eng');
    return this.worker;
  }
}

function enlarge(image: RawImage): HTMLCanvasElement {
  const source = document.createElement('canvas');
  source.width = image.width;
  source.height = image.height;
  source.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
  const canvas = document.createElement('canvas');
  canvas.width = image.width * SCALE;
  canvas.height = image.height * SCALE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot read screenshots (no canvas support).');
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
