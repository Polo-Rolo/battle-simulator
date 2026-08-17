import type { BattleRole, HeroLineup, Side, StatBonus, StatBonuses, TroopType } from '../engine';
import {
  countsFromRatio,
  emptyBonuses,
  emptyHeroLineup,
  emptyHeroSlot,
  lineupEffects,
  LINEUP_SLOTS,
  MAX_JOINERS,
  MAX_STAR,
  TROOP_TYPES,
} from '../engine';
import type { ReportSide } from '../ocr/battleReport';

export const STATS = ['attack', 'defense', 'lethality', 'health'] as const;

export type StatKey = (typeof STATS)[number];

/** The twelve percentages a battle report's Bonus Details lists: four stats per troop type. */
export type BonusDetails = Record<TroopType, StatBonus>;

/**
 * A bonus the report's percentages do not already contain - a pet skill you were not running, an
 * attack booster you plan to fire. Ticked per fight, so one profile covers buffed and unbuffed
 * marches.
 */
export interface ExtraBonus {
  id: string;
  label: string;
  scope: 'all' | TroopType;
  bonus: StatBonus;
  active: boolean;
}

export interface SideForm {
  label: string;
  /** Total march size; per-type counts come from the ratio. */
  total: number;
  ratio: Record<TroopType, number>;
  /** Troop level, i.e. tier T1-T11. */
  tier: number;
  /** Troop grade (the TG0-TG5 upgrade track). */
  tg: number;
  /**
   * The single source of truth for stats. Copied off a recent battle report, so it already contains
   * research, hero and governor gear, charms, widgets, masters, pets and slotted hero stat skills -
   * which is exactly why nothing else in this form may add to it.
   */
  bonusDetails: BonusDetails;
  /** Heroes leading this march and joining its rally, for skill procs and rally maths. */
  heroes: HeroLineup;
  extras: ExtraBonus[];
}

let nextId = 0;
export function newId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

/**
 * Placeholder percentages in the shape a report shows them, so the fields are self-explanatory before
 * anything has been imported. Replace them with your own report's numbers.
 */
export function defaultBonusDetails(): BonusDetails {
  const details = {} as BonusDetails;
  for (const type of TROOP_TYPES) {
    details[type] = { attack: 400, defense: 400, lethality: 300, health: 350 };
  }
  return details;
}

/**
 * Extras start empty and inactive: the game's item list changes every event and no per-pet table is
 * published, so the percentage has to come off the item or pet screen itself.
 */
export function defaultExtras(): ExtraBonus[] {
  const extra = (label: string): ExtraBonus => ({
    id: newId('extra'),
    label,
    scope: 'all',
    bonus: {},
    active: false,
  });
  return [extra('Pet bonus'), extra('Attack boost item'), extra('Defense boost item'), extra('Lethality boost item')];
}

export function defaultSideForm(label: string, ratio?: Record<TroopType, number>): SideForm {
  return {
    label,
    total: 100000,
    ratio: ratio ?? { infantry: 50, cavalry: 20, archer: 30 },
    tier: 10,
    tg: 0,
    bonusDetails: defaultBonusDetails(),
    heroes: emptyHeroLineup(),
    extras: defaultExtras(),
  };
}

export function setBonusDetail(form: SideForm, type: TroopType, stat: StatKey, value: number): SideForm {
  return {
    ...form,
    bonusDetails: { ...form.bonusDetails, [type]: { ...form.bonusDetails[type], [stat]: value } },
  };
}

/** Bonus Details plus whichever extras are ticked. Nothing else reaches the troop stats. */
export function totalBonuses(form: SideForm): StatBonuses {
  const bonuses = emptyBonuses();
  for (const type of TROOP_TYPES) {
    for (const stat of STATS) {
      const value = form.bonusDetails[type][stat];
      if (value) bonuses[type][stat] = (bonuses[type][stat] ?? 0) + value;
    }
  }
  for (const extra of form.extras) {
    if (!extra.active) continue;
    for (const stat of STATS) {
      const value = extra.bonus[stat];
      if (value) bonuses[extra.scope][stat] = (bonuses[extra.scope][stat] ?? 0) + value;
    }
  }
  return bonuses;
}

/**
 * Turns a form into an engine side. `side` decides whether rally-only or defender-only hero skills
 * count, since the same hero contributes differently marching and holding.
 */
export function toSide(form: SideForm, side: BattleRole = 'attacker'): Side {
  const counts = countsFromRatio(Math.max(0, Math.round(form.total)), form.ratio);
  const troops = {} as Side['troops'];
  for (const type of TROOP_TYPES) {
    troops[type] = { count: counts[type], tier: form.tier, tg: form.tg };
  }
  return {
    label: form.label,
    troops,
    bonuses: totalBonuses(form),
    // Hero skills are resolved here, so the engine's own joiner lookup stays out of it: the lineup
    // knows each hero's star rating, which the bare hero ids the engine takes cannot express.
    leaderEffects: lineupEffects(form.heroes, side),
    joiners: [],
  };
}

/** Replaces the joiner slots with a list of hero ids, keeping them at max stars. */
export function withJoiners(form: SideForm, heroIds: string[]): SideForm {
  const joiners = Array.from({ length: MAX_JOINERS }, (_, slot) => {
    const heroId = heroIds[slot] ?? '';
    const current = form.heroes.joiners[slot] ?? emptyHeroSlot();
    return { ...current, heroId, star: heroId === '' ? current.star : MAX_STAR };
  });
  return { ...form, heroes: { ...form.heroes, joiners } };
}

/**
 * Folds one side of a battle report into a side form. Bonus Details are per-troop-type totals, so they
 * land straight in the grid; any all-troops rows the report showed are spread across the three types,
 * which is how the game applies them. Extras are switched off, since the report's percentages already
 * contain whatever was buffed during that fight.
 */
export function applyReportSide(
  form: SideForm,
  side: ReportSide,
  options: { bonuses: boolean; troops: boolean },
): SideForm {
  const next: SideForm = { ...form };
  if (options.bonuses) {
    const scopes = Object.keys(side.bonuses) as (keyof typeof side.bonuses)[];
    if (scopes.length > 0) {
      const details = {} as BonusDetails;
      for (const type of TROOP_TYPES) {
        const bonus: StatBonus = {};
        for (const stat of STATS) {
          const value = (side.bonuses[type]?.[stat] ?? 0) + (side.bonuses.all?.[stat] ?? 0);
          if (value) bonus[stat] = Number(value.toFixed(2));
        }
        details[type] = bonus;
      }
      next.bonusDetails = details;
      next.extras = form.extras.map((extra) => ({ ...extra, active: false }));
    }
  }
  if (options.troops) {
    const counts = side.counts;
    if (counts) {
      const total = TROOP_TYPES.reduce((acc, type) => acc + counts[type], 0);
      next.total = side.squad ?? total;
      if (total > 0) {
        next.ratio = Object.fromEntries(
          TROOP_TYPES.map((type) => [type, Number(((counts[type] / total) * 100).toFixed(2))]),
        ) as Record<TroopType, number>;
      }
    } else if (side.squad !== undefined) {
      next.total = side.squad;
    }
    if (side.tier !== undefined) next.tier = side.tier;
  }
  return next;
}

export interface Scenario {
  name: string;
  attacker: SideForm;
  defender: SideForm;
}

const STORAGE_KEY = 'kingshot-sim-scenarios';

export function loadScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Scenario[]).map((scenario) => ({
      ...scenario,
      attacker: normalizeForm(scenario.attacker, scenario.attacker?.label ?? 'Attacker'),
      defender: normalizeForm(scenario.defender, scenario.defender?.label ?? 'Defender'),
    }));
  } catch {
    return [];
  }
}

export function saveScenarios(scenarios: Scenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // Private-mode browsers block localStorage; scenarios just don't persist.
  }
}

/**
 * One saved loadout - your own account, a teammate's, a known enemy - that can be loaded into either
 * side. Stats change rarely, so entering them once and picking a profile per fight is the point.
 */
export interface Profile {
  id: string;
  name: string;
  form: SideForm;
}

const PROFILE_KEY = 'kingshot-sim-profiles';

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Profile[]) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  } catch {
    // Private-mode browsers block localStorage; profiles just don't persist.
  }
}

/**
 * Fills in anything a stored form predates, so a save from an older version cannot leave the form with
 * missing fields. The side keeps the name it is being loaded into rather than the stored one.
 */
export function normalizeForm(form: SideForm | undefined, label: string): SideForm {
  const base = defaultSideForm(label);
  if (!form) return base;
  const heroes: HeroLineup = {
    lineup: Array.from({ length: LINEUP_SLOTS }, (_, slot) => form.heroes?.lineup?.[slot] ?? emptyHeroSlot()),
    joiners: Array.from({ length: MAX_JOINERS }, (_, slot) => form.heroes?.joiners?.[slot] ?? emptyHeroSlot()),
  };
  const bonusDetails = { ...base.bonusDetails };
  for (const type of TROOP_TYPES) {
    if (form.bonusDetails?.[type]) bonusDetails[type] = form.bonusDetails[type];
  }
  return {
    ...base,
    ...form,
    label,
    bonusDetails,
    extras: form.extras ?? base.extras,
    heroes,
  };
}

export function profileToForm(profile: Profile, label: string): SideForm {
  return normalizeForm(profile.form, label);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '\u221e';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPercent(fraction: number, fractionDigits = 1): string {
  if (!Number.isFinite(fraction)) return '\u221e';
  return `${(fraction * 100).toFixed(fractionDigits)}%`;
}
