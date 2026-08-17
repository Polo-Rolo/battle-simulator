import { describe, expect, it } from 'vitest';
import { HEROES_BY_ID, MAX_JOINERS } from './data/heroes';
import {
  MAX_STAR,
  MAX_WIDGET_LEVEL,
  activeSkills,
  emptyHeroLineup,
  lineupEffects,
  skillLevelIndex,
  slotEffects,
  type HeroSlot,
} from './lineup';

function slot(heroId: string, overrides: Partial<HeroSlot> = {}): HeroSlot {
  return { heroId, level: 80, star: MAX_STAR, widget: 0, ...overrides };
}

const skillOf = (heroId: string, name: string) => {
  const skill = HEROES_BY_ID[heroId].skills.find((entry) => entry.name === name);
  if (!skill) throw new Error(`${heroId} has no skill ${name}`);
  return skill;
};

describe('skillLevelIndex', () => {
  it('reads an expedition skill level off the star rating', () => {
    expect(skillLevelIndex(skillOf('chenko', 'Stand of Arms'), slot('chenko', { star: 3 }))).toBe(2);
    expect(skillLevelIndex(skillOf('chenko', 'Stand of Arms'), slot('chenko', { star: 0 }))).toBe(-1);
  });

  it('reads a widget skill off the widget level, rounding down to a published row', () => {
    const zeal = skillOf('helga', 'Zeal');
    expect(skillLevelIndex(zeal, slot('helga', { widget: 0 }))).toBe(-1);
    expect(skillLevelIndex(zeal, slot('helga', { widget: 5 }))).toBe(1);
    expect(skillLevelIndex(zeal, slot('helga', { widget: MAX_WIDGET_LEVEL }))).toBe(4);
  });
});

describe('slotEffects', () => {
  it('takes the published value for the star rating, not a guess at it', () => {
    const [effect] = slotEffects(slot('chenko', { star: 3 }), 'lineup', 'attacker').filter((e) => e.op === 101);
    expect(effect.value).toBe(15);
    expect(slotEffects(slot('chenko'), 'lineup', 'attacker').filter((e) => e.op === 101)[0].value).toBe(25);
  });

  it('folds a proc skill to its expected value, chance x magnitude', () => {
    const strike = slotEffects(slot('amadeus'), 'lineup', 'attacker').find((e) => e.op === 103);
    // Unrighteous Strike: 40% chance of +50% damage dealt at 5 stars.
    expect(strike).toMatchObject({ kind: 'DamageUp', value: 20, chance: 40 });
  });

  it('applies a widget skill only once the widget is levelled', () => {
    const unlevelled = slotEffects(slot('helga'), 'lineup', 'attacker');
    const levelled = slotEffects(slot('helga', { widget: MAX_WIDGET_LEVEL }), 'lineup', 'attacker');
    expect(unlevelled.some((effect) => effect.label === 'Helga: Zeal')).toBe(false);
    expect(levelled).toContainEqual(
      expect.objectContaining({ label: 'Helga: Zeal', op: 101, value: 15 }),
    );
  });

  it('gives a rally-only widget skill to the attacker and not the defender', () => {
    const build = slot('helga', { widget: MAX_WIDGET_LEVEL });
    expect(slotEffects(build, 'lineup', 'attacker').some((e) => e.label === 'Helga: Zeal')).toBe(true);
    expect(slotEffects(build, 'lineup', 'defender').some((e) => e.label === 'Helga: Zeal')).toBe(false);
  });

  it('takes only the first expedition skill from a joining march, and never its widget', () => {
    const build = slot('amadeus', { widget: MAX_WIDGET_LEVEL });
    expect(activeSkills(HEROES_BY_ID['amadeus'], 'joiner')).toHaveLength(1);
    expect(slotEffects(build, 'joiner', 'attacker')).toEqual([
      expect.objectContaining({ label: 'Amadeus: Battle Ready', op: 101, value: 25 }),
    ]);
  });

  it('contributes nothing for an empty or unknown slot', () => {
    expect(slotEffects(slot(''), 'lineup', 'attacker')).toEqual([]);
    expect(slotEffects(slot('not-a-hero'), 'lineup', 'attacker')).toEqual([]);
  });

  it('leaves skills the model cannot express out rather than approximating them', () => {
    // Amane's Exorcism fires every few turns, so it has no place in an aggregate per-round model.
    expect(skillOf('amane', 'Exorcism').unmodelled).toBeTruthy();
    expect(slotEffects(slot('amane'), 'lineup', 'attacker').map((effect) => effect.label)).toEqual([
      'Amane: Tri-Phalanx',
    ]);
  });
});

describe('lineupEffects', () => {
  it('collects the lineup plus at most four joiners', () => {
    const lineup = emptyHeroLineup();
    lineup.lineup[0] = slot('chenko');
    lineup.joiners = Array.from({ length: MAX_JOINERS + 2 }, () => slot('amane'));
    const effects = lineupEffects(lineup, 'attacker');
    // Chenko brings both of his skills; each joiner brings only Tri-Phalanx.
    expect(effects.filter((effect) => effect.label?.startsWith('Chenko'))).toHaveLength(2);
    expect(effects.filter((effect) => effect.op === 102)).toHaveLength(MAX_JOINERS);
  });

  it('is empty until heroes are chosen', () => {
    expect(lineupEffects(emptyHeroLineup(), 'attacker')).toEqual([]);
  });
});
