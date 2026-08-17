import { useState } from 'react';
import {
  DEFAULT_TURRET_FIRE,
  simulateCastleAssault,
  turretVolleys,
  type Assumptions,
  type TurretFire,
} from '../engine';
import { NumberField, SelectField, Stat } from './controls';
import { formatNumber, formatPercent, newId, profileToForm, toSide, type Profile, type SideForm } from './model';

/** `garrison-panel` follows the stance, so flipping who rallies does not need every squad re-picked. */
type SquadSource = 'garrison-panel' | 'attacker-panel' | 'defender-panel' | string;

interface GarrisonSquad {
  id: string;
  /** Which loadout this garrisoned march uses. */
  source: SquadSource;
  /** March size, since the same account garrisons different amounts through an event. */
  total: number;
}

/** Which side of the fight you are planning. Only the rally/garrison mapping changes. */
type Stance = 'assault' | 'hold';

const STRUCTURES = [
  { value: 'castle' as const, label: "King's Castle" },
  { value: 'turret' as const, label: 'Turret' },
];

export function CastlePanel(props: {
  attacker: SideForm;
  defender: SideForm;
  profiles: Profile[];
  assumptions: Assumptions;
}) {
  const [stance, setStance] = useState<Stance>('assault');
  const [structure, setStructure] = useState<'castle' | 'turret'>('castle');
  const [squads, setSquads] = useState<GarrisonSquad[]>(() => [
    { id: newId('squad'), source: 'garrison-panel', total: 100000 },
  ]);
  const [fire, setFire] = useState<TurretFire>({ ...DEFAULT_TURRET_FIRE, hostileTurrets: 2 });
  const [infirmary, setInfirmary] = useState(300000);

  // Holding the structure swaps the roles: the enemy brings the rally, your squads are the garrison.
  const rallyForm = stance === 'assault' ? props.attacker : props.defender;
  const garrisonBase = stance === 'assault' ? props.defender : props.attacker;

  const sourceOptions = [
    { value: 'garrison-panel', label: `Defending panel (${garrisonBase.label})` },
    { value: 'attacker-panel', label: `Attacker panel (${props.attacker.label})` },
    { value: 'defender-panel', label: `Defender panel (${props.defender.label})` },
    ...props.profiles.map((profile) => ({ value: profile.id, label: `Profile: ${profile.name}` })),
  ];

  const formFor = (squad: GarrisonSquad): SideForm => {
    if (squad.source === 'garrison-panel') return garrisonBase;
    if (squad.source === 'attacker-panel') return props.attacker;
    if (squad.source === 'defender-panel') return props.defender;
    const profile = props.profiles.find((entry) => entry.id === squad.source);
    return profile ? profileToForm(profile, profile.name) : garrisonBase;
  };

  // Turrets only shoot at the troops inside the castle, so a turret fight takes no turret fire.
  const effectiveFire: TurretFire = structure === 'castle' ? fire : { ...fire, hostileTurrets: 0 };

  const result = simulateCastleAssault(
    toSide(rallyForm, 'attacker'),
    squads.map((squad, index) => {
      const form = formFor(squad);
      return toSide({ ...form, label: `${form.label} #${index + 1}`, total: squad.total }, 'defender');
    }),
    { assumptions: props.assumptions, turret: effectiveFire, infirmaryCapacity: infirmary },
  );

  const patchSquad = (id: string, patch: Partial<GarrisonSquad>) =>
    setSquads(squads.map((squad) => (squad.id === id ? { ...squad, ...patch } : squad)));

  const volleys = turretVolleys(effectiveFire);
  const rallyIsMine = stance === 'assault';

  return (
    <div>
      <p className="note">
        A Castle Battle structure is not held by one march: every garrisoned squad fights as itself, so a rally works
        through them in turn and carries its survivors from one to the next. Turret fire is applied to the garrison
        first, because the turrets have been shooting for the whole hold before your rally lands. Chained rallies are
        not modelled yet - this is one rally against the stack.
      </p>

      <div className="grid">
        <SelectField
          label="You are"
          value={stance}
          options={[
            { value: 'assault', label: 'Rallying the structure' },
            { value: 'hold', label: 'Holding it against a rally' },
          ]}
          onChange={setStance}
        />
        <SelectField label="Structure" value={structure} options={STRUCTURES} onChange={setStructure} />
        <NumberField
          label="Infirmary capacity"
          value={infirmary}
          min={0}
          step={10000}
          onChange={setInfirmary}
          title="King's Castle rule: casualties go to the infirmary until it is full, and only the overflow dies."
        />
      </div>
      <p className="note">
        The rally uses the <strong>{rallyIsMine ? 'attacker' : 'defender'}</strong> panel ({rallyForm.label}), so its
        rally-only hero skills and widgets count; each garrison squad below is read as a defender, so garrison-only
        skills count for them.
      </p>

      <h3>Garrison squads</h3>
      <table className="bonus-table">
        <thead>
          <tr>
            <th>Loadout</th>
            <th>Troops</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {squads.map((squad, index) => (
            <tr key={squad.id}>
              <td>
                <SelectField
                  label={`Squad ${index + 1} loadout`}
                  value={squad.source}
                  options={sourceOptions}
                  onChange={(source) => patchSquad(squad.id, { source })}
                />
              </td>
              <td>
                <NumberField
                  label={`Squad ${index + 1} troops`}
                  value={squad.total}
                  min={0}
                  step={10000}
                  onChange={(total) => patchSquad(squad.id, { total })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="ghost"
                  aria-label={`Remove squad ${index + 1}`}
                  onClick={() => setSquads(squads.filter((entry) => entry.id !== squad.id))}
                >
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() =>
          setSquads([
            ...squads,
            { id: newId('squad'), source: squads[squads.length - 1]?.source ?? 'garrison-panel', total: 100000 },
          ])
        }
      >
        Add garrison squad
      </button>

      <h3>Turret fire</h3>
      <p className="note">
        Official: a turret only damages the team occupying the King&rsquo;s Castle, it does nothing to a team holding
        the castle and that turret at once, and its interval shortens the longer it is held. The percentages and
        intervals below are player-reported, not published - 2% of the occupier per turret per volley, the interval
        starting near 4 minutes and speeding up to about 1 - so they are editable.
      </p>
      <div className="grid">
        <NumberField
          label="Enemy-held turrets"
          value={fire.hostileTurrets}
          min={0}
          max={4}
          onChange={(hostileTurrets) => setFire({ ...fire, hostileTurrets })}
          disabled={structure !== 'castle'}
          title="Turrets held by the other side. Hold the castle and all four and nothing fires at you."
        />
        <NumberField
          label="Hold time"
          suffix="min"
          value={fire.holdMinutes}
          min={0}
          step={5}
          onChange={(holdMinutes) => setFire({ ...fire, holdMinutes })}
        />
        <NumberField
          label="Loss per turret"
          suffix="%"
          value={Number((fire.ratePerTurret * 100).toFixed(2))}
          min={0}
          step={0.5}
          onChange={(value) => setFire({ ...fire, ratePerTurret: value / 100 })}
        />
        <NumberField
          label="First interval"
          suffix="min"
          value={fire.startIntervalMinutes}
          min={0.25}
          step={0.5}
          onChange={(startIntervalMinutes) => setFire({ ...fire, startIntervalMinutes })}
        />
        <NumberField
          label="Fastest interval"
          suffix="min"
          value={fire.minIntervalMinutes}
          min={0.25}
          step={0.25}
          onChange={(minIntervalMinutes) => setFire({ ...fire, minIntervalMinutes })}
        />
        <NumberField
          label="Speed-up per volley"
          suffix="min"
          value={fire.intervalStepMinutes}
          min={0}
          step={0.25}
          onChange={(intervalStepMinutes) => setFire({ ...fire, intervalStepMinutes })}
        />
      </div>
      <p className="note">
        {structure === 'castle'
          ? `${volleys.length} volleys in ${formatNumber(fire.holdMinutes)} minutes, costing the garrison ${formatPercent(result.turret.fractionLost)} (${formatNumber(result.turret.total)} troops) before the rally lands.`
          : 'Turrets do not fire on a turret fight, so this only matters for the castle itself.'}
      </p>

      <h3>Outcome</h3>
      <div className="stats">
        <Stat
          label="Structure"
          value={result.structureTaken ? (rallyIsMine ? 'taken' : 'lost') : rallyIsMine ? 'held by them' : 'held'}
          tone={result.structureTaken === rallyIsMine ? 'good' : 'bad'}
        />
        <Stat label="Squads cleared" value={`${result.squadsCleared} / ${squads.length}`} />
        <Stat label="Rally survivors" value={formatNumber(result.attackerSurvivors)} />
        <Stat label="Garrison survivors" value={formatNumber(result.defenderSurvivors)} />
        <Stat
          label="K/D for the rally"
          value={Number.isFinite(result.killDeathRatio) ? result.killDeathRatio.toFixed(2) : '\u221e'}
          hint="Garrison losses, turret fire included, over the rally's own losses."
        />
      </div>

      <table className="result-table">
        <thead>
          <tr>
            <th>Engagement</th>
            <th>Rally losses</th>
            <th>Garrison losses</th>
            <th>Rally left</th>
            <th>Squad left</th>
          </tr>
        </thead>
        <tbody>
          {result.engagements.map((engagement) => (
            <tr key={engagement.index}>
              <td>
                {engagement.index}. {engagement.label}
              </td>
              <td>{formatNumber(engagement.battle.attackerCasualties.total)}</td>
              <td>{formatNumber(engagement.battle.defenderCasualties.total)}</td>
              <td>{formatNumber(engagement.attackerRemaining)}</td>
              <td>{formatNumber(engagement.defenderRemaining)}</td>
            </tr>
          ))}
          {result.turret.total > 0 ? (
            <tr>
              <td>Turret fire</td>
              <td>&mdash;</td>
              <td>{formatNumber(result.turret.total)}</td>
              <td>&mdash;</td>
              <td>&mdash;</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <p className="note">
        Casualty split uses the King&rsquo;s Castle rule: everything to the infirmary until it is full, then deaths.
        Rally {formatNumber(result.attackerCasualties.infirmary)} injured / {formatNumber(result.attackerCasualties.dead)}{' '}
        dead; garrison {formatNumber(result.defenderCasualties.infirmary)} injured /{' '}
        {formatNumber(result.defenderCasualties.dead)} dead.
      </p>
    </div>
  );
}
