import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const USER_AGENT = 'MSClassicTrainingSimulator data mirror (run by hand; github.com/jcsoutherland/ms-classic-training-simulator)';
const GAP_MILLISECONDS = 1000;
const CACHE_FOLDER = path.resolve('tools/.cache/http');

let lastRequestAt = 0;

export async function politeText(url: string): Promise<string> {
  const cached = cachePath(url);
  if (fs.existsSync(cached)) return fs.readFileSync(cached, 'utf8');
  const wait = lastRequestAt + GAP_MILLISECONDS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}.`);
  const text = await response.text();
  fs.mkdirSync(CACHE_FOLDER, { recursive: true });
  fs.writeFileSync(cached, text);
  return text;
}

export async function politeJson<T>(url: string): Promise<T> {
  return JSON.parse(await politeText(url)) as T;
}

function cachePath(url: string): string {
  return path.join(CACHE_FOLDER, crypto.createHash('sha1').update(url).digest('hex'));
}
