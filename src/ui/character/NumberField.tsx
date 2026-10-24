import { useEffect, useState } from 'react';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  wide?: boolean;
  onChange: (value: number) => void;
}

export function NumberField({ id, label, value, min = 0, max = 99999, step = 1, wide = false, onChange }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const parsed = Number(text);
    const clean = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setText(String(clean));
    if (clean !== value) onChange(clean);
  };
  return (
    <div className="field" style={wide ? { gridColumn: 'span 2' } : undefined}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={text}
        onChange={(event) => setText(event.target.value)} onBlur={commit} />
    </div>
  );
}
