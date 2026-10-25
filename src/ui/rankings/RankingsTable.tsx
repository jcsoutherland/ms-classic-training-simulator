import { useState } from 'react';
import type { Item, Monster } from '../../data/types';
import { imageUrl, meowdbItemUrl, meowdbMonsterUrl } from '../../data/loadGameData';
import type { RankedMap } from '../../sim/rankMaps';
import { formatNumber, formatShortHours, rateText } from '../shared/format';
import { routeHref } from '../routes';

type SortKey = 'kills' | 'exp' | 'mesos' | 'goal';

export interface LikelyDrop {
  itemId: number;
  perHour: number;
}

interface RankingsTableProps {
  ranked: RankedMap[];
  monsters: Map<number, Monster>;
  items: Map<number, Item>;
  likelyEquipment: (entry: RankedMap) => LikelyDrop[];
  itemLinks: Record<number, number>;
  party: number;
  goalLevel: number;
  compact?: boolean;
  shared?: Set<string>;
}

const VALUE: Record<SortKey, (entry: RankedMap) => number> = {
  kills: (entry) => entry.simulation.killsPerHour,
  exp: (entry) => entry.simulation.expPerHour,
  mesos: (entry) => entry.simulation.mesosPerHour,
  goal: (entry) => entry.hoursToGoal,
};

export function RankingsTable({ ranked, monsters, items, likelyEquipment, itemLinks, party, goalLevel, compact = false, shared }: RankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('exp');
  const ascending = sortKey === 'goal';
  const rows = [...ranked].sort((a, b) => (ascending ? VALUE[sortKey](a) - VALUE[sortKey](b) : VALUE[sortKey](b) - VALUE[sortKey](a)));
  const each = party > 1 ? ' each' : '';
  const allColumns: [SortKey, string][] = [['kills', 'Kills/h'], ['exp', `EXP${each}/h`], ['mesos', `Mesos${each}/h`], ['goal', `Hours to ${goalLevel}`]];
  const columns = compact ? allColumns.filter(([key]) => key !== 'goal') : allColumns;
  return (
    <div className="board">
      <table>
        <caption className="visually-hidden">Maps ranked for this character</caption>
        <thead>
          <tr>
            <th scope="col"><span className="plain">#</span></th>
            <th scope="col"><span className="plain">Map and main monster</span></th>
            {columns.map(([key, label]) => (
              <th key={key} scope="col" className="n" aria-sort={key === sortKey ? (ascending ? 'ascending' : 'descending') : 'none'}>
                <button className="sort" type="button" onClick={() => setSortKey(key)}>{label}{key === sortKey && <span aria-hidden="true">{ascending ? ' ▲' : ' ▼'}</span>}</button>
              </th>
            ))}
            {!compact && <th scope="col"><span className="plain">Equipment drops</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry, index) => {
            const main = monsters.get(entry.simulation.mainTarget ?? entry.map.spawnCounts[0][0]);
            return (
              <tr key={entry.map.id} className={shared?.has(entry.map.id) ? 'shared' : undefined}>
                <td className="rank">{index + 1}</td>
                <td className="map">
                  <a href={routeHref({ page: 'train', mapId: entry.map.id })}>{entry.map.name}</a>
                  {main && (
                    <div className="mobs">
                      <a href={meowdbMonsterUrl(main.id)} target="_blank" rel="noreferrer" title={main.name}><img className="pixel" src={imageUrl(`img/mobs/${main.id}/icon.png`)} alt={main.name} /></a>
                      <span>{main.name}, level {main.level}</span>
                    </div>
                  )}
                </td>
                {columns.map(([key]) => (
                  <td key={key} className={key === sortKey ? 'n on' : 'n'}>{key === 'goal' ? formatShortHours(entry.hoursToGoal) : formatNumber(VALUE[key](entry))}</td>
                ))}
                {!compact && (
                  <td>
                    <div className="drops">
                      {likelyEquipment(entry).map((drop) => {
                        const name = items.get(drop.itemId)?.name ?? `Item ${drop.itemId}`;
                        const tip = `${name}: ${rateText(drop.perHour).toLowerCase()}`;
                        return <a key={drop.itemId} href={meowdbItemUrl(drop.itemId, itemLinks)} target="_blank" rel="noreferrer" title={tip}><img className="pixel" src={imageUrl(`img/items/${drop.itemId}.png`)} alt={tip} /></a>;
                      })}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
