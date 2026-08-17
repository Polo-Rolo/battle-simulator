import {
  BASE_DEFENSE,
  BASE_LETHALITY,
  MAX_TG,
  MAX_TIER,
  MIN_TG,
  MIN_TIER,
  TROOP_BASE_STATS,
  TROOP_TYPES,
} from './data/troopBaseStats';
import { HEROES_BY_ID } from './data/heroes';
import { MASTER_SKILLS_BY_ID } from './data/masters';
import { emptyBonuses } from './data/presets';
import { collectSideEffects, skillMod } from './effects';
import type { MasterSkillLevel, ResolvedArmy, Side, StatBlock, StatBonuses, TroopType } from './types';

const STAT_KEYS = ['attack', 'defense', 'lethality', 'health'] as const;

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function baseStats(type: TroopType, tier: number, tg: number): StatBlock {
  const entry = TROOP_BASE_STATS[type][clampInt(tier, MIN_TIER, MAX_TIER)][clampInt(tg, MIN_TG, MAX_TG)];
  return { attack: entry.attack, health: entry.health, defense: BASE_DEFENSE, lethality: BASE_LETHALITY };
}

/**
 * Applies account bonuses to a troop type's base stats. Research, city buffs, gear, charms and
 * widgets all add together in game, so the "all troops" bonus and the type-specific bonus are
 * summed before being applied once.
 */
export function effectiveStats(type: TroopType, tier: number, tg: number, bonuses: StatBonuses): StatBlock {
  const base = baseStats(type, tier, tg);
  const all = bonuses.all;
  const specific = bonuses[type];
  const scale = (stat: keyof StatBlock) => 1 + ((all[stat] ?? 0) + (specific[stat] ?? 0)) / 100;
  return {
    attack: base.attack * scale('attack'),
    defense: base.defense * scale('defense'),
    lethality: base.lethality * scale('lethality'),
    health: base.health * scale('health'),
  };
}

/** Splits a march into troop counts from a percentage ratio, preserving the total exactly. */
export function countsFromRatio(total: number, ratio: Record<TroopType, number>): Record<TroopType, number> {
  const sum = TROOP_TYPES.reduce((acc, type) => acc + Math.max(0, ratio[type]), 0);
  if (sum <= 0) return { infantry: 0, cavalry: 0, archer: 0 };
  const counts = {} as Record<TroopType, number>;
  let assigned = 0;
  TROOP_TYPES.forEach((type, index) => {
    if (index === TROOP_TYPES.length - 1) {
      counts[type] = Math.max(0, total - assigned);
      return;
    }
    counts[type] = Math.floor((total * Math.max(0, ratio[type])) / sum);
    assigned += counts[type];
  });
  return counts;
}

/**
 * Totals the talents of the heroes leading or riding with a march (Born Leader, Power of the Deer) at
 * max stars. Duplicate ids are ignored: a hero can only be in the line-up once.
 *
 * Bonus Details already includes these for the heroes you had slotted, so the simplified flow never
 * calls this - it exists for callers that build a side from stat rows that predate the report.
 */
export function heroStatBonuses(heroIds: string[]): StatBonuses {
  const bonuses = emptyBonuses();
  for (const id of new Set(heroIds)) {
    for (const talent of HEROES_BY_ID[id]?.talents ?? []) {
      const target = bonuses[talent.scope];
      const maxed = talent.stars[talent.stars.length - 1] ?? {};
      for (const stat of STAT_KEYS) {
        const value = maxed[stat];
        if (value) target[stat] = (target[stat] ?? 0) + value;
      }
    }
  }
  return bonuses;
}

/**
 * Totals the trained master skills that buff troops (Cassia's Firepower to Win, Commando). Levels
 * are clamped to the published table and levels below 1 contribute nothing.
 */
export function masterStatBonuses(skills: MasterSkillLevel[]): StatBonuses {
  const bonuses = emptyBonuses();
  for (const { skillId, level } of skills) {
    const skill = MASTER_SKILLS_BY_ID[skillId];
    if (!skill || level < 1) continue;
    const bonus = skill.levels[Math.min(Math.round(level), skill.levels.length) - 1];
    const target = bonuses[skill.scope];
    for (const stat of STAT_KEYS) {
      const value = bonus[stat];
      if (value) target[stat] = (target[stat] ?? 0) + value;
    }
  }
  return bonuses;
}

export function addBonuses(a: StatBonuses, b: StatBonuses): StatBonuses {
  const sum = emptyBonuses();
  for (const scope of ['all', ...TROOP_TYPES] as const) {
    for (const stat of STAT_KEYS) {
      const value = (a[scope][stat] ?? 0) + (b[scope][stat] ?? 0);
      if (value) sum[scope][stat] = value;
    }
  }
  return sum;
}

/**
 * The bonuses a side actually fights with: what was entered, plus its heroes' and masters'
 * troop-stat skills - unless those numbers were read off a stat screen that already included them,
 * which is the normal case for your own city leader and the easiest way to double-count a buff.
 */
export function sideBonuses(side: Side): StatBonuses {
  let bonuses = side.bonuses;
  if (!side.statScreenIncludesHeroSkills) {
    bonuses = addBonuses(bonuses, heroStatBonuses(side.statSkillHeroIds ?? []));
  }
  if (!side.statScreenIncludesMasterSkills) {
    bonuses = addBonuses(bonuses, masterStatBonuses(side.masterSkills ?? []));
  }
  return bonuses;
}

export function resolveArmy(side: Side, opponent: Side): ResolvedArmy {
  const perType = {} as ResolvedArmy['perType'];
  const effects = collectSideEffects(side.leaderEffects, side.joiners);
  const opponentEffects = collectSideEffects(opponent.leaderEffects, opponent.joiners);
  const bonuses = sideBonuses(side);
  let totalTroops = 0;
  for (const type of TROOP_TYPES) {
    const group = side.troops[type];
    const count = Math.max(0, Math.round(group.count));
    perType[type] = { count, stats: effectiveStats(type, group.tier, group.tg, bonuses) };
    totalTroops += count;
  }

  const aggregate: StatBlock = { attack: 0, defense: 0, lethality: 0, health: 0 };
  if (totalTroops > 0) {
    for (const type of TROOP_TYPES) {
      const { count, stats } = perType[type];
      const weight = count / totalTroops;
      aggregate.attack += stats.attack * weight;
      aggregate.defense += stats.defense * weight;
      aggregate.lethality += stats.lethality * weight;
      aggregate.health += stats.health * weight;
    }
  }

  return {
    label: side.label,
    perType,
    totalTroops,
    aggregate,
    effects,
    skillMod: skillMod(effects, opponentEffects),
  };
}
