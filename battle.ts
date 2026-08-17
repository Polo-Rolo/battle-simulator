import { TROOP_TYPES } from './data/troopBaseStats';
import { resolveArmy } from './army';
import { DEFAULT_ASSUMPTIONS, type Assumptions } from './assumptions';
import { skillModAgainst } from './effects';
import type { BattleRole, ResolvedArmy, Side, TroopType } from './types';

/**
 * Counter triangle: Infantry beats Cavalry, Cavalry beats Archers, Archers beat Infantry.
 * The direction is confirmed; the magnitude is the `counterCoefficient` assumption.
 */
const COUNTERS: Record<TroopType, TroopType> = {
  infantry: 'cavalry',
  cavalry: 'archer',
  archer: 'infantry',
};

export function counterMultiplier(attacker: TroopType, defender: TroopType, coefficient: number): number {
  if (COUNTERS[attacker] === defender) return 1 + coefficient;
  if (COUNTERS[defender] === attacker) return 1 - coefficient;
  return 1;
}

/** Rows are engaged front to back: infantry, then cavalry, then archers. */
const ROW_ORDER: TroopType[] = ['infantry', 'cavalry', 'archer'];

function frontRow(counts: Record<TroopType, number>): TroopType | null {
  return ROW_ORDER.find((type) => counts[type] > 0) ?? null;
}

/**
 * How an attacking troop type spreads its damage across enemy rows. Everything hits the front-most
 * surviving row, except cavalry, which has a chance to bypass it and dive the archers.
 */
function targetShares(
  attacker: TroopType,
  enemyCounts: Record<TroopType, number>,
  bypassChance: number,
): Partial<Record<TroopType, number>> {
  const front = frontRow(enemyCounts);
  if (!front) return {};
  if (attacker !== 'cavalry' || front === 'archer' || enemyCounts.archer <= 0) return { [front]: 1 };
  return { archer: bypassChance, [front]: 1 - bypassChance };
}

export interface SideCasualties {
  perType: Record<TroopType, number>;
  total: number;
  /** Fraction of the march lost. */
  fraction: number;
  survivors: number;
}

export interface RoundSnapshot {
  round: number;
  attackerRemaining: number;
  defenderRemaining: number;
  attackerLosses: number;
  defenderLosses: number;
}

export interface BattleResult {
  attacker: ResolvedArmy;
  defender: ResolvedArmy;
  attackerCasualties: SideCasualties;
  defenderCasualties: SideCasualties;
  /** Enemy losses divided by own losses, from the attacker's point of view. */
  killDeathRatio: number;
  winner: 'attacker' | 'defender' | 'draw';
  wipeout: 'attacker' | 'defender' | null;
  roundsUsed: number;
  timeline: RoundSnapshot[];
  assumptions: Assumptions;
}

function zeroCounts(): Record<TroopType, number> {
  return { infantry: 0, cavalry: 0, archer: 0 };
}

function casualtiesOf(
  initial: Record<TroopType, number>,
  remaining: Record<TroopType, number>,
): SideCasualties {
  const perType = zeroCounts();
  let total = 0;
  let initialTotal = 0;
  for (const type of TROOP_TYPES) {
    perType[type] = initial[type] - remaining[type];
    total += perType[type];
    initialTotal += initial[type];
  }
  return {
    perType,
    total,
    fraction: initialTotal > 0 ? total / initialTotal : 0,
    survivors: initialTotal - total,
  };
}

export interface SimulateOptions {
  assumptions?: Partial<Assumptions>;
  /** Per-side multipliers on outgoing damage, used by the Monte Carlo mode for proc variance. */
  damageJitter?: { attacker: number; defender: number };
  /** Resolves cavalry bypass per round; defaults to the deterministic expected share. */
  bypassSampler?: (round: number, side: 'attacker' | 'defender') => number;
}

/**
 * Resolves a battle.
 *
 * Kills are driven by the community-validated aggregate formula
 *   kills = intensity x troops^k x (Attack x Lethality) / (enemy Defense x enemy Health) x SkillMod
 * applied per attacking troop type against the enemy row it engages, with the counter multiplier.
 *
 * Rather than being evaluated once, it is stepped over `rounds` attrition steps at 1/rounds
 * strength each. That keeps the total consistent with the one-shot formula while reproducing the
 * dynamics that decide real fights: the losing side's output decays as its troops die, and the back
 * rows only get exposed once the front row collapses.
 */
export function simulateBattle(
  attackerSide: Side,
  defenderSide: Side,
  options: SimulateOptions = {},
): BattleResult {
  const assumptions: Assumptions = { ...DEFAULT_ASSUMPTIONS, ...options.assumptions };
  const attacker = resolveArmy(attackerSide, defenderSide);
  const defender = resolveArmy(defenderSide, attackerSide);
  const jitter = options.damageJitter ?? { attacker: 1, defender: 1 };

  const armies = { attacker, defender } as const;

  /**
   * SkillMod per exchange rather than per side: troop-specific skills (Rosa's archers, Triton's
   * per-type Health) only count for the rows they name, so each attacker-type/target-type pairing
   * gets its own multiplier. Resolved once up front - the effects do not change mid-battle.
   */
  const mods = {} as Record<BattleRole, Record<TroopType, Record<TroopType, number>>>;
  for (const role of ['attacker', 'defender'] as const) {
    const foe = role === 'attacker' ? 'defender' : 'attacker';
    mods[role] = {} as Record<TroopType, Record<TroopType, number>>;
    for (const type of TROOP_TYPES) {
      mods[role][type] = {} as Record<TroopType, number>;
      for (const targetType of TROOP_TYPES) {
        mods[role][type][targetType] = skillModAgainst(
          armies[role].effects,
          armies[foe].effects,
          type,
          targetType,
        ).value;
      }
    }
  }
  const initial = {
    attacker: Object.fromEntries(TROOP_TYPES.map((t) => [t, attacker.perType[t].count])) as Record<TroopType, number>,
    defender: Object.fromEntries(TROOP_TYPES.map((t) => [t, defender.perType[t].count])) as Record<TroopType, number>,
  };
  const remaining = { attacker: { ...initial.attacker }, defender: { ...initial.defender } };

  const rounds = Math.max(1, Math.round(assumptions.rounds));
  const timeline: RoundSnapshot[] = [];
  let roundsUsed = 0;

  const totalOf = (counts: Record<TroopType, number>) =>
    TROOP_TYPES.reduce((acc, type) => acc + counts[type], 0);

  for (let round = 1; round <= rounds; round += 1) {
    if (totalOf(remaining.attacker) <= 0 || totalOf(remaining.defender) <= 0) break;
    roundsUsed = round;

    // Simultaneous resolution: both sides fire on the same pre-round state.
    const snapshot = { attacker: { ...remaining.attacker }, defender: { ...remaining.defender } };
    const inflicted = { attacker: zeroCounts(), defender: zeroCounts() };

    for (const role of ['attacker', 'defender'] as const) {
      const foe = role === 'attacker' ? 'defender' : 'attacker';
      const army = armies[role];
      const bypass = options.bypassSampler
        ? options.bypassSampler(round, role)
        : assumptions.cavalryBypassChance;

      for (const type of TROOP_TYPES) {
        const count = snapshot[role][type];
        if (count <= 0) continue;
        const stats = army.perType[type].stats;
        const shares = targetShares(type, snapshot[foe], bypass);
        for (const [targetType, share] of Object.entries(shares) as [TroopType, number][]) {
          if (!share || snapshot[foe][targetType] <= 0) continue;
          const target = armies[foe].perType[targetType].stats;
          const kills =
            (assumptions.intensity *
              Math.pow(count, assumptions.troopExponent) *
              (stats.attack * stats.lethality) *
              mods[role][type][targetType] *
              counterMultiplier(type, targetType, assumptions.counterCoefficient) *
              share *
              jitter[role]) /
            (target.defense * target.health * rounds);
          inflicted[foe][targetType] += kills;
        }
      }
    }

    for (const role of ['attacker', 'defender'] as const) {
      for (const type of TROOP_TYPES) {
        remaining[role][type] = Math.max(0, remaining[role][type] - inflicted[role][type]);
      }
    }

    timeline.push({
      round,
      attackerRemaining: Math.round(totalOf(remaining.attacker)),
      defenderRemaining: Math.round(totalOf(remaining.defender)),
      attackerLosses: Math.round(totalOf(inflicted.attacker)),
      defenderLosses: Math.round(totalOf(inflicted.defender)),
    });
  }

  const attackerCasualties = casualtiesOf(initial.attacker, remaining.attacker);
  const defenderCasualties = casualtiesOf(initial.defender, remaining.defender);
  const attackerWiped = attackerCasualties.survivors <= 0 && attacker.totalTroops > 0;
  const defenderWiped = defenderCasualties.survivors <= 0 && defender.totalTroops > 0;

  let winner: BattleResult['winner'];
  if (attackerWiped && !defenderWiped) winner = 'defender';
  else if (defenderWiped && !attackerWiped) winner = 'attacker';
  else {
    const margin = defenderCasualties.fraction - attackerCasualties.fraction;
    winner = Math.abs(margin) < 0.005 ? 'draw' : margin > 0 ? 'attacker' : 'defender';
  }

  return {
    attacker,
    defender,
    attackerCasualties,
    defenderCasualties,
    killDeathRatio:
      attackerCasualties.total > 0 ? defenderCasualties.total / attackerCasualties.total : Infinity,
    winner,
    wipeout: attackerWiped ? 'attacker' : defenderWiped ? 'defender' : null,
    roundsUsed,
    timeline,
    assumptions,
  };
}
