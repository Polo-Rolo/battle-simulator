import type { Master, MasterSkill, StatBonus } from '../types';

/**
 * Master skills that move troop stats, transcribed from the published skill tables on
 * kingshot.net/database/masters. Economy and event-scoring skills are deliberately absent: they do
 * not touch a battle. Percentages are per skill level, index 0 being Lv.1.
 */

/** Most skill tables step by a fixed amount per level. */
function linear(maxLevel: number, perLevel: StatBonus): StatBonus[] {
  return Array.from({ length: maxLevel }, (_, index) => {
    const level = index + 1;
    const bonus: StatBonus = {};
    for (const [stat, step] of Object.entries(perLevel) as [keyof StatBonus, number][]) {
      bonus[stat] = Number((step * level).toFixed(2));
    }
    return bonus;
  });
}

const SWORDLAND = 'Swordland Showdown and Swordland Summit League only';
const ARENA = 'Arena battles only';

export const MASTERS: Master[] = [
  {
    id: 'cassia',
    name: 'Cassia',
    title: 'Battle Master',
    troopSkills: [
      {
        id: 'firepower-to-win',
        name: 'Firepower to Win',
        scope: 'all',
        levels: linear(20, { attack: 0.5, defense: 0.5 }),
      },
      {
        id: 'commando',
        name: 'Commando',
        scope: 'all',
        levels: linear(20, { lethality: 0.5, health: 0.5 }),
      },
    ],
  },
  {
    id: 'guinevere',
    name: 'Guinevere',
    title: 'Queen of Holy Sword',
    troopSkills: [
      {
        id: 'holy-sword-domain',
        name: 'Holy Sword Domain',
        scope: 'all',
        onlyIn: SWORDLAND,
        // Expertise passive, and the one table that is not a fixed step per level.
        levels: [2, 4, 6, 9, 12, 15, 18, 21, 24, 27, 30].map((value) => ({ attack: value, defense: value })),
      },
      {
        id: 'royal-guidance',
        name: 'Royal Guidance',
        scope: 'all',
        onlyIn: SWORDLAND,
        levels: linear(20, { lethality: 1.5, health: 1.5 }),
      },
    ],
  },
  {
    id: 'roman',
    name: 'Roman',
    title: 'Arena Champion',
    troopSkills: [
      // "Escorts' Arena Battle Attack and Health", i.e. the escorting troops rather than the hero.
      {
        id: 'teacher-of-champions',
        name: 'Teacher of Champions',
        scope: 'all',
        onlyIn: ARENA,
        levels: linear(10, { attack: 2, health: 2 }),
      },
      {
        id: 'one-desire',
        name: 'One Desire',
        scope: 'all',
        onlyIn: ARENA,
        levels: linear(10, { attack: 2, health: 2 }),
      },
    ],
  },
];

export const MASTER_SKILLS: (MasterSkill & { masterId: string; masterName: string })[] = MASTERS.flatMap((master) =>
  master.troopSkills.map((skill) => ({ ...skill, masterId: master.id, masterName: master.name })),
);

export const MASTER_SKILLS_BY_ID = Object.fromEntries(MASTER_SKILLS.map((skill) => [skill.id, skill]));
