import type { TroopType } from './data/troopBaseStats';

export type { TroopType };

/** The four combat stats. */
export interface StatBlock {
  attack: number;
  defense: number;
  lethality: number;
  health: number;
}

/** Percentage bonuses (as percent, e.g. 150 means +150%). */
export type StatBonus = Partial<StatBlock>;

/**
 * All the flat percentage bonuses an account brings: research, city buffs, governor gear and
 * charms, hero gear, hero widgets, pet skills, etc. In game these all add together, so the
 * simulator only needs the totals - "all troops" plus any troop-type-specific extras.
 */
export interface StatBonuses {
  all: StatBonus;
  infantry: StatBonus;
  cavalry: StatBonus;
  archer: StatBonus;
}

export interface TroopGroup {
  count: number;
  /** Troop tier, 1-11. */
  tier: number;
  /** Troop grade (the TG0-TG5 upgrade track). */
  tg: number;
}

export type TroopComposition = Record<TroopType, TroopGroup>;

/**
 * A skill effect as the game's buff engine sees it. `op` is the effect_op identifier: effects
 * sharing an op add together, effects with different ops multiply. Getting this right is the
 * single biggest lever in rally/garrison planning.
 */
export type EffectKind = 'DamageUp' | 'DefenseUp' | 'OppDamageDown' | 'OppDefenseDown';

/** Which troops an effect covers. Troop-specific skills only fire for that row. */
export type EffectScope = 'all' | TroopType;

/**
 * Whose troop type `scope` names: the skill owner's ("Archers' Attack up") or the enemy's
 * ("Damage Dealt to Archer up").
 */
export type ScopeSide = 'self' | 'enemy';

/** Modes a skill is restricted to. Rally skills only help a rally; defender skills only a garrison. */
export type SkillCondition = 'always' | 'rally' | 'defender';

export interface SkillEffect {
  kind: EffectKind;
  /** effect_op identifier (e.g. 101 = "lethality" DamageUp, 102 = "attack" DamageUp). */
  op: number;
  /** Magnitude in percent at the configured skill level. */
  value: number;
  /** Defaults to 'all'. */
  scope?: EffectScope;
  /** Defaults to 'self'. */
  scopeSide?: ScopeSide;
  /** Set for proc skills: `value` is then the expected magnitude, chance x published magnitude. */
  chance?: number;
  /** Skill name, so the UI can explain a multiplier. */
  label?: string;
}

/** Where a skill comes from: the hero's expedition skills or their widget (exclusive weapon). */
export type SkillSource = 'expedition' | 'widget';

/** One published skill effect, with a magnitude per skill level rather than a single number. */
export interface HeroSkillEffect {
  kind: EffectKind;
  op: number;
  scope: EffectScope;
  scopeSide: ScopeSide;
  condition: SkillCondition;
  /** Magnitude in percent, indexed alongside the skill's `levels`. */
  values: number[];
  /** Proc chance in percent per level, when the skill only fires some of the time. */
  chances?: number[];
}

export interface HeroSkill {
  name: string;
  /** Skill text as published, at maxed level. */
  text: string;
  source: SkillSource;
  /** The levels `values` is indexed by: 1-5 for expedition skills, 2/4/6/8/10 for widget skills. */
  levels: number[];
  effects: HeroSkillEffect[];
  /** Why the skill is not in the formula, when it cannot be: a turn timer, a dodge, an economy buff. */
  unmodelled?: string;
}

/**
 * A hero talent: a flat troop-stat buff (Born Leader, Power of the Deer) that raises the same
 * Attack/Defense/Lethality/Health the stat screen shows rather than entering the damage formula.
 *
 * Kept for reference only. Bonus Details already includes the talents of the heroes you had
 * slotted, so applying these again would double-count them.
 */
export interface HeroTalent {
  name: string;
  text: string;
  scope: EffectScope;
  /** Bonus at each star rating, index 0 being 1 star. */
  stars: StatBonus[];
}

export interface Hero {
  id: string;
  name: string;
  /** Troop type the hero leads, which decides which row their squad joins. */
  troopClass: TroopType;
  rarity: string;
  /** Expedition skills plus, for mythic heroes, the widget skill. */
  skills: HeroSkill[];
  talents: HeroTalent[];
}

/**
 * A master skill that raises troop stats. Values come from the published per-level tables, so unlike
 * hero skills these are exact for a given level rather than a maxed-skill estimate.
 */
export interface MasterSkill {
  id: string;
  name: string;
  scope: 'all' | TroopType;
  /** Bonus at each level, index 0 being Lv.1. */
  levels: StatBonus[];
  /** Set when the game only grants the skill in specific modes, so it is off by default. */
  onlyIn?: string;
}

export interface Master {
  id: string;
  name: string;
  /** Class shown in game, e.g. Battle Master. */
  title: string;
  /** Only the skills that move troop stats; economy skills cannot affect a battle. */
  troopSkills: MasterSkill[];
}

/** A master skill the account has, at the level it is trained to. */
export interface MasterSkillLevel {
  skillId: string;
  level: number;
}

export interface Side {
  label: string;
  troops: TroopComposition;
  bonuses: StatBonuses;
  /** Skill effects from the leader trio, widgets and other non-stat skill sources. */
  leaderEffects: SkillEffect[];
  /** Joiner hero ids (max 4 are counted by the game). */
  joiners: string[];
  /**
   * Heroes leading or riding with this march, for their flat troop-stat skills. Separate from
   * `joiners`, which is about rally skills - a hero can contribute both.
   */
  statSkillHeroIds?: string[];
  /**
   * Set when `bonuses` was copied off an in-game stat screen that already included those hero
   * skills, so they must not be counted a second time.
   */
  statScreenIncludesHeroSkills?: boolean;
  /** Trained master skills that buff troops, with the level each is at. */
  masterSkills?: MasterSkillLevel[];
  /** As above, for master skills already included in the copied `bonuses`. */
  statScreenIncludesMasterSkills?: boolean;
}

export type BattleRole = 'attacker' | 'defender';

/** Per-troop-type resolved stats plus the side's aggregate values. */
export interface ResolvedArmy {
  label: string;
  perType: Record<TroopType, { count: number; stats: StatBlock }>;
  totalTroops: number;
  /** Troop-count-weighted aggregate, shown in the UI for comparison with battle reports. */
  aggregate: StatBlock;
  /** Every skill effect the side brings, lineup plus joiners. */
  effects: SkillEffect[];
  /** Headline SkillMod, counting every skill regardless of which troops it covers. */
  skillMod: SkillModBreakdown;
}

export interface SkillModBreakdown {
  damageUp: number;
  defenseUp: number;
  oppDamageDown: number;
  oppDefenseDown: number;
  /** (DamageUp x OppDefenseDown) / (OppDamageDown x DefenseUp), using the opponent's defensive terms. */
  value: number;
  /** Per-op subtotals, so the UI can explain where a multiplier came from. */
  detail: Record<EffectKind, Record<number, number>>;
}
