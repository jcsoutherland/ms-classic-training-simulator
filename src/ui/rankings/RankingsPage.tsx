import { useState } from 'react';
import { jobName, startingTown } from '../../character/jobs';
import type { Character } from '../../character/types';
import type { SiteData } from '../../data/loadGameData';
import { accuracyForHitChance, VIABLE_HIT_CHANCE } from '../../sim/accuracy';
import { MAX_LEVEL } from '../../sim/exp';
import type { LeftOutMap, RankedMap, Rankings } from '../../sim/rankMaps';
import { LOOT_SHARE } from '../../sim/roaming';
import { effectiveAccuracy } from '../../sim/simulateMap';
import { ComparePicker } from '../shared/ComparePicker';
import { formatPercent } from '../shared/format';
import { PartyPicker } from '../shared/PartyPicker';
import { useCompare } from '../shared/useCompare';
import { goalLevelFor, useSessionSettings } from '../shared/useSessionSettings';
import { useSite } from '../SiteContext';
import { CharacterWindow } from '../stage/CharacterWindow';
import { RankingsTable, type LikelyDrop } from './RankingsTable';
import { useRankings } from './useRankings';
import './rankings.css';

const EQUIPMENT_ICONS = 4;
const SHARED_TOP = 10;

export function RankingsPage() {
  const { site, character } = useSite();
  const compare = useCompare();
  const settings = useSessionSettings();
  const party = settings.party;
  const goalLevel = goalLevelFor(settings.goalText, character.level);
  const [goalText, setGoalText] = useState(String(goalLevel));
  const { rankings, problem, slow } = useRankings(site.game, character, party, goalLevel);
  const compared = useRankings(site.game, compare.compared, party, goalLevel);
  const likelyEquipment = (entry: RankedMap) => equipmentFor(entry, site);
  const tableProps = { monsters: site.game.monsters, items: site.items, itemLinks: site.itemLinks, likelyEquipment, party, goalLevel };
  const comparing = compare.compared !== null;
  const shared = rankings && compared.rankings ? sharedTopMaps(rankings, compared.rankings) : new Set<string>();
  return (
    <main className="wrap rankings">
      <div className="page-head rankings-head">
        <div>
          <h1>Where should {character.name} train?</h1>
          <p>{rankings ? `${rankings.ranked.length} maps suit a level ${character.level} ${jobName(character.jobId)}. Pick a column to sort by it.` : 'Working out every map for you…'}</p>
        </div>
        <div className="rankings-controls">
          <div className="field compact">
            <label htmlFor="ranking-goal">Goal level</label>
            <input id="ranking-goal" type="number" inputMode="numeric" min={character.level + 1} max={MAX_LEVEL} value={goalText}
              onChange={(event) => setGoalText(event.target.value)} onBlur={() => { const tidied = goalLevelFor(goalText, character.level); settings.setGoalText(String(tidied)); setGoalText(String(tidied)); }} />
          </div>
          <PartyPicker value={party} onChange={settings.setParty} />
          <ComparePicker compare={compare} />
        </div>
      </div>
      {(problem ?? compared.problem) && <p className="warn">{problem ?? compared.problem}</p>}
      {!rankings && slow && (
        <CharacterWindow character={character} site={site} sceneFile={`town-${startingTown(character.jobId)}`} feet={{ x: 110, y: 128 }}
          monster={{ id: 7, at: { x: 240, y: 128 } }} castsToKill={1} attacking note="Still working: this takes a little longer the first time." label="Your character warming up" />
      )}
      {rankings && !comparing && <RankingsTable ranked={rankings.ranked} {...tableProps} />}
      {rankings && comparing && (
        <>
          <p className="hint first">A gold edge marks a map in both top {SHARED_TOP}, so it suits you both.</p>
          <div className="boards">
            <div>
              <p className="board-title">{character.name}, level {character.level} {jobName(character.jobId)}</p>
              <RankingsTable ranked={rankings.ranked} {...tableProps} compact shared={shared} />
            </div>
            <div>
              <p className="board-title compare">{compare.compared?.name}</p>
              {compared.rankings ? <RankingsTable ranked={compared.rankings.ranked} {...tableProps} compact shared={shared} /> : <p className="hint">Working out their maps…</p>}
            </div>
          </div>
        </>
      )}
      {rankings && (
        <>
          <p className="muted small">Time to your goal assumes your stats, skills and gear stay as they are now. Update your character as you level for better estimates.</p>
          <LeftOut rankings={rankings} character={character} site={site} />
        </>
      )}
    </main>
  );
}

function LeftOut({ rankings, character, site }: { rankings: Rankings; character: Character; site: SiteData }) {
  const accuracy = effectiveAccuracy(character, site.game);
  return (
    <details className="left-out">
      <summary>Why some maps aren't listed ({rankings.leftOut.length} left out)</summary>
      <ul>{rankings.leftOut.slice(0, 40).map((entry) => <li key={entry.map.id}>{leftOutReason(entry, character.level, accuracy)}</li>)}</ul>
    </details>
  );
}

function equipmentFor(entry: RankedMap, site: SiteData): LikelyDrop[] {
  const perHour = new Map<number, number>();
  for (const [monsterId, kills] of entry.simulation.killsByMonster) {
    for (const drop of site.game.drops[monsterId] ?? []) {
      if (site.items.get(drop.itemId)?.category !== 'equip') continue;
      perHour.set(drop.itemId, (perHour.get(drop.itemId) ?? 0) + kills * LOOT_SHARE * drop.chance);
    }
  }
  return [...perHour].map(([itemId, rate]) => ({ itemId, perHour: rate })).sort((a, b) => b.perHour - a.perHour).slice(0, EQUIPMENT_ICONS);
}

function sharedTopMaps(mine: Rankings, theirs: Rankings): Set<string> {
  const top = (rankings: Rankings) => new Set(rankings.ranked.slice(0, SHARED_TOP).map((entry) => entry.map.id));
  const theirTop = top(theirs);
  return new Set([...top(mine)].filter((id) => theirTop.has(id)));
}

function leftOutReason(entry: LeftOutMap, level: number, accuracy: number): string {
  const { viability, map } = entry;
  if (viability.reason === 'too-hard') {
    const needed = accuracyForHitChance(VIABLE_HIT_CHANCE, level, viability.monster.level, viability.monster.avoid);
    const unlock = Number.isFinite(needed) ? ` ${needed} accuracy unlocks it (you have ${accuracy}).` : '';
    return `${map.name}: you'd hit ${viability.monster.name}s only ${formatPercent(viability.hitChance)} of the time.${unlock}`;
  }
  if (viability.reason === 'too-easy') return `${map.name}: most monsters there are level ${viability.mainLevel}, so they give very little EXP.`;
  return `${map.name}: there's no monster data for this map yet.`;
}
