import { useState } from 'react';
import { jobName, startingTown } from '../../character/jobs';
import { accuracyForHitChance, VIABLE_HIT_CHANCE } from '../../sim/accuracy';
import { MAX_LEVEL } from '../../sim/exp';
import type { LeftOutMap } from '../../sim/rankMaps';
import { effectiveAccuracy } from '../../sim/simulateMap';
import { formatPercent } from '../shared/format';
import { PartyPicker } from '../shared/PartyPicker';
import { useSite } from '../SiteContext';
import { CharacterWindow } from '../stage/CharacterWindow';
import { RankingsTable } from './RankingsTable';
import { useRankings } from './useRankings';
import './rankings.css';

const DROP_ICONS = 3;

export function RankingsPage() {
  const { site, character } = useSite();
  const [party, setParty] = useState(1);
  const [goalText, setGoalText] = useState(String(Math.min(MAX_LEVEL, character.level + 5)));
  const goalLevel = Math.min(MAX_LEVEL, Math.max(character.level + 1, Math.round(Number(goalText) || character.level + 1)));
  const { rankings, problem, slow } = useRankings(site.game, character, party, goalLevel);
  const dropIcons = (mapId: string) => {
    const map = site.game.maps.find((candidate) => candidate.id === mapId);
    const entries = (map?.spawnCounts ?? []).flatMap(([id]) => site.game.drops[id] ?? []);
    return [...new Set(entries.sort((a, b) => b.chance - a.chance).map((entry) => entry.itemId))].slice(0, DROP_ICONS);
  };
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
              onChange={(event) => setGoalText(event.target.value)} onBlur={() => setGoalText(String(goalLevel))} />
          </div>
          <PartyPicker value={party} onChange={setParty} />
        </div>
      </div>
      {problem && <p className="warn">{problem}</p>}
      {!rankings && slow && (
        <CharacterWindow character={character} site={site} sceneFile={`town-${startingTown(character.jobId)}`} feet={{ x: 110, y: 128 }}
          monster={{ id: 7, at: { x: 240, y: 128 } }} castsToKill={1} attacking caption="Still working: this takes a little longer the first time." label="Your character warming up" />
      )}
      {rankings && (
        <>
          <RankingsTable ranked={rankings.ranked} monsters={site.game.monsters} dropIcons={dropIcons} party={party} goalLevel={goalLevel} />
          <p className="muted small">Time to your goal assumes your stats, skills and gear stay as they are now. Update your character as you level for better estimates.</p>
          <details className="left-out">
            <summary>Why some maps aren't listed ({rankings.leftOut.length} left out)</summary>
            <ul>{rankings.leftOut.slice(0, 40).map((entry) => <li key={entry.map.id}>{leftOutReason(entry, character.level, effectiveAccuracy(character, site.game))}</li>)}</ul>
          </details>
        </>
      )}
    </main>
  );
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
