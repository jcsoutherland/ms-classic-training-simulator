import { useEffect, useState } from 'react';
import { jobName } from '../../character/jobs';
import type { Character } from '../../character/types';
import { imageUrl, meowdbMonsterUrl, type SiteData } from '../../data/loadGameData';
import { MAX_LEVEL } from '../../sim/exp';
import type { RoutePlan, RouteStop } from '../../sim/planRoute';
import { routeHref } from '../routes';
import { formatHours, formatNumber } from '../shared/format';
import { PartyPicker } from '../shared/PartyPicker';
import { useStoredState } from '../shared/storedState';
import { goalLevelFor, useSessionSettings } from '../shared/useSessionSettings';
import { useSite } from '../SiteContext';
import { advancementChoices } from './advancement';
import { useRoutePlan } from './useRoutePlan';
import './route.css';

const GOAL_DELAY_MILLISECONDS = 500;

export function RoutePage() {
  const { site, character } = useSite();
  const settings = useSessionSettings();
  const goalLevel = goalLevelFor(settings.goalText, character.level);
  const [goalText, setGoalText] = useState(String(goalLevel));
  const choices = advancementChoices(character.jobId, goalLevel);
  const [chosenJob, setChosenJob] = useStoredState('route-job', '');
  const advanceInto = choices.length ? (choices.includes(Number(chosenJob)) ? Number(chosenJob) : choices[0]) : null;
  const { plan, planningLevel, problem } = useRoutePlan(site, character, { goalLevel, players: settings.party, advanceInto });
  const { setGoalText: saveGoal } = settings;
  useEffect(() => {
    if (!goalText.trim()) return undefined;
    const timer = window.setTimeout(() => saveGoal(String(goalLevelFor(goalText, character.level))), GOAL_DELAY_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [goalText, character.level, saveGoal]);
  const tidyGoal = () => setGoalText(String(goalLevelFor(goalText, character.level)));
  return (
    <main className="wrap route-page">
      <div className="page-head route-head">
        <div>
          <h1>Plan my route</h1>
          <p>{plan && planningLevel === null ? summary(plan, character.level, goalLevel) : `Planning level ${planningLevel ?? character.level} of ${goalLevel}…`}</p>
        </div>
        <div className="route-controls">
          <div className="field compact">
            <label htmlFor="route-goal">Goal level</label>
            <input id="route-goal" type="number" inputMode="numeric" min={character.level + 1} max={MAX_LEVEL} value={goalText}
              onChange={(event) => setGoalText(event.target.value)} onBlur={tidyGoal} />
          </div>
          <PartyPicker value={settings.party} onChange={settings.setParty} />
          {choices.length > 0 && (
            <div className="field">
              <label htmlFor="route-job">Plan to become</label>
              <select id="route-job" value={advanceInto ?? ''} onChange={(event) => setChosenJob(event.target.value)}>
                {choices.map((jobId) => <option key={jobId} value={jobId}>{jobName(jobId)}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      {problem && <p className="warn">{problem}</p>}
      {plan && <RouteTimeline plan={plan} site={site} character={character} />}
      <details className="left-out route-assumptions">
        <summary>How the route is planned</summary>
        <ul>
          <li>Your gear, stat points and skill points move toward the class guide as you level.</li>
          <li>You job advance as soon as you can, into the job you pick here.</li>
          <li>Each map uses whichever of your attacks gives the most EXP there.</li>
          <li>You switch maps when another gives at least 25% more EXP an hour, or at least 10% more two levels in a row.</li>
        </ul>
      </details>
    </main>
  );
}

function RouteTimeline({ plan, site, character }: { plan: RoutePlan; site: SiteData; character: Character }) {
  return (
    <ol className="route">
      {plan.stops.map((stop, index) => (
        <li key={`${stop.mapId}-${stop.fromLevel}`}>
          {index > 0 && plan.stops[index - 1].jobId !== stop.jobId && <p className="advance">Advance to {jobName(stop.jobId)} at level {stop.fromLevel}</p>}
          {index === 0 && stop.jobId !== character.jobId && <p className="advance">Advance to {jobName(stop.jobId)} at level {stop.fromLevel}</p>}
          <RouteStopRow stop={stop} site={site} />
        </li>
      ))}
      {plan.stuckAt !== null && <li><p className="warn">No map in Classic suits level {plan.stuckAt} yet, so the route stops there.</p></li>}
    </ol>
  );
}

function RouteStopRow({ stop, site }: { stop: RouteStop; site: SiteData }) {
  const map = site.game.maps.find((candidate) => candidate.id === stop.mapId);
  const monster = stop.mainTarget !== null ? site.game.monsters.get(stop.mainTarget) : undefined;
  return (
    <div className="stop">
      <span className="stop-dot" aria-hidden="true" />
      <div className="stop-body">
        <a className="stop-map" href={routeHref({ page: 'train', mapId: stop.mapId })}>{map?.name ?? `Map ${stop.mapId}`}</a>
        <span className="stop-detail">
          Level {stop.fromLevel} → {stop.toLevel}
          {monster && (
            <>
              {' · '}
              <a href={meowdbMonsterUrl(monster.id)} target="_blank" rel="noreferrer" className="stop-monster">
                <img className="pixel" src={imageUrl(`img/mobs/${monster.id}/icon.png`)} alt="" />{monster.name}
              </a>
            </>
          )}
          {' · '}{formatNumber(stop.expPerHour)} EXP/h
        </span>
      </div>
      <span className="stop-hours num">{formatHours(stop.hours)}</span>
    </div>
  );
}

function summary(plan: RoutePlan, from: number, goal: number): string {
  const hours = plan.stops.reduce((total, stop) => total + stop.hours, 0);
  const maps = new Set(plan.stops.map((stop) => stop.mapId)).size;
  return `Level ${from} → ${goal} · about ${formatHours(hours)} · ${maps} ${maps === 1 ? 'map' : 'maps'}`;
}
