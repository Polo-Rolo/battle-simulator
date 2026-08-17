import type { StatBonus } from '../engine';
import { matchWord, normalise, readPercent, SCOPE_WORDS, STAT_WORDS, type Scope, type StatKey } from './text';

export type { Scope, StatKey } from './text';

export interface ParsedStat {
  scope: Scope;
  stat: StatKey;
  value: number;
  /** The line it came from, so a wrong read can be traced back to the screenshot. */
  raw: string;
}

export interface ParsedStatSheet {
  stats: ParsedStat[];
  /** One row per scope, ready to drop into the bonus table. */
  rows: { scope: Scope; bonus: StatBonus }[];
  /** Lines carrying a percentage that no stat could be matched to. */
  unread: string[];
}

const SCOPE_ORDER: Scope[] = ['all', 'infantry', 'cavalry', 'archer'];

/**
 * Read troop stat percentages out of OCR text. Kingshot's stat screens list one stat per line
 * ("Infantry Attack 152.5%"), but the layout varies by screen and OCR splits lines unpredictably, so
 * a stat keeps looking for its percentage on following lines and a bare troop name sets the scope for
 * the lines under it.
 */
export function parseStatSheet(text: string): ParsedStatSheet {
  const stats: ParsedStat[] = [];
  const unread: string[] = [];
  let sectionScope: Scope = 'all';
  let pending: { stat: StatKey; scope: Scope; raw: string } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalise(rawLine);
    if (!line) continue;
    const words = line.split(' ');
    let lineScope: Scope | null = null;
    let matchedHere = false;
    let sawPercent = false;

    for (const word of words) {
      const letters = word.replace(/[^a-z]/g, '');
      const scope = matchWord(letters, SCOPE_WORDS);
      if (scope) {
        lineScope = scope;
        // A troop name after the stat label still scopes it: "Attack (Infantry) 30%".
        pending = pending === null ? null : { stat: pending.stat, raw: pending.raw, scope };
        continue;
      }
      const stat = matchWord(letters, STAT_WORDS);
      if (stat) {
        pending = { stat, scope: lineScope ?? sectionScope, raw: rawLine.trim() };
        continue;
      }
      const value = readPercent(word);
      if (value === null) continue;
      sawPercent = true;
      if (!pending) continue;
      stats.push({ scope: pending.scope, stat: pending.stat, value, raw: pending.raw });
      pending = null;
      matchedHere = true;
    }

    // "Infantry" alone above a block of stats scopes the whole block.
    if (lineScope && !matchedHere && !words.some((word) => matchWord(word.replace(/[^a-z]/g, ''), STAT_WORDS))) {
      pending = null;
      sectionScope = lineScope;
    }
    if (sawPercent && !matchedHere) unread.push(rawLine.trim());
  }

  const byScope = new Map<Scope, StatBonus>();
  for (const parsed of stats) {
    const bonus = byScope.get(parsed.scope) ?? {};
    // A stat read twice (repeated screens, doubled OCR lines) keeps the larger total rather than summing.
    bonus[parsed.stat] = Math.max(bonus[parsed.stat] ?? -Infinity, parsed.value);
    byScope.set(parsed.scope, bonus);
  }

  return {
    stats,
    rows: SCOPE_ORDER.filter((scope) => byScope.has(scope)).map((scope) => ({
      scope,
      bonus: byScope.get(scope) as StatBonus,
    })),
    unread,
  };
}
