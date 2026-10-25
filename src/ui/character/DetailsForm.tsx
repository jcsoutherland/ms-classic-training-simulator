import { defaultCharacter } from '../../character/defaults';
import { weaponFitsJob } from '../../character/gear';
import { minimumLevel } from '../../character/jobs';
import type { Character } from '../../character/types';
import type { SiteData } from '../../data/loadGameData';
import type { Stat } from '../../data/types';
import { buffTotals } from '../../sim/buffs';
import { BASE_CRITICAL_CHANCE, BASE_CRITICAL_DAMAGE } from '../../sim/damage';
import { characterSkills } from '../../sim/simulateMap';
import { AttackMixEditor } from './AttackMixEditor';
import { EquipmentList } from './EquipmentList';
import { JobSelect } from './JobSelect';
import { NumberField } from './NumberField';
import { SkillsEditor } from './SkillsEditor';

interface DetailsFormProps {
  draft: Character;
  site: SiteData;
  onChange: (character: Character) => void;
  onDelete: () => void;
}

const STATS: Stat[] = ['STR', 'DEX', 'INT', 'LUK'];

export function DetailsForm({ draft, site, onChange, onDelete }: DetailsFormProps) {
  const change = (patch: Partial<Character>) => onChange({ ...draft, ...patch });
  const isMagician = Math.floor(draft.jobId / 100) === 2;
  const changeJob = (jobId: number) => onChange(withJob(draft, jobId, site));
  const shownCrit = statsWindowCrit(draft, site);
  return (
    <form className="panel details" aria-labelledby="details-heading" onSubmit={(event) => event.preventDefault()}>
      <div className="details-head">
        <h2 id="details-heading">Check the details</h2>
        <button className="button danger-solid" type="button" onClick={onDelete}>Delete character</button>
      </div>
      <fieldset>
        <legend>About {draft.name || 'your character'}</legend>
        <div className="fields">
          <div className="field span-2">
            <label htmlFor="name">Name</label>
            <input id="name" value={draft.name} onChange={(event) => change({ name: event.target.value })} />
          </div>
          <div className="field span-2">
            <label htmlFor="job">Job</label>
            <JobSelect id="job" value={draft.jobId} onChange={changeJob} />
          </div>
          <div className="field">
            <label htmlFor="gender">Gender</label>
            <select id="gender" value={draft.gender} onChange={(event) => change({ gender: event.target.value === 'female' ? 'female' : 'male' })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <NumberField id="level" label="Level" value={draft.level} min={minimumLevel(draft.jobId)} max={100} onChange={(level) => change({ level })} />
          <NumberField id="exp" label="EXP %" value={draft.expPercent} max={99.9} step={0.1} onChange={(expPercent) => change({ expPercent })} />
        </div>
      </fieldset>
      <fieldset>
        <legend>Stats window</legend>
        <div className="fields">
          {STATS.map((stat) => <NumberField key={stat} id={`stat-${stat}`} label={stat} value={draft.stats[stat]} max={999} onChange={(value) => change({ stats: { ...draft.stats, [stat]: value } })} />)}
          <NumberField id="attack-min" label="Attack, lowest" value={draft.attackMin} onChange={(attackMin) => change({ attackMin })} />
          <NumberField id="attack-max" label="Attack, highest" value={draft.attackMax} onChange={(attackMax) => change({ attackMax })} />
          <NumberField id="accuracy" label="Accuracy" value={draft.accuracy} max={999} onChange={(accuracy) => change({ accuracy })} />
          <NumberField id="avoid" label="Evasion" value={draft.avoid} max={999} onChange={(avoid) => change({ avoid })} />
          <NumberField id="crit-rate" label="Crit. rate %" value={draft.criticalRate ?? shownCrit.rate} max={100} onChange={(criticalRate) => change({ criticalRate })} />
          <NumberField id="crit-damage" label="Crit. damage %" value={draft.criticalDamage ?? shownCrit.damage} max={999} onChange={(criticalDamage) => change({ criticalDamage })} />
          <NumberField id="weapon-attack" label="Weapon attack" value={draft.weaponAttack} max={999} onChange={(weaponAttack) => change({ weaponAttack })} />
          {isMagician && <NumberField id="magic-attack" label="Magic attack" value={draft.magicAttack} max={999} onChange={(magicAttack) => change({ magicAttack })} />}
        </div>
      </fieldset>
      <AttackMixEditor character={draft} game={site.game} onChange={onChange} />
      <SkillsEditor character={draft} game={site.game} onChange={onChange} />
      <fieldset>
        <legend>Equipment</legend>
        <EquipmentList itemIds={draft.equipment} site={site} />
      </fieldset>
      <p><a className="button ghost" href="#/rankings">See the best maps for {draft.name || 'your character'}</a></p>
    </form>
  );
}

function withJob(draft: Character, jobId: number, site: SiteData): Character {
  const level = Math.max(draft.level, minimumLevel(jobId));
  const moved = { ...draft, jobId, level };
  if (weaponFitsJob(draft.weaponType, jobId)) return moved;
  const guide = defaultCharacter(jobId, level, { data: site.game, guides: site.guides, items: site.itemList });
  const equipment = [...draft.equipment.filter((itemId) => itemId !== draft.weaponId), ...(guide.weaponId !== null ? [guide.weaponId] : [])];
  return { ...moved, weaponId: guide.weaponId, weaponType: guide.weaponType, weaponSpeed: guide.weaponSpeed, weaponAttack: guide.weaponAttack, attackMix: guide.attackMix, equipment };
}

function statsWindowCrit(draft: Character, site: SiteData): { rate: number; damage: number } {
  const buffs = buffTotals(draft, characterSkills(draft, site.game));
  return { rate: Math.round(BASE_CRITICAL_CHANCE * 100 + buffs.criticalChance), damage: Math.round(100 + BASE_CRITICAL_DAMAGE * 100 + buffs.criticalDamage) };
}
