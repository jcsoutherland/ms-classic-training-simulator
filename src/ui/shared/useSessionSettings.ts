import { MAX_LEVEL } from '../../sim/exp';
import { useStoredState } from './storedState';

export type SessionMode = 'hours' | 'goal';

export interface SessionSettings {
  mode: SessionMode;
  hoursText: string;
  goalText: string;
  party: number;
  setMode: (mode: SessionMode) => void;
  setHoursText: (text: string) => void;
  setGoalText: (text: string) => void;
  setParty: (party: number) => void;
}

export function useSessionSettings(): SessionSettings {
  const [mode, setMode] = useStoredState('session-mode', 'hours');
  const [hoursText, setHoursText] = useStoredState('hours', '1');
  const [goalText, setGoalText] = useStoredState('goal-level', '');
  const [partyText, setPartyText] = useStoredState('party', '1');
  return {
    mode: mode === 'goal' ? 'goal' : 'hours',
    hoursText,
    goalText,
    party: Math.min(6, Math.max(1, Math.round(Number(partyText)) || 1)),
    setMode,
    setHoursText,
    setGoalText,
    setParty: (party) => setPartyText(String(party)),
  };
}

export function goalLevelFor(goalText: string, level: number): number {
  const typed = Math.round(Number(goalText));
  const goal = Number.isFinite(typed) && typed > 0 ? typed : level + 5;
  return Math.min(MAX_LEVEL, Math.max(level + 1, goal));
}
