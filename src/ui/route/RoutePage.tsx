import { useEffect, useState } from 'react';
import { jobName } from '../../character/jobs';
import type { Character } from '../../character/types';
import { imageUrl, meowdbMonsterUrl, type SiteData } from '../../data/loadGameData';
import { MAX_LEVEL } from '../../sim/exp';
import type { PlayStyle, RouteOption, RoutePlan, RouteStop } from '../../sim/planRoute';
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
const STYLES: [style: PlayStyle, label: string, rule: string][] = [
  ['fastest', 'Fastest levelling', 'You switch maps when another gives at least 10% more EXP an hour.'],
  ['swapOften', 'Swap maps more often', 'Every 3 levels you move to whichever map gives the most EXP then.'],
  ['mesos', 'Most mesos', 'You switch maps when another gives at least 10% more mesos an hour.'],
  ['rareDrops', 'Hunting rare drops', 'Maps with at least half the best EXP an hour count. Each is scored half on EXP and half on valuable drops (60%, Chaos, 10% and 100% scrolls, throwing stars, then class gear), and you switch when another scores 10% higher.'],
];

export function RoutePage() {
  const { site, character } = useSite();
  const settings = useSessionSettings();
  const goalLevel = goalLevelFor(settings.goalText, character.level);
  const [goalText, setGoalText] = useState(String(goalLevel));
  const choices = advancementChoices(character.jobId, goalLevel);
  const [chosenJob, setChosenJob] = useStoredState('route-job', '');
  const [styleText, setStyle] = useStoredState('route-style', 'fastest');
  const style = STYLES.find(([candidate]) => candidate === styleText) ?? STYLES[0];
  const advanceInto = choices.length ? (choices.includes(Number(chosenJob)) ? Number(chosenJob) : choices[0]) : null;
  const { plan, planningLevel, problem } = useRoutePlan(site, character, { goalLevel, players: settings.party, advanceInto, style: style[0] });
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
          <div className="field">
            <label htmlFor="route-style">How you like to play</label>
            <select id="route-style" value={style[0]} onChange={(event) => setStyle(event.target.value)}>
              {STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
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
          <li>{style[2]}</li>
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
  return (
    <div className="stop">
      <span className="stop-dot" aria-hidden="true" />
      <div className="stop-body">
        <MapLine option={stop} site={site} prefix={`Level ${stop.fromLevel} → ${stop.toLevel}`} />
        {stop.runnerUps.length > 0 && (
          <details className="runner-ups">
            <summary>Other options</summary>
            <ul>
              {stop.runnerUps.map((option) => (
                <li key={option.mapId}>
                  <MapLine option={option} site={site} prefix={difference(option, stop)} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <span className="stop-hours num">{formatHours(stop.hours)}</span>
    </div>
  );
}

function MapLine({ option, site, prefix }: { option: RouteOption; site: SiteData; prefix: string }) {
  const map = site.game.maps.find((candidate) => candidate.id === option.mapId);
  const monster = option.mainTarget !== null ? site.game.monsters.get(option.mainTarget) : undefined;
  return (
    <>
      <a className="stop-map" href={routeHref({ page: 'train', mapId: option.mapId })}>{map?.name ?? `Map ${option.mapId}`}</a>
      <span className="stop-detail">
        {prefix}
        {monster && (
          <>
            {' · '}
            <a href={meowdbMonsterUrl(monster.id)} target="_blank" rel="noreferrer" className="stop-monster">
              <img className="pixel" src={imageUrl(`img/mobs/${monster.id}/icon.png`)} alt="" />{monster.name}
            </a>
          </>
        )}
        {' · '}{formatNumber(option.expPerHour)} EXP/h · {formatNumber(option.mesosPerHour)} mesos/h
      </span>
    </>
  );
}

function difference(option: RouteOption, chosen: RouteOption): string {
  const percent = chosen.expPerHour > 0 ? Math.round((option.expPerHour / chosen.expPerHour - 1) * 100) : 0;
  return `${percent > 0 ? '+' : percent < 0 ? '−' : '±'}${Math.abs(percent)}% EXP`;
}

function summary(plan: RoutePlan, from: number, goal: number): string {
  const hours = plan.stops.reduce((total, stop) => total + stop.hours, 0);
  const maps = new Set(plan.stops.map((stop) => stop.mapId)).size;
  return `Level ${from} → ${goal} · about ${formatHours(hours)} · ${maps} ${maps === 1 ? 'map' : 'maps'}`;
}
