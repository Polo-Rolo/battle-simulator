import { useState } from 'react';
import {
  runsForPrecision,
  type BattleResult,
  type ConfigurationVerdict,
  type Distribution,
  type HistogramBucket,
  type MonteCarloSummary,
} from '../engine';
import { NumberField, Stat } from './controls';
import { formatNumber, formatPercent } from './model';

function Histogram(props: { buckets: HistogramBucket[]; label: string }) {
  const peak = Math.max(...props.buckets.map((bucket) => bucket.fraction));
  return (
    <div className="histogram">
      <h4>{props.label}</h4>
      {props.buckets.map((bucket) => (
        <div className="histogram-row" key={bucket.from}>
          <span className="histogram-bin">
            {bucket.from.toFixed(2)}&ndash;{bucket.to.toFixed(2)}
          </span>
          <span className="histogram-bar">
            <span style={{ width: `${peak === 0 ? 0 : (bucket.fraction / peak) * 100}%` }} />
          </span>
          <span className="histogram-count">
            {formatNumber(bucket.count)} ({formatPercent(bucket.fraction)})
          </span>
        </div>
      ))}
    </div>
  );
}

function DistributionRow(props: { label: string; dist: Distribution; digits?: number }) {
  const fmt = (value: number) =>
    props.digits === undefined ? formatNumber(value) : value.toFixed(props.digits);
  return (
    <tr>
      <td>{props.label}</td>
      <td>{fmt(props.dist.p10)}</td>
      <td>{fmt(props.dist.p25)}</td>
      <td>{fmt(props.dist.p50)}</td>
      <td>{fmt(props.dist.p75)}</td>
      <td>{fmt(props.dist.p90)}</td>
      <td>
        {fmt(props.dist.mean)} &plusmn; {fmt(1.96 * props.dist.stderr)}
      </td>
      <td>{fmt(props.dist.sd)}</td>
    </tr>
  );
}

function RunSummary(props: { label: string; result: BattleResult; tone?: 'good' | 'bad' | 'neutral' }) {
  const { result } = props;
  return (
    <Stat
      label={props.label}
      value={`${result.killDeathRatio.toFixed(2)} K/D`}
      tone={props.tone}
      hint={`Lost ${formatNumber(result.attackerCasualties.total)} (${formatPercent(
        result.attackerCasualties.fraction,
      )}), killed ${formatNumber(result.defenderCasualties.total)} (${formatPercent(
        result.defenderCasualties.fraction,
      )}) in ${result.roundsUsed} rounds`}
    />
  );
}

export function SimulationsPanel(props: {
  summary: MonteCarloSummary | null;
  runs: number;
  onRunsChange: (runs: number) => void;
  seed: number;
  onSeedChange: (seed: number) => void;
  onRun: () => void;
  comparison: ConfigurationVerdict[] | null;
  candidates: { id: string; label: string }[];
  selectedCandidates: string[];
  onToggleCandidate: (id: string) => void;
  onCompare: () => void;
}) {
  const { summary, comparison } = props;
  const [showLog, setShowLog] = useState(false);
  const needed = summary ? runsForPrecision(summary.killDeathRatio, 0.01) : 0;

  return (
    <div className="simulations">
      <p className="note">
        Both sides stay exactly as configured; only the dice move &mdash; skill procs and cavalry bypass. So this is the
        range of battles one configuration can produce, and the mean is only as trustworthy as the sample behind it.
      </p>
      <div className="row">
        <NumberField label="Runs" value={props.runs} step={100} min={1} max={20000} onChange={props.onRunsChange} />
        <NumberField
          label="Seed"
          value={props.seed}
          step={1}
          min={0}
          onChange={props.onSeedChange}
          title="Same seed and same inputs reproduce the same batch exactly, so a result can be shared and checked."
        />
        <button type="button" className="primary" onClick={props.onRun}>
          Run {formatNumber(props.runs)} simulations
        </button>
      </div>

      {summary ? (
        <>
          <div className="stat-row">
            <Stat label="Attacker wins" value={formatPercent(summary.attackerWinRate)} tone="good" />
            <Stat label="Defender wins" value={formatPercent(summary.defenderWinRate)} tone="bad" />
            <Stat label="Draws" value={formatPercent(summary.drawRate)} />
            <Stat label="Attacker wiped" value={formatPercent(summary.attackerWipeRate)} />
            <Stat label="Defender wiped" value={formatPercent(summary.defenderWipeRate)} />
          </div>

          <table className="result-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>p10</th>
                <th>p25</th>
                <th>median</th>
                <th>p75</th>
                <th>p90</th>
                <th>mean (95% CI)</th>
                <th>spread</th>
              </tr>
            </thead>
            <tbody>
              <DistributionRow label="Attacker losses" dist={summary.attackerLosses} />
              <DistributionRow label="Defender losses" dist={summary.defenderLosses} />
              <DistributionRow label="Kill / death" dist={summary.killDeathRatio} digits={2} />
            </tbody>
          </table>
          <p className="note">
            {needed <= summary.runs
              ? `${formatNumber(summary.runs)} runs pin mean kill/death to better than ±1%; this sample is large enough to
                 compare configurations on.`
              : `${formatNumber(summary.runs)} runs only pin mean kill/death to ±${formatPercent(
                  (1.96 * summary.killDeathRatio.stderr) / Math.max(summary.killDeathRatio.mean, 1e-9),
                )}. Use ${formatNumber(needed)} runs for ±1%, or treat gaps smaller than that as noise.`}
          </p>

          <div className="two-col">
            <Histogram buckets={summary.killDeathHistogram} label="Kill/death spread" />
            <div>
              <h4>Representative battles</h4>
              <div className="stat-row">
                <RunSummary label="Best case" result={summary.best} tone="good" />
                <RunSummary label="Typical (median)" result={summary.median} />
                <RunSummary label="Worst case" result={summary.worst} tone="bad" />
              </div>
              <p className="note">
                Plan against the worst case, not the mean: the median tells you what usually happens, the p10 tail tells
                you what you can afford to lose when it doesn&apos;t.
              </p>
              <button type="button" onClick={() => setShowLog(!showLog)}>
                {showLog ? 'Hide' : 'Show'} run log
              </button>
            </div>
          </div>

          {showLog ? (
            <div className="run-log">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Outcome</th>
                    <th>Attacker lost</th>
                    <th>Defender lost</th>
                    <th>K/D</th>
                    <th>Rounds</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.outcomes.map((outcome) => (
                    <tr key={outcome.run}>
                      <td>{outcome.run}</td>
                      <td>{outcome.wipeout ? `${outcome.winner} (wipe)` : outcome.winner}</td>
                      <td>{formatNumber(outcome.attackerLosses)}</td>
                      <td>{formatNumber(outcome.defenderLosses)}</td>
                      <td>{outcome.killDeathRatio.toFixed(2)}</td>
                      <td>{outcome.roundsUsed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      <h3>Compare configurations</h3>
      <p className="note">
        Runs the same batch for each configuration against the current defender and ranks them by mean kill/death. Every
        configuration faces the same dice in the same order, so the gap against the baseline is measured run by run -
        shared luck cancels out and a genuine edge shows up in far fewer runs. The current attacker is the baseline;
        saved scenarios are the alternatives, so save a loadout for every option you want to weigh up.
      </p>
      <div className="hero-pool">
        {props.candidates.map((candidate) => (
          <label className="checkbox" key={candidate.id}>
            <input
              type="checkbox"
              checked={props.selectedCandidates.includes(candidate.id)}
              onChange={() => props.onToggleCandidate(candidate.id)}
            />
            {candidate.label}
          </label>
        ))}
      </div>
      <button type="button" className="primary" onClick={props.onCompare} disabled={props.candidates.length === 0}>
        Compare {formatNumber(props.selectedCandidates.length + 1)} configurations &times; {formatNumber(props.runs)} runs
      </button>

      {comparison ? (
        <table className="result-table">
          <thead>
            <tr>
              <th>Configuration</th>
              <th>Wins</th>
              <th>Mean K/D (95% CI)</th>
              <th>median</th>
              <th>p10</th>
              <th>Mean attacker losses</th>
              <th>vs baseline</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((verdict) => (
              <tr key={verdict.id}>
                <td>{verdict.label}</td>
                <td>{formatPercent(verdict.summary.attackerWinRate)}</td>
                <td>
                  {verdict.summary.killDeathRatio.mean.toFixed(2)} &plusmn;{' '}
                  {(1.96 * verdict.summary.killDeathRatio.stderr).toFixed(2)}
                </td>
                <td>{verdict.summary.killDeathRatio.p50.toFixed(2)}</td>
                <td>{verdict.summary.killDeathRatio.p10.toFixed(2)}</td>
                <td>{formatNumber(verdict.summary.attackerLosses.mean)}</td>
                <td>
                  {verdict.vsBaseline === null
                    ? 'baseline'
                    : `${verdict.vsBaseline.delta >= 0 ? '+' : ''}${verdict.vsBaseline.delta.toFixed(2)} ${
                        verdict.vsBaseline.significant ? '(real)' : '(within noise)'
                      }`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
