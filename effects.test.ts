import { describe, expect, it } from 'vitest';
import { collectSideEffects, combineBucket, joinerEffects, skillMod, skillModAgainst } from './effects';
import type { SkillEffect } from './types';

/** The first-skill contribution of a set of joining marches, which is all the game counts. */
const joined = (...ids: string[]) => ids.flatMap(joinerEffects);

describe('effect_op stacking', () => {
  it('adds values that share an effect_op', () => {
    expect(combineBucket({ 101: 100 })).toBeCloseTo(2);
  });

  it('multiplies across different effect_ops', () => {
    expect(combineBucket({ 101: 50, 102: 50 })).toBeCloseTo(2.25);
  });

  // The worked examples the community published, which any correct implementation must reproduce.
  it('reproduces 4x Chenko = 2.00 and 2x Chenko + 2x Amane = 2.25', () => {
    const clones = skillMod(joined('chenko', 'chenko', 'chenko', 'chenko'), []);
    const mixed = skillMod(joined('chenko', 'chenko', 'amane', 'amane'), []);
    expect(clones.damageUp).toBeCloseTo(2);
    expect(mixed.damageUp).toBeCloseTo(2.25);
    expect(mixed.damageUp / clones.damageUp - 1).toBeCloseTo(0.125);
  });

  it('reproduces 3x Gordon + 1x Howard = 2.1 and 3x Howard + 1x Gordon = 2.0', () => {
    // Defensive terms belong to the opposing side, so they are read off the second argument.
    expect(skillMod([], joined('gordon', 'gordon', 'gordon', 'howard')).defenseUp).toBeCloseTo(2.1);
    expect(skillMod([], joined('howard', 'howard', 'howard', 'gordon')).defenseUp).toBeCloseTo(2.0);
  });

  it('reproduces 4x Saul (2.24) beating 4x Gordon (2.00) despite lower listed values', () => {
    const saul = skillMod([], joined('saul', 'saul', 'saul', 'saul'));
    const gordon = skillMod([], joined('gordon', 'gordon', 'gordon', 'gordon'));
    expect(saul.defenseUp).toBeCloseTo(2.24);
    expect(gordon.defenseUp).toBeCloseTo(2.0);
  });

  it('reproduces 5x Fahd halving the damage coefficient', () => {
    const attacker = skillMod([], joined('fahd', 'fahd', 'fahd', 'fahd', 'fahd'));
    expect(attacker.oppDamageDown).toBeCloseTo(2);
    expect(attacker.value).toBeCloseTo(0.5);
  });
});

describe('skillMod', () => {
  it('takes offensive terms from the attacker and defensive terms from the defender', () => {
    const attackerEffects: SkillEffect[] = [{ kind: 'DamageUp', op: 101, value: 50 }];
    const defenderEffects: SkillEffect[] = [
      { kind: 'DefenseUp', op: 111, value: 25 },
      { kind: 'OppDamageDown', op: 201, value: 20 },
    ];
    const mod = skillMod(attackerEffects, defenderEffects);
    expect(mod.damageUp).toBeCloseTo(1.5);
    expect(mod.defenseUp).toBeCloseTo(1.25);
    expect(mod.oppDamageDown).toBeCloseTo(1.2);
    expect(mod.value).toBeCloseTo(1.5 / (1.25 * 1.2));
  });

  it('is 1 with no skills at all', () => {
    expect(skillMod([], []).value).toBe(1);
  });
});

describe('skillModAgainst', () => {
  const archerOnly: SkillEffect[] = [{ kind: 'DamageUp', op: 102, value: 50, scope: 'archer', scopeSide: 'self' }];
  const versusArchers: SkillEffect[] = [{ kind: 'DamageUp', op: 103, value: 50, scope: 'archer', scopeSide: 'enemy' }];

  it('applies a troop-specific buff to that troop type only', () => {
    expect(skillModAgainst(archerOnly, [], 'archer', 'infantry').damageUp).toBeCloseTo(1.5);
    expect(skillModAgainst(archerOnly, [], 'cavalry', 'infantry').damageUp).toBeCloseTo(1);
  });

  it('reads a "damage dealt to X" buff against the enemy row, not the owner\u2019s', () => {
    expect(skillModAgainst(versusArchers, [], 'infantry', 'archer').damageUp).toBeCloseTo(1.5);
    expect(skillModAgainst(versusArchers, [], 'archer', 'infantry').damageUp).toBeCloseTo(1);
  });

  it('reads the defender\u2019s troop-specific mitigation from the row being hit', () => {
    const infantryGuard: SkillEffect[] = [
      { kind: 'DefenseUp', op: 112, value: 50, scope: 'infantry', scopeSide: 'self' },
    ];
    expect(skillModAgainst([], infantryGuard, 'cavalry', 'infantry').defenseUp).toBeCloseTo(1.5);
    expect(skillModAgainst([], infantryGuard, 'cavalry', 'archer').defenseUp).toBeCloseTo(1);
  });
});

describe('collectSideEffects', () => {
  it('counts at most four joiners, matching the rally cap', () => {
    const effects = collectSideEffects([], ['chenko', 'chenko', 'chenko', 'chenko', 'chenko']);
    expect(effects).toHaveLength(4);
  });

  it('ignores unknown hero ids so saved scenarios keep working', () => {
    expect(collectSideEffects([], ['not-a-hero', 'chenko'])).toHaveLength(1);
  });

  it('stacks leader effects with joiner effects', () => {
    const effects = collectSideEffects([{ kind: 'DamageUp', op: 102, value: 25 }], ['chenko']);
    expect(skillMod(effects, []).damageUp).toBeCloseTo(1.25 * 1.25);
  });
});
