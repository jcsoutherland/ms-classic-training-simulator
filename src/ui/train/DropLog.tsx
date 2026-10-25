import { imageUrl, meowdbItemUrl } from '../../data/loadGameData';
import type { Item } from '../../data/types';
import type { RolledDrop } from '../../sim/drops';
import { formatNumber, formatPercent, rateText } from '../shared/format';

const RARE_CHANCE_PER_KILL = 0.001;

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
  const isRare = (drop: RolledDrop) => totalKills > 0 && drop.expected / totalKills < RARE_CHANCE_PER_KILL;
  return (
    <section className="loot" aria-labelledby="loot-heading">
      <div className="loot-head">
        <div>
          <h2 id="loot-heading">What you'd pick up</h2>
          <p className="hint">{party > 1 ? `Your share of one possible session, split evenly with ${party - 1} other ${party === 2 ? 'player' : 'players'}.` : 'One possible session. Rare finds are outlined in gold.'}</p>
          <p className="hint">Drop rates come from osmlib, which uses older game data, so they may not match Classic exactly.</p>
        </div>
        <button className="button gold" type="button" onClick={onRollAgain}>Roll again</button>
      </div>
      <ul className="slots">
        <li>
          <span className="slot">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <circle cx="15" cy="15" r="12" fill="#F5C542" stroke="#9A6A00" strokeWidth="2.5" />
              <circle cx="15" cy="15" r="6" fill="none" stroke="#9A6A00" strokeWidth="2" />
            </svg>
          </span>
          <div><b className="num gold">{formatNumber(mesos)}</b><span>Mesos</span><small>Always the average, never rolled</small></div>
        </li>
        {dropped.map((drop) => (
          <li key={drop.itemId} className={isRare(drop) ? 'rare' : undefined}>
            <span className="slot"><img className="pixel" src={imageUrl(`img/items/${drop.itemId}.png`)} alt="" /></span>
            <div>
              <b className="num">{formatNumber(share(drop.count))}</b>
              <a href={meowdbItemUrl(drop.itemId, itemLinks)} target="_blank" rel="noreferrer">{items.get(drop.itemId)?.name ?? `Item ${drop.itemId}`}</a>
              <small>{rateText(drop.expected / hours / party)}</small>
            </div>
          </li>
        ))}
      </ul>
      {missed.length > 0 && (
        <>
          <h3>Didn't drop this time</h3>
          <p className="hint">Rare items that could still turn up. Roll again to see another possible session.</p>
          <ul className="missed">
            {missed.map((drop) => (
              <li key={drop.itemId}>
                <span className="slot small"><img className="pixel" src={imageUrl(`img/items/${drop.itemId}.png`)} alt="" /></span>
                <div>
                  <a href={meowdbItemUrl(drop.itemId, itemLinks)} target="_blank" rel="noreferrer">{items.get(drop.itemId)?.name ?? `Item ${drop.itemId}`}</a>
                  <small>{rateText(drop.expected / hours / party)}, {formatPercent(drop.chanceOfOne)} chance this session</small>
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
