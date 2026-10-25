import { useEffect, useState } from 'react';
import { withGenderFromGear } from '../../character/gear';
import { jobName, startingTown } from '../../character/jobs';
import type { Character } from '../../character/types';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useSite } from '../SiteContext';
import { CharacterWindow } from '../stage/CharacterWindow';
import { DetailsForm } from './DetailsForm';
import { GuideBuildPanel } from './GuideBuildPanel';
import { ScreenshotPanel } from './ScreenshotPanel';
import './character.css';

const SAVE_DELAY_MILLISECONDS = 600;
const TOWN_NAMES = { henesys: 'Henesys', ellinia: 'Ellinia', perion: 'Perion', kerning: 'Kerning City' };

export function CharacterPage() {
  const { site, characters, character, selectCharacter, saveCharacter, addCharacter, deleteCharacter } = useSite();
  const [draft, setDraft] = useState<Character>(character);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    setDraft(character);
    setConfirmingDelete(false);
  }, [character]);
  useEffect(() => {
    if (draft === character || draft.id !== character.id) return undefined;
    const timer = window.setTimeout(() => {
      saveCharacter(draft).catch((error: unknown) => setProblem(`Couldn't save: ${error instanceof Error ? error.message : String(error)}`));
    }, SAVE_DELAY_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [draft, character, saveCharacter]);
  const remove = () => {
    setConfirmingDelete(false);
    deleteCharacter(character.id).catch((error: unknown) => setProblem(`Couldn't delete: ${error instanceof Error ? error.message : String(error)}`));
  };
  const town = startingTown(draft.jobId);
  return (
    <main className="wrap character-page">
      <div className="page-head">
        <h1>Your character</h1>
        <div className="saved-characters" role="group" aria-label="Saved characters">
          {characters.map((saved) => (
            <button key={saved.id} className="character-card" type="button" aria-pressed={saved.id === character.id} onClick={() => selectCharacter(saved.id)}>
              <span className="card-text"><b>{saved.name}</b><span>{jobName(saved.jobId)}</span></span>
              <span className="card-level"><small>Lv</small><b>{saved.level}</b></span>
            </button>
          ))}
          <button className="add-character" type="button" aria-label="Add a character" title="Add a character" onClick={() => { addCharacter().catch((error: unknown) => setProblem(String(error))); }}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </button>
        </div>
        {problem && <p className="warn">{problem}</p>}
      </div>
      <div className="character-columns">
        <div className="character-side">
          <section className="panel">
            <CharacterWindow character={draft} site={site} sceneFile={`town-${town}`} feet={{ x: 174, y: 128 }} monster={null} castsToKill={1}
              attacking={false} label={`${draft.name} standing in ${TOWN_NAMES[town]}`} />
          </section>
          <ScreenshotPanel draft={draft} site={site} onRead={(read) => setDraft(read.equipment !== draft.equipment ? withGenderFromGear(read) : read)} />
          <GuideBuildPanel draft={draft} site={site} onUse={setDraft} />
        </div>
        <DetailsForm draft={draft} site={site} onChange={setDraft} onDelete={() => setConfirmingDelete(true)} />
      </div>
      <ConfirmDialog open={confirmingDelete} title={`Delete ${character.name} for good?`} confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirmingDelete(false)} />
    </main>
  );
}
