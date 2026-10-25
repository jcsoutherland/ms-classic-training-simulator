import type { CompareState } from './useCompare';

export function ComparePicker({ compare }: { compare: CompareState }) {
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
      </div>
    </div>
  );
}
