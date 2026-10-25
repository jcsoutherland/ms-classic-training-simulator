import { useMemo, useState } from 'react';
import { isTrainingMap } from '../../data/gameData';
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
      .filter((map) => isTrainingMap(map) && map.id !== currentId)
      .filter((map) => `${map.name} ${map.street} ${map.spawnCounts.map(([id]) => monsters.get(id)?.name ?? '').join(' ')}`.toLowerCase().includes(wanted))
      .slice(0, RESULT_LIMIT);
  }, [query, maps, monsters, currentId]);
  return (
    <div className="map-picker">
      <label htmlFor="map-search" className="control-label">Pick another map</label>
      <input id="map-search" type="search" placeholder="Map or monster name" value={query} onChange={(event) => setQuery(event.target.value)} />
      {results.length > 0 && (
        <ul className="map-results">
          {results.map((map) => (
            <li key={map.id}>
              <a href={routeHref({ page: 'train', mapId: map.id })} onClick={() => setQuery('')}>
                <b><Highlighted text={map.name} query={query} /></b>
                <span><Highlighted text={`${map.street}: ${map.spawnCounts.map(([id]) => `${monsters.get(id)?.name ?? '?'} (level ${monsters.get(id)?.level ?? '?'})`).join(', ')}`} query={query} /></span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && results.length === 0 && <p className="hint">No maps match "{query}". Try a monster name instead.</p>}
    </div>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const wanted = query.trim();
  if (!wanted) return <>{text}</>;
  const pieces = text.split(new RegExp(`(${wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'));
  return <>{pieces.map((piece, index) => (index % 2 === 1 ? <mark key={index}>{piece}</mark> : piece))}</>;
}
