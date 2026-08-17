import { TROOP_TYPES } from './data/troopBaseStats';
import { simulateBattle, type BattleResult, type SimulateOptions } from './battle';
import { CASUALTY_POLICIES, splitCasualties, type CasualtyBreakdown, type CasualtyPolicy } from './casualties';
import type { Side, TroopType } from './types';

/**
 * Turret fire during a Castle Battle.
 *
 * Official (Kingshot help centre): a turret only damages the team occupying the King's Castle, it
 * does nothing to a team that holds the castle and that turret at once, and its interval shortens
 * the longer it is held.
 *
 * The numbers are player-reported rather than published: 2% of the occupier's troops per turret per
 * volley, with the interval starting around 4 minutes and speeding up to about 1 minute. They are
 * therefore inputs here, not constants.
 */
export interface TurretFire {
  /** Turrets held by the side that does *not* hold the castle, 0-4. */
  hostileTurrets: number;
  /** How long the castle has to be held, in minutes. */
  holdMinutes: number;
  /** Casualty fraction per turret per volley. */
  ratePerTurret: number;
  /** Interval before the first volley, in minutes. */
  startIntervalMinutes: number;
  /** Floor the interval speeds up to, in minutes. */
  minIntervalMinutes: number;
  /** How much each consecutive volley shortens the interval, in minutes. */
  intervalStepMinutes: number;
}

export const DEFAULT_TURRET_FIRE: TurretFire = {
  hostileTurrets: 0,
  holdMinutes: 30,
  ratePerTurret: 0.02,
  startIntervalMinutes: 4,
  minIntervalMinutes: 1,
  intervalStepMinutes: 0.5,
};

/** The minute mark of each volley inside the hold window. */
export function turretVolleys(fire: TurretFire): number[] {
  if (fire.hostileTurrets <= 0 || fire.holdMinutes <= 0) return [];
  const volleys: number[] = [];
  let interval = Math.max(fire.minIntervalMinutes, fire.startIntervalMinutes);
  let at = interval;
  while (at <= fire.holdMinutes && volleys.length < 1000) {
    volleys.push(Number(at.toFixed(3)));
    interval = Math.max(fire.minIntervalMinutes, interval - fire.intervalStepMinutes);
    at += interval;
  }
  return volleys;
}

export interface TurretAttrition {
  volleys: number;
  /** Fraction of the garrison lost, compounded volley by volley. */
  fractionLost: number;
  perType: Record<TroopType, number>;
  total: number;
  remaining: Record<TroopType, number>;
}

/**
 * Applies turret fire to a garrison. Each volley takes its percentage of what is *left*, so four
 * hostile turrets over a long hold compound rather than adding up to more than the whole squad.
 */
export function turretAttrition(counts: Record<TroopType, number>, fire: TurretFire): TurretAttrition {
  const volleys = turretVolleys(fire);
  const perVolley = Math.min(1, Math.max(0, fire.ratePerTurret * Math.min(4, fire.hostileTurrets)));
  const survivingFraction = Math.pow(1 - perVolley, volleys.length);
  const perType = { infantry: 0, cavalry: 0, archer: 0 } as Record<TroopType, number>;
  const remaining = { infantry: 0, cavalry: 0, archer: 0 } as Record<TroopType, number>;
  let total = 0;
  for (const type of TROOP_TYPES) {
    remaining[type] = counts[type] * survivingFraction;
    perType[type] = counts[type] - remaining[type];
    total += perType[type];
  }
  return { volleys: volleys.length, fractionLost: 1 - survivingFraction, perType, total, remaining };
}

function countsOf(side: Side): Record<TroopType, number> {
  const counts = { infantry: 0, cavalry: 0, archer: 0 } as Record<TroopType, number>;
  for (const type of TROOP_TYPES) counts[type] = side.troops[type].count;
  return counts;
}

function withCounts(side: Side, counts: Record<TroopType, number>): Side {
  const troops = { ...side.troops };
  for (const type of TROOP_TYPES) {
    troops[type] = { ...side.troops[type], count: Math.max(0, Math.round(counts[type])) };
  }
  return { ...side, troops };
}

export interface CastleEngagement {
  /** Which garrison squad this was, 1-based. */
  index: number;
  label: string;
  battle: BattleResult;
  /** Rally troops still standing when this squad was finished with. */
  attackerRemaining: number;
  /** Garrison troops still standing in this squad. */
  defenderRemaining: number;
}

export interface CastleAssaultOptions extends SimulateOptions {
  /** Turret fire on whichever side is holding the structure. Defaults to none. */
  turret?: Partial<TurretFire>;
  /** Casualty policy for the report split; defaults to King's Castle. */
  policy?: CasualtyPolicy;
  infirmaryCapacity?: number;
}

export interface CastleAssaultResult {
  engagements: CastleEngagement[];
  /** Turret losses taken by the garrison before the rally landed. */
  turret: TurretAttrition;
  attackerLosses: number;
  /** Battle losses across every garrison squad, excluding the turret attrition. */
  defenderBattleLosses: number;
  attackerSurvivors: number;
  defenderSurvivors: number;
  /** Garrison squads emptied, out of those defending. */
  squadsCleared: number;
  /** True when the rally emptied the whole garrison and still had troops left. */
  structureTaken: boolean;
  killDeathRatio: number;
  attackerCasualties: CasualtyBreakdown;
  defenderCasualties: CasualtyBreakdown;
}

const KINGS_CASTLE =
  CASUALTY_POLICIES.find((policy) => policy.id === 'kings-castle') ?? CASUALTY_POLICIES[0];

/**
 * One rally against a structure held by several garrison squads.
 *
 * The game does not pool a structure's defenders into one army: each garrisoned march fights as
 * itself, so the rally works through them in the order given and carries its survivors from squad to
 * squad. Turret fire is applied to the garrison first, since the turrets have been firing for the
 * whole hold before the rally arrives.
 */
export function simulateCastleAssault(
  rally: Side,
  garrison: Side[],
  options: CastleAssaultOptions = {},
): CastleAssaultResult {
  const fire: TurretFire = { ...DEFAULT_TURRET_FIRE, ...options.turret };
  const engagements: CastleEngagement[] = [];

  const garrisonTotalBefore = garrison.reduce(
    (acc, squad) => acc + TROOP_TYPES.reduce((sum, type) => sum + squad.troops[type].count, 0),
    0,
  );
  const turret = turretAttrition(
    garrison.reduce(
      (acc, squad) => {
        for (const type of TROOP_TYPES) acc[type] += squad.troops[type].count;
        return acc;
      },
      { infantry: 0, cavalry: 0, archer: 0 } as Record<TroopType, number>,
    ),
    fire,
  );

  let attackerCounts = countsOf(rally);
  const attackerPerType = { infantry: 0, cavalry: 0, archer: 0 } as Record<TroopType, number>;
  const defenderPerType = { ...turret.perType };
  let attackerLosses = 0;
  let defenderBattleLosses = 0;
  let defenderSurvivors = 0;
  let squadsCleared = 0;

  garrison.forEach((squad, index) => {
    const standing = TROOP_TYPES.reduce((sum, type) => sum + attackerCounts[type], 0);
    const squadCounts = countsOf(squad);
    // Turret fire is shared out across the garrison in proportion to each squad's size.
    for (const type of TROOP_TYPES) squadCounts[type] *= 1 - turret.fractionLost;
    const squadTotal = TROOP_TYPES.reduce((sum, type) => sum + squadCounts[type], 0);
    if (squadTotal <= 0) {
      squadsCleared += 1;
      return;
    }
    if (standing <= 0) {
      defenderSurvivors += squadTotal;
      return;
    }

    const battle = simulateBattle(withCounts(rally, attackerCounts), withCounts(squad, squadCounts), options);
    attackerLosses += battle.attackerCasualties.total;
    defenderBattleLosses += battle.defenderCasualties.total;
    defenderSurvivors += battle.defenderCasualties.survivors;
    if (battle.defenderCasualties.survivors <= 0) squadsCleared += 1;

    const next = { infantry: 0, cavalry: 0, archer: 0 } as Record<TroopType, number>;
    for (const type of TROOP_TYPES) {
      attackerPerType[type] += battle.attackerCasualties.perType[type];
      defenderPerType[type] += battle.defenderCasualties.perType[type];
      next[type] = Math.max(0, attackerCounts[type] - battle.attackerCasualties.perType[type]);
    }
    attackerCounts = next;

    engagements.push({
      index: index + 1,
      label: squad.label,
      battle,
      attackerRemaining: Math.round(TROOP_TYPES.reduce((sum, type) => sum + attackerCounts[type], 0)),
      defenderRemaining: Math.round(battle.defenderCasualties.survivors),
    });
  });

  const attackerSurvivors = TROOP_TYPES.reduce((sum, type) => sum + attackerCounts[type], 0);
  const policy = options.policy ?? KINGS_CASTLE;
  const defenderLosses = defenderBattleLosses + turret.total;

  return {
    engagements,
    turret,
    attackerLosses,
    defenderBattleLosses,
    attackerSurvivors,
    defenderSurvivors,
    squadsCleared,
    structureTaken: garrison.length > 0 && defenderSurvivors <= 0 && attackerSurvivors > 0,
    killDeathRatio: attackerLosses > 0 ? defenderLosses / attackerLosses : Infinity,
    attackerCasualties: splitCasualties(
      {
        perType: attackerPerType,
        total: attackerLosses,
        fraction: attackerLosses / Math.max(1, TROOP_TYPES.reduce((sum, type) => sum + rally.troops[type].count, 0)),
        survivors: attackerSurvivors,
      },
      policy,
      options.infirmaryCapacity,
    ),
    defenderCasualties: splitCasualties(
      {
        perType: defenderPerType,
        total: defenderLosses,
        fraction: defenderLosses / Math.max(1, garrisonTotalBefore),
        survivors: defenderSurvivors,
      },
      policy,
      options.infirmaryCapacity,
    ),
  };
}
