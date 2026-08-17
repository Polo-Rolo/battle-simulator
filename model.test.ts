import { describe, expect, it } from 'vitest';
import {
  applyReportSide,
  defaultSideForm,
  profileToForm,
  setBonusDetail,
  toSide,
  totalBonuses,
  withJoiners,
  type Profile,
} from './model';
import { parseBattleReport } from '../ocr/battleReport';

const REPORT = parseBattleReport([
  '207,132 Squad 1,381,138',
  'Lv.10.0',
  '103,566 41,426 62,140 473,239 306,164 601,735',
  '+1090.0% Infantry Attack +422.4%',
  '+1483.9% Infantry Health +378.1%',
]);

describe('applyReportSide', () => {
  const form = defaultSideForm('Attacker');

  it('sets counts, ratio and tier from the report', () => {
    const next = applyReportSide(form, REPORT.left, { bonuses: false, troops: true });
    expect(next.total).toBe(207132);
    expect(next.ratio).toEqual({ infantry: 50, cavalry: 20, archer: 30 });
    expect(next.tier).toBe(10);
    expect(next.bonusDetails).toBe(form.bonusDetails);
  });

  it('replaces the grid, because report percentages are totals', () => {
    const next = applyReportSide(form, REPORT.right, { bonuses: true, troops: false });
    expect(next.bonusDetails.infantry).toEqual({ attack: 422.4, health: 378.1 });
    expect(next.bonusDetails.cavalry).toEqual({});
    expect(next.total).toBe(form.total);
  });

  it('feeds the engine the imported totals', () => {
    const side = toSide(applyReportSide(form, REPORT.left, { bonuses: true, troops: true }));
    expect(side.troops.infantry.count).toBe(103566);
    expect(side.troops.cavalry.count).toBe(41426);
    expect(side.troops.archer.count).toBe(62140);
    expect(side.troops.infantry.tier).toBe(10);
    expect(side.bonuses.infantry.attack).toBeCloseTo(1090, 6);
  });

  it('switches extras off, since the report totals already contain them', () => {
    const buffed = defaultSideForm('Attacker');
    buffed.extras = [{ id: 'b1', label: 'Attack boost', scope: 'all', bonus: { attack: 25 }, active: true }];
    const next = applyReportSide(buffed, REPORT.right, { bonuses: true, troops: false });
    expect(next.extras.every((item) => !item.active)).toBe(true);
  });
});

describe('stat totals', () => {
  it('come from the grid, with extras counted only while ticked', () => {
    let form = defaultSideForm('Attacker');
    form = setBonusDetail(form, 'infantry', 'attack', 500);
    form.extras = [
      { id: 'b1', label: 'Attack boost', scope: 'all', bonus: { attack: 25 }, active: false },
      { id: 'b2', label: 'Lethality boost', scope: 'infantry', bonus: { lethality: 10 }, active: true },
    ];
    expect(totalBonuses(form).infantry.attack).toBe(500);
    expect(totalBonuses(form).all.attack).toBeUndefined();
    expect(totalBonuses(form).infantry.lethality).toBe(310);

    form.extras[0].active = true;
    expect(totalBonuses(form).all.attack).toBe(25);
  });
});

describe('hero lineup', () => {
  it('reaches the engine as skill effects at the published value for each star rating', () => {
    const form = defaultSideForm('Attacker');
    form.heroes.lineup[0] = { heroId: 'chenko', level: 80, star: 5, widget: 0 };
    form.heroes.lineup[1] = { heroId: 'amane', level: 80, star: 3, widget: 0 };
    const side = toSide(form);
    expect(side.leaderEffects).toEqual([
      expect.objectContaining({ kind: 'DamageUp', op: 101, value: 25 }),
      expect.objectContaining({ kind: 'DefenseUp', op: 113, value: 20 }),
      expect.objectContaining({ kind: 'DamageUp', op: 102, value: 15 }),
    ]);
    // Joiner ids stay empty: the lineup already resolved every effect, stars included.
    expect(side.joiners).toEqual([]);
  });

  it('takes only the first skill from a joiner', () => {
    const form = withJoiners(defaultSideForm('Attacker'), ['saul']);
    // Taskforce Training is one skill carrying two effect_ops; Saul's later skills stay behind.
    expect(toSide(form).leaderEffects).toEqual([
      expect.objectContaining({ kind: 'DefenseUp', op: 111, value: 10 }),
      expect.objectContaining({ kind: 'DefenseUp', op: 112, value: 15 }),
    ]);
  });
});

describe('profileToForm', () => {
  it('keeps the side name and fills in anything an older save lacks', () => {
    const saved = defaultSideForm('My account');
    saved.total = 250000;
    const partial = { ...saved } as Profile['form'] & { extras?: unknown };
    delete (partial as { extras?: unknown }).extras;
    const form = profileToForm({ id: 'p1', name: 'My account', form: partial }, 'Defender');
    expect(form.label).toBe('Defender');
    expect(form.total).toBe(250000);
    expect(Array.isArray(form.extras)).toBe(true);
    expect(form.heroes.lineup).toHaveLength(3);
  });
});
