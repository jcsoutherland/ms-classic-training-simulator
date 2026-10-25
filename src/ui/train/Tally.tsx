import type { Session } from '../../sim/session';
import { formatNumber } from '../shared/format';

export interface ComparedSession {
  name: string;
  session: Session;
}

interface TallyProps {
  session: Session;
  party: number;
  startLevel: number;
  compared?: ComparedSession;
}

export function Tally({ session, party, startLevel, compared }: TallyProps) {
  const { reached } = session;
  const percent = Math.min(100, Math.max(0, reached.percent));
  const levelText = reached.level === startLevel
    ? `${Math.floor(percent)}% of the way to level ${startLevel + 1}`
    : `Level ${startLevel} to ${reached.level}, plus ${Math.floor(percent)}% toward ${reached.level + 1}`;
  const each = party > 1 ? ' for each of you' : '';
  return (
    <dl className="tally">
      <div className="panel">
        <dt>Monsters defeated</dt>
        <dd className="num big">{formatNumber(session.kills)}</dd>
        <dd className="per">About {formatNumber(session.kills / session.hours)} an hour{party > 1 ? ' for the party' : ''}</dd>
        {compared && <Versus name={compared.name} theirs={compared.session.kills} yours={session.kills} />}
      </div>
      <div className="panel">
        <dt>EXP{each}</dt>
        <dd className="num big exp">{formatNumber(session.exp)}</dd>
        <dd>
          <div className="gauge" role="img" aria-label={levelText}><i style={{ width: `${percent}%` }} /></div>
        </dd>
        <dd className="per">{levelText}</dd>
        {compared && <Versus name={compared.name} theirs={compared.session.exp} yours={session.exp} />}
      </div>
      <div className="panel">
        <dt>Mesos{each}</dt>
        <dd className="num big gold">{formatNumber(session.mesos)}</dd>
        <dd className="per">About {formatNumber(session.mesos / session.hours)} an hour</dd>
        {compared && <Versus name={compared.name} theirs={compared.session.mesos} yours={session.mesos} />}
      </div>
    </dl>
  );
}

function Versus({ name, theirs, yours }: { name: string; theirs: number; yours: number }) {
  const difference = yours > 0 ? Math.round((theirs / yours - 1) * 100) : 0;
  const sign = difference > 0 ? '+' : '';
  return <dd className="versus num">{name} {formatNumber(theirs)} ({sign}{difference}%)</dd>;
}
