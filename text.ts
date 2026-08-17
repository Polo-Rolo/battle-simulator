import type { StatBonus, TroopType } from '../engine';

export type StatKey = keyof StatBonus;
export type Scope = 'all' | TroopType;

export const STAT_WORDS: Record<StatKey, string[]> = {
  attack: ['attack', 'atk'],
  defense: ['defense', 'defence', 'def'],
  lethality: ['lethality', 'lethal'],
  health: ['health', 'hp'],
};

export const SCOPE_WORDS: Record<Scope, string[]> = {
  infantry: ['infantry', 'infantryman', 'inf'],
  cavalry: ['cavalry', 'cavalryman', 'cav'],
  archer: ['archer', 'archers', 'arc'],
  all: ['all', 'troops', 'troop', 'soldiers', 'squads'],
};

/** OCR reliably confuses these with digits in numeric contexts. */
const DIGIT_LOOKALIKES: Record<string, string> = {
  o: '0',
  l: '1',
  i: '1',
  '|': '1',
  '!': '1',
  s: '5',
  b: '8',
};

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) {
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = next;
  }
  return prev[b.length];
}

/** A word matches a keyword when it is close enough that no other keyword is closer. */
export function matchWord<T extends string>(word: string, table: Record<T, string[]>): T | null {
  if (word.length < 3) return null;
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const key of Object.keys(table) as T[]) {
    for (const keyword of table[key]) {
      // Short aliases have to be exact; OCR noise on three letters is indistinguishable from a real word.
      const tolerance = keyword.length <= 4 ? 0 : keyword.length <= 7 ? 1 : 2;
      const distance = levenshtein(word, keyword);
      if (distance <= tolerance && distance < bestDistance) {
        best = key;
        bestDistance = distance;
      }
    }
  }
  return best;
}

/** A percentage with common OCR substitutions repaired, or null when the token is not one. */
export function readPercent(token: string): number | null {
  if (!token.includes('%')) return null;
  const body = token.replace('%', '');
  if (!/\d/.test(body)) return null;
  let repaired = '';
  for (const char of body) {
    if (/[\d.+-]/.test(char)) repaired += char;
    else if (DIGIT_LOOKALIKES[char]) repaired += DIGIT_LOOKALIKES[char];
    else if (char === ',') repaired += '.';
    else return null;
  }
  const value = Number(repaired);
  return Number.isFinite(value) ? value : null;
}

/** A plain count like "1,381,138", where commas are thousand separators rather than decimal points. */
export function readCount(token: string): number | null {
  if (token.includes('%')) return null;
  if (!/^[+-]?[\d,.]+$/.test(token) || !/\d/.test(token)) return null;
  // Only group separators are allowed: casualty and troop counts are always whole numbers.
  if (!/^[+-]?\d{1,3}([,.]\d{3})*$/.test(token)) return null;
  const value = Number(token.replace(/[,.]/g, ''));
  return Number.isFinite(value) ? Math.abs(value) : null;
}

export function normalise(line: string): string {
  return (
    line
      .toLowerCase()
      .replace(/[\u2019\u02bc]/g, "'")
      .replace(/[^a-z0-9%.,+\-|!'\s]/g, ' ')
      .replace(/\s+/g, ' ')
      // OCR often detaches the percent sign from its number.
      .replace(/([\d.,olisb|!])\s+%/g, '$1%')
      .trim()
  );
}
