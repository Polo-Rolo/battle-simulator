import type { SideCasualties } from './battle';

/**
 * How casualties are split after the fight. Only the ratios Century Games documents are marked
 * `sourced`; the rest are editable estimates, because the full per-location table has never been
 * published in text form.
 *
 * Troops only actually die in three situations: a direct city attack, a full infirmary (overflow), and
 * a level 4 outpost. Everywhere else casualties are injuries, so those policies carry a zero death
 * rate and deaths appear only through infirmary overflow.
 */
export interface CasualtyPolicy {
  id: string;
  label: string;
  /** Fraction of casualties that die outright, before infirmary overflow. */
  deathRate: number;
  /** Fraction that is only lightly injured and heals for free. */
  lightlyInjuredRate: number;
  sourced: boolean;
  note: string;
}

export const CASUALTY_POLICIES: CasualtyPolicy[] = [
  {
    id: 'town-center-attack',
    label: 'Attacking a player Town Center (attacker)',
    deathRate: 0.35,
    lightlyInjuredRate: 0.15,
    sourced: true,
    note: 'Official Combat FAQ: 35% of the attacker\u2019s casualties die. The lightly-injured share is an estimate.',
  },
  {
    id: 'kings-castle',
    label: "King's Castle",
    deathRate: 0,
    lightlyInjuredRate: 0.15,
    sourced: true,
    note: 'Official Combat FAQ: all casualties go to the infirmary until it is full, then further casualties die.',
  },
  {
    id: 'outpost-l4',
    label: 'Level 4 outpost',
    deathRate: 0.1,
    lightlyInjuredRate: 0.6,
    sourced: false,
    note: 'Player-reported: about 10% of casualties die and 30% are heavily injured, leaving 60% lightly injured.',
  },
  {
    id: 'field-pvp',
    label: 'Open-field PvP / rally',
    deathRate: 0,
    lightlyInjuredRate: 0.2,
    sourced: false,
    note:
      'No deaths outside a direct city attack, a full infirmary or a level 4 outpost, so casualties here are injuries - ' +
      'deaths appear only once the infirmary overflows. The injured/lightly-injured split is an estimate.',
  },
  {
    id: 'garrison',
    label: 'Garrison / city defence',
    deathRate: 0,
    lightlyInjuredRate: 0.25,
    sourced: false,
    note: 'Defending is injuries only until the infirmary fills. The injured/lightly-injured split is an estimate.',
  },
];

export interface CasualtyBreakdown {
  total: number;
  dead: number;
  infirmary: number;
  lightlyInjured: number;
  /** Casualties converted to deaths because the infirmary was full. */
  overflowDead: number;
}

export function splitCasualties(
  casualties: SideCasualties,
  policy: CasualtyPolicy,
  infirmaryCapacity?: number,
): CasualtyBreakdown {
  const total = casualties.total;
  const lightlyInjured = total * policy.lightlyInjuredRate;
  let dead = total * policy.deathRate;
  let infirmary = total - lightlyInjured - dead;
  let overflowDead = 0;
  if (infirmaryCapacity !== undefined && infirmary > infirmaryCapacity) {
    overflowDead = infirmary - infirmaryCapacity;
    infirmary = infirmaryCapacity;
    dead += overflowDead;
  }
  return { total, dead, infirmary, lightlyInjured, overflowDead };
}
