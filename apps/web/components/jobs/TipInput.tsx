'use client';

const QUICK_TIPS = [20, 40, 60];

export function TipInput({ id, value, onChange, label = 'Tip amount in dollars' }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="row">
      <input
        id={id} type="number" inputMode="decimal" min={0} max={10000} step="0.01" placeholder="0"
        style={{ width: 96 }} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      />
      {QUICK_TIPS.map((v) => (
        <button
          key={v} type="button" className="toggle" aria-pressed={value === String(v)}
          onClick={() => onChange(String(v))}
        >
          ${v}
        </button>
      ))}
    </div>
  );
}
