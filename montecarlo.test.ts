import { describe, expect, it } from 'vitest';
import {
  compareDistributions,
  comparePaired,
  histogram,
  mulberry32,
  runMonteCarlo,
  runsForPrecision,
} from './montecarlo';
import { defaultSide } from './data/presets';
import type { Side } from './types';

describe('mulberry32', () => {
  it('is reproducible from a seed and stays in [0, 1)', () => {
    const first = Array.from({ length: 50 }, mulberry32(42));
    const again = Array.from({ length: 50 }, mulberry32(42));
    expect(first).toEqual(again);
    expect(Math.min(...first)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...first)).toBeLessThan(1);
  });

  it('gives different streams for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('runMonteCarlo', () => {
  it('is deterministic for a given seed and varies with the seed', () => {
    const run = (seed: number) => runMonteCarlo(defaultSide('A'), defaultSide('B'), 40, {}, seed);
    expect(run(7).attackerLosses.mean).toBeCloseTo(run(7).attackerLosses.mean, 10);
    expect(run(7).attackerLosses.mean).not.toBeCloseTo(run(8).attackerLosses.mean, 10);
  });

  it('reports rates that partition the outcomes', () => {
    const summary = runMonteCarlo(defaultSide('A'), defaultSide('B'), 40);
    expect(summary.runs).toBe(40);
    expect(summary.attackerWinRate + summary.defenderWinRate + summary.drawRate).toBeCloseTo(1);
  });

  it('orders the loss distribution percentiles', () => {
    const { attackerLosses } = runMonteCarlo(defaultSide('A'), defaultSide('B'), 60, { procVariance: 0.2 });
    expect(attackerLosses.min).toBeLessThanOrEqual(attackerLosses.p10);
    expect(attackerLosses.p10).toBeLessThanOrEqual(attackerLosses.p50);
    expect(attackerLosses.p50).toBeLessThanOrEqual(attackerLosses.p90);
    expect(attackerLosses.p90).toBeLessThanOrEqual(attackerLosses.max);
    expect(attackerLosses.max).toBeGreaterThan(attackerLosses.min);
  });

  it('collapses to the deterministic result when nothing is random', () => {
    const summary = runMonteCarlo(defaultSide('A'), defaultSide('B'), 10, {
      procVariance: 0,
      cavalryBypassChance: 0,
    });
    expect(summary.attackerLosses.min).toBeCloseTo(summary.attackerLosses.max, 6);
  });

  it('gives a decisive win rate to a much stronger attacker', () => {
    const attacker: Side = defaultSide('A');
    attacker.bonuses.all = { ...attacker.bonuses.all, attack: 400, lethality: 300 };
    const summary = runMonteCarlo(attacker, defaultSide('B'), 40);
    expect(summary.attackerWinRate).toBe(1);
    expect(summary.defenderWipeRate).toBeGreaterThan(0.5);
  });

  it('logs every run and picks best/median/worst from that log', () => {
    const summary = runMonteCarlo(defaultSide('A'), defaultSide('B'), 50, { procVariance: 0.2 }, 3);
    expect(summary.outcomes).toHaveLength(50);
    expect(summary.outcomes.map((o) => o.run)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
    const ratios = summary.outcomes.map((o) => o.killDeathRatio);
    expect(summary.best.killDeathRatio).toBeCloseTo(Math.max(...ratios), 10);
    expect(summary.worst.killDeathRatio).toBeCloseTo(Math.min(...ratios), 10);
    expect(summary.median.killDeathRatio).toBeCloseTo(summary.killDeathRatio.p50, 10);
    expect(summary.seed).toBe(3);
  });

  it('buckets the kill/death spread into a histogram covering every run', () => {
    const summary = runMonteCarlo(defaultSide('A'), defaultSide('B'), 80, { procVariance: 0.25 });
    const total = summary.killDeathHistogram.reduce((sum, bucket) => sum + bucket.count, 0);
    expect(total).toBe(80);
    expect(summary.killDeathHistogram[0].from).toBeCloseTo(summary.killDeathRatio.min, 10);
  });
});

describe('histogram', () => {
  it('collapses to a single bucket when every value is identical', () => {
    expect(histogram([2, 2, 2])).toEqual([{ from: 2, to: 2, count: 3, fraction: 1 }]);
  });

  it('puts the maximum in the last bucket rather than off the end', () => {
    const buckets = histogram([0, 1, 2, 3, 4], 4);
    expect(buckets).toHaveLength(4);
    expect(buckets[buckets.length - 1].count).toBe(2);
  });
});

describe('compareDistributions', () => {
  const dist = (mean: number, stderr: number) => ({
    mean,
    sd: stderr * 10,
    stderr,
    p10: mean,
    p25: mean,
    p50: mean,
    p75: mean,
    p90: mean,
    min: mean,
    max: mean,
  });

  it('calls a gap real only when it clears the combined standard error', () => {
    expect(compareDistributions(dist(1.5, 0.01), dist(1.4, 0.01)).significant).toBe(true);
    expect(compareDistributions(dist(1.5, 0.2), dist(1.4, 0.2)).significant).toBe(false);
  });

  it('signs the delta by direction', () => {
    expect(compareDistributions(dist(1.2, 0.01), dist(1.5, 0.01)).delta).toBeCloseTo(-0.3, 10);
  });
});

describe('comparePaired', () => {
  it('resolves a small consistent edge that an unpaired comparison would miss', () => {
    // Shared swings of +/-0.5 dwarf the constant 0.05 edge, which is exactly the case pairing is for.
    const shared = Array.from({ length: 200 }, (_, i) => 1 + 0.5 * Math.sin(i));
    const better = shared.map((value) => value + 0.05);
    expect(comparePaired(better, shared).delta).toBeCloseTo(0.05, 10);
    expect(comparePaired(better, shared).significant).toBe(true);
  });

  it('reports no difference between identical run series', () => {
    const values = Array.from({ length: 50 }, (_, i) => 1 + i / 100);
    expect(comparePaired(values, values)).toEqual({ delta: 0, z: 0, significant: false });
  });

  it('signs the delta by direction and tolerates an empty series', () => {
    expect(comparePaired([1, 1, 1], [2, 2, 2]).delta).toBeCloseTo(-1, 10);
    expect(comparePaired([], []).significant).toBe(false);
  });
});

describe('runsForPrecision', () => {
  it('scales with the square of the spread', () => {
    const dist = (sd: number) => ({
      mean: 1,
      sd,
      stderr: sd,
      p10: 1,
      p25: 1,
      p50: 1,
      p75: 1,
      p90: 1,
      min: 1,
      max: 1,
    });
    expect(runsForPrecision(dist(0.2), 0.01) / runsForPrecision(dist(0.1), 0.01)).toBeCloseTo(4, 1);
  });

  it('asks for a single run when there is nothing random', () => {
    const summary = runMonteCarlo(defaultSide('A'), defaultSide('B'), 5, {
      procVariance: 0,
      cavalryBypassChance: 0,
    });
    expect(runsForPrecision(summary.killDeathRatio)).toBe(1);
  });
});
