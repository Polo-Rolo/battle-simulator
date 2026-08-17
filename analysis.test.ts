import { describe, expect, it } from 'vitest';
import { compareConfigurations, optimiseJoiners, sweepFormations } from './analysis';
import { defaultSide } from './data/presets';
import { countsFromRatio } from './army';
import type { Side, TroopType } from './types';

function withRatio(side: Side, ratio: Record<TroopType, number>): Side {
  const total = side.troops.infantry.count + side.troops.cavalry.count + side.troops.archer.count;
  const counts = countsFromRatio(total, ratio);
  return {
    ...side,
    troops: {
      infantry: { ...side.troops.infantry, count: counts.infantry },
      cavalry: { ...side.troops.cavalry, count: counts.cavalry },
      archer: { ...side.troops.archer, count: counts.archer },
    },
  };
}

describe('sweepFormations', () => {
  const candidates = sweepFormations(defaultSide('A'), defaultSide('B'), { step: 10, minShare: 10 });

  it('enumerates valid ratios only, and keeps the march size fixed', () => {
    expect(candidates.length).toBeGreaterThan(10);
    for (const candidate of candidates) {
      const { infantry, cavalry, archer } = candidate.ratio;
      expect(infantry + cavalry + archer).toBe(100);
      expect(Math.min(infantry, cavalry, archer)).toBeGreaterThanOrEqual(10);
    }
  });

  it('ranks by kill/death ratio, best first', () => {
    for (let i = 1; i < candidates.length; i += 1) {
      expect(candidates[i - 1].killDeathRatio).toBeGreaterThanOrEqual(candidates[i].killDeathRatio);
    }
  });

  it('beats mirroring the enemy split, which is the point of sweeping', () => {
    const enemy = withRatio(defaultSide('B'), { infantry: 10, cavalry: 80, archer: 10 });
    const ranked = sweepFormations(defaultSide('A'), enemy, {
      step: 10,
      minShare: 10,
      assumptions: { counterCoefficient: 0.3, intensity: 0.1 },
    });
    const mirror = ranked.find(
      (c) => c.ratio.infantry === 10 && c.ratio.cavalry === 80 && c.ratio.archer === 10,
    )!;
    expect(mirror.killDeathRatio).toBeCloseTo(1, 2);
    expect(ranked[0].killDeathRatio).toBeGreaterThan(mirror.killDeathRatio);
  });
});

describe('optimiseJoiners', () => {
  it('never suggests more than the four joiner skills the game counts', () => {
    const candidates = optimiseJoiners(defaultSide('A'), defaultSide('B'), ['chenko', 'amane', 'gordon'], 5);
    expect(candidates).toHaveLength(5);
    for (const candidate of candidates) expect(candidate.heroIds).toHaveLength(4);
  });

  it('picks spread-out effect_ops over four copies of one hero', () => {
    const best = optimiseJoiners(defaultSide('A'), defaultSide('B'), ['chenko', 'amane'], 1)[0];
    expect(new Set(best.heroIds).size).toBe(2);
    expect(best.damageUp).toBeCloseTo(2.25);
  });

  it('ranks by net advantage, so defensive joiners are not undervalued', () => {
    const candidates = optimiseJoiners(defaultSide('A'), defaultSide('B'), ['chenko', 'fahd', 'gordon', 'saul'], 200);
    for (let i = 1; i < candidates.length; i += 1) {
      expect(candidates[i - 1].advantage).toBeGreaterThanOrEqual(candidates[i].advantage);
    }
    const allDefensive = candidates.find((c) => c.heroIds.every((id) => id === 'saul'))!;
    const allOffensive = candidates.find((c) => c.heroIds.every((id) => id === 'chenko'))!;
    expect(allDefensive.advantage).toBeGreaterThan(1);
    expect(allOffensive.advantage).toBeGreaterThan(1);
  });

  it('ignores hero ids that are not in the database', () => {
    const candidates = optimiseJoiners(defaultSide('A'), defaultSide('B'), ['chenko', 'nonexistent'], 3);
    for (const candidate of candidates) {
      expect(candidate.heroIds.every((id) => id === 'chenko')).toBe(true);
    }
  });
});

describe('compareConfigurations', () => {
  const enemy = defaultSide('B');
  const weak = defaultSide('Weak');
  const strong: Side = {
    ...defaultSide('Strong'),
    bonuses: {
      ...defaultSide('Strong').bonuses,
      all: { attack: 300, lethality: 250, defense: 150, health: 120 },
    },
  };

  it('ranks by mean kill/death and marks a real gap as significant', () => {
    const verdicts = compareConfigurations(
      [
        { id: 'weak', label: 'Weak', side: weak },
        { id: 'strong', label: 'Strong', side: strong },
      ],
      enemy,
      { runs: 40, seed: 5 },
    );
    expect(verdicts[0].id).toBe('strong');
    expect(verdicts[0].summary.killDeathRatio.mean).toBeGreaterThan(verdicts[1].summary.killDeathRatio.mean);
    expect(verdicts.find((v) => v.id === 'weak')!.vsBaseline).toBeNull();
    expect(verdicts.find((v) => v.id === 'strong')!.vsBaseline!.significant).toBe(true);
  });

  it('calls two copies of the same configuration indistinguishable', () => {
    const verdicts = compareConfigurations(
      [
        { id: 'a', label: 'A', side: defaultSide('A') },
        { id: 'b', label: 'B', side: defaultSide('A') },
      ],
      enemy,
      { runs: 200, seed: 11 },
    );
    // Common random numbers: identical configurations see identical dice, so the gap is exactly 0.
    expect(verdicts.find((v) => v.id === 'b')!.vsBaseline!.delta).toBe(0);
    expect(verdicts.find((v) => v.id === 'b')!.vsBaseline!.significant).toBe(false);
  });

  it('gives every configuration the same dice, so runs line up one to one', () => {
    const verdicts = compareConfigurations(
      [
        { id: 'weak', label: 'Weak', side: weak },
        { id: 'strong', label: 'Strong', side: strong },
      ],
      enemy,
      { runs: 25, seed: 3 },
    );
    for (const verdict of verdicts) expect(verdict.summary.seed).toBe(3);
    // Pairing makes a real edge visible in nearly every individual run, not just on average.
    const strongRuns = verdicts.find((v) => v.id === 'strong')!.summary.outcomes;
    const weakRuns = verdicts.find((v) => v.id === 'weak')!.summary.outcomes;
    const wins = strongRuns.filter((run, i) => run.killDeathRatio > weakRuns[i].killDeathRatio).length;
    expect(wins).toBe(strongRuns.length);
  });

  it('is reproducible from its seed and gives every configuration the same run count', () => {
    const configurations = [
      { id: 'weak', label: 'Weak', side: weak },
      { id: 'strong', label: 'Strong', side: strong },
    ];
    const first = compareConfigurations(configurations, enemy, { runs: 30, seed: 9 });
    const again = compareConfigurations(configurations, enemy, { runs: 30, seed: 9 });
    expect(first.map((v) => v.summary.killDeathRatio.mean)).toEqual(
      again.map((v) => v.summary.killDeathRatio.mean),
    );
    for (const verdict of first) expect(verdict.summary.runs).toBe(30);
  });
});
