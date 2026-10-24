import { MAX_PARTY } from '../../sim/party';

interface PartyPickerProps {
  value: number;
  onChange: (members: number) => void;
}

export function PartyPicker({ value, onChange }: PartyPickerProps) {
  return (
    <div role="group" aria-label="Party size">
      <p className="control-label">Party size</p>
      <div className="pills">
        {Array.from({ length: MAX_PARTY }, (_, index) => index + 1).map((members) => (
          <button
            key={members}
            className="pill"
            type="button"
            aria-pressed={members === value}
            aria-label={members === 1 ? 'Solo' : `Party of ${members}`}
            onClick={() => onChange(members)}
          >
            {members === 1 ? 'Solo' : members}
          </button>
        ))}
      </div>
    </div>
  );
}
