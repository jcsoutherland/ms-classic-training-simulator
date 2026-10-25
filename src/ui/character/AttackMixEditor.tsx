import { useEffect, useState } from 'react';
import { stepDown, stepUp } from '../../character/attackMix';
import { jobName } from '../../character/jobs';
import { REGULAR_ATTACK, type Character } from '../../character/types';
import { jobLine, type GameData } from '../../data/gameData';
import { imageUrl } from '../../data/loadGameData';
import { usableWithWeapon } from '../../sim/buffs';

const AUTOMATIC = /^Final Attack/;
const COLORS = ['#8b7bff', '#5aa9ff', '#a6e05a', '#ffb257', '#ff6b78', '#f5c542', '#5fd3c8'];

interface AttackMixEditorProps {
  character: Character;
  game: GameData;
  onChange: (character: Character) => void;
}

interface AttackOption {
  id: number;
  name: string;
  job: string;
}

export function AttackMixEditor({ character, game, onChange }: AttackMixEditorProps) {
  const options = attackOptions(character, game);
  const total = options.reduce((sum, option) => sum + (character.attackMix[option.id] ?? 0), 0);
  const setUse = (id: number, percent: number) => onChange({ ...character, attackMix: { ...character.attackMix, [id]: Math.min(100, Math.max(0, Math.round(percent))) } });
  return (
    <fieldset>
      <legend>How often you use each attack</legend>
      <div className="mix-bar" role="img" aria-label={options.map((option) => `${option.name} ${character.attackMix[option.id] ?? 0}%`).join(', ')}>
        {options.map((option, index) => <i key={option.id} style={{ width: `${total > 0 ? (character.attackMix[option.id] ?? 0) / total * 100 : 0}%`, background: COLORS[index % COLORS.length] }} />)}
      </div>
      <ul className="mix-list">
        {options.map((option, index) => (
          <li key={option.id}>
            <span className="mix-swatch" style={{ background: COLORS[index % COLORS.length] }} />
            {option.id === REGULAR_ATTACK ? <span className="skill-icon" /> : <img className="pixel skill-icon" src={imageUrl(`img/skills/${option.id}/icon.png`)} alt="" />}
            <span>{option.name} <span className="muted">{option.job}</span></span>
            <MixStepper id={`mix-${option.id}`} label={option.name} value={character.attackMix[option.id] ?? 0} onChange={(percent) => setUse(option.id, percent)} />
          </li>
        ))}
      </ul>
      <p className={total === 100 ? 'mix-ok' : 'mix-off'}>{total === 100 ? 'Adds up to 100%' : `Adds up to ${total}%, scaled to 100% when simulating`}</p>
    </fieldset>
  );
}

function MixStepper({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (percent: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed)) setText(String(value));
    else onChange(parsed);
  };
  return (
    <span className="stepper">
      <button className="pill" type="button" aria-label={`Use ${label} less`} onClick={() => onChange(stepDown(value))}>−</button>
      <input id={id} aria-label={`${label}, percent of attacks`} type="number" inputMode="numeric" min={0} max={100} value={text}
        onChange={(event) => setText(event.target.value)} onBlur={commit} />
      <span className="muted">%</span>
      <button className="pill" type="button" aria-label={`Use ${label} more`} onClick={() => onChange(stepUp(value))}>+</button>
    </span>
  );
}

function attackOptions(character: Character, game: GameData): AttackOption[] {
  const jobs = game.jobs.filter((job) => jobLine(character.jobId).includes(job.id));
  const skills = jobs.flatMap((job) => job.skills.map((skill) => ({ skill, job: jobName(job.id) })))
    .filter(({ skill }) => skill.kind === 'attack' && !AUTOMATIC.test(skill.name) && (character.skills[skill.id] ?? 0) > 0 && usableWithWeapon(skill, character.weaponType));
  return [{ id: REGULAR_ATTACK, name: 'Regular attack', job: '' }, ...skills.map(({ skill, job }) => ({ id: skill.id, name: skill.name, job }))];
}
