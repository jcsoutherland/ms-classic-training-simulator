import { useState } from 'react';
import { jobName } from '../../character/jobs';
import type { Character } from '../../character/types';
import { jobLine, type GameData } from '../../data/gameData';
import { imageUrl } from '../../data/loadGameData';
import type { Skill } from '../../data/types';
import { usableWithWeapon } from '../../sim/buffs';
import { NumberField } from './NumberField';

interface SkillsEditorProps {
  character: Character;
  game: GameData;
  onChange: (character: Character) => void;
}

export function SkillsEditor({ character, game, onChange }: SkillsEditorProps) {
  const jobs = game.jobs.filter((job) => jobLine(character.jobId).includes(job.id));
  const [tab, setTab] = useState(jobs[jobs.length - 1]?.id ?? 0);
  const job = jobs.find((candidate) => candidate.id === tab) ?? jobs[0];
  const setLevel = (skill: Skill, level: number) => onChange({ ...character, skills: { ...character.skills, [skill.id]: Math.min(skill.maxLevel, Math.max(0, level)) } });
  return (
    <fieldset>
      <legend>Skills</legend>
      <div className="pills tabs" role="group" aria-label="Skill tab">
        {jobs.map((candidate) => (
          <button key={candidate.id} className="pill" type="button" aria-pressed={candidate.id === job?.id} onClick={() => setTab(candidate.id)}>{jobName(candidate.id)}</button>
        ))}
      </div>
      <ul className="skills">
        {job?.skills.map((skill) => {
          const level = character.skills[skill.id] ?? 0;
          const usable = usableWithWeapon(skill, character.weaponType);
          return (
            <li key={skill.id}>
              <img className="pixel skill-icon" src={imageUrl(`img/skills/${skill.id}/icon.png`)} alt="" />
              <div>
                <b>{skill.name}</b>
                <span>{skillText(skill, level)}</span>
                {!usable && level > 0 && <span className="note">Needs a different weapon</span>}
              </div>
              <NumberField id={`level-${skill.id}`} label={`Level (max ${skill.maxLevel})`} value={level} max={skill.maxLevel} onChange={(next) => setLevel(skill, next)} />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function skillText(skill: Skill, level: number): string {
  if (level > 0) return skill.levelText[level - 1] ?? '';
  return skill.levelText[0] ? `Level 1: ${skill.levelText[0]}` : '';
}
