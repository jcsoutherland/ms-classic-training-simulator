import { useState, type DragEvent } from 'react';
import type { Character } from '../../character/types';
import type { SiteData } from '../../data/loadGameData';
import { fileToRawImage, loadWindowKit } from '../../ocr/loadKit';
import { applyReadings, type Reading } from '../../ocr/readings';
import { readScreenshot } from '../../ocr/readWindows';
import { TextReader } from '../../ocr/textReader';

interface ScreenshotPanelProps {
  draft: Character;
  site: SiteData;
  onRead: (character: Character) => void;
}

interface FileResult {
  name: string;
  status: 'reading' | 'read' | 'nothing' | 'problem';
  message: string;
}

export function ScreenshotPanel({ draft, site, onRead }: ScreenshotPanelProps) {
  const [results, setResults] = useState<FileResult[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const readFiles = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;
    setBusy(true);
    setResults(images.map((file) => ({ name: file.name, status: 'reading', message: 'Reading…' })));
    const reader = new TextReader();
    const all: Reading[] = [];
    try {
      const kit = await loadWindowKit();
      for (const [index, file] of images.entries()) {
        const outcome = await readOne(file, kit, reader);
        all.push(...outcome.readings);
        setResults((current) => current.map((result, position) => (position === index ? outcome.result : result)));
      }
      if (all.length) onRead(applyReadings(draft, all, new Set(site.game.weapons.keys())));
    } catch (error) {
      setResults((current) => [...current, { name: 'Screenshots', status: 'problem', message: error instanceof Error ? error.message : String(error) }]);
    } finally {
      await reader.close();
      setBusy(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    readFiles([...event.dataTransfer.files]).catch(() => setBusy(false));
  };

  return (
    <section className="panel" aria-labelledby="shots-heading">
      <h2 id="shots-heading">Fill it in from screenshots</h2>
      <p className="hint">Add your Stats (with Detail open), Equipment and Skill windows. Scroll your skill windows and add every part. Your screenshots never leave your computer.</p>
      <p className="warn">Take your Stats window screenshot with no buffs on. Buffs are added for you, so a buffed screenshot would count them twice.</p>
      <div className={over ? 'drop over' : 'drop'} onDragOver={(event) => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
        <p className="drop-title">{busy ? 'Reading your screenshots…' : 'Drop screenshots here'}</p>
        <label className="button" htmlFor="screenshot-files">Choose screenshots</label>
        <input id="screenshot-files" className="visually-hidden" type="file" accept="image/*" multiple disabled={busy}
          onChange={(event) => { readFiles([...(event.target.files ?? [])]).catch(() => setBusy(false)); event.target.value = ''; }} />
      </div>
      {results.length > 0 && (
        <ul className="reads" aria-live="polite">
          {results.map((result, index) => (
            <li key={`${result.name}-${index}`}>
              <span aria-hidden="true">{result.status === 'read' ? '✓' : result.status === 'reading' ? '…' : '!'}</span>
              <div><b>{result.name}</b><span>{result.message}</span></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function readOne(file: File, kit: Awaited<ReturnType<typeof loadWindowKit>>, reader: TextReader): Promise<{ readings: Reading[]; result: FileResult }> {
  try {
    const readings = await readScreenshot(await fileToRawImage(file), kit, reader);
    if (readings.length === 0) {
      return { readings, result: { name: file.name, status: 'nothing', message: "No Stats, Skill or Equipment window found. Take the screenshot with the window open and not covered." } };
    }
    return { readings, result: { name: file.name, status: 'read', message: describe(readings) } };
  } catch (error) {
    return { readings: [], result: { name: file.name, status: 'problem', message: error instanceof Error ? error.message : String(error) } };
  }
}

function describe(readings: Reading[]): string {
  return readings.map((reading) => {
    if (reading.kind === 'stats') return 'Stats window read. Check the numbers on the right.';
    if (reading.kind === 'detail') return 'Detail window read (attack, accuracy and avoid).';
    if (reading.kind === 'skills') return `Skills window read: ${Object.keys(reading.levels).length} skills.`;
    return `Equipment window read: ${reading.itemIds.length} items found${reading.emptySlots.length ? `, ${reading.emptySlots.length} slots empty or not recognised` : ''}.`;
  }).join(' ');
}
