import { simulateBattle } from './battle';
import { DEFAULT_ASSUMPTIONS, type Assumptions } from './assumptions';
import { CASUALTY_POLICIES, splitCasualties, type CasualtyPolicy } from './casualties';
import type { SideCasualties } from './battle';
import type { Side } from './types';

/**
 * Which of the report's casualty rows the observed numbers cover. The game reports three: dead
 * ("Losses at battle end"), severely injured (into the infirmary) and lightly injured (recover on
 * returning to the city). They mean very different things, so the fit has to compare like with like.
 */
export type CasualtyTarget = 'dead' | 'deadAndInfirmary' | 'all';

/** A real battle report: both loadouts plus the casualties the game actually reported. */
export interface CalibrationCase {
  id: string;
  attacker: Side;
  defender: Side;
  observed: {
    attackerLosses: number;
    defenderLosses: number;
    /** Which rows `attackerLosses`/`defenderLosses` add up. Defaults to all three. */
    target?: CasualtyTarget;
  };
  /**
   * Splits predicted casualties into dead/infirmary/lightly injured, needed whenever the observed
   * numbers cover only some of those rows. Defaults to open-field PvP.
   */
  policy?: CasualtyPolicy;
}

const DEFAULT_POLICY =
  CASUALTY_POLICIES.find((policy) => policy.id === 'field-pvp') ?? CASUALTY_POLICIES[0];

export interface CalibrationResidual {
  id: string;
  predictedAttackerLosses: number;
  predictedDefenderLosses: number;
  attackerError: number;
  defenderError: number;
}

export interface CalibrationResult {
  assumptions: Assumptions;
  /** Mean absolute relative error across every case and both sides. */
  meanRelativeError: number;
  residuals: CalibrationResidual[];
  evaluations: number;
}

function relativeError(predicted: number, observed: number): number {
  if (observed === 0) return predicted === 0 ? 0 : 1;
  return Math.abs(predicted - observed) / observed;
}

function predicted(
  casualties: SideCasualties,
  target: CasualtyTarget,
  policy: CasualtyPolicy,
): number {
  if (target === 'all') return casualties.total;
  const split = splitCasualties(casualties, policy);
  return target === 'dead' ? split.dead : split.dead + split.infirmary;
}

export function evaluateAssumptions(
  cases: CalibrationCase[],
  assumptions: Assumptions,
): { meanRelativeError: number; residuals: CalibrationResidual[] } {
  const residuals = cases.map((testCase) => {
    const result = simulateBattle(testCase.attacker, testCase.defender, { assumptions });
    const target = testCase.observed.target ?? 'all';
    const policy = testCase.policy ?? DEFAULT_POLICY;
    const predictedAttackerLosses = predicted(result.attackerCasualties, target, policy);
    const predictedDefenderLosses = predicted(result.defenderCasualties, target, policy);
    return {
      id: testCase.id,
      predictedAttackerLosses,
      predictedDefenderLosses,
      attackerError: relativeError(predictedAttackerLosses, testCase.observed.attackerLosses),
      defenderError: relativeError(predictedDefenderLosses, testCase.observed.defenderLosses),
    };
  });
  const meanRelativeError =
    residuals.length === 0
      ? 0
      : residuals.reduce((acc, r) => acc + r.attackerError + r.defenderError, 0) / (residuals.length * 2);
  return { meanRelativeError, residuals };
}

const SEARCH_SPACE: { key: keyof Assumptions; min: number; max: number }[] = [
  { key: 'intensity', min: 0.001, max: 2 },
  { key: 'troopExponent', min: 0.4, max: 1.2 },
  { key: 'counterCoefficient', min: 0, max: 0.5 },
  { key: 'cavalryBypassChance', min: 0, max: 0.6 },
];

/**
 * Fits the unknown constants to real battle reports by coordinate descent with a shrinking step.
 *
 * Deliberately simple and derivative-free: the objective is cheap, the search space is four bounded
 * parameters, and a transparent search is easier to trust than a black-box optimiser when the whole
 * point of this module is to be honest about which numbers are guesses.
 */
export function calibrate(
  cases: CalibrationCase[],
  start: Partial<Assumptions> = {},
  iterations = 6,
): CalibrationResult {
  let current: Assumptions = { ...DEFAULT_ASSUMPTIONS, ...start };
  let best = evaluateAssumptions(cases, current);
  let evaluations = 1;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const { key, min, max } of SEARCH_SPACE) {
      const span = (max - min) / Math.pow(2, iteration + 1);
      for (const direction of [-1, 1]) {
        const candidateValue = Math.min(max, Math.max(min, current[key] + direction * span));
        if (candidateValue === current[key]) continue;
        const candidate: Assumptions = { ...current, [key]: candidateValue };
        const score = evaluateAssumptions(cases, candidate);
        evaluations += 1;
        if (score.meanRelativeError < best.meanRelativeError) {
          best = score;
          current = candidate;
        }
      }
    }
  }

  return {
    assumptions: current,
    meanRelativeError: best.meanRelativeError,
    residuals: best.residuals,
    evaluations,
  };
}
