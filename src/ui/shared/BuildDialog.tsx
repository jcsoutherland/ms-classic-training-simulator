import { useEffect, useRef } from 'react';
import { equipmentBySlot } from '../../character/gear';
import { jobName } from '../../character/jobs';
import { REGULAR_ATTACK, type Character } from '../../character/types';
import { jobLine } from '../../data/gameData';
import { imageUrl, type SiteData } from '../../data/loadGameData';

interface BuildDialogProps {
  character: Character | null;
  site: SiteData;
  onClose: () => void;
}

export function BuildDialog({ character, site, onClose }: BuildDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (character && !element.open) element.showModal();
    if (!character && element.open) element.close();
  }, [character]);
  return (
    <dialog ref={dialog} className="dialog build" aria-labelledby="build-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-head">
        <p className="dialog-title" id="build-title">{character ? buildTitle(character) : ''}</p>
        <button className="pill close-button" type="button" aria-label="Close build" onClick={onClose}>×</button>
      </div>
      {character && <BuildSummary character={character} site={site} />}
    </dialog>
  );
}

function BuildSummary({ character, site }: { character: Character; site: SiteData }) {
  const skills = site.game.jobs.filter((job) => jobLine(character.jobId).includes(job.id)).flatMap((job) => job.skills.map((skill) => ({ skill, job: jobName(job.id) })));
  const learned = skills.filter(({ skill }) => (character.skills[skill.id] ?? 0) > 0);
  const attacks = Object.entries(character.attackMix).filter(([, percent]) => percent > 0)
    .map(([id, percent]) => ({ name: Number(id) === REGULAR_ATTACK ? 'Regular attack' : site.game.skills.get(Number(id))?.name ?? `Skill ${id}`, percent }));
  const stats: [string, string | number][] = [
    ['STR', character.stats.STR], ['DEX', character.stats.DEX], ['INT', character.stats.INT], ['LUK', character.stats.LUK],
    ['Attack', `${character.attackMin}–${character.attackMax}`], ['Accuracy', character.accuracy], ['Evasion', character.avoid],
    ['Weapon attack', character.weaponAttack], ...(character.magicAttack ? [['Magic attack', character.magicAttack] as [string, number]] : []),
  ];
  return (
    <div className="build-body">
      <section>
        <h3>Stats</h3>
        <dl className="build-stats">{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="num">{value}</dd></div>)}</dl>
      </section>
      <section>
        <h3>Attacks</h3>
        <ul className="build-list">{attacks.map((attack) => <li key={attack.name}><span>{attack.name}</span><b className="num">{attack.percent}%</b></li>)}</ul>
      </section>
      <section>
        <h3>Skills</h3>
        <ul className="build-list">
          {learned.map(({ skill, job }) => (
            <li key={skill.id}>
              <span className="build-skill"><img className="pixel" src={imageUrl(`img/skills/${skill.id}/icon.png`)} alt="" />{skill.name} <span className="muted">{job}</span></span>
              <b className="num">{character.skills[skill.id]}</b>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Equipment</h3>
        <ul className="build-list">{equipmentBySlot(character.equipment).map(({ slot, itemId }) => <li key={`${slot}-${itemId}`}><span className="muted">{slot}</span><span>{site.items.get(itemId)?.name ?? `Item ${itemId}`}</span></li>)}</ul>
      </section>
    </div>
  );
}

function buildTitle(character: Character): string {
  const job = jobName(character.jobId);
  return character.name === job ? `${job}, level ${character.level}` : `${character.name}, level ${character.level} ${job}`;
}
