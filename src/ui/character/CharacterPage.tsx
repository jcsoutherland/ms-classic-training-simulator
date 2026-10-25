import { useEffect, useState } from 'react';
import { jobName, startingTown } from '../../character/jobs';
import type { Character } from '../../character/types';
import { useSite } from '../SiteContext';
import { CharacterWindow } from '../stage/CharacterWindow';
import { DetailsForm } from './DetailsForm';
import { GuideBuildPanel } from './GuideBuildPanel';
import { ScreenshotPanel } from './ScreenshotPanel';
import './character.css';

const SAVE_DELAY_MILLISECONDS = 600;
const TOWN_NAMES = { henesys: 'Henesys', ellinia: 'Ellinia', perion: 'Perion', kerning: 'Kerning City' };

type SaveState = 'saved' | 'waiting' | 'failed';

export function CharacterPage() {
  const { site, characters, character, selectCharacter, saveCharacter, addCharacter, deleteCharacter } = useSite();
  const [draft, setDraft] = useState<Character>(character);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    setDraft(character);
    setConfirmingDelete(false);
  }, [character]);
  useEffect(() => {
    if (draft === character || draft.id !== character.id) return undefined;
    setSaveState('waiting');
    const timer = window.setTimeout(() => {
      saveCharacter(draft)
        .then(() => setSaveState('saved'))
        .catch((error: unknown) => {
          setSaveState('failed');
          setProblem(`Couldn't save in this browser: ${error instanceof Error ? error.message : String(error)}`);
        });
    }, SAVE_DELAY_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [draft, character, saveCharacter]);
  const remove = () => {
    deleteCharacter(character.id).catch((error: unknown) => setProblem(`Couldn't delete: ${error instanceof Error ? error.message : String(error)}`));
  };
  const town = startingTown(draft.jobId);
  return (
    <main className="wrap character-page">
      <div className="page-head">
        <h1>Your character</h1>
        <p>Everything you enter saves as you type and stays in this browser.</p>
        <div className="pills saved-characters" role="group" aria-label="Saved characters">
          {characters.map((saved) => (
            <button key={saved.id} className="pill" type="button" aria-pressed={saved.id === character.id} onClick={() => selectCharacter(saved.id)}>
              {saved.name}, level {saved.level} {jobName(saved.jobId)}
            </button>
          ))}
          <button className="pill" type="button" onClick={() => { addCharacter().catch((error: unknown) => setProblem(String(error))); }}>Add a character</button>
          {confirmingDelete ? (
            <span className="delete-confirm">
              <span>Delete {character.name} for good?</span>
              <button className="button danger" type="button" onClick={remove}>Delete</button>
              <button className="button ghost" type="button" onClick={() => setConfirmingDelete(false)}>Keep</button>
            </span>
          ) : (
            <button className="button ghost" type="button" onClick={() => setConfirmingDelete(true)}>Delete this character</button>
          )}
        </div>
        {problem && <p className="warn">{problem}</p>}
      </div>
      <div className="character-columns">
        <div className="character-side">
          <section className="panel">
            <CharacterWindow character={draft} site={site} sceneFile={`town-${town}`} feet={{ x: 174, y: 128 }} monster={null} castsToKill={1}
              attacking={false} label={`${draft.name} standing in ${TOWN_NAMES[town]}`} />
          </section>
          <ScreenshotPanel draft={draft} site={site} onRead={setDraft} />
          <GuideBuildPanel draft={draft} site={site} onUse={setDraft} />
        </div>
        <DetailsForm draft={draft} site={site} onChange={setDraft} saveStatus={<SaveStatus state={saveState} />} />
      </div>
    </main>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'failed') return <p className="save-status failed" role="status">Not saved</p>;
  if (state === 'waiting') return <p className="save-status" role="status">Saving…</p>;
  return <p className="save-status saved" role="status">Saved in this browser</p>;
}
