import type { MapDetails } from '../data/gameData';
import type { MapDetail } from '../data/types';

const details = new Map<string, MapDetail>();

export async function loadMapDetails(dataUrl: string, ids: string[]): Promise<MapDetails> {
  const missing = ids.filter((id) => !details.has(id));
  await Promise.all(missing.map(async (id) => {
    const response = await fetch(`${dataUrl}maps/${id}.json`);
    if (!response.ok) throw new Error(`Couldn't load map ${id} (${response.status}).`);
    details.set(id, await response.json() as MapDetail);
  }));
  return (id) => {
    const detail = details.get(id);
    if (!detail) throw new Error(`Map ${id} is missing.`);
    return detail;
  };
}
