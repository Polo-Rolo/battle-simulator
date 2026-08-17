import { describe, expect, it } from 'vitest';
import {
  addBonuses,
  baseStats,
  countsFromRatio,
  effectiveStats,
  heroStatBonuses,
  masterStatBonuses,
  resolveArmy,
  sideBonuses,
} from './army';
import { MASTERS } from './data/masters';
import { defaultSide, emptyBonuses } from './data/presets';
import type { Side, StatBonuses } from './types';

describe('base stats', () => {
  it('uses the datamined combat values, not the in-game display values', () => {
    expect(baseStats('infantry', 10, 0)).toEqual({ attack: 472, defense: 10, lethality: 10, health: 1416 });
    expect(baseStats('archer', 10, 0)).toEqual({ attack: 1888, defense: 10, lethality: 10, health: 354 });
  });

  it('keeps defense and lethality fixed at 10 across every tier and grade', () => {
    for (const tier of [1, 5, 11]) {
      for (const tg of [0, 3, 5]) {
        const stats = baseStats('cavalry', tier, tg);
        expect(stats.defense).toBe(10);
        expect(stats.lethality).toBe(10);
      }
    }
  });

  it('clamps out-of-range tiers and grades instead of throwing', () => {
    expect(baseStats('infantry', 99, 99)).toEqual(baseStats('infantry', 11, 5));
    expect(baseStats('infantry', 0, -3)).toEqual(baseStats('infantry', 1, 0));
  });
});

describe('effectiveStats', () => {
  it('adds the all-troop bonus to the type-specific bonus before applying it', () => {
    const bonuses: StatBonuses = { ...emptyBonuses(), all: { attack: 100 }, archer: { attack: 50 } };
    expect(effectiveStats('archer', 10, 0, bonuses).attack).toBeCloseTo(1888 * 2.5);
    expect(effectiveStats('infantry', 10, 0, bonuses).attack).toBeCloseTo(472 * 2);
  });
});

describe('countsFromRatio', () => {
  it('splits a march by percentage and preserves the total exactly', () => {
    const counts = countsFromRatio(100000, { infantry: 50, cavalry: 20, archer: 30 });
    expect(counts).toEqual({ infantry: 50000, cavalry: 20000, archer: 30000 });
  });

  it('normalises ratios that do not sum to 100', () => {
    const counts = countsFromRatio(300, { infantry: 1, cavalry: 1, archer: 1 });
    expect(counts.infantry + counts.cavalry + counts.archer).toBe(300);
  });

  it('returns an empty march for a degenerate ratio', () => {
    expect(countsFromRatio(1000, { infantry: 0, cavalry: 0, archer: 0 })).toEqual({
      infantry: 0,
      cavalry: 0,
      archer: 0,
    });
  });
});

describe('hero troop-stat skills', () => {
  it('reads the skill percentages off the hero data', () => {
    // Amadeus: Born Leader, +15% Lethality/Health to all soldiers.
    expect(heroStatBonuses(['amadeus']).all).toEqual({ lethality: 15, health: 15 });
    // Helga: Power of the Deer, +10% Attack/Defense to all squads.
    expect(heroStatBonuses(['helga']).all).toEqual({ attack: 10, defense: 10 });
  });

  it('adds skills from different heroes and ignores a hero listed twice', () => {
    expect(heroStatBonuses(['amadeus', 'helga']).all).toEqual({
      attack: 10,
      defense: 10,
      lethality: 15,
      health: 15,
    });
    expect(heroStatBonuses(['amadeus', 'amadeus'])).toEqual(heroStatBonuses(['amadeus']));
  });

  it('contributes nothing for heroes without a troop-stat skill or unknown ids', () => {
    expect(heroStatBonuses(['chenko', 'nobody'])).toEqual(emptyBonuses());
  });

  it('adds hero skills to the entered bonuses, or skips them when the stat screen already had them', () => {
    const side: Side = { ...defaultSide('A'), statSkillHeroIds: ['amadeus'] };
    expect(sideBonuses(side).all.lethality).toBe(120 + 15);
    expect(sideBonuses({ ...side, statScreenIncludesHeroSkills: true }).all.lethality).toBe(120);
  });

  it('feeds through to the resolved troop stats', () => {
    const plain = resolveArmy(defaultSide('A'), defaultSide('B'));
    const buffed = resolveArmy({ ...defaultSide('A'), statSkillHeroIds: ['helga'] }, defaultSide('B'));
    // +10% attack on top of +150% is 260/250 of the plain value.
    expect(buffed.aggregate.attack / plain.aggregate.attack).toBeCloseTo(2.6 / 2.5, 10);
    expect(buffed.aggregate.lethality).toBeCloseTo(plain.aggregate.lethality, 10);
  });

  it('sums two bonus sets scope by scope', () => {
    const combined = addBonuses(
      { ...emptyBonuses(), all: { attack: 10 }, archer: { health: 5 } },
      { ...emptyBonuses(), all: { attack: 15, defense: 20 } },
    );
    expect(combined.all).toEqual({ attack: 25, defense: 20 });
    expect(combined.archer).toEqual({ health: 5 });
  });
});

describe('master troop-stat skills', () => {
  it('reads the published per-level tables', () => {
    // Cassia, Firepower to Win: +0.5% Attack/Defense per level, 20 levels.
    expect(masterStatBonuses([{ skillId: 'firepower-to-win', level: 1 }]).all).toEqual({ attack: 0.5, defense: 0.5 });
    expect(masterStatBonuses([{ skillId: 'firepower-to-win', level: 20 }]).all).toEqual({ attack: 10, defense: 10 });
    // Guinevere's expertise passive does not step evenly.
    expect(masterStatBonuses([{ skillId: 'holy-sword-domain', level: 4 }]).all).toEqual({ attack: 9, defense: 9 });
    // Roman's two arena skills stack: +2% Attack/Health each per level.
    expect(
      masterStatBonuses([
        { skillId: 'teacher-of-champions', level: 10 },
        { skillId: 'one-desire', level: 10 },
      ]).all,
    ).toEqual({ attack: 40, health: 40 });
  });

  it('sums skills and ignores untrained, unknown or over-max levels', () => {
    expect(
      masterStatBonuses([
        { skillId: 'firepower-to-win', level: 10 },
        { skillId: 'commando', level: 10 },
        { skillId: 'royal-guidance', level: 0 },
        { skillId: 'not-a-skill', level: 20 },
      ]).all,
    ).toEqual({ attack: 5, defense: 5, lethality: 5, health: 5 });
    expect(masterStatBonuses([{ skillId: 'commando', level: 99 }])).toEqual(
      masterStatBonuses([{ skillId: 'commando', level: 20 }]),
    );
  });

  it('adds to the entered bonuses unless the stat screen already had them', () => {
    const side: Side = { ...defaultSide('A'), masterSkills: [{ skillId: 'commando', level: 20 }] };
    expect(sideBonuses(side).all.health).toBe(120 + 10);
    expect(sideBonuses({ ...side, statScreenIncludesMasterSkills: true }).all.health).toBe(120);
  });

  it('is suppressed independently of the hero-skill toggle', () => {
    const side: Side = {
      ...defaultSide('A'),
      statSkillHeroIds: ['amadeus'],
      masterSkills: [{ skillId: 'commando', level: 20 }],
      statScreenIncludesHeroSkills: true,
    };
    expect(sideBonuses(side).all.health).toBe(120 + 10);
  });

  it('only lists skills that move troop stats', () => {
    for (const master of MASTERS) {
      for (const skill of master.troopSkills) {
        expect(skill.levels.length).toBeGreaterThan(0);
        for (const level of skill.levels) {
          expect(Object.values(level).some((value) => value > 0)).toBe(true);
        }
      }
    }
  });
});

describe('resolveArmy', () => {
  it('weights the aggregate stats by troop count, matching how battle reports read', () => {
    const resolved = resolveArmy(defaultSide('A'), defaultSide('B'));
    expect(resolved.totalTroops).toBe(100000);
    // +150% attack on a 50/20/30 split of T10 troops.
    const expectedAttack = (0.5 * 472 + 0.2 * 1416 + 0.3 * 1888) * 2.5;
    expect(resolved.aggregate.attack).toBeCloseTo(expectedAttack, 3);
  });
});
