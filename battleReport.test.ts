import { describe, expect, it } from 'vitest';
import { parseBattleReport, reportedCasualties } from './battleReport';

/** Real tesseract output for the Battle Overview screenshot of a report mail, noise included. */
const OVERVIEW = `Plunder;
@1sam  P1BoM Jo &o
Battle|Overview,
#1636(404]Pol0 1660 [KFC Rabrotonum
X:608 Y:583 X:613 Y:586
« (9-1,073,104 (P-36,738,400
207,132 Squad 1,381,138
8,879 Losses 343,260
2,537 Injured 140,140
13,950 Lightly Injured @ 897,738
181,766 Residents 0
Bonus|Source 9`;

/** Real tesseract output for the Troop Power / Bonus Details screenshot of the same report. */
const BONUS_DETAILS = `iTiroop/Power/Comparison S)
© Infantry (EEE ED
A» cavalry
i Archer (IEEE D
L J Lv. 10.0 J, L J Lv. 10.0 8 it v. 10:08
103,566 41,426 62,140 473,239 306,164 601,735
Bonus|Details @
+1090.0% Infantry Attack +422.4%
Q +1108.9% Infantry Defense ~~ +400.0%
+1182.2% Infantry Lethality  +311.7%
+1483.9% Infantry Health +378.1%
+1145.0% Cavalry Attack +497.2%
+1060.9% Cavalry Defense +475.1%
+1241.6% Cavalry Lethality +312.7%
+1052.1% Cavalry Health +320.7%
+1098.7% Archer Attack +373.5%
+1054.3% Archer Defense +350.9%
+1374.3% Archer Lethality  +345.4%
+1067.9% Archer Health +314.6%`;

describe('parseBattleReport', () => {
  const report = parseBattleReport([OVERVIEW, BONUS_DETAILS]);

  it('splits the overview columns into own side and enemy', () => {
    expect(report.left).toMatchObject({
      squad: 207132,
      losses: 8879,
      injured: 2537,
      lightlyInjured: 13950,
      residents: 181766,
    });
    expect(report.right).toMatchObject({
      squad: 1381138,
      losses: 343260,
      injured: 140140,
      lightlyInjured: 897738,
      residents: 0,
    });
  });

  it('reads every bonus percentage for both sides', () => {
    expect(report.left.bonuses).toEqual({
      infantry: { attack: 1090, defense: 1108.9, lethality: 1182.2, health: 1483.9 },
      cavalry: { attack: 1145, defense: 1060.9, lethality: 1241.6, health: 1052.1 },
      archer: { attack: 1098.7, defense: 1054.3, lethality: 1374.3, health: 1067.9 },
    });
    expect(report.right.bonuses).toEqual({
      infantry: { attack: 422.4, defense: 400, lethality: 311.7, health: 378.1 },
      cavalry: { attack: 497.2, defense: 475.1, lethality: 312.7, health: 320.7 },
      archer: { attack: 373.5, defense: 350.9, lethality: 345.4, health: 314.6 },
    });
  });

  it('reads per-type counts that reconcile with the squad totals, and the troop tier', () => {
    expect(report.left.counts).toEqual({ infantry: 103566, cavalry: 41426, archer: 62140 });
    expect(report.right.counts).toEqual({ infantry: 473239, cavalry: 306164, archer: 601735 });
    expect(report.left.tier).toBe(10);
    expect(report.right.tier).toBe(10);
    expect(report.notes).toEqual([]);
  });

  it('sums only the casualty rows the chosen target covers', () => {
    expect(reportedCasualties(report.left, 'dead')).toBe(8879);
    expect(reportedCasualties(report.left, 'deadAndInfirmary')).toBe(11416);
    expect(reportedCasualties(report.left, 'all')).toBe(25366);
    expect(reportedCasualties(report.right, 'dead')).toBe(343260);
    expect(reportedCasualties(report.right, 'deadAndInfirmary')).toBe(483400);
    expect(reportedCasualties(report.right, 'all')).toBe(1381138);
  });

  it('swaps the count columns when their totals match the other side', () => {
    const swapped = parseBattleReport([
      '207,132 Squad 1,381,138',
      '473,239 306,164 601,735 103,566 41,426 62,140',
    ]);
    expect(swapped.left.counts).toEqual({ infantry: 103566, cavalry: 41426, archer: 62140 });
    expect(swapped.notes).toEqual([]);
  });

  it('flags counts that reconcile with neither side', () => {
    const wrong = parseBattleReport(['207,132 Squad 1,381,138', '100,000 100,000 100,000 200,000 200,000 200,000']);
    expect(wrong.notes).toHaveLength(2);
  });

  it('returns nothing for unrelated text', () => {
    expect(parseBattleReport(['Kingdom 123', 'Alliance KSA'])).toEqual({
      left: { bonuses: {} },
      right: { bonuses: {} },
      notes: [],
    });
  });
});
