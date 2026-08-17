import {
  CASUALTY_POLICIES,
  TROOP_TYPES,
  splitCasualties,
  type BattleResult,
  type ResolvedArmy,
  type SkillModBreakdown,
} from '../engine';
import { NumberField, SelectField, Stat } from './controls';
import { formatNumber, formatPercent } from './model';

function SkillModDetail(props: { label: string; army: ResolvedArmy }) {
  const mod: SkillModBreakdown = props.army.skillMod;
  const rows: { label: string; value: number }[] = [
    { label: 'Damage up', value: mod.damageUp },
    { label: 'Enemy defense down', value: mod.oppDefenseDown },
    { label: "Enemy's defense up", value: mod.defenseUp },
    { label: "Enemy's damage-down", value: mod.oppDamageDown },
  ];
  return (
    <div className="skillmod">
      <h4>
        {props.label} SkillMod <strong>&times;{mod.value.toFixed(3)}</strong>
      </h4>
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>&times;{row.value.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CasualtyTable(props: { result: BattleResult }) {
  const { result } = props;
  return (
    <table className="result-table">
      <thead>
        <tr>
          <th>Troop</th>
          <th>{result.attacker.label} sent</th>
          <th>lost</th>
          <th>{result.defender.label} sent</th>
          <th>lost</th>
        </tr>
      </thead>
      <tbody>
        {TROOP_TYPES.map((type) => (
          <tr key={type}>
            <td>{type}</td>
            <td>{formatNumber(result.attacker.perType[type].count)}</td>
            <td>{formatNumber(result.attackerCasualties.perType[type])}</td>
            <td>{formatNumber(result.defender.perType[type].count)}</td>
            <td>{formatNumber(result.defenderCasualties.perType[type])}</td>
          </tr>
        ))}
        <tr className="totals">
          <td>total</td>
          <td>{formatNumber(result.attacker.totalTroops)}</td>
          <td>
            {formatNumber(result.attackerCasualties.total)} ({formatPercent(result.attackerCasualties.fraction)})
          </td>
          <td>{formatNumber(result.defender.totalTroops)}</td>
          <td>
            {formatNumber(result.defenderCasualties.total)} ({formatPercent(result.defenderCasualties.fraction)})
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function ResultsPanel(props: {
  result: BattleResult;
  policyId: string;
  onPolicyChange: (id: string) => void;
  infirmary: number;
  onInfirmaryChange: (value: number) => void;
}) {
  const { result } = props;
  const policy = CASUALTY_POLICIES.find((item) => item.id === props.policyId) ?? CASUALTY_POLICIES[0];
  const attackerSplit = splitCasualties(
    result.attackerCasualties,
    policy,
    policy.deathRate === 0 ? props.infirmary : undefined,
  );
  const winnerLabel =
    result.winner === 'draw'
      ? 'Too close to call'
      : `${result.winner === 'attacker' ? result.attacker.label : result.defender.label} wins`;

  return (
    <div className="results">
      <div className="stat-row">
        <Stat
          label="Outcome"
          value={winnerLabel}
          tone={result.winner === 'attacker' ? 'good' : result.winner === 'defender' ? 'bad' : 'neutral'}
          hint={result.wipeout ? `${result.wipeout} was wiped out` : 'Decided on casualty share'}
        />
        <Stat
          label="Kill / death"
          value={result.killDeathRatio.toFixed(2)}
          tone={result.killDeathRatio >= 1 ? 'good' : 'bad'}
          hint="Enemy losses divided by your losses"
        />
        <Stat label="Your losses" value={formatPercent(result.attackerCasualties.fraction)} />
        <Stat label="Enemy losses" value={formatPercent(result.defenderCasualties.fraction)} />
        <Stat label="Rounds" value={String(result.roundsUsed)} />
      </div>

      <CasualtyTable result={result} />

      <div className="two-col">
        <SkillModDetail label={result.attacker.label} army={result.attacker} />
        <SkillModDetail label={result.defender.label} army={result.defender} />
      </div>

      <h3>Where the casualties go</h3>
      <div className="row">
        <SelectField
          label="Battle type"
          value={policy.id}
          options={CASUALTY_POLICIES.map((item) => ({
            value: item.id,
            label: item.sourced ? item.label : `${item.label} (estimate)`,
          }))}
          onChange={props.onPolicyChange}
        />
        {policy.deathRate === 0 ? (
          <NumberField
            label="Infirmary capacity"
            value={props.infirmary}
            step={1000}
            min={0}
            onChange={props.onInfirmaryChange}
          />
        ) : null}
      </div>
      <p className="note">{policy.note}</p>
      <div className="stat-row">
        <Stat label="Dead" value={formatNumber(attackerSplit.dead)} tone="bad" />
        <Stat label="Infirmary" value={formatNumber(attackerSplit.infirmary)} />
        <Stat label="Lightly injured" value={formatNumber(attackerSplit.lightlyInjured)} />
        {attackerSplit.overflowDead > 0 ? (
          <Stat label="Died to overflow" value={formatNumber(attackerSplit.overflowDead)} tone="bad" />
        ) : null}
      </div>

      <h3>Round by round</h3>
      <table className="result-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>{result.attacker.label} left</th>
            <th>lost this round</th>
            <th>{result.defender.label} left</th>
            <th>lost this round</th>
          </tr>
        </thead>
        <tbody>
          {result.timeline.map((snapshot) => (
            <tr key={snapshot.round}>
              <td>{snapshot.round}</td>
              <td>{formatNumber(snapshot.attackerRemaining)}</td>
              <td>{formatNumber(snapshot.attackerLosses)}</td>
              <td>{formatNumber(snapshot.defenderRemaining)}</td>
              <td>{formatNumber(snapshot.defenderLosses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
