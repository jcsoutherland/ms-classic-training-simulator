import type { ReactNode } from 'react';
import { JOB_IDS, jobName, minimumLevel } from '../../character/jobs';
import type { Character } from '../../character/types';
import type { SiteData } from '../../data/loadGameData';
import type { Stat } from '../../data/types';
import { NumberField } from './NumberField';
import { SkillsEditor } from './SkillsEditor';

interface DetailsFormProps {
  draft: Character;
  site: SiteData;
  onChange: (character: Character) => void;
  saveStatus: ReactNode;
}

const STATS: Stat[] = ['STR', 'DEX', 'INT', 'LUK'];

export function DetailsForm({ draft, site, onChange, saveStatus }: DetailsFormProps) {
  const change = (patch: Partial<Character>) => onChange({ ...draft, ...patch });
  const weapon = draft.weaponId !== null ? site.game.weapons.get(draft.weaponId) : undefined;
  const weaponName = draft.weaponId !== null ? site.items.get(draft.weaponId)?.name : undefined;
  const isMagician = Math.floor(draft.jobId / 100) === 2;
  return (
    <form className="panel details" aria-labelledby="details-heading" onSubmit={(event) => event.preventDefault()}>
      <div className="details-head">
        <h2 id="details-heading">Check the details</h2>
        {saveStatus}
      </div>
      <p className="hint">Copy these from your Stats window with no buffs on. Use the final numbers the game shows, with your gear on.</p>
      <fieldset>
        <legend>About {draft.name || 'your character'}</legend>
        <div className="fields">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="name">Name</label>
            <input id="name" value={draft.name} onChange={(event) => change({ name: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="job">Job</label>
            <select id="job" value={draft.jobId} onChange={(event) => change({ jobId: Number(event.target.value), level: Math.max(draft.level, minimumLevel(Number(event.target.value))) })}>
              {JOB_IDS.map((id) => <option key={id} value={id}>{jobName(id)}</option>)}
            </select>
          </div>
          <NumberField id="level" label="Level" value={draft.level} min={minimumLevel(draft.jobId)} max={100} onChange={(level) => change({ level })} />
          <NumberField id="exp" label="EXP % (optional)" value={draft.expPercent} max={99.9} step={0.1} onChange={(expPercent) => change({ expPercent })} />
        </div>
      </fieldset>
      <fieldset>
        <legend>From your Stats window</legend>
        <div className="fields">
          {STATS.map((stat) => <NumberField key={stat} id={`stat-${stat}`} label={stat} value={draft.stats[stat]} max={999} onChange={(value) => change({ stats: { ...draft.stats, [stat]: value } })} />)}
          <NumberField id="attack-min" label="Attack, lowest" value={draft.attackMin} onChange={(attackMin) => change({ attackMin })} />
          <NumberField id="attack-max" label="Attack, highest" value={draft.attackMax} onChange={(attackMax) => change({ attackMax })} />
          <NumberField id="accuracy" label="Accuracy" value={draft.accuracy} max={999} onChange={(accuracy) => change({ accuracy })} />
          <NumberField id="avoid" label="Avoid" value={draft.avoid} max={999} onChange={(avoid) => change({ avoid })} />
          <NumberField id="weapon-attack" label="Weapon attack (W.ATK)" value={draft.weaponAttack} max={999} onChange={(weaponAttack) => change({ weaponAttack })} />
          {isMagician && <NumberField id="magic-attack" label="Magic attack (M.ATK)" value={draft.magicAttack} max={999} onChange={(magicAttack) => change({ magicAttack })} />}
        </div>
        <p className="hint">Weapon: {weaponName ?? 'none picked'}{weapon ? `, speed ${weapon.attackSpeed}` : ''}. Pick a guide build or add an Equipment screenshot to change it.</p>
      </fieldset>
      <SkillsEditor character={draft} game={site.game} onChange={onChange} />
      <fieldset>
        <legend>Equipment</legend>
        <p className="hint first">{draft.equipment.length ? draft.equipment.map((id) => site.items.get(id)?.name ?? `Item ${id}`).join(', ') : 'No equipment recorded yet.'}</p>
        <p className="hint">Your Stats window already counts your gear, so this only changes how your character looks.</p>
      </fieldset>
      <p><a className="button ghost" href="#/rankings">See the best maps for {draft.name || 'your character'}</a></p>
    </form>
  );
}
