import { ASSUMPTION_NOTES, DEFAULT_ASSUMPTIONS, type Assumptions } from '../engine';
import { ConfidenceTag, NumberField } from './controls';

const STEPS: Record<keyof Assumptions, { step: number; min: number; max: number }> = {
  troopExponent: { step: 0.05, min: 0.2, max: 1.5 },
  intensity: { step: 0.05, min: 0.001, max: 5 },
  counterCoefficient: { step: 0.05, min: 0, max: 1 },
  cavalryBypassChance: { step: 0.05, min: 0, max: 1 },
  rounds: { step: 1, min: 1, max: 50 },
  procVariance: { step: 0.01, min: 0, max: 0.5 },
};

export function AssumptionsPanel(props: {
  assumptions: Assumptions;
  onChange: (assumptions: Assumptions) => void;
}) {
  return (
    <div>
      <p className="note">
        These are the parts of the engine the community has <em>not</em> pinned down. They are exposed rather than
        hidden: the counter-triangle magnitude, the cavalry bypass rate and the round structure are unpublished, so
        treat absolute casualty numbers as indicative and comparisons between two loadouts as the useful output. Fit
        them to your own battle reports in the calibration panel.
      </p>
      {ASSUMPTION_NOTES.map((note) => (
        <div className="assumption" key={note.key}>
          <NumberField
            label={note.label}
            value={props.assumptions[note.key]}
            step={STEPS[note.key].step}
            min={STEPS[note.key].min}
            max={STEPS[note.key].max}
            onChange={(value) => props.onChange({ ...props.assumptions, [note.key]: value })}
          />
          <div className="assumption-note">
            <ConfidenceTag confidence={note.confidence} />
            <span>{note.note}</span>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => props.onChange({ ...DEFAULT_ASSUMPTIONS })}>
        Reset to defaults
      </button>
    </div>
  );
}
