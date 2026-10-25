import { useState } from 'react';
import type { CompareState } from './useCompare';

export function ComparePicker({ compare }: { compare: CompareState }) {
  const [open, setOpen] = useState(false);
  if (compare.compared) {
    return (
      <div className="compare-chip" role="group" aria-label="Comparing">
        <span>Comparing with <b>{compare.compared.name}</b></span>
        <button className="pill" type="button" aria-label="Stop comparing" onClick={() => compare.choose('')}>×</button>
      </div>
    );
  }
  if (!open) return <button className="button ghost" type="button" onClick={() => setOpen(true)}>Compare</button>;
  return (
    <div className="field compare-pick">
      <label htmlFor="compare-with">Compare with</label>
      <select id="compare-with" value="" onChange={(event) => { compare.choose(event.target.value); setOpen(false); }} onBlur={() => setOpen(false)} autoFocus>
        <option value="" disabled>Pick a character or job</option>
        {compare.savedChoices.length > 0 && (
          <optgroup label="Your characters">
            {compare.savedChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </optgroup>
        )}
        <optgroup label="Another job at your level">
          {compare.jobChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </optgroup>
      </select>
    </div>
  );
}
