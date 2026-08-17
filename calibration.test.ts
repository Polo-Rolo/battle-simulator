import { describe, expect, it } from 'vitest';
import { calibrate, evaluateAssumptions, type CalibrationCase } from './calibration';
import { DEFAULT_ASSUMPTIONS } from './assumptions';
import { simulateBattle } from './battle';
import { defaultSide } from './data/presets';
import { CASUALTY_POLICIES, splitCasualties } from './casualties';

/** Builds a report from a known set of assumptions, so calibration has a recoverable ground truth. */
function syntheticCase(id: string, intensity: number): CalibrationCase {
  const attacker = defaultSide('A');
  attacker.bonuses.all = { ...attacker.bonuses.all, lethality: 200 };
  const defender = defaultSide('B');
  const truth = simulateBattle(attacker, defender, { assumptions: { intensity } });
  return {
    id,
    attacker,
    defender,
    observed: {
      attackerLosses: truth.attackerCasualties.total,
      defenderLosses: truth.defenderCasualties.total,
    },
  };
}

describe('evaluateAssumptions', () => {
  it('scores a perfect fit as zero error', () => {
    const cases = [syntheticCase('a', DEFAULT_ASSUMPTIONS.intensity)];
    const { meanRelativeError, residuals } = evaluateAssumptions(cases, DEFAULT_ASSUMPTIONS);
    expect(meanRelativeError).toBeCloseTo(0, 10);
    expect(residuals[0].id).toBe('a');
  });

  it('reports relative error per side', () => {
    const cases = [syntheticCase('a', DEFAULT_ASSUMPTIONS.intensity)];
    cases[0].observed.defenderLosses *= 2;
    const { residuals } = evaluateAssumptions(cases, DEFAULT_ASSUMPTIONS);
    expect(residuals[0].attackerError).toBeCloseTo(0, 10);
    expect(residuals[0].defenderError).toBeCloseTo(0.5, 6);
  });

  it('compares against only the casualty rows the report covers', () => {
    const base = syntheticCase('a', DEFAULT_ASSUMPTIONS.intensity);
    const truth = simulateBattle(base.attacker, base.defender, { assumptions: DEFAULT_ASSUMPTIONS });
    // An outpost is one of the few places troops actually die, so dead and total differ here.
    const policy = CASUALTY_POLICIES.find((item) => item.id === 'outpost-l4');
    if (policy === undefined) throw new Error('outpost-l4 policy missing');
    const attacker = splitCasualties(truth.attackerCasualties, policy);
    const defender = splitCasualties(truth.defenderCasualties, policy);
    // The lightly injured recover, so a report read as dead-only must not be matched to the total.
    expect(defender.dead).toBeGreaterThan(0);
    expect(defender.dead).toBeLessThan(defender.total);
    const deadOnly: CalibrationCase = {
      ...base,
      policy,
      observed: {
        attackerLosses: attacker.dead,
        defenderLosses: defender.dead,
        target: 'dead',
      },
    };
    expect(evaluateAssumptions([deadOnly], DEFAULT_ASSUMPTIONS).meanRelativeError).toBeCloseTo(0, 10);
    expect(
      evaluateAssumptions([{ ...deadOnly, observed: { ...deadOnly.observed, target: 'all' } }], DEFAULT_ASSUMPTIONS)
        .meanRelativeError,
    ).toBeGreaterThan(0.01);
  });

  it('returns zero error for an empty case list rather than NaN', () => {
    expect(evaluateAssumptions([], DEFAULT_ASSUMPTIONS).meanRelativeError).toBe(0);
  });
});

describe('calibrate', () => {
  it('recovers a known intensity from synthetic reports', () => {
    const cases = [syntheticCase('a', 0.2), syntheticCase('b', 0.2)];
    const before = evaluateAssumptions(cases, DEFAULT_ASSUMPTIONS).meanRelativeError;
    const fitted = calibrate(cases, {}, 12);
    expect(fitted.meanRelativeError).toBeLessThan(before);
    expect(fitted.meanRelativeError).toBeLessThan(0.1);
    expect(fitted.assumptions.intensity).toBeCloseTo(0.2, 1);
    expect(fitted.evaluations).toBeGreaterThan(1);
  });

  it('never returns a worse fit than the starting point', () => {
    const cases = [syntheticCase('a', 0.5)];
    const start = { intensity: 0.5 };
    const fitted = calibrate(cases, start, 4);
    expect(fitted.meanRelativeError).toBeLessThanOrEqual(
      evaluateAssumptions(cases, { ...DEFAULT_ASSUMPTIONS, ...start }).meanRelativeError + 1e-12,
    );
  });

  it('keeps fitted parameters inside their documented bounds', () => {
    const fitted = calibrate([syntheticCase('a', 1.5)], {}, 8);
    expect(fitted.assumptions.intensity).toBeGreaterThanOrEqual(0.001);
    expect(fitted.assumptions.intensity).toBeLessThanOrEqual(2);
    expect(fitted.assumptions.counterCoefficient).toBeGreaterThanOrEqual(0);
    expect(fitted.assumptions.counterCoefficient).toBeLessThanOrEqual(0.5);
    expect(fitted.assumptions.cavalryBypassChance).toBeGreaterThanOrEqual(0);
    expect(fitted.assumptions.cavalryBypassChance).toBeLessThanOrEqual(0.6);
  });
});
