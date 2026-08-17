import type { ReactNode } from 'react';

export function NumberField(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  title?: string;
  disabled?: boolean;
}) {
  const { label, value, onChange, step = 1, min, max, suffix, title, disabled } = props;
  return (
    <label className="field" title={title}>
      <span className="field-label">
        {label}
        {suffix ? <em>{suffix}</em> : null}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
      />
    </label>
  );
}

export function SelectField<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <select value={props.value} onChange={(event) => props.onChange(event.target.value as T)}>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section(props: { title: string; note?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{props.title}</h2>
        {props.actions}
      </header>
      {props.note ? <p className="note">{props.note}</p> : null}
      {props.children}
    </section>
  );
}

export function Stat(props: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className={`stat stat-${props.tone ?? 'neutral'}`} title={props.hint}>
      <span className="stat-label">{props.label}</span>
      <strong className="stat-value">{props.value}</strong>
    </div>
  );
}

export function ConfidenceTag(props: { confidence: 'datamined' | 'community-tested' | 'unknown' }) {
  return <span className={`tag tag-${props.confidence}`}>{props.confidence}</span>;
}
