import { useState } from 'react';
import {
  calibrate,
  type Assumptions,
  type CalibrationCase,
  type CalibrationResult,
  type CasualtyPolicy,
  type CasualtyTarget,
  type Side,
} from '../engine';
import { NumberField } from './controls';
import { formatNumber, formatPercent, newId } from './model';

export interface StoredCase extends CalibrationCase {
  label: string;
}

/**
 * Fits the unknown constants to battle reports. This is the honest route to accuracy: rather than
 * asserting a counter-triangle magnitude nobody has published, feed in fights whose outcome you
 * know and let the numbers come out.
 */
export function CalibrationPanel(props: {
  attacker: Side;
  defender: Side;
  /** The casualty split chosen in Result, used to compare against dead-only or dead+infirmary reports. */
  policy: CasualtyPolicy;
  assumptions: Assumptions;
  onApply: (assumptions: Assumptions) => void;
  /** Held by the app so an imported battle report can add a case directly. */
  cases: StoredCase[];
  onCasesChange: (cases: StoredCase[]) => void;
}) {
  const { cases, onCasesChange: setCases } = props;
  const [attackerLosses, setAttackerLosses] = useState(0);
  const [defenderLosses, setDefenderLosses] = useState(0);
  const [target, setTarget] = useState<CasualtyTarget>('deadAndInfirmary');
  const [result, setResult] = useState<CalibrationResult | null>(null);

  const addCase = () => {
    setCases([
      ...cases,
      {
        id: newId('case'),
        label: `${props.attacker.label} vs ${props.defender.label}`,
        attacker: structuredClone(props.attacker),
        defender: structuredClone(props.defender),
        observed: { attackerLosses, defenderLosses, target },
        policy: props.policy,
      },
    ]);
    setResult(null);
  };

  return (
    <div>
      <p className="note">
        Set both sides up exactly as they were in a real fight, enter the casualties the game reported, and add it as a
        case. With a handful of cases the fit is worth trusting for the kind of fight they came from; with one it is
        just an anchor. The report splits casualties three ways and they mean different things - only Losses is
        permanent, the infirmary heals and the lightly injured recover once the squad is home - so say which rows your
        numbers add up.
      </p>
      <label className="field">
        <span className="field-label">Numbers below cover</span>
        <select value={target} onChange={(event) => setTarget(event.target.value as CasualtyTarget)}>
          <option value="dead">Losses only</option>
          <option value="deadAndInfirmary">Losses + injured</option>
          <option value="all">Losses + injured + lightly injured</option>
        </select>
      </label>
      <div className="row">
        <NumberField
          label={`${props.attacker.label} casualties`}
          value={attackerLosses}
          step={100}
          min={0}
          onChange={setAttackerLosses}
        />
        <NumberField
          label={`${props.defender.label} casualties`}
          value={defenderLosses}
          step={100}
          min={0}
          onChange={setDefenderLosses}
        />
        <button type="button" onClick={addCase} disabled={attackerLosses <= 0 && defenderLosses <= 0}>
          Add battle report
        </button>
      </div>

      {cases.length > 0 ? (
        <table className="result-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Observed attacker casualties</th>
              <th>Observed defender casualties</th>
              <th>Rows</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.id}>
                <td>{item.label}</td>
                <td>{formatNumber(item.observed.attackerLosses)}</td>
                <td>{formatNumber(item.observed.defenderLosses)}</td>
                <td>{item.observed.target ?? 'all'}</td>
                <td>
                  <button
                    type="button"
                    className="ghost"
                    aria-label={`Remove ${item.label}`}
                    onClick={() => setCases(cases.filter((other) => other.id !== item.id))}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <button
        type="button"
        className="primary"
        disabled={cases.length === 0}
        onClick={() => setResult(calibrate(cases, props.assumptions, 10))}
      >
        Fit assumptions to {cases.length} report{cases.length === 1 ? '' : 's'}
      </button>

      {result ? (
        <div className="calibration-result">
          <p>
            Mean error <strong>{formatPercent(result.meanRelativeError)}</strong> after {result.evaluations} evaluations.
          </p>
          <table className="result-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Fitted</th>
              </tr>
            </thead>
            <tbody>
              {(['intensity', 'troopExponent', 'counterCoefficient', 'cavalryBypassChance'] as const).map((key) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{result.assumptions[key].toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="result-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Predicted attacker</th>
                <th>Error</th>
                <th>Predicted defender</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {result.residuals.map((residual) => (
                <tr key={residual.id}>
                  <td>{cases.find((item) => item.id === residual.id)?.label ?? residual.id}</td>
                  <td>{formatNumber(residual.predictedAttackerLosses)}</td>
                  <td>{formatPercent(residual.attackerError)}</td>
                  <td>{formatNumber(residual.predictedDefenderLosses)}</td>
                  <td>{formatPercent(residual.defenderError)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="primary" onClick={() => props.onApply(result.assumptions)}>
            Use these assumptions
          </button>
        </div>
      ) : null}
    </div>
  );
}
