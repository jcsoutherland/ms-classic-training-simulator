import { useState } from 'react';
import type { Monster } from '../../data/types';
import { imageUrl } from '../../data/loadGameData';
import type { RankedMap } from '../../sim/rankMaps';
import { formatNumber, formatShortHours } from '../shared/format';
import { routeHref } from '../routes';

type SortKey = 'kills' | 'exp' | 'mesos' | 'goal';

interface RankingsTableProps {
  ranked: RankedMap[];
  monsters: Map<number, Monster>;
  dropIcons: (mapId: string) => number[];
  party: number;
  goalLevel: number;
}

const VALUE: Record<SortKey, (entry: RankedMap) => number> = {
  kills: (entry) => entry.simulation.killsPerHour,
  exp: (entry) => entry.simulation.expPerHour,
  mesos: (entry) => entry.simulation.mesosPerHour,
  goal: (entry) => entry.hoursToGoal,
};

export function RankingsTable({ ranked, monsters, dropIcons, party, goalLevel }: RankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('exp');
  const ascending = sortKey === 'goal';
  const rows = [...ranked].sort((a, b) => (ascending ? VALUE[sortKey](a) - VALUE[sortKey](b) : VALUE[sortKey](b) - VALUE[sortKey](a)));
  const each = party > 1 ? ' each' : '';
  const columns: [SortKey, string][] = [['kills', 'Kills an hour'], ['exp', `EXP${each} an hour`], ['mesos', `Mesos${each} an hour`], ['goal', `Time to level ${goalLevel}`]];
  return (
    <div className="board">
      <table>
        <caption className="visually-hidden">Maps ranked for your character</caption>
        <thead>
          <tr>
            <th scope="col"><span className="plain">Rank</span></th>
            <th scope="col"><span className="plain">Map and monsters</span></th>
            {columns.map(([key, label]) => (
              <th key={key} scope="col" className="n" aria-sort={key === sortKey ? (ascending ? 'ascending' : 'descending') : 'none'}>
                <button className="sort" type="button" onClick={() => setSortKey(key)}>{label}{key === sortKey && <span aria-hidden="true">{ascending ? ' ▲' : ' ▼'}</span>}</button>
              </th>
            ))}
            <th scope="col"><span className="plain">Possible drops</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry, index) => (
            <tr key={entry.map.id}>
              <td className="rank">{index + 1}</td>
              <td className="map">
                <a href={routeHref({ page: 'train', mapId: entry.map.id })}>{entry.map.name}</a>
                <div className="mobs">
                  {entry.map.spawnCounts.slice(0, 3).map(([id]) => <img key={id} className="pixel" src={imageUrl(`img/mobs/${id}/icon.png`)} alt={monsters.get(id)?.name ?? ''} />)}
                  <span>{monsters.get(entry.map.spawnCounts[0][0])?.name}, level {monsters.get(entry.map.spawnCounts[0][0])?.level}</span>
                </div>
              </td>
              {columns.map(([key]) => (
                <td key={key} className={key === sortKey ? 'n on' : 'n'}>{key === 'goal' ? formatShortHours(entry.hoursToGoal) : formatNumber(VALUE[key](entry))}</td>
              ))}
              <td><div className="drops">{dropIcons(entry.map.id).map((id) => <span key={id}><img className="pixel" src={imageUrl(`img/items/${id}.png`)} alt="" /></span>)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
