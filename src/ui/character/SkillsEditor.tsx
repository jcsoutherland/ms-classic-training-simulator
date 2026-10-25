import { useState } from 'react';
import { jobName } from '../../character/jobs';
import { REGULAR_ATTACK, type Character } from '../../character/types';
import { jobLine, type GameData } from '../../data/gameData';
import { imageUrl } from '../../data/loadGameData';
import type { Skill } from '../../data/types';
import { usableWithWeapon } from '../../sim/buffs';

interface SkillsEditorProps {
  character: Character;
  game: GameData;
  onChange: (character: Character) => void;
}

export function SkillsEditor({ character, game, onChange }: SkillsEditorProps) {
  const jobs = game.jobs.filter((job) => jobLine(character.jobId).includes(job.id));
  const [tab, setTab] = useState(jobs[jobs.length - 1]?.id ?? 0);
  const job = jobs.find((candidate) => candidate.id === tab) ?? jobs[0];
  const mixTotal = Object.values(character.attackMix).reduce((total, percent) => total + percent, 0);
  const setLevel = (skill: Skill, level: number) => onChange({ ...character, skills: { ...character.skills, [skill.id]: Math.min(skill.maxLevel, Math.max(0, level)) } });
  const setUse = (skillId: number, percent: number) => onChange({ ...character, attackMix: { ...character.attackMix, [skillId]: Math.min(100, Math.max(0, percent)) } });
  return (
    <fieldset>
      <legend>Skills</legend>
      <p className="hint first">Set your skill levels, then say how often you use each attack. Buffs you have points in count as always on.</p>
      <div className="pills tabs" role="group" aria-label="Skill tab">
        {jobs.map((candidate) => (
          <button key={candidate.id} className="pill" type="button" aria-pressed={candidate.id === job?.id} onClick={() => setTab(candidate.id)}>{jobName(candidate.id)}</button>
        ))}
      </div>
      <ul className="skills">
        {job?.id === jobs[0]?.id && (
          <li>
            <span className="skill-icon" />
            <div><b>Regular attack</b><span>Your weapon's normal attack</span></div>
            <span />
            <UseField id="use-regular" value={character.attackMix[REGULAR_ATTACK] ?? 0} onChange={(percent) => setUse(REGULAR_ATTACK, percent)} />
          </li>
        )}
        {job?.skills.map((skill) => {
          const level = character.skills[skill.id] ?? 0;
          const usable = usableWithWeapon(skill, character.weaponType);
          return (
            <li key={skill.id}>
              <img className="pixel skill-icon" src={imageUrl(`img/skills/${skill.id}/icon.png`)} alt="" />
              <div><b>{skill.name}</b><span>{skill.description.split('\n')[1] ?? skill.description.split('\n')[0]}</span></div>
              <div className="field mini">
                <label htmlFor={`level-${skill.id}`}>Level (max {skill.maxLevel})</label>
                <input id={`level-${skill.id}`} type="number" min={0} max={skill.maxLevel} value={level} onChange={(event) => setLevel(skill, Number(event.target.value))} />
              </div>
              {skill.kind === 'attack' && usable && level > 0 && <UseField id={`use-${skill.id}`} value={character.attackMix[skill.id] ?? 0} onChange={(percent) => setUse(skill.id, percent)} />}
              {skill.kind === 'buff' && level > 0 && usable && <span className="buff-note">Counted as always on</span>}
              {!usable && level > 0 && <span className="note">Needs a different weapon, so it isn't used.</span>}
            </li>
          );
        })}
      </ul>
      <p className={mixTotal === 100 ? 'mix-ok' : 'mix-off'}>{mixTotal === 100 ? 'Your attacks add up to 100%.' : `Your attacks add up to ${mixTotal}%. They're scaled to 100% when simulating.`}</p>
    </fieldset>
  );
}

function UseField({ id, value, onChange }: { id: string; value: number; onChange: (percent: number) => void }) {
  return (
    <div className="field mini">
      <label htmlFor={id}>Use it (% of attacks)</label>
      <input id={id} type="number" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}
