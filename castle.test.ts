import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TURRET_FIRE,
  simulateCastleAssault,
  turretAttrition,
  turretVolleys,
  type TurretFire,
} from './castle';
import { defaultSide } from './data/presets';
import type { Side, TroopType } from './types';

function sized(label: string, total: number): Side {
  const side = defaultSide(label);
  const share = Math.round(total / 3);
  return {
    ...side,
    troops: {
      infantry: { ...side.troops.infantry, count: total - 2 * share },
      cavalry: { ...side.troops.cavalry, count: share },
      archer: { ...side.troops.archer, count: share },
    },
  };
}

const counts = (side: Side) =>
  ({
    infantry: side.troops.infantry.count,
    cavalry: side.troops.cavalry.count,
    archer: side.troops.archer.count,
  }) as Record<TroopType, number>;

const fire = (overrides: Partial<TurretFire>): TurretFire => ({ ...DEFAULT_TURRET_FIRE, ...overrides });

describe('turret fire', () => {
  it('does nothing while the holder also holds every turret', () => {
    expect(turretVolleys(fire({ hostileTurrets: 0, holdMinutes: 120 }))).toEqual([]);
    const none = turretAttrition({ infantry: 100, cavalry: 0, archer: 0 }, fire({ hostileTurrets: 0 }));
    expect(none.total).toBe(0);
  });

  it('fires more often the longer a turret is held, up to the interval floor', () => {
    const volleys = turretVolleys(
      fire({ hostileTurrets: 1, holdMinutes: 30, startIntervalMinutes: 4, intervalStepMinutes: 1, minIntervalMinutes: 1 }),
    );
    // 4, then 3, 2, 1, 1, 1 ... minutes apart.
    expect(volleys.slice(0, 5)).toEqual([4, 7, 9, 10, 11]);
    const gaps = volleys.slice(1).map((at, index) => Number((at - volleys[index]).toFixed(3)));
    expect(Math.min(...gaps)).toBe(1);
    expect(gaps.every((gap, index) => index === 0 || gap <= gaps[index - 1])).toBe(true);
  });

  it('compounds each volley against what is left, so it can never exceed the squad', () => {
    const attrition = turretAttrition(
      { infantry: 100000, cavalry: 0, archer: 0 },
      fire({ hostileTurrets: 4, holdMinutes: 150 }),
    );
    expect(attrition.volleys).toBeGreaterThan(30);
    expect(attrition.fractionLost).toBeLessThan(1);
    expect(attrition.total).toBeLessThan(100000);
    expect(attrition.total + attrition.remaining.infantry).toBeCloseTo(100000, 6);
  });

  it('scales with the number of hostile turrets, capped at the four that exist', () => {
    const one = turretAttrition({ infantry: 100000, cavalry: 0, archer: 0 }, fire({ hostileTurrets: 1, holdMinutes: 20 }));
    const four = turretAttrition({ infantry: 100000, cavalry: 0, archer: 0 }, fire({ hostileTurrets: 4, holdMinutes: 20 }));
    const eight = turretAttrition({ infantry: 100000, cavalry: 0, archer: 0 }, fire({ hostileTurrets: 8, holdMinutes: 20 }));
    expect(four.total).toBeGreaterThan(one.total);
    expect(eight.total).toBeCloseTo(four.total, 6);
  });

  it('takes 2% per turret per volley', () => {
    const single = turretAttrition(
      { infantry: 1000, cavalry: 0, archer: 0 },
      fire({ hostileTurrets: 2, holdMinutes: 4, startIntervalMinutes: 4 }),
    );
    expect(single.volleys).toBe(1);
    expect(single.total).toBeCloseTo(40, 6);
  });
});

describe('simulateCastleAssault', () => {
  const options = { assumptions: { intensity: 0.1 } };

  it('works through the garrison squad by squad, carrying the rally survivors forward', () => {
    const rally = sized('Rally', 300000);
    const garrison = [sized('Garrison 1', 60000), sized('Garrison 2', 60000)];
    const result = simulateCastleAssault(rally, garrison, options);
    expect(result.engagements).toHaveLength(2);
    expect(result.engagements[1].battle.attacker.totalTroops).toBe(result.engagements[0].attackerRemaining);
    expect(result.attackerSurvivors).toBeLessThan(300000);
  });

  it('leaves later squads untouched once the rally is spent', () => {
    const rally = sized('Rally', 1000);
    const garrison = [sized('Garrison 1', 400000), sized('Garrison 2', 400000)];
    const result = simulateCastleAssault(rally, garrison, options);
    expect(result.engagements).toHaveLength(1);
    expect(result.structureTaken).toBe(false);
    expect(result.defenderSurvivors).toBeGreaterThan(400000);
  });

  it('reports the structure taken only when the whole garrison is cleared', () => {
    const rally = sized('Rally', 2000000);
    const result = simulateCastleAssault(rally, [sized('Garrison', 20000)], options);
    expect(result.squadsCleared).toBe(1);
    expect(result.defenderSurvivors).toBe(0);
    expect(result.structureTaken).toBe(true);
  });

  it('makes a garrison under turret fire cheaper to break', () => {
    const rally = sized('Rally', 200000);
    const garrison = [sized('Garrison', 200000)];
    const safe = simulateCastleAssault(rally, garrison, options);
    const shelled = simulateCastleAssault(rally, garrison, {
      ...options,
      turret: { hostileTurrets: 4, holdMinutes: 60 },
    });
    expect(shelled.turret.total).toBeGreaterThan(0);
    expect(shelled.attackerLosses).toBeLessThan(safe.attackerLosses);
    expect(shelled.killDeathRatio).toBeGreaterThan(safe.killDeathRatio);
  });

  it('counts turret losses as the defender\u2019s, on top of the battle losses', () => {
    const result = simulateCastleAssault(sized('Rally', 100000), [sized('Garrison', 100000)], {
      ...options,
      turret: { hostileTurrets: 2, holdMinutes: 30 },
    });
    expect(result.defenderCasualties.total).toBeCloseTo(result.defenderBattleLosses + result.turret.total, 6);
  });

  it('splits casualties with the King\u2019s Castle policy, so nobody dies until the infirmary fills', () => {
    const result = simulateCastleAssault(sized('Rally', 100000), [sized('Garrison', 100000)], options);
    expect(result.attackerCasualties.dead).toBe(0);
    const capped = simulateCastleAssault(sized('Rally', 100000), [sized('Garrison', 100000)], {
      ...options,
      infirmaryCapacity: 1000,
    });
    expect(capped.attackerCasualties.infirmary).toBe(1000);
    expect(capped.attackerCasualties.dead).toBeGreaterThan(0);
  });

  it('has nothing to fight without a garrison', () => {
    const result = simulateCastleAssault(sized('Rally', 100000), []);
    expect(result.engagements).toEqual([]);
    expect(result.structureTaken).toBe(false);
    expect(result.attackerLosses).toBe(0);
  });

  it('keeps the turret split proportional to each squad\u2019s size', () => {
    const attrition = turretAttrition(counts(sized('Garrison', 300000)), fire({ hostileTurrets: 1, holdMinutes: 10 }));
    expect(attrition.perType.cavalry).toBeCloseTo(attrition.perType.archer, 6);
    expect(attrition.perType.infantry).toBeCloseTo(attrition.perType.cavalry, 6);
  });
});
