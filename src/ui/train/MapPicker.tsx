import { useMemo, useState } from 'react';
import type { MapSummary, Monster } from '../../data/types';
import { routeHref } from '../routes';

interface MapPickerProps {
  maps: MapSummary[];
  monsters: Map<number, Monster>;
  currentId: string;
}

const RESULT_LIMIT = 12;

export function MapPicker({ maps, monsters, currentId }: MapPickerProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    if (wanted.length < 2) return [];
    return maps
      .filter((map) => !map.instanced && map.id !== currentId)
      .filter((map) => `${map.name} ${map.street} ${map.spawnCounts.map(([id]) => monsters.get(id)?.name ?? '').join(' ')}`.toLowerCase().includes(wanted))
      .slice(0, RESULT_LIMIT);
  }, [query, maps, monsters, currentId]);
  return (
    <div className="map-picker">
      <label htmlFor="map-search" className="control-label">Pick another map</label>
      <input id="map-search" type="search" placeholder="Map or monster name, e.g. Ligator" value={query} onChange={(event) => setQuery(event.target.value)} />
      {results.length > 0 && (
        <ul className="map-results">
          {results.map((map) => (
            <li key={map.id}>
              <a href={routeHref({ page: 'train', mapId: map.id })} onClick={() => setQuery('')}>
                <b>{map.name}</b>
                <span>{map.street}: {map.spawnCounts.slice(0, 3).map(([id]) => `${monsters.get(id)?.name ?? '?'} (level ${monsters.get(id)?.level ?? '?'})`).join(', ')}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && results.length === 0 && <p className="hint">No maps match "{query}". Try a monster name instead.</p>}
    </div>
  );
}
