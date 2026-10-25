import { equipmentBySlot } from '../../character/gear';
import { imageUrl, meowdbItemUrl, type SiteData } from '../../data/loadGameData';

export function EquipmentList({ itemIds, site }: { itemIds: number[]; site: SiteData }) {
  const entries = equipmentBySlot(itemIds);
  if (!entries.length) return <p className="hint first">No equipment yet. Add an Equipment screenshot or use a guide build.</p>;
  return (
    <ul className="equipment">
      {entries.map(({ slot, itemId }) => {
        const name = site.items.get(itemId)?.name ?? `Item ${itemId}`;
        return (
          <li key={`${slot}-${itemId}`}>
            <a href={meowdbItemUrl(itemId, site.itemLinks)} target="_blank" rel="noreferrer">
              <span className="slot small"><img className="pixel" src={imageUrl(`img/items/${itemId}.png`)} alt="" /></span>
              <span className="muted">{slot}</span>
              <b>{name}</b>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
