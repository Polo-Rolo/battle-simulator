import { describe, expect, it } from 'vitest';
import { counterMultiplier, simulateBattle } from './battle';
import { splitCasualties, CASUALTY_POLICIES } from './casualties';
import { countsFromRatio } from './army';
import { defaultSide } from './data/presets';
import { HEROES_BY_ID } from './data/heroes';
import type { Side, TroopType } from './types';

function withRatio(side: Side, ratio: Record<TroopType, number>, total = 100000): Side {
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

describe('counter triangle', () => {
  it('rewards the countering type and penalises the countered one', () => {
    expect(counterMultiplier('infantry', 'cavalry', 0.1)).toBeCloseTo(1.1);
    expect(counterMultiplier('cavalry', 'infantry', 0.1)).toBeCloseTo(0.9);
    expect(counterMultiplier('cavalry', 'archer', 0.1)).toBeCloseTo(1.1);
    expect(counterMultiplier('archer', 'infantry', 0.1)).toBeCloseTo(1.1);
    expect(counterMultiplier('archer', 'archer', 0.1)).toBe(1);
  });
});

describe('simulateBattle', () => {
  it('is a draw between identical armies', () => {
    const result = simulateBattle(defaultSide('A'), defaultSide('B'));
    expect(result.winner).toBe('draw');
    expect(result.attackerCasualties.total).toBeCloseTo(result.defenderCasualties.total, 5);
    expect(result.killDeathRatio).toBeCloseTo(1, 5);
  });

  it('never kills more troops than the enemy brought', () => {
    const attacker = defaultSide('A');
    const defender = withRatio(defaultSide('B'), { infantry: 50, cavalry: 20, archer: 30 }, 500);
    const result = simulateBattle(attacker, defender);
    expect(result.defenderCasualties.total).toBeLessThanOrEqual(500);
    expect(result.defenderCasualties.survivors).toBeGreaterThanOrEqual(0);
    expect(result.wipeout).toBe('defender');
    expect(result.winner).toBe('attacker');
  });

  it('gives the win to better stats, all else equal', () => {
    const attacker = defaultSide('A');
    const defender = defaultSide('B');
    attacker.bonuses.all = { ...attacker.bonuses.all, lethality: 300 };
    const result = simulateBattle(attacker, defender);
    expect(result.winner).toBe('attacker');
    expect(result.killDeathRatio).toBeGreaterThan(1);
  });

  it('treats attack and lethality as equally valuable, since they multiply', () => {
    const boostAttack = defaultSide('A');
    boostAttack.bonuses.all = { ...boostAttack.bonuses.all, attack: 200 };
    const boostLethality = defaultSide('A');
    boostLethality.bonuses.all = { ...boostLethality.bonuses.all, lethality: 164 };
    // x2.5 -> x3.0 attack and x2.2 -> x2.64 lethality are the same proportional gain.
    const a = simulateBattle(boostAttack, defaultSide('B'));
    const b = simulateBattle(boostLethality, defaultSide('B'));
    expect(a.defenderCasualties.total).toBeCloseTo(b.defenderCasualties.total, 5);
  });

  it('rewards mixed-effect_op joiners over stacked clones', () => {
    const clones: Side = { ...defaultSide('A'), joiners: ['chenko', 'chenko', 'chenko', 'chenko'] };
    const mixed: Side = { ...defaultSide('A'), joiners: ['chenko', 'chenko', 'amane', 'amane'] };
    const defender = defaultSide('B');
    // Low intensity keeps both runs away from the wipe ceiling, where the comparison saturates.
    const options = { assumptions: { intensity: 0.1 } };
    const clonesResult = simulateBattle(clones, defender, options);
    const mixedResult = simulateBattle(mixed, defender, options);
    expect(mixedResult.defenderCasualties.total).toBeGreaterThan(clonesResult.defenderCasualties.total);
  });

  it('lets a defender cut incoming damage with OppDamageDown joiners', () => {
    const attacker = defaultSide('A');
    const bare = defaultSide('B');
    const fahds: Side = { ...bare, joiners: ['fahd', 'fahd', 'fahd', 'fahd'] };
    const options = { assumptions: { intensity: 0.1 } };
    const withoutFahd = simulateBattle(attacker, bare, options);
    const withFahd = simulateBattle(attacker, fahds, options);
    expect(withFahd.defenderCasualties.total).toBeLessThan(withoutFahd.defenderCasualties.total);
    expect(HEROES_BY_ID.fahd.skills[0].effects[0].kind).toBe('OppDamageDown');
  });

  it('exposes the counter triangle: cavalry-heavy loses to infantry-heavy', () => {
    const infantryHeavy = withRatio(defaultSide('A'), { infantry: 80, cavalry: 10, archer: 10 });
    const cavalryHeavy = withRatio(defaultSide('B'), { infantry: 10, cavalry: 80, archer: 10 });
    const strongCounter = simulateBattle(infantryHeavy, cavalryHeavy, {
      assumptions: { counterCoefficient: 0.3 },
    });
    const noCounter = simulateBattle(infantryHeavy, cavalryHeavy, {
      assumptions: { counterCoefficient: 0 },
    });
    expect(strongCounter.killDeathRatio).toBeGreaterThan(noCounter.killDeathRatio);
  });

  it('scales absolute casualties with intensity but never changes the winner', () => {
    const attacker = defaultSide('A');
    attacker.bonuses.all = { ...attacker.bonuses.all, lethality: 200 };
    const defender = defaultSide('B');
    const low = simulateBattle(attacker, defender, { assumptions: { intensity: 0.2 } });
    const high = simulateBattle(attacker, defender, { assumptions: { intensity: 0.6 } });
    expect(high.defenderCasualties.total).toBeGreaterThan(low.defenderCasualties.total);
    expect(low.winner).toBe(high.winner);
  });

  it('produces a per-round timeline that only ever loses troops', () => {
    const result = simulateBattle(defaultSide('A'), defaultSide('B'), { assumptions: { rounds: 8 } });
    expect(result.timeline).toHaveLength(8);
    for (let i = 1; i < result.timeline.length; i += 1) {
      expect(result.timeline[i].attackerRemaining).toBeLessThanOrEqual(result.timeline[i - 1].attackerRemaining);
      expect(result.timeline[i].defenderRemaining).toBeLessThanOrEqual(result.timeline[i - 1].defenderRemaining);
    }
  });

  it('handles an empty march without dividing by zero', () => {
    const empty = withRatio(defaultSide('A'), { infantry: 50, cavalry: 20, archer: 30 }, 0);
    const result = simulateBattle(empty, defaultSide('B'));
    expect(result.attackerCasualties.total).toBe(0);
    expect(result.wipeout).toBeNull();
  });
});

describe('splitCasualties', () => {
  const casualties = { perType: { infantry: 0, cavalry: 0, archer: 0 }, total: 1000, fraction: 0.1, survivors: 9000 };

  it('applies the documented 35% death rate when hitting a Town Center', () => {
    const policy = CASUALTY_POLICIES.find((p) => p.id === 'town-center-attack')!;
    const split = splitCasualties(casualties, policy);
    expect(split.dead).toBeCloseTo(350);
    expect(split.dead + split.infirmary + split.lightlyInjured).toBeCloseTo(1000);
  });

  it('converts infirmary overflow into deaths', () => {
    const policy = CASUALTY_POLICIES.find((p) => p.id === 'kings-castle')!;
    const split = splitCasualties(casualties, policy, 400);
    expect(split.infirmary).toBe(400);
    expect(split.overflowDead).toBeCloseTo(450);
    expect(split.dead).toBeCloseTo(450);
  });
});
