import { useState } from 'react';
import {
  HEROES,
  HEROES_BY_ID,
  joinerEffects,
  optimiseJoiners,
  sweepFormations,
  type Assumptions,
  type FormationCandidate,
  type JoinerCandidate,
  type Side,
} from '../engine';
import { formatNumber } from './model';

export function PlanningPanel(props: {
  attacker: Side;
  defender: Side;
  assumptions: Assumptions;
  onApplyRatio: (ratio: FormationCandidate['ratio']) => void;
  onApplyJoiners: (heroIds: string[]) => void;
}) {
  const [formations, setFormations] = useState<FormationCandidate[] | null>(null);
  const [joiners, setJoiners] = useState<JoinerCandidate[] | null>(null);
  // A joiner only brings its lead hero's first skill, so heroes whose first skill this model cannot
  // apply start unticked - they would all rank identically at zero.
  const contributes = (heroId: string) => joinerEffects(heroId).length > 0;
  const [pool, setPool] = useState<string[]>(HEROES.filter((hero) => contributes(hero.id)).map((hero) => hero.id));

  return (
    <div>
      <h3>Formation sweep</h3>
      <p className="note">
        Tries every Infantry/Cavalry/Archer split in 5% steps against the enemy march as configured, and ranks by
        kill/death ratio. 50/20/30 is a fine default; this tells you what it costs you against <em>this</em> enemy.
      </p>
      <button
        type="button"
        className="primary"
        onClick={() =>
          setFormations(sweepFormations(props.attacker, props.defender, { assumptions: props.assumptions }).slice(0, 12))
        }
      >
        Sweep formations
      </button>
      {formations ? (
        <table className="result-table">
          <thead>
            <tr>
              <th>Inf / Cav / Arc</th>
              <th>K/D</th>
              <th>Your losses</th>
              <th>Enemy losses</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {formations.map((candidate) => (
              <tr key={`${candidate.ratio.infantry}-${candidate.ratio.cavalry}`}>
                <td>
                  {candidate.ratio.infantry} / {candidate.ratio.cavalry} / {candidate.ratio.archer}
                </td>
                <td>{candidate.killDeathRatio.toFixed(2)}</td>
                <td>{formatNumber(candidate.ownLosses)}</td>
                <td>{formatNumber(candidate.enemyLosses)}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => props.onApplyRatio(candidate.ratio)}>
                    apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h3>Joiner optimiser</h3>
      <p className="note">
        Exact, not simulated: joiner skills only reach the battle through SkillMod, so the best line-up is pure
        effect_op arithmetic. Ranked by net advantage (your SkillMod divided by theirs) so defensive joiners are not
        undervalued. Tick the heroes your alliance can actually field.
      </p>
      <div className="hero-pool">
        {HEROES.map((hero) => (
          <label key={hero.id} className="checkbox">
            <input
              type="checkbox"
              checked={pool.includes(hero.id)}
              onChange={(event) =>
                setPool(
                  event.target.checked ? [...pool, hero.id] : pool.filter((id) => id !== hero.id),
                )
              }
            />
            <span>
              {hero.name}
              {contributes(hero.id) ? null : <em> (first skill not modelled)</em>}
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="primary"
        disabled={pool.length === 0}
        onClick={() => setJoiners(optimiseJoiners(props.attacker, props.defender, pool, 10))}
      >
        Optimise joiners
      </button>
      {joiners ? (
        <table className="result-table">
          <thead>
            <tr>
              <th>Line-up</th>
              <th>Your SkillMod</th>
              <th>Theirs</th>
              <th>Net</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {joiners.map((candidate) => (
              <tr key={candidate.heroIds.join('+')}>
                <td>{candidate.heroIds.map((id) => HEROES_BY_ID[id].name).join(' + ')}</td>
                <td>&times;{candidate.ownSkillMod.toFixed(3)}</td>
                <td>&times;{candidate.incomingSkillMod.toFixed(3)}</td>
                <td>&times;{candidate.advantage.toFixed(3)}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => props.onApplyJoiners(candidate.heroIds)}>
                    apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
