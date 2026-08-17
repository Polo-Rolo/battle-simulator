/**
 * Every number in here is a modelling assumption rather than a datamined fact.
 *
 * The community has reverse-engineered the aggregate kill formula and the effect_op buff-stacking
 * rules to a high degree of confidence, but the per-round engine (the counter-triangle coefficient,
 * the cavalry bypass rate, how many exchanges a round contains) has never been published. Those
 * live here as explicit, calibratable parameters so results can be honestly labelled and refit
 * against real battle reports instead of quietly hard-coded.
 */
export interface Assumptions {
  /**
   * Exponent applied to troop count in the kill formula. Published community versions have used
   * 0.5 (sqrt) and later dropped it; 1.0 reproduces "twice the troops, twice the kills".
   */
  troopExponent: number;
  /**
   * Global battle intensity. Scales absolute casualty counts only - it is common to both sides,
   * so it never changes which side wins or the relative ranking of two loadouts.
   */
  intensity: number;
  /** Counter-triangle edge, as a fraction. 0.1 = countering type deals +10% / takes -10%. */
  counterCoefficient: number;
  /** Chance per round that cavalry bypasses the front row and dives the enemy archers. */
  cavalryBypassChance: number;
  /** Number of attrition steps used to resolve the battle. */
  rounds: number;
  /** Relative spread of RNG skill procs, used only by the Monte Carlo mode. */
  procVariance: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  troopExponent: 1,
  intensity: 0.4,
  counterCoefficient: 0.1,
  cavalryBypassChance: 0.2,
  rounds: 10,
  procVariance: 0.08,
};

export interface AssumptionNote {
  key: keyof Assumptions;
  label: string;
  confidence: 'datamined' | 'community-tested' | 'unknown';
  note: string;
}

export const ASSUMPTION_NOTES: AssumptionNote[] = [
  {
    key: 'troopExponent',
    label: 'Troop count exponent',
    confidence: 'community-tested',
    note: 'Published versions of the kill formula have used sqrt(troops) and, more recently, dropped it. Calibrate against your own reports.',
  },
  {
    key: 'intensity',
    label: 'Battle intensity',
    confidence: 'unknown',
    note: 'Pure scale factor on absolute casualties. Identical for both sides, so it cannot change who wins - only how bloody the fight is. The default is tuned so an evenly matched T10 mirror match loses roughly a third of each march, leaving headroom for lopsided fights to reach a wipe.',
  },
  {
    key: 'counterCoefficient',
    label: 'Counter-triangle edge',
    confidence: 'unknown',
    note: 'Infantry > Cavalry > Archers > Infantry is confirmed to exist and to matter in even fights, but no source publishes the magnitude.',
  },
  {
    key: 'cavalryBypassChance',
    label: 'Cavalry bypass chance',
    confidence: 'unknown',
    note: 'Official FAQ confirms cavalry sometimes skip the front row to hit archers; the rate is unpublished.',
  },
  {
    key: 'rounds',
    label: 'Attrition steps',
    confidence: 'unknown',
    note: 'Battles are turn-based with simultaneous damage. More steps model the losing side\u2019s death spiral more smoothly; totals are step-count normalised.',
  },
  {
    key: 'procVariance',
    label: 'Skill proc variance',
    confidence: 'unknown',
    note: 'Spread applied to skill contributions in Monte Carlo runs, to show the range of plausible outcomes rather than a single point estimate.',
  },
];
