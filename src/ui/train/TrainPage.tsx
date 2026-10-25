import { useEffect, useMemo, useState } from 'react';
import { startingTown } from '../../character/jobs';
import { loadMapDetail, meowdbRouteUrl } from '../../data/loadGameData';
import type { MapDetail, MapSummary } from '../../data/types';
import { MAX_LEVEL } from '../../sim/exp';
import { buildSession, sessionHours, tidyHours } from '../../sim/session';
import { LOOT_SHARE } from '../../sim/roaming';
import { attacksToDefeat, simulateMap } from '../../sim/simulateMap';
import { useRankings } from '../rankings/useRankings';
import { ComparePicker } from '../shared/ComparePicker';
import { formatHours, formatNumber } from '../shared/format';
import { readThisVisit, writeThisVisit } from '../shared/storedState';
import { goalLevelFor, useSessionSettings } from '../shared/useSessionSettings';
import { useCompare } from '../shared/useCompare';
import { useSite } from '../SiteContext';
import { CharacterWindow } from '../stage/CharacterWindow';
import { DropLog } from './DropLog';
import { MapPicker } from './MapPicker';
import { SessionControls, type SessionInputs } from './SessionControls';
import { SpawnAtlas } from './SpawnAtlas';
import { suggestMap } from './suggestMap';
import { Tally, type ComparedSession } from './Tally';
import { useDropRoll } from './useDropRoll';
import './train.css';

const FALLBACK_STAGE = { characterX: 110, characterY: 128, monsterX: 240, monsterY: 128 };
const CHOSEN_MAP_KEY = 'last-map';
const TRACKER_URL = 'https://mapleclassic.training';

export function TrainPage({ mapId }: { mapId: string | null }) {
  const { site, character } = useSite();
  const chosenId = mapId ?? readThisVisit(CHOSEN_MAP_KEY);
  const { rankings, problem } = useRankings(site.game, chosenId ? null : character, 1, Math.min(MAX_LEVEL, character.level + 5));
  useEffect(() => {
    if (mapId) writeThisVisit(CHOSEN_MAP_KEY, mapId);
  }, [mapId]);
  const bestId = rankings?.ranked[0]?.map.id ?? (problem || rankings ? suggestMap(character, site.game) : null);
  const shownId = chosenId ?? bestId;
  const map = shownId ? site.game.maps.find((candidate) => candidate.id === shownId) ?? site.game.maps[0] : null;
  if (!map) return <main className="wrap page-head"><h1>Train on a map</h1><p>Finding your best map…</p></main>;
  return <TrainMap key={map.id} map={map} />;
}

function TrainMap({ map }: { map: MapSummary }) {
  const { character } = useSite();
  const [detail, setDetail] = useState<MapDetail | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const settings = useSessionSettings();
  const [expText, setExpText] = useState(String(character.expPercent));
  const inputs: SessionInputs = { mode: settings.mode, hoursText: settings.hoursText, goalText: settings.goalText || String(goalLevelFor('', character.level)), expText, party: settings.party };
  const setInputs = (next: SessionInputs) => {
    settings.setMode(next.mode);
    settings.setHoursText(next.hoursText);
    settings.setGoalText(next.goalText);
    settings.setParty(next.party);
    setExpText(next.expText);
  };

  useEffect(() => {
    let cancelled = false;
    loadMapDetail(map.id)
      .then((loaded) => { if (!cancelled) setDetail(loaded); })
      .catch((error: unknown) => { if (!cancelled) setProblem(error instanceof Error ? error.message : String(error)); });
    return () => { cancelled = true; };
  }, [map.id]);

  if (problem) return <main className="wrap page-head"><h1>{map.name}</h1><p>{problem}</p></main>;
  if (!detail) return <main className="wrap page-head"><h1>{map.name}</h1><p>Loading the map…</p></main>;
  return <TrainView map={map} detail={detail} inputs={inputs} onInputs={setInputs} />;
}

interface TrainViewProps {
  map: MapSummary;
  detail: MapDetail;
  inputs: SessionInputs;
  onInputs: (inputs: SessionInputs) => void;
}

function TrainView({ map, detail, inputs, onInputs }: TrainViewProps) {
  const { site, character } = useSite();
  const compare = useCompare();
  const simulation = useMemo(() => simulateMap(character, site.game, detail, inputs.party), [character, site.game, detail, inputs.party]);
  const expPercent = Math.min(99.9, Math.max(0, Number(inputs.expText) || 0));
  const goalLevel = Math.min(MAX_LEVEL, Math.max(character.level + 1, Math.round(Number(inputs.goalText) || character.level + 1)));
  const length = inputs.mode === 'hours' ? { kind: 'hours' as const, hours: Number(inputs.hoursText) } : { kind: 'goal' as const, goalLevel };
  const hours = sessionHours(length, simulation, character.level, expPercent);
  const sessionLength = Number.isFinite(hours) ? hours : 0;
  const session = useMemo(() => buildSession(simulation, sessionLength, character.level, expPercent), [simulation, sessionLength, character.level, expPercent]);
  const compared = useMemo((): ComparedSession | undefined => {
    if (!compare.compared) return undefined;
    const theirs = simulateMap(compare.compared, site.game, detail, inputs.party);
    return { name: compare.compared.name, session: buildSession(theirs, sessionLength, compare.compared.level, compare.compared.expPercent) };
  }, [compare.compared, site.game, detail, inputs.party, sessionLength]);
  const rollKey = `${map.id}|${character.id}|${character.level}|${hours.toFixed(1)}|${inputs.party}`;
  const lootedKills = useMemo(() => new Map([...session.killsByMonster].map(([id, kills]) => [id, kills * LOOT_SHARE])), [session.killsByMonster]);
  const { drops, rollAgain } = useDropRoll(rollKey, lootedKills, site.game.drops);
  const mainMonster = simulation.mainTarget !== null ? site.game.monsters.get(simulation.mainTarget) : undefined;
  const stage = detail.stage ?? FALLBACK_STAGE;
  const note = sessionNote(inputs, hours, goalLevel, character.level, session.kills);
  const missingTables = [...session.killsByMonster.keys()].filter((id) => !site.game.drops[id]).map((id) => site.game.monsters.get(id)?.name ?? `Monster ${id}`);
  const tidy = () => onInputs({ ...inputs, hoursText: String(tidyHours(Number(inputs.hoursText))), goalText: String(goalLevel), expText: String(expPercent) });

  return (
    <main className="wrap train">
      <div className="train-head">
        <div className="train-title">
          <p className="street">{map.street}</p>
          <h1>{map.name}</h1>
          <div className="train-actions">
            <a className="button" href={meowdbRouteUrl(map.id)} target="_blank" rel="noreferrer">How to get there</a>
            <span className="muted go-note">Opens the route on NiaDB</span>
          </div>
          {simulation.killsPerHour <= 0 && <p className="warn">You can't defeat the monsters here yet. Try a map with lower-level monsters.</p>}
          <MapPicker maps={site.game.maps} monsters={site.game.monsters} currentId={map.id} />
        </div>
        <div className="train-side">
          <CharacterWindow
            character={character}
            site={site}
            sceneFile={map.hasScene ? map.id : `town-${startingTown(character.jobId)}`}
            feet={{ x: stage.characterX, y: stage.characterY }}
            monster={mainMonster ? { id: mainMonster.id, at: { x: stage.monsterX, y: stage.monsterY } } : null}
            castsToKill={mainMonster ? Math.min(4, attacksToDefeat(character, site.game, mainMonster)) : 1}
            attacking
            label={`${character.name} attacking ${mainMonster?.name ?? 'a monster'}`}
          />
          <p className="tracker-link">Want to track your training session? Visit <a href={TRACKER_URL} target="_blank" rel="noreferrer">mapleclassic.training</a></p>
        </div>
      </div>
      <SessionControls inputs={inputs} level={character.level} note={note} onChange={onInputs} onTidy={tidy} extra={<ComparePicker compare={compare} />} />
      <Tally session={session} party={inputs.party} startLevel={character.level} compared={compared} />
      <SpawnAtlas detail={detail} mapName={map.name} monsters={site.game.monsters} hitChances={simulation.hitChances} />
      <DropLog drops={drops} hours={Math.max(session.hours, 0.5)} party={inputs.party} mesos={session.mesos} items={site.items}
        itemLinks={site.itemLinks} missingTables={missingTables} totalKills={session.kills * LOOT_SHARE} onRollAgain={rollAgain} />
      <p className="muted small footnote">Kills, EXP and mesos are averages and stay the same each time. Item drops are rolled like a real session, so they change a little when you roll again. Your character spends most of the time on the platforms of the monster that gives them the best EXP, and fights other monsters only when they share those platforms. Monster numbers come from MapleStory Classic's game files, drop rates from osmlib (older game data, so they may not match Classic exactly; Classic scrolls are matched by tier) and meso amounts from NiaDB. Monsters drop mesos about 67% of the time, measured from real training logs, and you're assumed to pick up about 85% of drops.</p>
    </main>
  );
}

function sessionNote(inputs: SessionInputs, hours: number, goalLevel: number, level: number, kills: number): string {
  if (inputs.mode === 'goal') {
    return Number.isFinite(hours) ? `Level ${level} to ${goalLevel} takes about ${formatHours(hours)} here (${formatNumber(kills)} monsters).` : 'You would never reach that level here.';
  }
  const typed = inputs.hoursText.trim();
  return typed !== '' && String(hours) !== typed ? `Using ${formatHours(hours)}. Hours go from 0.5 to 1,000 in half-hour steps.` : '';
}
