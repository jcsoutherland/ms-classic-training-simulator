import { useEffect, useMemo, useState } from 'react';
import { startingTown } from '../../character/jobs';
import { loadMapDetail, meowdbRouteUrl } from '../../data/loadGameData';
import type { MapDetail, MapSummary } from '../../data/types';
import { buildSession, sessionHours, tidyHours } from '../../sim/session';
import { attacksToDefeat, simulateMap } from '../../sim/simulateMap';
import { formatHours, formatNumber } from '../shared/format';
import { readStored, writeStored } from '../shared/storedState';
import { useSite } from '../SiteContext';
import { CharacterWindow } from '../stage/CharacterWindow';
import { DropLog } from './DropLog';
import { MapPicker } from './MapPicker';
import { SessionControls, type SessionInputs } from './SessionControls';
import { SpawnAtlas } from './SpawnAtlas';
import { suggestMap } from './suggestMap';
import { Tally } from './Tally';
import { useDropRoll } from './useDropRoll';
import './train.css';

const FALLBACK_STAGE = { characterX: 110, characterY: 128, monsterX: 240, monsterY: 128 };

export function TrainPage({ mapId }: { mapId: string | null }) {
  const { site, character } = useSite();
  const chosenId = mapId ?? readStored('last-map') ?? suggestMap(character, site.game);
  const map = site.game.maps.find((candidate) => candidate.id === chosenId) ?? site.game.maps[0];
  const [detail, setDetail] = useState<MapDetail | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [inputs, setInputs] = useState<SessionInputs>({ mode: 'hours', hoursText: '3', goalText: String(Math.min(100, character.level + 5)), expText: String(character.expPercent), party: 1 });

  useEffect(() => {
    writeStored('last-map', map.id);
    let cancelled = false;
    setDetail(null);
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
  const simulation = useMemo(() => simulateMap(character, site.game, detail, inputs.party), [character, site.game, detail, inputs.party]);
  const expPercent = Math.min(99.9, Math.max(0, Number(inputs.expText) || 0));
  const goalLevel = Math.min(100, Math.max(character.level + 1, Math.round(Number(inputs.goalText) || character.level + 1)));
  const length = inputs.mode === 'hours' ? { kind: 'hours' as const, hours: Number(inputs.hoursText) } : { kind: 'goal' as const, goalLevel };
  const hours = sessionHours(length, simulation, character.level, expPercent);
  const session = useMemo(() => buildSession(simulation, Number.isFinite(hours) ? hours : 0, character.level, expPercent), [simulation, hours, character.level, expPercent]);
  const rollKey = `${map.id}|${character.id}|${character.level}|${hours.toFixed(1)}|${inputs.party}`;
  const { drops, rollAgain } = useDropRoll(rollKey, session.killsByMonster, site.game.drops);
  const mainMonsterId = map.spawnCounts[0]?.[0];
  const mainMonster = mainMonsterId !== undefined ? site.game.monsters.get(mainMonsterId) : undefined;
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
          <p className="summary">
            {simulation.killsPerHour > 0
              ? `In ${formatHours(hours)}, ${inputs.party > 1 ? `your party of ${inputs.party}` : 'you'} would defeat about ${formatNumber(session.kills)} monsters here.`
              : "You can't defeat the monsters here yet. Try a map with lower-level monsters."}
          </p>
          <a className="button go" href={meowdbRouteUrl(map.id)} target="_blank" rel="noreferrer">How to get there</a>
          <span className="muted go-note">Opens the route on MeowDB</span>
          <MapPicker maps={site.game.maps} monsters={site.game.monsters} currentId={map.id} />
        </div>
        <CharacterWindow
          character={character}
          site={site}
          sceneFile={map.hasScene ? map.id : `town-${startingTown(character.jobId)}`}
          feet={{ x: stage.characterX, y: stage.characterY }}
          monster={mainMonster ? { id: mainMonster.id, at: { x: stage.monsterX, y: stage.monsterY } } : null}
          castsToKill={mainMonster ? Math.min(4, attacksToDefeat(character, site.game, mainMonster)) : 1}
          attacking
          caption={mainMonster ? `${character.name} is fighting ${mainMonster.name}s on this map.` : `${character.name} on this map.`}
          label={`${character.name} attacking ${mainMonster?.name ?? 'a monster'}`}
        />
      </div>
      <SessionControls inputs={inputs} level={character.level} note={note} onChange={onInputs} onTidy={tidy} />
      <Tally session={session} party={inputs.party} startLevel={character.level} />
      <SpawnAtlas detail={detail} mapName={map.name} monsters={site.game.monsters} hitChances={simulation.hitChances} />
      <DropLog drops={drops} hours={Math.max(session.hours, 0.5)} party={inputs.party} mesos={session.mesos} items={site.items}
        itemLinks={site.itemLinks} missingTables={missingTables} totalKills={session.kills} onRollAgain={rollAgain} />
      <p className="muted small footnote">Kills, EXP and mesos are averages and stay the same each time. Item drops are rolled like a real session, so they change a little when you roll again. Monster numbers come from MapleStory Classic's game files, drop rates from osmlib and meso amounts from MeowDB.</p>
    </main>
  );
}

function sessionNote(inputs: SessionInputs, hours: number, goalLevel: number, level: number, kills: number): string {
  if (inputs.mode === 'goal') {
    return Number.isFinite(hours) ? `Level ${level} to ${goalLevel} takes about ${formatHours(hours)} here (${formatNumber(kills)} monsters).` : 'You would never reach that level here.';
  }
  const typed = inputs.hoursText.trim();
  return typed !== '' && String(hours) !== typed ? `Using ${formatHours(hours)}. Hours go from 0.5 to 1,000 in half-hour steps.` : `Training for ${formatHours(hours)}.`;
}
