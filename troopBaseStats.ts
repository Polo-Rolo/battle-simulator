// Real combat base stats for troops, by type / tier / troop-grade (TG).
// The values shown in-game are display placeholders; these are the values combat math uses.
// Defense and Lethality are fixed at 10 for every troop type, tier and TG - only Attack and
// Health vary. Source: community datamining (shared via kingshotsimulator.com/troop-base-stats,
// originally traced to State of Survival, which shares this combat engine).
//
// This file is generated data; edit BASE_DEFENSE/BASE_LETHALITY or the table only if the game changes.

export const BASE_DEFENSE = 10;
export const BASE_LETHALITY = 10;

export type TroopType = 'infantry' | 'cavalry' | 'archer';
export const TROOP_TYPES: readonly TroopType[] = ['infantry', 'cavalry', 'archer'] as const;

/** Attack and Health indexed as [tier][troopGrade]. Tiers 1-11, TG 0-5. */
export interface TroopBaseStatEntry {
  attack: number;
  health: number;
}

export const TROOP_BASE_STATS: Record<TroopType, Record<number, Record<number, TroopBaseStatEntry>>> = {
  infantry: {
    1: { 0: { attack: 63, health: 189 }, 1: { attack: 66, health: 197 }, 2: { attack: 69, health: 206 }, 3: { attack: 72, health: 217 }, 4: { attack: 76, health: 228 }, 5: { attack: 80, health: 239 } },
    2: { 0: { attack: 94, health: 283 }, 1: { attack: 98, health: 294 }, 2: { attack: 103, health: 309 }, 3: { attack: 108, health: 324 }, 4: { attack: 113, health: 341 }, 5: { attack: 119, health: 358 } },
    3: { 0: { attack: 132, health: 397 }, 1: { attack: 137, health: 413 }, 2: { attack: 144, health: 434 }, 3: { attack: 151, health: 455 }, 4: { attack: 159, health: 478 }, 5: { attack: 167, health: 502 } },
    4: { 0: { attack: 172, health: 516 }, 1: { attack: 179, health: 537 }, 2: { attack: 188, health: 563 }, 3: { attack: 197, health: 592 }, 4: { attack: 207, health: 621 }, 5: { attack: 217, health: 652 } },
    5: { 0: { attack: 206, health: 619 }, 1: { attack: 214, health: 644 }, 2: { attack: 225, health: 676 }, 3: { attack: 236, health: 710 }, 4: { attack: 248, health: 745 }, 5: { attack: 260, health: 782 } },
    6: { 0: { attack: 243, health: 730 }, 1: { attack: 253, health: 759 }, 2: { attack: 265, health: 797 }, 3: { attack: 279, health: 837 }, 4: { attack: 293, health: 879 }, 5: { attack: 307, health: 923 } },
    7: { 0: { attack: 287, health: 862 }, 1: { attack: 298, health: 896 }, 2: { attack: 313, health: 941 }, 3: { attack: 329, health: 988 }, 4: { attack: 346, health: 1038 }, 5: { attack: 363, health: 1090 } },
    8: { 0: { attack: 339, health: 1017 }, 1: { attack: 353, health: 1058 }, 2: { attack: 370, health: 1111 }, 3: { attack: 389, health: 1166 }, 4: { attack: 408, health: 1224 }, 5: { attack: 429, health: 1286 } },
    9: { 0: { attack: 400, health: 1200 }, 1: { attack: 416, health: 1248 }, 2: { attack: 437, health: 1310 }, 3: { attack: 459, health: 1376 }, 4: { attack: 482, health: 1445 }, 5: { attack: 506, health: 1517 } },
    10: { 0: { attack: 472, health: 1416 }, 1: { attack: 491, health: 1473 }, 2: { attack: 515, health: 1546 }, 3: { attack: 541, health: 1624 }, 4: { attack: 568, health: 1705 }, 5: { attack: 597, health: 1790 } },
    11: { 0: { attack: 566, health: 1699 }, 1: { attack: 589, health: 1767 }, 2: { attack: 618, health: 1855 }, 3: { attack: 649, health: 1948 }, 4: { attack: 681, health: 2045 }, 5: { attack: 716, health: 2148 } },
  },
  cavalry: {
    1: { 0: { attack: 189, health: 63 }, 1: { attack: 197, health: 66 }, 2: { attack: 206, health: 69 }, 3: { attack: 217, health: 72 }, 4: { attack: 228, health: 76 }, 5: { attack: 239, health: 80 } },
    2: { 0: { attack: 283, health: 94 }, 1: { attack: 294, health: 98 }, 2: { attack: 309, health: 103 }, 3: { attack: 324, health: 108 }, 4: { attack: 341, health: 113 }, 5: { attack: 358, health: 119 } },
    3: { 0: { attack: 397, health: 132 }, 1: { attack: 413, health: 137 }, 2: { attack: 434, health: 144 }, 3: { attack: 455, health: 151 }, 4: { attack: 478, health: 159 }, 5: { attack: 502, health: 167 } },
    4: { 0: { attack: 516, health: 172 }, 1: { attack: 537, health: 179 }, 2: { attack: 563, health: 188 }, 3: { attack: 592, health: 197 }, 4: { attack: 621, health: 207 }, 5: { attack: 652, health: 217 } },
    5: { 0: { attack: 619, health: 206 }, 1: { attack: 644, health: 214 }, 2: { attack: 676, health: 225 }, 3: { attack: 710, health: 236 }, 4: { attack: 745, health: 248 }, 5: { attack: 782, health: 260 } },
    6: { 0: { attack: 730, health: 243 }, 1: { attack: 759, health: 253 }, 2: { attack: 797, health: 265 }, 3: { attack: 837, health: 279 }, 4: { attack: 879, health: 293 }, 5: { attack: 923, health: 307 } },
    7: { 0: { attack: 862, health: 287 }, 1: { attack: 896, health: 298 }, 2: { attack: 941, health: 313 }, 3: { attack: 988, health: 329 }, 4: { attack: 1038, health: 346 }, 5: { attack: 1090, health: 363 } },
    8: { 0: { attack: 1017, health: 339 }, 1: { attack: 1058, health: 353 }, 2: { attack: 1111, health: 370 }, 3: { attack: 1166, health: 389 }, 4: { attack: 1224, health: 408 }, 5: { attack: 1286, health: 429 } },
    9: { 0: { attack: 1200, health: 400 }, 1: { attack: 1248, health: 416 }, 2: { attack: 1310, health: 437 }, 3: { attack: 1376, health: 459 }, 4: { attack: 1445, health: 482 }, 5: { attack: 1517, health: 506 } },
    10: { 0: { attack: 1416, health: 472 }, 1: { attack: 1473, health: 491 }, 2: { attack: 1546, health: 515 }, 3: { attack: 1624, health: 541 }, 4: { attack: 1705, health: 568 }, 5: { attack: 1790, health: 597 } },
    11: { 0: { attack: 1699, health: 566 }, 1: { attack: 1767, health: 589 }, 2: { attack: 1855, health: 618 }, 3: { attack: 1948, health: 649 }, 4: { attack: 2045, health: 681 }, 5: { attack: 2148, health: 716 } },
  },
  archer: {
    1: { 0: { attack: 252, health: 47 }, 1: { attack: 262, health: 49 }, 2: { attack: 275, health: 51 }, 3: { attack: 289, health: 54 }, 4: { attack: 303, health: 57 }, 5: { attack: 319, health: 59 } },
    2: { 0: { attack: 378, health: 71 }, 1: { attack: 393, health: 74 }, 2: { attack: 413, health: 78 }, 3: { attack: 433, health: 81 }, 4: { attack: 455, health: 85 }, 5: { attack: 478, health: 90 } },
    3: { 0: { attack: 529, health: 99 }, 1: { attack: 550, health: 103 }, 2: { attack: 578, health: 108 }, 3: { attack: 607, health: 114 }, 4: { attack: 637, health: 119 }, 5: { attack: 669, health: 125 } },
    4: { 0: { attack: 688, health: 129 }, 1: { attack: 716, health: 134 }, 2: { attack: 751, health: 141 }, 3: { attack: 789, health: 148 }, 4: { attack: 828, health: 155 }, 5: { attack: 870, health: 163 } },
    5: { 0: { attack: 825, health: 155 }, 1: { attack: 858, health: 161 }, 2: { attack: 901, health: 169 }, 3: { attack: 946, health: 178 }, 4: { attack: 993, health: 187 }, 5: { attack: 1043, health: 196 } },
    6: { 0: { attack: 974, health: 183 }, 1: { attack: 1013, health: 190 }, 2: { attack: 1064, health: 200 }, 3: { attack: 1117, health: 210 }, 4: { attack: 1173, health: 220 }, 5: { attack: 1231, health: 231 } },
    7: { 0: { attack: 1149, health: 215 }, 1: { attack: 1195, health: 224 }, 2: { attack: 1255, health: 235 }, 3: { attack: 1317, health: 247 }, 4: { attack: 1383, health: 259 }, 5: { attack: 1452, health: 272 } },
    8: { 0: { attack: 1356, health: 254 }, 1: { attack: 1410, health: 264 }, 2: { attack: 1481, health: 277 }, 3: { attack: 1555, health: 291 }, 4: { attack: 1633, health: 306 }, 5: { attack: 1714, health: 321 } },
    9: { 0: { attack: 1600, health: 300 }, 1: { attack: 1664, health: 312 }, 2: { attack: 1747, health: 328 }, 3: { attack: 1835, health: 344 }, 4: { attack: 1926, health: 361 }, 5: { attack: 2023, health: 379 } },
    10: { 0: { attack: 1888, health: 354 }, 1: { attack: 1964, health: 368 }, 2: { attack: 2062, health: 387 }, 3: { attack: 2165, health: 406 }, 4: { attack: 2273, health: 426 }, 5: { attack: 2387, health: 448 } },
    11: { 0: { attack: 2266, health: 390 }, 1: { attack: 2357, health: 406 }, 2: { attack: 2474, health: 426 }, 3: { attack: 2598, health: 447 }, 4: { attack: 2728, health: 470 }, 5: { attack: 2865, health: 493 } },
  },
};

export const MIN_TIER = 1;
export const MAX_TIER = 11;
export const MIN_TG = 0;
export const MAX_TG = 5;
