import { useState } from 'react';
import { useSite } from '../SiteContext';
import { BuildDialog } from './BuildDialog';
import type { CompareState } from './useCompare';

export function ComparePicker({ compare }: { compare: CompareState }) {
  const { site } = useSite();
  const [viewing, setViewing] = useState(false);
  return (
    <div className="field compare-pick">
      <label htmlFor="compare-with">Compare</label>
      <div className="compare-row">
        <select id="compare-with" value={compare.choice} onChange={(event) => compare.choose(event.target.value)}>
          <option value="">No one</option>
          {compare.savedChoices.length > 0 && (
            <optgroup label="Your characters">
              {compare.savedChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            </optgroup>
          )}
          <optgroup label="Jobs at your level">
            {compare.jobChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </optgroup>
        </select>
        <button className="button ghost" type="button" style={{ visibility: compare.compared ? 'visible' : 'hidden' }} onClick={() => setViewing(true)}>View</button>
      </div>
      <BuildDialog character={viewing ? compare.compared : null} site={site} onClose={() => setViewing(false)} />
    </div>
  );
}
