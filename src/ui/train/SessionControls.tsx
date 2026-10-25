import type { ReactNode } from 'react';
import { MAX_LEVEL } from '../../sim/exp';
import { MAX_HOURS, MIN_HOURS } from '../../sim/session';
import { PartyPicker } from '../shared/PartyPicker';

export interface SessionInputs {
  mode: 'hours' | 'goal';
  hoursText: string;
  goalText: string;
  expText: string;
  party: number;
}

interface SessionControlsProps {
  inputs: SessionInputs;
  level: number;
  note: string;
  onChange: (inputs: SessionInputs) => void;
  onTidy: () => void;
  extra?: ReactNode;
}

export function SessionControls({ inputs, level, note, onChange, onTidy, extra }: SessionControlsProps) {
  const change = (patch: Partial<SessionInputs>) => onChange({ ...inputs, ...patch });
  return (
    <section className="panel session" aria-label="How long and with whom">
      <div className="session-row">
        <div role="group" aria-label="Train for">
          <p className="control-label">Train for</p>
          <div className="pills">
            <button className="pill" type="button" aria-pressed={inputs.mode === 'hours'} onClick={() => change({ mode: 'hours' })}>A number of hours</button>
            <button className="pill" type="button" aria-pressed={inputs.mode === 'goal'} onClick={() => change({ mode: 'goal' })}>Until a level</button>
          </div>
        </div>
        {inputs.mode === 'hours' ? (
          <div className="field compact">
            <label htmlFor="hours">Hours</label>
            <input id="hours" type="number" inputMode="decimal" min={MIN_HOURS} max={MAX_HOURS} step={0.5} value={inputs.hoursText}
              onChange={(event) => change({ hoursText: event.target.value })} onBlur={onTidy} />
          </div>
        ) : (
          <>
            <div className="field compact">
              <label htmlFor="goal">Goal level</label>
              <input id="goal" type="number" inputMode="numeric" min={level + 1} max={MAX_LEVEL} step={1} value={inputs.goalText}
                onChange={(event) => change({ goalText: event.target.value })} onBlur={onTidy} />
            </div>
            <div className="field compact">
              <label htmlFor="exp-percent">Current EXP %</label>
              <input id="exp-percent" type="number" inputMode="decimal" min={0} max={99.9} step={0.1} value={inputs.expText}
                onChange={(event) => change({ expText: event.target.value })} onBlur={onTidy} />
            </div>
          </>
        )}
        <PartyPicker value={inputs.party} onChange={(party) => change({ party })} />
        {extra}
      </div>
      {note && <p className="session-note">{note}</p>}
    </section>
  );
}
