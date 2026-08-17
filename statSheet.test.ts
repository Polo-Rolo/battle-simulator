import { describe, expect, it } from 'vitest';
import { parseStatSheet } from './statSheet';

describe('parseStatSheet', () => {
  it('reads one stat per line with a troop scope', () => {
    const sheet = parseStatSheet(
      ['Infantry Attack 152.5%', 'Infantry Defense 148%', 'Infantry Lethality 120%', 'Infantry Health 130%'].join('\n'),
    );
    expect(sheet.rows).toEqual([
      { scope: 'infantry', bonus: { attack: 152.5, defense: 148, lethality: 120, health: 130 } },
    ]);
    expect(sheet.unread).toEqual([]);
  });

  it('carries a bare troop heading down to the stats under it', () => {
    const sheet = parseStatSheet(['Cavalry', 'Attack +40%', 'Defense +35%', 'Archer', 'Attack +10%'].join('\n'));
    expect(sheet.rows).toEqual([
      { scope: 'cavalry', bonus: { attack: 40, defense: 35 } },
      { scope: 'archer', bonus: { attack: 10 } },
    ]);
  });

  it('pairs a stat label with a percentage on the following line', () => {
    const sheet = parseStatSheet(['All Troops', 'Lethality', '62.5%', 'Health', '58%'].join('\n'));
    expect(sheet.rows).toEqual([{ scope: 'all', bonus: { lethality: 62.5, health: 58 } }]);
  });

  it('repairs digits and stat words that OCR mangled', () => {
    // "1S2.5%" for 152.5, "Lethaiity" for Lethality, "Defence" spelling, detached percent sign.
    const sheet = parseStatSheet(['Infantry Attack 1S2.5%', 'Infantry Lethaiity 12O %', 'Infantry Defence 9O%'].join('\n'));
    expect(sheet.rows).toEqual([{ scope: 'infantry', bonus: { attack: 152.5, lethality: 120, defense: 90 } }]);
  });

  it('defaults to all troops and takes several stats from one line', () => {
    const sheet = parseStatSheet('Attack 10% Defense 20%');
    expect(sheet.stats).toEqual([
      { scope: 'all', stat: 'attack', value: 10, raw: 'Attack 10% Defense 20%' },
      { scope: 'all', stat: 'defense', value: 20, raw: 'Attack 10% Defense 20%' },
    ]);
  });

  it('reports percentages it could not attach to a stat', () => {
    const sheet = parseStatSheet(['Construction Speed 25%', 'Attack 10%'].join('\n'));
    expect(sheet.rows).toEqual([{ scope: 'all', bonus: { attack: 10 } }]);
    expect(sheet.unread).toEqual(['Construction Speed 25%']);
  });

  it('keeps the larger value when a stat is read twice', () => {
    const sheet = parseStatSheet(['Attack 10%', 'Attack 110%'].join('\n'));
    expect(sheet.rows).toEqual([{ scope: 'all', bonus: { attack: 110 } }]);
  });

  it('ignores text with no percentages', () => {
    const sheet = parseStatSheet('Kingdom 123\nAlliance KSA\n');
    expect(sheet.stats).toEqual([]);
    expect(sheet.rows).toEqual([]);
    expect(sheet.unread).toEqual([]);
  });
});
