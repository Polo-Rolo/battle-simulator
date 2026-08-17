import { TROOP_TYPES, type CasualtyTarget, type StatBonus, type TroopType } from '../engine';
import {
  matchWord,
  normalise,
  readCount,
  readPercent,
  SCOPE_WORDS,
  STAT_WORDS,
  type Scope,
  type StatKey,
} from './text';

type Metric = 'squad' | 'losses' | 'injured' | 'lightlyInjured' | 'residents';

const METRIC_WORDS: Record<Exclude<Metric, 'lightlyInjured'>, string[]> = {
  squad: ['squad', 'squads'],
  losses: ['losses', 'loss'],
  injured: ['injured'],
  residents: ['residents', 'resident'],
};

export interface ReportSide {
  /** Percentage bonuses per troop type, as the Bonus Details section lists them. */
  bonuses: Partial<Record<Scope, StatBonus>>;
  counts?: Record<TroopType, number>;
  squad?: number;
  losses?: number;
  injured?: number;
  lightlyInjured?: number;
  /** Captured for reference only: residents do not take part in the fight itself. */
  residents?: number;
  tier?: number;
}

export interface ParsedBattleReport {
  /** The report's own side (left column) and the opponent (right column). */
  left: ReportSide;
  right: ReportSide;
  /** Anything the parse could not reconcile, worth showing next to the numbers. */
  notes: string[];
}

/**
 * The casualty rows the chosen target covers. `dead` is the report's Losses row alone, which is the
 * only permanent one: the infirmary heals and the lightly injured recover on returning to the city.
 */
export function reportedCasualties(side: ReportSide, target: CasualtyTarget): number | undefined {
  const rows =
    target === 'dead'
      ? [side.losses]
      : target === 'deadAndInfirmary'
        ? [side.losses, side.injured]
        : [side.losses, side.injured, side.lightlyInjured];
  const parts = rows.filter((value): value is number => value !== undefined);
  return parts.length === 0 ? undefined : parts.reduce((acc, value) => acc + value, 0);
}

function setBonus(side: ReportSide, scope: Scope, stat: StatKey, value: number): void {
  side.bonuses[scope] = { ...side.bonuses[scope], [stat]: value };
}

interface Token {
  index: number;
  percent?: number;
  count?: number;
  scope?: Scope;
  stat?: StatKey;
  metric?: Metric;
  level?: number;
}

/** Tier badges come through as "Lv. 10.0", with the number split off from the "Lv" as often as not. */
function joinLevels(line: string): string {
  return line.replace(/\b([il]?[lt]v)\.?\s+(?=\d)/g, '$1.');
}

function tokenise(line: string): Token[] {
  const lightly = /light/.test(line);
  return line.split(' ').map((word, index) => {
    const letters = word.replace(/[^a-z]/g, '');
    const token: Token = { index };
    const scope = matchWord(letters, SCOPE_WORDS);
    if (scope) token.scope = scope;
    const stat = matchWord(letters, STAT_WORDS);
    if (stat) token.stat = stat;
    const metric = matchWord(letters, METRIC_WORDS);
    if (metric) token.metric = metric === 'injured' && lightly ? 'lightlyInjured' : metric;
    const percent = readPercent(word);
    if (percent !== null) token.percent = percent;
    const count = readCount(word);
    if (count !== null) token.count = count;
    // Troop tier badges read as "Lv.10.0", and OCR usually mangles the "Lv" and trails noise.
    const level = /^(?:lv|[il]?tv)\.?(\d{1,2})/.exec(word);
    if (level && Number(level[1]) >= 1 && Number(level[1]) <= 11) token.level = Number(level[1]);
    return token;
  });
}

/**
 * Reads a Kingshot battle-report mail: the Battle Overview squad/casualty columns, the per-troop-type
 * counts under Troop Power Comparison, and the Bonus Details percentages for both sides.
 *
 * The report is two columns, own side left and enemy right, so a value's position relative to its
 * label decides whose it is. Several screenshots can be passed together because the mail does not fit
 * on one screen; each is parsed independently and the fields are merged.
 */
export function parseBattleReport(texts: string[]): ParsedBattleReport {
  const left: ReportSide = { bonuses: {} };
  const right: ReportSide = { bonuses: {} };
  const notes: string[] = [];
  let countCandidate: number[] | null = null;
  let levels: number[] = [];

  for (const text of texts) {
    let lastLevels: number[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
      const line = joinLevels(normalise(rawLine));
      if (!line) continue;
      const tokens = tokenise(line);
      const label = tokens.find((token) => token.stat ?? token.metric);
      const percents = tokens.filter((token) => token.percent !== undefined);
      const counts = tokens.filter((token) => token.count !== undefined && token.percent === undefined);
      const lineLevels = tokens
        .filter((token) => token.level !== undefined)
        .map((token) => token.level as number);

      if (label?.stat) {
        const scope = tokens.find((token) => token.scope)?.scope ?? 'all';
        for (const token of percents) {
          const side = token.index < label.index ? left : right;
          setBonus(side, scope, label.stat, token.percent as number);
        }
        continue;
      }

      if (label?.metric) {
        for (const token of counts) {
          const side = token.index < label.index ? left : right;
          side[label.metric] = token.count as number;
        }
        continue;
      }

      // The troop counts sit on their own line under the power bars: three per side, no labels.
      if (counts.length === 6 && counts.every((token) => (token.count as number) >= 100)) {
        countCandidate = counts.map((token) => token.count as number);
        levels = lastLevels;
      }
      if (lineLevels.length > 0) lastLevels = lineLevels;
    }
  }

  if (countCandidate) {
    const halves = [countCandidate.slice(0, 3), countCandidate.slice(3)];
    const sums = halves.map((half) => half.reduce((acc, value) => acc + value, 0));
    const matches = (sum: number, squad?: number) => squad !== undefined && Math.abs(sum - squad) / squad < 0.02;
    // The columns can only be told apart by their totals; without a squad line, assume report order.
    const swapped = matches(sums[0], right.squad) && matches(sums[1], left.squad);
    const [leftCounts, rightCounts] = swapped ? [halves[1], halves[0]] : halves;
    const assign = (side: ReportSide, values: number[]) => {
      side.counts = Object.fromEntries(TROOP_TYPES.map((type, index) => [type, values[index]])) as Record<
        TroopType,
        number
      >;
    };
    assign(left, leftCounts);
    assign(right, rightCounts);
    const checked = swapped ? [sums[1], sums[0]] : sums;
    for (const [index, side] of [left, right].entries()) {
      if (side.squad !== undefined && !matches(checked[index], side.squad)) {
        notes.push(
          `Troop counts add up to ${checked[index].toLocaleString()} but the squad line says ${side.squad.toLocaleString()} - check the counts.`,
        );
      }
    }
  }

  if (levels.length > 0) {
    const unique = [...new Set(levels)];
    left.tier = levels[0];
    right.tier = unique.length === 1 ? levels[0] : levels[levels.length - 1];
    if (unique.length > 1) notes.push(`Read troop tiers ${unique.join(', ')} - confirm which side is which.`);
  }

  return { left, right, notes };
}
