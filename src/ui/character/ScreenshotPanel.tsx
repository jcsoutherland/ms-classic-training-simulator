import { useState, type DragEvent } from 'react';
import { withUsableAttackMix } from '../../character/defaults';
import type { Character } from '../../character/types';
import type { SiteData } from '../../data/loadGameData';
import { fileToRawImage, loadWindowKit } from '../../ocr/loadKit';
import { applyReadings, type Reading } from '../../ocr/readings';
import { readScreenshot } from '../../ocr/readWindows';
import { characterSkills } from '../../sim/simulateMap';
import { BoxPicker } from './BoxPicker';
import { ExamplesDialog } from './ExamplesDialog';
import { useCaptures, type Capture } from './useCaptures';

interface ScreenshotPanelProps {
  draft: Character;
  site: SiteData;
  onRead: (character: Character) => void;
}

interface CaptureResult {
  captureId: number;
  found: boolean;
  message: string;
}

export function ScreenshotPanel({ draft, site, onRead }: ScreenshotPanelProps) {
  const { captures, add, remove, clear, snip, problem } = useCaptures();
  const [results, setResults] = useState<CaptureResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [boxing, setBoxing] = useState<Capture | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const kit = await loadWindowKit();
      const all: Reading[] = [];
      const next: CaptureResult[] = [];
      for (const capture of captures) {
        const readings = await readScreenshot(await fileToRawImage(capture.blob), kit);
        all.push(...readings);
        next.push({ captureId: capture.id, found: readings.length > 0, message: describe(readings) });
      }
      setResults(next);
      if (!all.length) return;
      const read = applyReadings(draft, all, new Set(site.game.weapons.keys()));
      onRead(withUsableAttackMix(read, characterSkills(read, site.game)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    add([...event.dataTransfer.files], 'Screenshot');
  };

  const resultFor = (capture: Capture) => results.find((result) => result.captureId === capture.id);

  return (
    <section className="panel" aria-labelledby="shots-heading">
      <h2 id="shots-heading">Fill it in from screenshots</h2>
      <p className="warn">Add your Stats (with Detail open and no buffs active), Equipment and Skill windows. <button className="link-button" type="button" onClick={() => setShowExamples(true)}>Examples</button></p>
      <div className={over ? 'drop over' : 'drop'} onDragOver={(event) => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
        <div className="capture-actions">
          <button className="button" type="button" onClick={snip}>Snip a window</button>
          <label className="button ghost" htmlFor="screenshot-files">Upload screenshots</label>
          <input id="screenshot-files" className="visually-hidden" type="file" accept="image/*" multiple
            onChange={(event) => { add([...(event.target.files ?? [])], 'Screenshot'); event.target.value = ''; }} />
        </div>
        <p className="hint">Or drop files here, or press Ctrl+V to paste a snip.</p>
      </div>
      {problem && <p className="hint">{problem}</p>}
      {captures.length > 0 && (
        <>
          <ul className="captures">
            {captures.map((capture) => {
              const result = resultFor(capture);
              return (
                <li key={capture.id} className={result && !result.found ? 'missed' : undefined}>
                  <img src={capture.url} alt={capture.name} />
                  <div>
                    <b>{capture.name}</b>
                    {result && <span>{result.message}</span>}
                    <span className="capture-links">
                      <button className="link-button" type="button" onClick={() => setBoxing(capture)}>Draw a box</button>
                      <button className="link-button" type="button" onClick={() => remove(capture.id)}>Remove</button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="capture-actions">
            <button className="button" type="button" disabled={busy} onClick={() => { readAll().catch(() => setBusy(false)); }}>{busy ? 'Reading…' : `Read all ${captures.length}`}</button>
            <button className="button ghost" type="button" onClick={() => { clear(); setResults([]); }}>Clear</button>
          </div>
        </>
      )}
      {error && <p className="warn">{error}</p>}
      <ExamplesDialog open={showExamples} onClose={() => setShowExamples(false)} />
      <BoxPicker capture={boxing} onClose={() => setBoxing(null)} onCrop={(blob) => { add([blob], 'Boxed window'); setBoxing(null); }} />
    </section>
  );
}

function describe(readings: Reading[]): string {
  if (!readings.length) return 'No game window found. Draw a box around it.';
  return readings.map((reading) => {
    if (reading.kind === 'stats') return 'Stats';
    if (reading.kind === 'detail') return 'Detail';
    if (reading.kind === 'skills') return `${Object.keys(reading.levels).length} skills`;
    if (reading.deco) return "Deco tab: cosmetics can't be drawn yet, so your regular gear is shown";
    return `${reading.itemIds.length} items`;
  }).join(', ');
}
