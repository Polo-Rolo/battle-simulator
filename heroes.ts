import type { Hero } from '../types';

/**
 * Every hero's expedition skills, widget skill and talent, with the published per-skill-level and
 * per-widget-level values.
 *
 * Source: kingshotoptimizer.com/heroes (community-maintained, not official), transcribed per hero.
 *
 * Three kinds of skill live here and they are treated very differently:
 *
 * - Expedition skills go through the buff engine, so each one is mapped to the formula lever it
 *   pulls (DamageUp / DefenseUp / OppDamageDown / OppDefenseDown) and an effect_op. `values` is
 *   indexed by skill level 1-5, which is what the star rating gates.
 * - The widget skill is the same, indexed by the widget levels the table publishes. Widget *stats*
 *   are not here: those are troop percentages your Bonus Details already contains.
 * - Talents are flat troop-stat buffs (Born Leader, Power of the Deer). They are recorded for
 *   reference only, because Bonus Details already includes the ones your slotted heroes give.
 *
 * `effects: []` with an `unmodelled` reason means the skill is real but cannot be expressed in an
 * aggregate per-round model - a turn-timed strike, a dodge chance, an economy buff. The UI shows the
 * wording so nothing silently disappears, and nothing is invented to fill the gap.
 */
export const HEROES: Hero[] = [
  {
    id: "alcar",
    name: "Alcar",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Rescuing Hands",
        text: "Alcar's utter dedication to keeping his men safe is well-proved. Reduces Infantry and Archer's Damage Taken by 70% every 5 turns for 2 turns.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Praetorian Will",
        text: "The fighting belligerence of a Praetorian is something for others to study. Increases Infantry Damage Dealt by 100% and Cavalry and Archer's Damage Dealt by 10%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "infantry",
            scopeSide: "self",
            condition: "always",
            values: [20.0, 40.0, 60.0, 80.0, 100.0]
          },
          {
            kind: "DamageUp",
            op: 103,
            scope: "cavalry",
            scopeSide: "self",
            condition: "always",
            values: [2.0, 4.0, 6.0, 8.0, 10.0]
          },
          {
            kind: "DamageUp",
            op: 103,
            scope: "archer",
            scopeSide: "self",
            condition: "always",
            values: [2.0, 4.0, 6.0, 8.0, 10.0]
          }
        ]
      },
      {
        name: "Carpe Diem",
        text: "Years of training have taught Alcar how to exploit enemy weakness, increasing Infantry Damage Dealt per attack by 60% and target Damage Taken by 25% for 1 turn.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Vow of Honor",
        text: "There is power in the steadfast vow. Alcar increases Defender Squads' Health by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "amadeus",
    name: "Amadeus",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Battle Ready",
        text: "Young ranger Amadeus excels in boosting morale, increasing the total Squads' Lethality by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Way of the Blade",
        text: "Amadeus imparts the secrets of swordsmanship, increasing the total Squads' Attack by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Unrighteous Strike",
        text: "Amadeus' unique swordplay has a 40% chance of increasing damage dealt by 50% for all squads.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [50.0, 50.0, 50.0, 50.0, 50.0],
            chances: [8.0, 16.0, 24.0, 32.0, 40.0]
          }
        ]
      },
      {
        name: "Discernment",
        text: "Amadeus attacks in a sword-tailored formation, increasing Rally Attack by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: [
      {
        name: "Born Leader",
        text: "Amadeus inspires at all times even when absent, boosting the Lethality and Health for all deployed soldiers by 15%.",
        scope: "all",
        stars: [
          {
            lethality: 3.0,
            health: 3.0
          },
          {
            lethality: 6.0,
            health: 6.0
          },
          {
            lethality: 9.0,
            health: 9.0
          },
          {
            lethality: 12.0,
            health: 12.0
          },
          {
            lethality: 15.0,
            health: 15.0
          }
        ]
      }
    ]
  },
  {
    id: "amane",
    name: "Amane",
    troopClass: "archer",
    rarity: "epic",
    skills: [
      {
        name: "Tri-Phalanx",
        text: "Amane's trademark formation increases all Squads' total Attack by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Exorcism",
        text: "Amane's skill at warding off evil increases Infirmary Healing Speed by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "ava",
    name: "Ava",
    troopClass: "cavalry",
    rarity: "mythic",
    skills: [
      {
        name: "Dissolution",
        text: "An artist sees what others cannot. Ava's deconstructive gaze sees vulnerabilities, reducing total enemy Defense by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDefenseDown",
            op: 121,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Chiaroscuro",
        text: "Bright light and dark shadow can blind enemies who do not expect it. All enemy soldiers receive 50% increased damage for 2 turns every 4 turns.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Light and Cold",
        text: "Ava's weapons are like twin beacons for all to follow, increasing soldiers' Lethality by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Color Storm",
        text: "Ava's unique color dispatching system increases Rally Squad Lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "charles",
    name: "Charles",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Intimidation",
        text: "The terrifying presence of the massive Angel of Justice on the battlefield reduces enemy Squad's Total Lethality by 20%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDamageDown",
            op: 202,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Iron Bodies",
        text: "Superior metal armor forging blunts the impact of conventional weapons, reducing damage taken by all soldiers by 20%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Great Justice",
        text: "The Angel of Justice comes outfitted with state-of-the-art battlefield medkits, increasing Squad's total Health by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Shock and Awe",
        text: "Charles knows how to make a roaring entrance worthy of the massive Angel of Justice mech, increasing Defender Squad's Health by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "chenko",
    name: "Chenko",
    troopClass: "cavalry",
    rarity: "epic",
    skills: [
      {
        name: "Stand of Arms",
        text: "Chenko implements advanced weaponry for our soldiers, increasing the total Squads' Lethality by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Shield Wall",
        text: "Enhances troop armor with a keen engineering eye, reducing damage taken by 20% for all troops.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "diana",
    name: "Diana",
    troopClass: "archer",
    rarity: "epic",
    skills: [
      {
        name: "Iron Constitution",
        text: "The unique arts of the wilderness rangers reduce Governor Stamina Cost by 20%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Quick Paced",
        text: "Diana takes care of tough enemies with ease, increasing Hunting March Speed by 100%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "edwin",
    name: "Edwin",
    troopClass: "cavalry",
    rarity: "rare",
    skills: [
      {
        name: "Demolitions Expert",
        text: "Edwin uses his knowledge of minerals, increasing the Town's Quarry Output by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Stone Mining",
        text: "Edwin's expert quarrying techniques increases his Stone Mining Speed in the Wilderness by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "eric",
    name: "Eric",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Holy Warrior",
        text: "The purity of Eric's faith can cause even his enemies to stumble, reducing total Enemy Squads' Attack by 20%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDamageDown",
            op: 201,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Conviction",
        text: "Conviction is a shield for the righteous, reducing Squads' Damage Taken by 20%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Exhortation",
        text: "An inspiring leader can unlock new reserves of vitality. Eric increases total Squads' Health by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Vanguard",
        text: "A paladin must always lead by example from the front. Eric increases Defender Squad Defense by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DefenseUp",
            op: 111,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "fahd",
    name: "Fahd",
    troopClass: "cavalry",
    rarity: "epic",
    skills: [
      {
        name: "Desert Eclipse",
        text: "A rising cloud of sand is terrible for visibility, reducing all Enemy Squads' Damage Dealt by 20%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDamageDown",
            op: 203,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Pathfinder",
        text: "Fahd has always been a pathfinder for his warriors, increasing Solo Hunting March Speed by 100%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "forrest",
    name: "Forrest",
    troopClass: "infantry",
    rarity: "rare",
    skills: [
      {
        name: "Woodland Inheritor",
        text: "Forrest's expert lumberjack skills increase the Town's Sawmill Output by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Master Woodcutter",
        text: "Forrest utilizes his logging expertise, increasing Wood Gathering Speed in the Wilderness by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "gordon",
    name: "Gordon",
    troopClass: "cavalry",
    rarity: "epic",
    skills: [
      {
        name: "Super Nutrients",
        text: "Gordon's culinary masterpieces invigorate our soldiers, increasing total Squads' Health by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Trash Talk",
        text: "Beyond delicious meals, Gordon's trash talk increases the total Squads' Attack by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "helga",
    name: "Helga",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Oath of Guardian",
        text: "Helga has a 40% chance of reducing damage taken by 50% for all squads.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [50.0, 50.0, 50.0, 50.0, 50.0],
            chances: [8.0, 16.0, 24.0, 32.0, 40.0]
          }
        ]
      },
      {
        name: "Echoes of Valhalla",
        text: "Helga blows the horn to motivate the squad, increasing the total Squads' Attack by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Nature's Balance",
        text: "Helga invites everyone to embrace nature, increasing the total Squads' Lethality by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Zeal",
        text: "Helga joins the rally, increasing Rally Troops Lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: [
      {
        name: "Power of the Deer",
        text: "Helga's manifold talent bolsters all deployed soldiers' Attack and Defense by 10% even in her absence.",
        scope: "all",
        stars: [
          {
            attack: 2.0,
            defense: 2.0
          },
          {
            attack: 4.0,
            defense: 4.0
          },
          {
            attack: 6.0,
            defense: 6.0
          },
          {
            attack: 8.0,
            defense: 8.0
          },
          {
            attack: 10.0,
            defense: 10.0
          }
        ]
      }
    ]
  },
  {
    id: "hilde",
    name: "Hilde",
    troopClass: "cavalry",
    rarity: "mythic",
    skills: [
      {
        name: "Noble Path",
        text: "Hilde's exhaustive discipline develops soldiers into true weapons, increasing the total Squads' Attack and Defense by 15% and 10%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [3.0, 6.0, 9.0, 12.0, 15.0]
          },
          {
            kind: "DefenseUp",
            op: 111,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [2.0, 4.0, 6.0, 8.0, 10.0]
          }
        ]
      },
      {
        name: "Elixir of Strength",
        text: "Hilde uses her secret tonic to enhance the warriors' strength, granting all squads' attack a 25% chance of dealing 200% damage.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [20.0, 40.0, 60.0, 80.0, 100.0],
            chances: [25.0, 25.0, 25.0, 25.0, 25.0]
          }
        ]
      },
      {
        name: "Trial by Fire",
        text: "Hilde's devout prayer has a 40% chance of reducing damage taken by 50% for all squads.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [50.0, 50.0, 50.0, 50.0, 50.0],
            chances: [8.0, 16.0, 24.0, 32.0, 40.0]
          }
        ]
      },
      {
        name: "Fortitude",
        text: "Hilde's pious confidence in her cause is infectious, increasing Defender Squads' Health by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "howard",
    name: "Howard",
    troopClass: "infantry",
    rarity: "epic",
    skills: [
      {
        name: "Defenders' Edge",
        text: "Howard guards our troops with his shield, reducing damage taken by 20% for all troops.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Weaken",
        text: "Howard's intimidating presence reduces the total Enemy Squads' Attack by 20%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDamageDown",
            op: 201,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "jabel",
    name: "Jabel",
    troopClass: "cavalry",
    rarity: "mythic",
    skills: [
      {
        name: "Rally Flag",
        text: "Jabel, with her banner-like red armor, has a 40% chance of reducing damage taken by 50% for all squads.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [50.0, 50.0, 50.0, 50.0, 50.0],
            chances: [8.0, 16.0, 24.0, 32.0, 40.0]
          }
        ]
      },
      {
        name: "Hero's Domain",
        text: "Jabel, a fearless knight, grants all squads a 50% chance of dealing 50% more damage when attacking.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [50.0, 50.0, 50.0, 50.0, 50.0]
          }
        ]
      },
      {
        name: "Youthful Rage",
        text: "Jabel's valiant spirit inspires everyone, increasing Squads' Lethality by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Divine Strength",
        text: "Based on steadfast faith, Defender Troops' Lethality is increased by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "jaeger",
    name: "Jaeger",
    troopClass: "archer",
    rarity: "mythic",
    skills: [
      {
        name: "The Tempest",
        text: "Jaeger's triumphant music is a fine tool of intimidation, granting a 20% chance of increasing Squads' damage dealt by 40% for 3 turns.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "The Resistance",
        text: "Music focuses the soldier's mind. Jaeger grants all squads a 20% chance of reducing the total Enemy Squads' Lethality by 50% for 2 turns when attacking.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "The Celebration",
        text: "A rousing song unlocks new reserves of strength. Increases total Squads' Health by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Hymn to Survival",
        text: "No ease or luxury can be enjoyed unless the lives of soldiers are well-guarded. Jaeger increases Defender Squads' Health by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "long-fei",
    name: "Long Fei",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Mighty Paragon",
        text: "Long Fei's courage in the teeth of the enemy points the way toward the warrior within, granting a 40% chance of reducing damage taken by all squads by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [40.0, 40.0, 40.0, 40.0, 40.0]
          }
        ]
      },
      {
        name: "Celestial Sustenance",
        text: "The sweet nectar of Long Fei's potions have born fruit in soldiers' vitality, increasing total Squads' Defense by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 111,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Art of War",
        text: "\"All warfare is based on deception\". Long Fei's war wisdom is ingrained in his soldiers, granting all squads' attacks a 25% chance of dealing 200% damage.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [20.0, 40.0, 60.0, 80.0, 100.0],
            chances: [25.0, 25.0, 25.0, 25.0, 25.0]
          }
        ]
      },
      {
        name: "Strategic Strike",
        text: "\"Appear unable when able; appear inactive when active.\" Long Fei's war wisdom increases Defender Squads' Attack by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "margot",
    name: "Margot",
    troopClass: "cavalry",
    rarity: "mythic",
    skills: [
      {
        name: "Warbringer",
        text: "Margot's focus on armor-penetration increases total Squads' Attack by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Subterfuge",
        text: "Within Margot's haphazard positioning lies careful strategy. Her presence grants all Squads a 20% chance of dodging Normal Attacks.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Sleight Hand",
        text: "Margot's Cavalry have a 25% chance of performing an extra attack, dealing 200% damage.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Pugilist",
        text: "Margot never lets her guard down on the battlements even for a moment, increasing Defender Squads' Lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "marlin",
    name: "Marlin",
    troopClass: "archer",
    rarity: "mythic",
    skills: [
      {
        name: "Wild Card",
        text: "Marlin, being unpredictable, has a 40% chance of increasing damage dealt by 50% for all squads.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [50.0, 50.0, 50.0, 50.0, 50.0],
            chances: [8.0, 16.0, 24.0, 32.0, 40.0]
          }
        ]
      },
      {
        name: "Rumhead",
        text: "\"Stiff rum can drown 'most any battlefield sorrow\". Marlin grants all squads a 20% chance of reducing the total Enemy Squads' Lethality by 50% for 2 turns when attacking.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Dynamo",
        text: "Grants your squads' attack a 50% chance of increasing damage dealt by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [50.0, 50.0, 50.0, 50.0, 50.0]
          }
        ]
      },
      {
        name: "Admiral of the Line",
        text: "A true admiral leads from the front. Increases Rally Squads' Lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "olive",
    name: "Olive",
    troopClass: "archer",
    rarity: "rare",
    skills: [
      {
        name: "Green Thumb",
        text: "Olive' unmatched baking skills increase the Town's Mill Output by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Forager's Luck",
        text: "Olive's expertise in logistics increases her Bread Gathering Speed in the Wilderness by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "petra",
    name: "Petra",
    troopClass: "cavalry",
    rarity: "mythic",
    skills: [
      {
        name: "Evil Eye",
        text: "Grants all Squads\u2019 Attack a 50% chance of cursing the target, increasing their damage taken by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDefenseDown",
            op: 122,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [50.0, 50.0, 50.0, 50.0, 50.0]
          }
        ]
      },
      {
        name: "The Favor",
        text: "Petra is known as a lucky fortune-teller to her soldiers, granting a 50% chance of increasing Squads' Attack by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [50.0, 50.0, 50.0, 50.0, 50.0]
          }
        ]
      },
      {
        name: "The Shield",
        text: "Petra's divination navigates bad outcomes with a 40% chance of reducing damage taken by 50% for all squads.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [40.0, 40.0, 40.0, 40.0, 40.0]
          }
        ]
      },
      {
        name: "Cosmic Eye",
        text: "\"Strike!\" The cards never fail to inform Petra of the right time to act. Petra increases Rally Squad Attack by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "quinn",
    name: "Quinn",
    troopClass: "archer",
    rarity: "epic",
    skills: [
      {
        name: "Sixth Sense",
        text: "Senses for dangers ahead, reducing damage taken by 20% for all troops.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Precision Shot",
        text: "Quinn grants all soldiers a 50% chance of dealing 50% more damage when attacking.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [50.0, 50.0, 50.0, 50.0, 50.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "rosa",
    name: "Rosa",
    troopClass: "archer",
    rarity: "mythic",
    skills: [
      {
        name: "Chaos Gambit",
        text: "Well-placed chaos is prologue to success. Rosa grants a 40% chance of increasing all Squads' Damage Dealt by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [40.0, 40.0, 40.0, 40.0, 40.0]
          }
        ]
      },
      {
        name: "Rose of War",
        text: "No soldier wishes to harm this wild rose of war, reducing damage dealt by 20% for all enemy squads.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDamageDown",
            op: 203,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          }
        ]
      },
      {
        name: "Golden Rhythm",
        text: "A dance of distraction is the perfect complement to archer fire, increasing Archers' total Attack by 30%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "archer",
            scopeSide: "self",
            condition: "always",
            values: [6.0, 12.0, 18.0, 24.0, 30.0]
          }
        ]
      },
      {
        name: "Perihelion",
        text: "Rosa's performances greatly increase your soldiers' willingness to fight, increasing Rally Squads' Lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "saul",
    name: "Saul",
    troopClass: "archer",
    rarity: "mythic",
    skills: [
      {
        name: "Taskforce Training",
        text: "As a member of the task force, Saul's unique training program is highly empowering, increasing the total Squads' Defense and Health by 10% and 15%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 111,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [2.0, 4.0, 6.0, 8.0, 10.0]
          },
          {
            kind: "DefenseUp",
            op: 112,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [3.0, 6.0, 9.0, 12.0, 15.0]
          }
        ]
      },
      {
        name: "Resourceful",
        text: "Saul's efficient construction management increases Construction Speed by 15%, and his proficiency in maximizing resource utilization reduces Construction Costs by 15%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Positional Battler",
        text: "Saul masterfully manipulates the battlefield, increasing the total Squads' Lethality by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Defend to Attack",
        text: "Increases Defender Troops Attack by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "seth",
    name: "Seth",
    troopClass: "infantry",
    rarity: "rare",
    skills: [
      {
        name: "Burnished Iron",
        text: "Seth passes on his passion for iron mining to everyone, increasing the Town's Iron Output by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Craftsmanship",
        text: "Seth has a special bond with Iron, increasing his Iron Mining Speed in the Wilderness by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "sophia",
    name: "Sophia",
    troopClass: "cavalry",
    rarity: "mythic",
    skills: [
      {
        name: "Arcane Pact",
        text: "The arcane pact grants Sophia the protection of night, and a 40% chance of reducing all squad damage received by 50% every turn.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [50.0, 50.0, 50.0, 50.0, 50.0],
            chances: [8.0, 16.0, 24.0, 32.0, 40.0]
          }
        ]
      },
      {
        name: "Terror - Deathblow",
        text: "Sophia radiates a fearsome aura that has a chance to inflict Terror on enemy targets. Enemy targets suffer the effects of Terror every 2 turns and will receive 200% increased Cavalry damage on the following turn. Terror lasts 1 turn.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Terror - Annihilation",
        text: "Terror increases fragility. All Squads deal 75% increased damage to Terrified targets.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Queen of Night",
        text: "Sophia draws upon her avatar as Queen of the Night to enhance soldiers' Attack, increasing Defender Squad's Lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "thrud",
    name: "Thrud",
    troopClass: "cavalry",
    rarity: "mythic",
    skills: [
      {
        name: "Battle Hunger",
        text: "Thrud's battle fever inspires her Infantry and Archers, reducing their damage taken by 15% and increasing their damage dealt by 15%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 113,
            scope: "infantry",
            scopeSide: "self",
            condition: "always",
            values: [3.0, 6.0, 9.0, 12.0, 15.0]
          },
          {
            kind: "DefenseUp",
            op: 113,
            scope: "archer",
            scopeSide: "self",
            condition: "always",
            values: [3.0, 6.0, 9.0, 12.0, 15.0]
          },
          {
            kind: "DamageUp",
            op: 103,
            scope: "infantry",
            scopeSide: "self",
            condition: "always",
            values: [3.0, 6.0, 9.0, 12.0, 15.0]
          },
          {
            kind: "DamageUp",
            op: 103,
            scope: "archer",
            scopeSide: "self",
            condition: "always",
            values: [3.0, 6.0, 9.0, 12.0, 15.0]
          }
        ]
      },
      {
        name: "Reckless Charge",
        text: "No plans. No finesse. Just brutally charging into battle. Thrud's Cavalry has a 20% chance of dealing 100% extra damage to all enemies on attack.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "cavalry",
            scopeSide: "self",
            condition: "always",
            values: [20.0, 40.0, 60.0, 80.0, 100.0],
            chances: [20.0, 20.0, 20.0, 20.0, 20.0]
          }
        ]
      },
      {
        name: "Ancestral Guidance",
        text: "Ancestral spirits guide the brave to Valhalla. For every 4 attacks made by Cavalry, all squads' damage dealt is increased by 25% and damage taken is reduced by 25% for 2 turns.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Wolf-Kissed",
        text: "Thrud lives up to her title, \"Wolf-Kissed.\" Increases rally squads' lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "triton",
    name: "Triton",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Command of Power",
        text: "Acceptance of Triton's authority enables the fruits to be shared thereof, increasing total Squads' Defense by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 111,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Warfare of Power",
        text: "The power of warfare lies in shared fearlessness in the face of battle, increasing total Squads' skill damage dealt by 30%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Oath of Power",
        text: "Great power stems from a willingness to keep oaths, increasing Infantry Health by 20% as well as Cavalry and Archer Health by 30%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DefenseUp",
            op: 112,
            scope: "infantry",
            scopeSide: "self",
            condition: "always",
            values: [4.0, 8.0, 12.0, 16.0, 20.0]
          },
          {
            kind: "DefenseUp",
            op: 112,
            scope: "cavalry",
            scopeSide: "self",
            condition: "always",
            values: [6.0, 12.0, 18.0, 24.0, 30.0]
          },
          {
            kind: "DefenseUp",
            op: 112,
            scope: "archer",
            scopeSide: "self",
            condition: "always",
            values: [6.0, 12.0, 18.0, 24.0, 30.0]
          }
        ]
      },
      {
        name: "Whale Call",
        text: "Triton's ancient whale-calls echo through the barricades, filling soldiers with unshakable resolve and increasing Defender Squad Defense by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DefenseUp",
            op: 111,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "vivian",
    name: "Vivian",
    troopClass: "archer",
    rarity: "mythic",
    skills: [
      {
        name: "Crouching Tiger",
        text: "Vivian is a patient commander willing to wait for just the right moment to strike. All squads' attacks increase enemy damage taken by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "OppDefenseDown",
            op: 122,
            scope: "all",
            scopeSide: "enemy",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Focus Fire",
        text: "Vivian's sharp focus exposes enemy weaknesses, granting all squads' attack 100% extra damage after every four attacks, and causes the target to receive 15% extra damage for its next attack received.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Trap of Greed",
        text: "Vivian equips her Archers with custom coin traps, her Archers deal 60% extra damage to all enemies on the next attack of every 4 attacks.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Money Driven",
        text: "Big rewards fuel great bravery, increasing Defender Squad Defense by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DefenseUp",
            op: 111,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "wee-and-woo",
    name: "Wee & Woo",
    troopClass: "archer",
    rarity: "mythic",
    skills: [
      {
        name: "Artillerymen",
        text: "The inclusion of the artillerymen has an overall helpful effect of increasing Squad's total Attack by 15% and total Lethality by 10%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [3.0, 6.0, 9.0, 12.0, 15.0]
          },
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [2.0, 4.0, 6.0, 8.0, 10.0]
          }
        ]
      },
      {
        name: "Chain Shelling",
        text: "Wee & Woo's devastating back-to-back rounds tear shreds through the enemy lines, increasing Squad's Damage Dealt to Archer by 30% and to Infantry by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "archer",
            scopeSide: "enemy",
            condition: "always",
            values: [6.0, 12.0, 18.0, 24.0, 30.0]
          },
          {
            kind: "DamageUp",
            op: 103,
            scope: "infantry",
            scopeSide: "enemy",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Boom Boom",
        text: "\"There's always someone in every cannon duo who can aim well.\" Wee & Woo's presence gives all Squad's Attack a 50% chance of dealing 50% extra damage.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [10.0, 20.0, 30.0, 40.0, 50.0],
            chances: [50.0, 50.0, 50.0, 50.0, 50.0]
          }
        ]
      },
      {
        name: "Landmines",
        text: "Smart artillerymen always keep mines in reserve in case of unwelcome friends. Wee & Woo increase Defender Squad's Attack by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "yang",
    name: "Yang",
    troopClass: "archer",
    rarity: "mythic",
    skills: [
      {
        name: "Avalanche",
        text: "An avalanche for Yang is just another weapon in his arsenal, resulting in an additional strike against a target by all Squads every 4 turns for 100% damage.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Ice Zone",
        text: "Years of arctic adversity have taught Yang to seize advantages. Yang's Archers have a 40% chance of dealing 100% extra damage with every attack.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "archer",
            scopeSide: "self",
            condition: "always",
            values: [20.0, 40.0, 60.0, 80.0, 100.0],
            chances: [40.0, 40.0, 40.0, 40.0, 40.0]
          }
        ]
      },
      {
        name: "Ambush",
        text: "Yang is an advanced thinker who can easily grasp the principles of almost any phenomena, granting a 40% chance of increasing Squad's Damage Dealt by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 103,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [50.0, 50.0, 50.0, 50.0, 50.0],
            chances: [8.0, 16.0, 24.0, 32.0, 40.0]
          }
        ]
      },
      {
        name: "Offensive Defense",
        text: "Yang puts the maxim that the best defense is a good offense to good use, increasing Rally Squad's Lethality by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "rally",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  },
  {
    id: "yeonwoo",
    name: "Yeonwoo",
    troopClass: "archer",
    rarity: "epic",
    skills: [
      {
        name: "On Guard",
        text: "\"My blade and I are one\". Yeonwoo's sword skills increases all Squads' total Lethality by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 101,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Well-Traveled",
        text: "Yeonwoo's travels have secured a technological edge, increasing Research Speed by 15%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      }
    ],
    talents: []
  },
  {
    id: "zoe",
    name: "Zoe",
    troopClass: "infantry",
    rarity: "mythic",
    skills: [
      {
        name: "Sundering Wound",
        text: "Your squads' attacks gain a 20% chance of inflicting Sunder, dealing 40% damage per turn for 3 turns.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Charisma",
        text: "Zoe is a gifted female orator, and her rousing battle speeches increase the total Squads' Attack by 25%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "always",
            values: [5.0, 10.0, 15.0, 20.0, 25.0]
          }
        ]
      },
      {
        name: "Infinite Arsenal",
        text: "Zoe strikes the enemy so completely and utterly that your squads' attacks gain a 50% chance of amplifying enemy squads' damage taken by 50%.",
        source: "expedition",
        levels: [1, 2, 3, 4, 5],
        effects: [],
        unmodelled: "not a flat battle-wide buff"
      },
      {
        name: "Dark Lady",
        text: "Zoe is a relentlessly demanding garrison commander, increasing Defender Squads' Attack by 15%.",
        source: "widget",
        levels: [2, 4, 6, 8, 10],
        effects: [
          {
            kind: "DamageUp",
            op: 102,
            scope: "all",
            scopeSide: "self",
            condition: "defender",
            values: [5.0, 7.5, 10.0, 12.5, 15.0]
          }
        ]
      }
    ],
    talents: []
  }
];

export const HEROES_BY_ID: Record<string, Hero> = Object.fromEntries(HEROES.map((h) => [h.id, h]));

/** The game counts at most this many joiner skills per rally/garrison. */
export const MAX_JOINERS = 4;

/** Skill levels run 1-5, and level 5 is what the published "maxed" wording describes. */
export const MAX_SKILL_LEVEL = 5;
