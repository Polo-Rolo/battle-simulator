import { simulateBattle, type BattleResult } from './battle';
import { DEFAULT_ASSUMPTIONS, type Assumptions } from './assumptions';
import type { Side } from './types';

/** Small deterministic PRNG so a run can be reproduced from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Distribution {
  mean: number;
  /** Population standard deviation: how wide the outcome spread is. */
  sd: number;
  /** Standard error of the mean, i.e. how well this many runs pin the mean down. */
  stderr: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
}

export interface HistogramBucket {
  from: number;
  to: number;
  count: number;
  fraction: number;
}

/** One line in the run log, so a batch can be reviewed run by run rather than only in aggregate. */
export interface RunOutcome {
  run: number;
  winner: BattleResult['winner'];
  wipeout: BattleResult['wipeout'];
  attackerLosses: number;
  defenderLosses: number;
  killDeathRatio: number;
  roundsUsed: number;
}

export interface MonteCarloSummary {
  runs: number;
  seed: number;
  attackerWinRate: number;
  defenderWinRate: number;
  drawRate: number;
  attackerWipeRate: number;
  defenderWipeRate: number;
  attackerLosses: Distribution;
  defenderLosses: Distribution;
  killDeathRatio: Distribution;
  /** Shape of the kill/death spread, for a "how often does it land here" read. */
  killDeathHistogram: HistogramBucket[];
  outcomes: RunOutcome[];
  /** Representative runs: median, best and worst by kill/death. */
  median: BattleResult;
  best: BattleResult;
  worst: BattleResult;
}

function distribution(values: number[]): Distribution {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  return {
    mean,
    sd,
    stderr: sd / Math.sqrt(values.length),
    p10: at(0.1),
    p25: at(0.25),
    p50: at(0.5),
    p75: at(0.75),
    p90: at(0.9),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

export function histogram(values: number[], buckets = 12): HistogramBucket[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / buckets;
  if (width === 0) {
    return [{ from: min, to: max, count: values.length, fraction: 1 }];
  }
  const counts = new Array<number>(buckets).fill(0);
  for (const value of values) {
    const index = Math.min(buckets - 1, Math.floor((value - min) / width));
    counts[index] += 1;
  }
  return counts.map((count, index) => ({
    from: min + index * width,
    to: min + (index + 1) * width,
    count,
    fraction: count / values.length,
  }));
}

/**
 * Two-sided z test on the difference of means. With a few hundred runs the sampling distribution of
 * the mean is normal enough for this, and it answers the question the spread raises: is this
 * configuration actually better, or is the gap inside the noise?
 */
export function compareDistributions(
  a: Distribution,
  b: Distribution,
): { delta: number; z: number; significant: boolean } {
  const se = Math.sqrt(a.stderr ** 2 + b.stderr ** 2);
  const delta = a.mean - b.mean;
  const z = se === 0 ? 0 : delta / se;
  return { delta, z, significant: Math.abs(z) >= 1.96 };
}

/**
 * Paired version of the above, for when both batches were run with the same seed and therefore saw
 * the same dice. Differencing run by run cancels the shared luck, which is much more sensitive than
 * comparing two independent batches: a real gap shows up in a fraction of the runs.
 */
export function comparePaired(
  a: number[],
  b: number[],
): { delta: number; z: number; significant: boolean } {
  const n = Math.min(a.length, b.length);
  if (n === 0) return { delta: 0, z: 0, significant: false };
  const diffs = Array.from({ length: n }, (_, i) => a[i] - b[i]);
  const { mean, stderr } = distribution(diffs);
  const z = stderr === 0 ? 0 : mean / stderr;
  return { delta: mean, z, significant: Math.abs(z) >= 1.96 };
}

/**
 * How many runs it takes to know the mean to within `relativeMargin` at 95% confidence, given the
 * spread already observed. Undersampling a noisy matchup is the easiest way to pick the wrong
 * formation, so the UI can show this rather than leaving the run count to guesswork.
 */
export function runsForPrecision(dist: Distribution, relativeMargin = 0.01): number {
  if (dist.mean === 0 || dist.sd === 0) return 1;
  return Math.ceil((1.96 * dist.sd / (relativeMargin * Math.abs(dist.mean))) ** 2);
}

/**
 * Runs the same matchup many times over the uncertain terms - RNG skill procs and cavalry bypass -
 * and reports the spread. The configuration is held fixed; only the dice move, so the output is the
 * range of battles that configuration can produce rather than one arbitrary draw from it.
 */
export function runMonteCarlo(
  attacker: Side,
  defender: Side,
  runs = 500,
  assumptions: Partial<Assumptions> = {},
  seed = 1,
): MonteCarloSummary {
  const merged: Assumptions = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  runs = Math.max(1, Math.floor(runs));
  const random = mulberry32(seed);
  const results: BattleResult[] = [];

  for (let i = 0; i < runs; i += 1) {
    const jitterFor = () => 1 + (random() * 2 - 1) * merged.procVariance;
    results.push(
      simulateBattle(attacker, defender, {
        assumptions: merged,
        damageJitter: { attacker: jitterFor(), defender: jitterFor() },
        bypassSampler: () => (random() < merged.cavalryBypassChance ? 1 : 0),
      }),
    );
  }

  const ratioOf = (result: BattleResult) =>
    Number.isFinite(result.killDeathRatio) ? result.killDeathRatio : 0;
  const outcomes: RunOutcome[] = results.map((result, index) => ({
    run: index + 1,
    winner: result.winner,
    wipeout: result.wipeout,
    attackerLosses: result.attackerCasualties.total,
    defenderLosses: result.defenderCasualties.total,
    killDeathRatio: ratioOf(result),
    roundsUsed: result.roundsUsed,
  }));

  const byRatio = [...outcomes].sort((a, b) => a.killDeathRatio - b.killDeathRatio);
  const pick = (outcome: RunOutcome) => results[outcome.run - 1];

  return {
    runs,
    seed,
    attackerWinRate: outcomes.filter((o) => o.winner === 'attacker').length / runs,
    defenderWinRate: outcomes.filter((o) => o.winner === 'defender').length / runs,
    drawRate: outcomes.filter((o) => o.winner === 'draw').length / runs,
    attackerWipeRate: outcomes.filter((o) => o.wipeout === 'attacker').length / runs,
    defenderWipeRate: outcomes.filter((o) => o.wipeout === 'defender').length / runs,
    attackerLosses: distribution(outcomes.map((o) => o.attackerLosses)),
    defenderLosses: distribution(outcomes.map((o) => o.defenderLosses)),
    killDeathRatio: distribution(outcomes.map((o) => o.killDeathRatio)),
    killDeathHistogram: histogram(outcomes.map((o) => o.killDeathRatio)),
    outcomes,
    median: pick(byRatio[Math.floor(byRatio.length / 2)]),
    best: pick(byRatio[byRatio.length - 1]),
    worst: pick(byRatio[0]),
  };
}
