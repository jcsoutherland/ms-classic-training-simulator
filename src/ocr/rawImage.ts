export interface RawImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export const PRINT_SIZE = 8;
const ICON_FRAME = 32;

export function crop(image: RawImage, left: number, top: number, width: number, height: number): RawImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = left + x;
      const sourceY = top + y;
      if (sourceX < 0 || sourceY < 0 || sourceX >= image.width || sourceY >= image.height) continue;
      const source = (sourceY * image.width + sourceX) * 4;
      data.set(image.data.subarray(source, source + 4), (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

export function gray(image: RawImage, x: number, y: number): number {
  const index = (y * image.width + x) * 4;
  return (image.data[index] * 299 + image.data[index + 1] * 587 + image.data[index + 2] * 114) / 1000;
}

export function iconFingerprint(icon: RawImage): Uint8ClampedArray {
  const block = ICON_FRAME / PRINT_SIZE;
  const print = new Uint8ClampedArray(PRINT_SIZE * PRINT_SIZE * 3);
  for (let cellY = 0; cellY < PRINT_SIZE; cellY++) {
    for (let cellX = 0; cellX < PRINT_SIZE; cellX++) {
      const sums = [0, 0, 0];
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          const source = ((cellY * block + y) * icon.width + cellX * block + x) * 4;
          for (let channel = 0; channel < 3; channel++) sums[channel] += icon.data[source + channel];
        }
      }
      const target = (cellY * PRINT_SIZE + cellX) * 3;
      for (let channel = 0; channel < 3; channel++) print[target + channel] = Math.round(sums[channel] / (block * block));
    }
  }
  return print;
}

export function decodePrint(base64: string): Uint8ClampedArray {
  const binary = atob(base64);
  const bytes = new Uint8ClampedArray(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function printDistance(screen: Uint8ClampedArray, stored: Uint8ClampedArray): number {
  let weighted = 0;
  let weight = 0;
  for (let cell = 0; cell < PRINT_SIZE * PRINT_SIZE; cell++) {
    const alpha = stored[cell * 4 + 3] / 255;
    if (alpha < 0.35) continue;
    let difference = 0;
    for (let channel = 0; channel < 3; channel++) difference += Math.abs(screen[cell * 3 + channel] - stored[cell * 4 + channel]);
    weighted += alpha * difference / 3;
    weight += alpha;
  }
  return weight > 0 ? weighted / weight : Infinity;
}
