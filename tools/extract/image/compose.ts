import type { Bitmap } from './canvas';

export class Composer {
  private readonly color: Float32Array;

  constructor(readonly width: number, readonly height: number) {
    this.color = new Float32Array(width * height * 3);
  }

  draw(bitmap: Bitmap, left: number, top: number, flip = false, opacity = 1): void {
    const startX = Math.round(left);
    const startY = Math.round(top);
    if (startX >= this.width || startY >= this.height || startX + bitmap.width <= 0 || startY + bitmap.height <= 0) return;
    for (let y = 0; y < bitmap.height; y++) {
      const targetY = startY + y;
      if (targetY < 0 || targetY >= this.height) continue;
      for (let x = 0; x < bitmap.width; x++) {
        const targetX = startX + x;
        if (targetX < 0 || targetX >= this.width) continue;
        const source = (y * bitmap.width + (flip ? bitmap.width - 1 - x : x)) * 4;
        const alpha = bitmap.pixels[source + 3] / 255 * opacity;
        if (alpha === 0) continue;
        const target = (targetY * this.width + targetX) * 3;
        for (let channel = 0; channel < 3; channel++) {
          this.color[target + channel] = this.color[target + channel] * (1 - alpha) + bitmap.pixels[source + channel] * alpha;
        }
      }
    }
  }

  toBitmap(): Bitmap {
    const pixels = Buffer.alloc(this.width * this.height * 4);
    for (let index = 0; index < this.width * this.height; index++) {
      pixels[index * 4] = Math.round(this.color[index * 3]);
      pixels[index * 4 + 1] = Math.round(this.color[index * 3 + 1]);
      pixels[index * 4 + 2] = Math.round(this.color[index * 3 + 2]);
      pixels[index * 4 + 3] = 255;
    }
    return { width: this.width, height: this.height, pixels };
  }
}
