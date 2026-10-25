import type { MapDetail, Monster } from '../../data/types';
import { imageUrl, meowdbMonsterUrl } from '../../data/loadGameData';
import { formatPercent } from '../shared/format';

export const MONSTER_COLORS = ['#5AA9FF', '#FFB257', '#A6E05A', '#FF6B78', '#8B7BFF', '#F5C542', '#C9C4E6'];
const PADDING = 60;

interface SpawnAtlasProps {
  detail: MapDetail;
  mapName: string;
  monsters: Map<number, Monster>;
  hitChances: Map<number, number>;
}

export function SpawnAtlas({ detail, mapName, monsters, hitChances }: SpawnAtlasProps) {
  const counts = new Map<number, number>();
  for (const spawn of detail.spawns) counts.set(spawn.mobId, (counts.get(spawn.mobId) ?? 0) + 1);
  const order = [...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const color = (id: number) => MONSTER_COLORS[order.indexOf(id) % MONSTER_COLORS.length];
  const xs = [...detail.footholds.flatMap(([x1, , x2]) => [x1, x2]), ...detail.spawns.map((spawn) => spawn.x)];
  const ys = [...detail.footholds.flatMap(([, y1, , y2]) => [y1, y2]), ...detail.spawns.map((spawn) => spawn.y)];
  const left = Math.min(...xs) - PADDING;
  const top = Math.min(...ys) - PADDING * 2;
  const width = Math.max(...xs) - left + PADDING;
  const height = Math.max(...ys) - top + PADDING;
  const path = detail.footholds.map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`).join('');
  const ropes = detail.ropes.map(([x, y1, y2]) => `M${x} ${y1}L${x} ${y2}`).join('');
  return (
    <figure className="panel atlas">
      <svg viewBox={`${left} ${top} ${width} ${height}`} role="img" aria-label={`Layout of ${mapName}: platforms, ropes and ${detail.spawns.length} monster spawn points`}>
        <path className="platforms" d={path} />
        <path className="ropes" d={ropes} />
        {detail.spawns.map((spawn, index) => (
          <circle key={index} className="spawn" cx={spawn.x} cy={spawn.y - 24} r={22} fill={color(spawn.mobId)} />
        ))}
      </svg>
      <figcaption>
        <ul className="legend">
          {order.map((id) => {
            const monster = monsters.get(id);
            const chance = hitChances.get(id) ?? 0;
            return (
              <li key={id}>
                <i className="dot" style={{ background: color(id) }} />
                <a href={meowdbMonsterUrl(id)} target="_blank" rel="noreferrer" title={monster?.name}><img className="pixel sprite" src={imageUrl(`img/mobs/${id}/icon.png`)} alt={monster?.name ?? ''} /></a>
                <div>
                  <a className="legend-name" href={meowdbMonsterUrl(id)} target="_blank" rel="noreferrer">{monster?.name ?? `Monster ${id}`}</a>
                  <span>Level {monster?.level ?? '?'}, {counts.get(id)} spawn points. {chance >= 1 ? 'You hit it every time.' : `You hit it ${formatPercent(chance)} of the time.`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </figcaption>
    </figure>
  );
}
