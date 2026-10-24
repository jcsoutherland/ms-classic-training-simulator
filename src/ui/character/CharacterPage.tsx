import { useEffect, useState } from 'react';
import { jobName, jobNamePlural, startingTown } from '../../character/jobs';
import type { Character } from '../../character/types';
import { useSite } from '../SiteContext';
import { CharacterWindow } from '../stage/CharacterWindow';
import { DetailsForm } from './DetailsForm';
import { GuideBuildPanel } from './GuideBuildPanel';
import { ScreenshotPanel } from './ScreenshotPanel';
import './character.css';

const TOWN_NAMES = { henesys: 'Henesys', ellinia: 'Ellinia', perion: 'Perion', kerning: 'Kerning City' };

export function CharacterPage() {
  const { site, characters, character, selectCharacter, saveCharacter, addCharacter } = useSite();
  const [draft, setDraft] = useState<Character>(character);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => setDraft(character), [character]);
  const edit = (next: Character) => {
    setDraft(next);
    setSaved(false);
  };
  const save = () => {
    saveCharacter(draft)
      .then(() => setSaved(true))
      .catch((error: unknown) => setProblem(`Couldn't save in this browser: ${error instanceof Error ? error.message : String(error)}`));
  };
  const town = startingTown(draft.jobId);
  return (
    <main className="wrap character-page">
      <div className="page-head">
        <h1>Your character</h1>
        <p>Everything you enter stays in this browser. Switch between saved characters any time.</p>
        <div className="pills saved-characters" role="group" aria-label="Saved characters">
          {characters.map((saved) => (
            <button key={saved.id} className="pill" type="button" aria-pressed={saved.id === character.id} onClick={() => selectCharacter(saved.id)}>
              {saved.name}, level {saved.level} {jobName(saved.jobId)}
            </button>
          ))}
          <button className="pill" type="button" onClick={() => { addCharacter().catch((error: unknown) => setProblem(String(error))); }}>Add a character</button>
        </div>
        {problem && <p className="warn">{problem}</p>}
      </div>
      <div className="character-columns">
        <div className="character-side">
          <section className="panel">
            <CharacterWindow character={draft} site={site} sceneFile={`town-${town}`} feet={{ x: 174, y: 128 }} monster={null} castsToKill={1}
              attacking={false} caption={`Shown in ${TOWN_NAMES[town]}, where ${jobNamePlural(Math.floor(draft.jobId / 100) * 100)} start.`} label={`${draft.name} standing in ${TOWN_NAMES[town]}`} />
          </section>
          <ScreenshotPanel draft={draft} site={site} onRead={edit} />
          <GuideBuildPanel draft={draft} site={site} onUse={edit} />
        </div>
        <DetailsForm draft={draft} site={site} onChange={edit} onSave={save} saved={saved} />
      </div>
    </main>
  );
}
