import { HEROES_BY_ID, MAX_JOINERS, MAX_SKILL_LEVEL } from './data/heroes';
import type { BattleRole, Hero, HeroSkill, HeroSkillEffect, SkillEffect } from './types';

/**
 * Star ratings run 1-5. Stars are what unlocks skill levels, so a hero's star rating is read as the
 * level of every skill they have - which is how the published 5-level tables are laid out.
 */
export const MAX_STAR = MAX_SKILL_LEVEL;

/** Hero levels cap at 80 in game; the level does not change a skill's percentage. */
export const MAX_HERO_LEVEL = 80;

/** Widget (exclusive weapon) levels for mythic heroes. */
export const MAX_WIDGET_LEVEL = 10;

/** The march's own lineup: lead hero plus two support heroes. */
export const LINEUP_SLOTS = 3;

/**
 * One hero as the player has them built. `level` is kept because it is what the hero screen shows and
 * what march capacity scales with, but it deliberately does not feed the skill percentages: the
 * published values are per skill level, which stars gate, not per hero level.
 */
export interface HeroSlot {
  heroId: string;
  level: number;
  star: number;
  /** Widget level, for mythic heroes with an exclusive weapon. 0 for everyone else. */
  widget: number;
}

export function emptyHeroSlot(): HeroSlot {
  return { heroId: '', level: MAX_HERO_LEVEL, star: MAX_STAR, widget: 0 };
}

export interface HeroLineup {
  /** Slot 1 is the lead hero; slots 2 and 3 ride with it. */
  lineup: HeroSlot[];
  /** Heroes joining this march's rally, i.e. other players' lead heroes. */
  joiners: HeroSlot[];
}

export function emptyHeroLineup(): HeroLineup {
  return {
    lineup: Array.from({ length: LINEUP_SLOTS }, emptyHeroSlot),
    joiners: Array.from({ length: MAX_JOINERS }, emptyHeroSlot),
  };
}

/**
 * Index into a skill's published table for a given build. Expedition tables are indexed by skill
 * level, widget tables by widget level - and widget tables skip levels (2/4/6/8/10), so a widget
 * sitting between two rows counts as the lower one. Returns -1 when the skill is not unlocked yet.
 */
export function skillLevelIndex(skill: HeroSkill, slot: HeroSlot): number {
  const level = skill.source === 'widget' ? Math.round(slot.widget) : Math.round(slot.star);
  let index = -1;
  skill.levels.forEach((step, at) => {
    if (level >= step) index = at;
  });
  return index;
}

/**
 * The magnitude one published effect contributes at a given build, in percent.
 *
 * Proc skills are folded to their expected value (chance x magnitude) because the model resolves
 * aggregate rounds rather than individual swings; the Monte Carlo mode's proc variance is what puts
 * the spread back. A skill's chance is sometimes what the level table scales and sometimes not, which
 * is why both are stored.
 */
export function effectValue(effect: HeroSkillEffect, index: number): number {
  const magnitude = effect.values[index] ?? 0;
  const chance = effect.chances?.[index];
  const value = chance === undefined ? magnitude : (magnitude * chance) / 100;
  return Number(value.toFixed(4));
}

/** Whether a mode-restricted skill fires for the side it belongs to. */
export function conditionApplies(effect: HeroSkillEffect, side: BattleRole): boolean {
  if (effect.condition === 'rally') return side === 'attacker';
  if (effect.condition === 'defender') return side === 'defender';
  return true;
}

/**
 * The skills a hero brings, given where they are standing.
 *
 * A hero in your own lineup brings their expedition skills, and their widget skill too if the widget
 * is levelled. A joiner brings only their first expedition skill: the game takes the lead hero's
 * first skill from each joining march, ignores the rest, and never counts a joiner's widget.
 */
export function activeSkills(hero: Hero, role: 'lineup' | 'joiner'): HeroSkill[] {
  const expedition = hero.skills.filter((skill) => skill.source === 'expedition');
  if (role === 'joiner') return expedition.slice(0, 1);
  return hero.skills;
}

/** What one hero contributes to the battle formula, at the star and widget level they are built to. */
export function slotEffects(slot: HeroSlot, role: 'lineup' | 'joiner', side: BattleRole): SkillEffect[] {
  const hero = HEROES_BY_ID[slot.heroId];
  if (!hero) return [];
  const effects: SkillEffect[] = [];
  for (const skill of activeSkills(hero, role)) {
    const index = skillLevelIndex(skill, slot);
    if (index < 0) continue;
    for (const effect of skill.effects) {
      if (!conditionApplies(effect, side)) continue;
      const value = effectValue(effect, index);
      if (value === 0) continue;
      effects.push({
        kind: effect.kind,
        op: effect.op,
        value,
        scope: effect.scope,
        scopeSide: effect.scopeSide,
        label: `${hero.name}: ${skill.name}`,
        ...(effect.chances ? { chance: effect.chances[index] } : {}),
      });
    }
  }
  return effects;
}

/**
 * Every skill effect a side's heroes bring: its own lineup plus up to four joiners. A joiner's second
 * and third skills are ignored on purpose - only the lead hero's first skill travels with a joining
 * march.
 */
export function lineupEffects(lineup: HeroLineup, side: BattleRole): SkillEffect[] {
  return [
    ...lineup.lineup.slice(0, LINEUP_SLOTS).flatMap((slot) => slotEffects(slot, 'lineup', side)),
    ...lineup.joiners.slice(0, MAX_JOINERS).flatMap((slot) => slotEffects(slot, 'joiner', side)),
  ];
}
