import type { Side, StatBonuses, TroopType } from '../types';

export interface FormationPreset {
  id: string;
  label: string;
  ratio: Record<TroopType, number>;
  note: string;
}

/**
 * Community-recommended starting formations. These are rules of thumb, not optimal solutions - the
 * formation sweep exists precisely because the best split depends on what the enemy brought.
 */
export const FORMATION_PRESETS: FormationPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced 50/20/30',
    ratio: { infantry: 50, cavalry: 20, archer: 30 },
    note: 'The default for rallies, PvP, Alliance Championship and Swordland Showdown.',
  },
  {
    id: 'city-defence',
    label: 'City defence 60/15/25',
    ratio: { infantry: 60, cavalry: 15, archer: 25 },
    note: 'Standard garrison split across all hero generations.',
  },
  {
    id: 'heavy-defence',
    label: 'Heavy defence 70/10/20',
    ratio: { infantry: 70, cavalry: 10, archer: 20 },
    note: 'When you expect to be hit by much bigger marches.',
  },
  {
    id: 'bear',
    label: 'Bear hunt 10/10/80',
    ratio: { infantry: 10, cavalry: 10, archer: 80 },
    note: 'Archers carry the damage; keep a token infantry/cavalry share so all three hero bonuses apply.',
  },
  {
    id: 'bear-gen4',
    label: 'Bear hunt, Gen 4+ 1/10/89',
    ratio: { infantry: 1, cavalry: 10, archer: 89 },
    note: 'Later generations push the archer share even higher.',
  },
  {
    id: 'vs-infantry',
    label: 'vs Infantry 30/20/50',
    ratio: { infantry: 30, cavalry: 20, archer: 50 },
    note: 'Archers counter infantry.',
  },
  {
    id: 'vs-cavalry',
    label: 'vs Cavalry 60/10/30',
    ratio: { infantry: 60, cavalry: 10, archer: 30 },
    note: 'Infantry counter cavalry.',
  },
  {
    id: 'vs-archers',
    label: 'vs Archers 30/50/20',
    ratio: { infantry: 30, cavalry: 50, archer: 20 },
    note: 'Cavalry counter archers.',
  },
];

export function emptyBonuses(): StatBonuses {
  return { all: {}, infantry: {}, cavalry: {}, archer: {} };
}

/**
 * A mid/late-game account as a starting point: T10 troops with the kind of totals a developed
 * account carries. Replace the bonuses with your own from the in-game stat screens.
 */
export function defaultSide(label: string): Side {
  return {
    label,
    troops: {
      infantry: { count: 50000, tier: 10, tg: 0 },
      cavalry: { count: 20000, tier: 10, tg: 0 },
      archer: { count: 30000, tier: 10, tg: 0 },
    },
    bonuses: {
      all: { attack: 150, defense: 150, lethality: 120, health: 120 },
      infantry: {},
      cavalry: {},
      archer: {},
    },
    leaderEffects: [],
    joiners: [],
  };
}
