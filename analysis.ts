import { countsFromRatio } from './army';
import { simulateBattle } from './battle';
import { HEROES, MAX_JOINERS } from './data/heroes';
import { collectSideEffects, skillMod } from './effects';
import { comparePaired, runMonteCarlo, runsForPrecision, type MonteCarloSummary } from './montecarlo';
import type { Assumptions } from './assumptions';
import type { Side, TroopType } from './types';

export interface FormationCandidate {
  ratio: Record<TroopType, number>;
  killDeathRatio: number;
  ownLosses: number;
  enemyLosses: number;
  winner: 'attacker' | 'defender' | 'draw';
}

/**
 * Sweeps Infantry/Cavalry/Archer splits for the attacker against a fixed enemy and ranks them.
 *
 * This is the point of simulating rather than following a rule of thumb: 50/20/30 is a decent
 * default, but the best split depends on what the enemy actually brought, and this shows by how
 * much. `minShare` defaults to 5% because every march wants at least a token amount of each type -
 * you bring one hero per troop type and their stat bonuses are wasted on a type you didn't send.
 */
export function sweepFormations(
  attacker: Side,
  defender: Side,
  options: {
    step?: number;
    minShare?: number;
    assumptions?: Partial<Assumptions>;
  } = {},
): FormationCandidate[] {
  const step = options.step ?? 5;
  const minShare = options.minShare ?? 5;
  const total = (['infantry', 'cavalry', 'archer'] as TroopType[]).reduce(
    (acc, type) => acc + attacker.troops[type].count,
    0,
  );
  const candidates: FormationCandidate[] = [];

  for (let infantry = minShare; infantry <= 100 - 2 * minShare; infantry += step) {
    for (let cavalry = minShare; cavalry <= 100 - infantry - minShare; cavalry += step) {
      const archer = 100 - infantry - cavalry;
      if (archer < minShare) continue;
      const ratio = { infantry, cavalry, archer };
      const counts = countsFromRatio(total, ratio);
      const candidate: Side = {
        ...attacker,
        troops: {
          infantry: { ...attacker.troops.infantry, count: counts.infantry },
          cavalry: { ...attacker.troops.cavalry, count: counts.cavalry },
          archer: { ...attacker.troops.archer, count: counts.archer },
        },
      };
      const result = simulateBattle(candidate, defender, { assumptions: options.assumptions });
      candidates.push({
        ratio,
        killDeathRatio: result.killDeathRatio,
        ownLosses: result.attackerCasualties.total,
        enemyLosses: result.defenderCasualties.total,
        winner: result.winner,
      });
    }
  }

  return candidates.sort((a, b) => b.killDeathRatio - a.killDeathRatio);
}

export interface JoinerCandidate {
  heroIds: string[];
  /** Your outgoing SkillMod against this opponent. */
  ownSkillMod: number;
  /** The opponent's outgoing SkillMod against you - defensive joiners push this down. */
  incomingSkillMod: number;
  /** ownSkillMod / incomingSkillMod: the net swing, which is what actually decides the fight. */
  advantage: number;
  damageUp: number;
  defenseUp: number;
}

/**
 * Finds the joiner line-up that maximises SkillMod against a known enemy line-up.
 *
 * This is exact rather than simulated: joiner skills only enter the battle through SkillMod, so the
 * optimum is pure effect_op arithmetic. It is also where most alliances leave value on the table -
 * four copies of the same hero add, whereas four different effect_ops multiply.
 *
 * Ranking is by net advantage, not by your own SkillMod alone: a joiner's DefenseUp and
 * OppDamageDown sit in the *opponent's* SkillMod, so an offence-only ranking would systematically
 * undervalue defensive joiners.
 */
export function optimiseJoiners(
  side: Side,
  opponent: Side,
  availableHeroIds: string[] = HEROES.map((h) => h.id),
  limit = 10,
): JoinerCandidate[] {
  const opponentEffects = collectSideEffects(opponent.leaderEffects, opponent.joiners);
  const pool = availableHeroIds.filter((id) => HEROES.some((hero) => hero.id === id));
  const results: JoinerCandidate[] = [];

  // Combinations with repetition - stacking clones is legal and sometimes correct.
  const walk = (start: number, chosen: string[]) => {
    if (chosen.length === MAX_JOINERS) {
      const ownEffects = collectSideEffects(side.leaderEffects, chosen);
      const own = skillMod(ownEffects, opponentEffects);
      const incoming = skillMod(opponentEffects, ownEffects);
      results.push({
        heroIds: [...chosen],
        ownSkillMod: own.value,
        incomingSkillMod: incoming.value,
        advantage: own.value / incoming.value,
        damageUp: own.damageUp,
        defenseUp: incoming.defenseUp,
      });
      return;
    }
    for (let i = start; i < pool.length; i += 1) {
      chosen.push(pool[i]);
      walk(i, chosen);
      chosen.pop();
    }
  };
  walk(0, []);

  return results.sort((a, b) => b.advantage - a.advantage).slice(0, limit);
}

export interface Configuration {
  id: string;
  label: string;
  side: Side;
}

export interface ConfigurationVerdict {
  id: string;
  label: string;
  summary: MonteCarloSummary;
  /** Null for the baseline itself. */
  vsBaseline: {
    /** Difference in mean kill/death against the baseline configuration. */
    delta: number;
    z: number;
    /** True when the batch is large enough for this gap to be more than sampling noise. */
    significant: boolean;
  } | null;
  /** Runs needed to pin this configuration's mean kill/death to +/-1%, at 95% confidence. */
  runsForOnePercent: number;
}

/**
 * Runs every candidate configuration against the same enemy for the same number of simulations, and
 * ranks them by mean kill/death.
 *
 * Every configuration is run against the same enemy, with the same assumptions, from the same seed:
 * common random numbers, so run 3 of one configuration meets the same dice as run 3 of another. The
 * gap between them is then measured run by run (`comparePaired`), which cancels the luck they share
 * and needs far fewer runs to resolve a real difference.
 *
 * The `significant` flag is the part that matters when choosing between them: ordering a handful of
 * noisy batches by their means will happily crown a configuration that was merely lucky.
 *
 * The first entry of `configurations` is the baseline everything else is measured against.
 */
export function compareConfigurations(
  configurations: Configuration[],
  opponent: Side,
  options: { runs?: number; assumptions?: Partial<Assumptions>; seed?: number } = {},
): ConfigurationVerdict[] {
  const runs = options.runs ?? 500;
  const seed = options.seed ?? 1;
  const summaries = configurations.map((configuration) => ({
    configuration,
    summary: runMonteCarlo(configuration.side, opponent, runs, options.assumptions, seed),
  }));
  const baseline = summaries[0];
  const baselineRatios = baseline.summary.outcomes.map((o) => o.killDeathRatio);

  return summaries
    .map(({ configuration, summary }) => ({
      id: configuration.id,
      label: configuration.label,
      summary,
      vsBaseline:
        configuration.id === baseline.configuration.id
          ? null
          : comparePaired(
              summary.outcomes.map((o) => o.killDeathRatio),
              baselineRatios,
            ),
      runsForOnePercent: runsForPrecision(summary.killDeathRatio, 0.01),
    }))
    .sort((a, b) => b.summary.killDeathRatio.mean - a.summary.killDeathRatio.mean);
}
