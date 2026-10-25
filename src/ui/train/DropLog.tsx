import { imageUrl, meowdbItemUrl } from '../../data/loadGameData';
import type { Item } from '../../data/types';
import type { RolledDrop } from '../../sim/drops';
import { formatNumber, formatPercent, rateText, rawRate } from '../shared/format';

interface DropLogProps {
  drops: RolledDrop[];
  hours: number;
  party: number;
  mesos: number;
  items: Map<number, Item>;
  itemLinks: Record<number, number>;
  missingTables: string[];
  totalKills: number;
  onRollAgain: () => void;
}

export function DropLog({ drops, hours, party, mesos, items, itemLinks, missingTables, totalKills, onRollAgain }: DropLogProps) {
  const share = (count: number) => Math.floor(count / party);
  const dropped = drops.filter((drop) => share(drop.count) > 0);
  const missed = drops.filter((drop) => share(drop.count) === 0);
  const nameOf = (itemId: number) => items.get(itemId)?.name ?? `Item ${itemId}`;
  return (
    <section className="loot" aria-labelledby="loot-heading">
      <div className="loot-head">
        <h2 id="loot-heading">What you'd pick up</h2>
        <button className="button gold" type="button" onClick={onRollAgain}>Roll again</button>
      </div>
      <ul className="slots">
        <li>
          <span className="slot">
            <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
              <circle cx="15" cy="15" r="12" fill="#F5C542" stroke="#9A6A00" strokeWidth="2.5" />
              <circle cx="15" cy="15" r="6" fill="none" stroke="#9A6A00" strokeWidth="2" />
            </svg>
          </span>
          <div><b className="num gold">{formatNumber(mesos)}</b><span>Mesos</span></div>
        </li>
        {dropped.map((drop) => (
          <li key={drop.itemId}>
            <ItemIcon itemId={drop.itemId} name={nameOf(drop.itemId)} href={meowdbItemUrl(drop.itemId, itemLinks)} />
            <div>
              <b className="num">{formatNumber(share(drop.count))}</b>
              <a href={meowdbItemUrl(drop.itemId, itemLinks)} target="_blank" rel="noreferrer">{nameOf(drop.itemId)}</a>
            </div>
          </li>
        ))}
      </ul>
      {missed.length > 0 && (
        <>
          <h3>Didn't drop this time</h3>
          <ul className="missed">
            {missed.map((drop) => (
              <li key={drop.itemId}>
                <ItemIcon itemId={drop.itemId} name={nameOf(drop.itemId)} href={meowdbItemUrl(drop.itemId, itemLinks)} small />
                <div>
                  <a href={meowdbItemUrl(drop.itemId, itemLinks)} target="_blank" rel="noreferrer">{nameOf(drop.itemId)}</a>
                  <small>{rateText(drop.expected / hours / party)} · {rawRate(drop.expected, totalKills)} per kill · {formatPercent(drop.chanceOfOne)} chance this session</small>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {missingTables.length > 0 && <p className="hint">No drop data yet for {missingTables.join(', ')}. Their mesos are still counted.</p>}
    </section>
  );
}

function ItemIcon({ itemId, name, href, small = false }: { itemId: number; name: string; href: string; small?: boolean }) {
  return (
    <a className={small ? 'slot small' : 'slot'} href={href} target="_blank" rel="noreferrer" title={name}>
      <img className="pixel" src={imageUrl(`img/items/${itemId}.png`)} alt={name} />
    </a>
  );
}
