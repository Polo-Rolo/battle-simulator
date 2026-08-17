import { HEROES_BY_ID, MAX_JOINERS } from './data/heroes';
import type { EffectKind, SkillEffect, SkillModBreakdown, TroopType } from './types';

const KINDS: EffectKind[] = ['DamageUp', 'DefenseUp', 'OppDamageDown', 'OppDefenseDown'];

export type EffectBuckets = Record<EffectKind, Record<number, number>>;

export function emptyBuckets(): EffectBuckets {
  return { DamageUp: {}, DefenseUp: {}, OppDamageDown: {}, OppDefenseDown: {} };
}

/** Sums effect magnitudes into per-kind, per-effect_op buckets. */
export function bucketEffects(effects: SkillEffect[]): EffectBuckets {
  const buckets = emptyBuckets();
  for (const effect of effects) {
    const bucket = buckets[effect.kind];
    bucket[effect.op] = (bucket[effect.op] ?? 0) + effect.value;
  }
  return buckets;
}

/**
 * Collapses one bucket into a multiplier: values sharing an effect_op add, different ops multiply.
 *
 * This is why mixing joiners beats stacking clones - 4x Chenko (all op 101) gives 1 + 100/100 = 2.00,
 * while 2x Chenko + 2x Amane (ops 101 and 102) gives 1.5 x 1.5 = 2.25.
 */
export function combineBucket(bucket: Record<number, number>): number {
  return Object.values(bucket).reduce((product, value) => product * (1 + value / 100), 1);
}

/** Resolves a side's own DamageUp / DefenseUp / OppDamageDown / OppDefenseDown multipliers. */
export function sideMultipliers(effects: SkillEffect[]) {
  const buckets = bucketEffects(effects);
  return {
    buckets,
    damageUp: combineBucket(buckets.DamageUp),
    defenseUp: combineBucket(buckets.DefenseUp),
    oppDamageDown: combineBucket(buckets.OppDamageDown),
    oppDefenseDown: combineBucket(buckets.OppDefenseDown),
  };
}

/**
 * Whether a troop-specific effect covers a given exchange. `scope` names either the skill owner's
 * troops ("Archers' Attack up") or the enemy's ("Damage Dealt to Archer up"), so both types are
 * needed to decide.
 */
export function effectApplies(effect: SkillEffect, ownType: TroopType, enemyType: TroopType): boolean {
  const scope = effect.scope ?? 'all';
  if (scope === 'all') return true;
  return scope === ((effect.scopeSide ?? 'self') === 'self' ? ownType : enemyType);
}

/**
 * SkillMod = (DamageUp x OppDefenseDown) / (OppDamageDown x DefenseUp)
 *
 * DamageUp and OppDefenseDown come from the side dealing the damage; DefenseUp and OppDamageDown
 * come from the side taking it.
 *
 * Troop-specific skills are ignored here, because "the side's SkillMod" is not a single number once
 * a skill only covers one row - use `skillModAgainst` for what the battle actually resolves. This
 * stays as the headline figure the UI shows next to a side.
 */
export function skillMod(ownEffects: SkillEffect[], opponentEffects: SkillEffect[]): SkillModBreakdown {
  const own = sideMultipliers(ownEffects);
  const opponent = sideMultipliers(opponentEffects);
  const detail = emptyBuckets();
  for (const kind of KINDS) detail[kind] = { ...own.buckets[kind] };
  return {
    damageUp: own.damageUp,
    oppDefenseDown: own.oppDefenseDown,
    defenseUp: opponent.defenseUp,
    oppDamageDown: opponent.oppDamageDown,
    value: (own.damageUp * own.oppDefenseDown) / (opponent.oppDamageDown * opponent.defenseUp),
    detail,
  };
}

/**
 * SkillMod for one exchange: attacking troop type against the enemy row it engages. Only the skills
 * that cover that pairing count, so Rosa's archer-only Attack buff lifts her archers' kills and
 * nothing else.
 */
export function skillModAgainst(
  ownEffects: SkillEffect[],
  opponentEffects: SkillEffect[],
  attackType: TroopType,
  targetType: TroopType,
): SkillModBreakdown {
  return skillMod(
    ownEffects.filter((effect) => effectApplies(effect, attackType, targetType)),
    // From the opponent's point of view its own troops are the target row and we are the enemy.
    opponentEffects.filter((effect) => effectApplies(effect, targetType, attackType)),
  );
}

/**
 * The effects a joining march contributes, given only its lead hero's id: that hero's first
 * expedition skill, at maxed skill level. Used by saved scenarios that stored joiner ids rather than
 * full hero builds; unknown ids are ignored so old scenarios survive data updates.
 */
export function joinerEffects(heroId: string): SkillEffect[] {
  const skill = HEROES_BY_ID[heroId]?.skills.find((entry) => entry.source === 'expedition');
  if (!skill) return [];
  const top = skill.levels.length - 1;
  return skill.effects.map((effect) => {
    const chance = effect.chances?.[top];
    const magnitude = effect.values[top] ?? 0;
    return {
      kind: effect.kind,
      op: effect.op,
      value: chance === undefined ? magnitude : (magnitude * chance) / 100,
      scope: effect.scope,
      scopeSide: effect.scopeSide,
      label: `${HEROES_BY_ID[heroId].name}: ${skill.name}`,
    };
  });
}

/**
 * All skill effects a side brings: its leader/widget effects plus the first skills of up to four
 * joiners.
 */
export function collectSideEffects(leaderEffects: SkillEffect[], joinerIds: string[]): SkillEffect[] {
  return [...leaderEffects, ...joinerIds.slice(0, MAX_JOINERS).flatMap(joinerEffects)];
}
