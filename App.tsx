import { useMemo, useState } from 'react';
import {
  CASUALTY_POLICIES,
  DEFAULT_ASSUMPTIONS,
  compareConfigurations,
  runMonteCarlo,
  simulateBattle,
  type Assumptions,
  type ConfigurationVerdict,
  type MonteCarloSummary,
} from './engine';
import { AssumptionsPanel } from './ui/AssumptionsPanel';
import { CalibrationPanel, type StoredCase } from './ui/CalibrationPanel';
import { CastlePanel } from './ui/CastlePanel';
import { ReportImport } from './ui/ReportImport';
import { reportedCasualties } from './ocr/battleReport';
import { PlanningPanel } from './ui/PlanningPanel';
import { ResultsPanel } from './ui/ResultsPanel';
import { SimulationsPanel } from './ui/SimulationsPanel';
import { SidePanel } from './ui/SidePanel';
import { Section } from './ui/controls';
import {
  applyReportSide,
  defaultSideForm,
  formatNumber,
  formatPercent,
  loadProfiles,
  loadScenarios,
  newId,
  saveProfiles,
  saveScenarios,
  withJoiners,
  type Profile,
  toSide,
  type Scenario,
  type SideForm,
} from './ui/model';
import './App.css';

export default function App() {
  const [attackerForm, setAttackerForm] = useState<SideForm>(() => defaultSideForm('Attacker'));
  const [defenderForm, setDefenderForm] = useState<SideForm>(() =>
    defaultSideForm('Defender', { infantry: 60, cavalry: 15, archer: 25 }),
  );
  const [assumptions, setAssumptions] = useState<Assumptions>({ ...DEFAULT_ASSUMPTIONS });
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloSummary | null>(null);
  const [comparison, setComparison] = useState<ConfigurationVerdict[] | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [runs, setRuns] = useState(500);
  const [seed, setSeed] = useState(1);
  const [policyId, setPolicyId] = useState('field-pvp');
  const [infirmary, setInfirmary] = useState(50000);
  const [scenarios, setScenarios] = useState<Scenario[]>(() => loadScenarios());
  const [scenarioName, setScenarioName] = useState('');
  const [calibrationCases, setCalibrationCases] = useState<StoredCase[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());

  const persistProfiles = (next: Profile[]) => {
    setProfiles(next);
    saveProfiles(next);
  };

  /** The chosen split governs how a predicted casualty total maps onto the report's three rows. */
  const policy = CASUALTY_POLICIES.find((item) => item.id === policyId) ?? CASUALTY_POLICIES[0];

  const attacker = useMemo(() => toSide(attackerForm, 'attacker'), [attackerForm]);
  const defender = useMemo(() => toSide(defenderForm, 'defender'), [defenderForm]);
  const result = useMemo(() => simulateBattle(attacker, defender, { assumptions }), [attacker, defender, assumptions]);

  const candidates = scenarios.map((scenario, index) => ({
    id: `${index}`,
    label: `${scenario.name} (attacker)`,
  }));

  const compare = () => {
    const chosen = selectedCandidates
      .map((id) => scenarios[Number(id)])
      .filter((scenario): scenario is Scenario => scenario !== undefined)
      .map((scenario, index) => ({
        id: `saved-${index}`,
        label: scenario.name,
        side: toSide(scenario.attacker, 'attacker'),
      }));
    setComparison(
      compareConfigurations([{ id: 'current', label: 'Current attacker', side: attacker }, ...chosen], defender, {
        runs,
        assumptions,
        seed,
      }),
    );
  };

  const persist = (next: Scenario[]) => {
    setScenarios(next);
    saveScenarios(next);
  };

  const exportScenarios = () => {
    const blob = new Blob([JSON.stringify(scenarios, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kingshot-scenarios.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importScenarios = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (Array.isArray(parsed)) persist([...scenarios, ...(parsed as Scenario[])]);
    } catch {
      // Ignore malformed files; the user can see nothing was added.
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Kingshot battle simulator</h1>
        <p>
          Plan marches, rallies and garrisons: enter both sides, run one battle or a few hundred, and compare loadouts.
          The buff maths (effect_op stacking) and troop base stats are reverse-engineered from the game; the per-round
          engine is a model with the uncertain parts exposed as editable assumptions. Use it to rank options, and
          calibrate it against your own battle reports before trusting absolute numbers.
        </p>
      </header>

      <div className="sides">
        <Section title="Attacker">
          <SidePanel
            form={attackerForm}
            onChange={setAttackerForm}
            side="attacker"
            profiles={profiles}
            onProfilesChange={persistProfiles}
          />
        </Section>
        <Section title="Defender">
          <SidePanel
            form={defenderForm}
            onChange={setDefenderForm}
            side="defender"
            profiles={profiles}
            onProfilesChange={persistProfiles}
          />
        </Section>
      </div>

      <Section
        title="Import a battle report"
        note="Read both sides straight off a report mail: stat percentages, troop counts, tier and the casualties it reported."
      >
        <ReportImport
          attackerLabel={attackerForm.label}
          defenderLabel={defenderForm.label}
          onApply={({ report, swap, bonuses, troops, calibrate, target }) => {
            const attackerReport = swap ? report.right : report.left;
            const defenderReport = swap ? report.left : report.right;
            const nextAttacker = applyReportSide(attackerForm, attackerReport, { bonuses, troops });
            const nextDefender = applyReportSide(defenderForm, defenderReport, { bonuses, troops });
            setAttackerForm(nextAttacker);
            setDefenderForm(nextDefender);
            const attackerLosses = reportedCasualties(attackerReport, target);
            const defenderLosses = reportedCasualties(defenderReport, target);
            if (calibrate && attackerLosses !== undefined && defenderLosses !== undefined) {
              setCalibrationCases((current) => [
                ...current,
                {
                  id: newId('case'),
                  label: `Imported report, ${target} (${formatNumber(attackerLosses)} vs ${formatNumber(defenderLosses)})`,
                  attacker: toSide(nextAttacker, 'attacker'),
                  defender: toSide(nextDefender, 'defender'),
                  observed: { attackerLosses, defenderLosses, target },
                  policy,
                },
              ]);
            }
          }}
        />
      </Section>

      <Section title="Result">
        <ResultsPanel
          result={result}
          policyId={policyId}
          onPolicyChange={setPolicyId}
          infirmary={infirmary}
          onInfirmaryChange={setInfirmary}
        />
      </Section>

      <Section title="Multiple simulations">
        <SimulationsPanel
          summary={monteCarlo}
          runs={runs}
          onRunsChange={setRuns}
          seed={seed}
          onSeedChange={setSeed}
          onRun={() => setMonteCarlo(runMonteCarlo(attacker, defender, runs, assumptions, seed))}
          comparison={comparison}
          candidates={candidates}
          selectedCandidates={selectedCandidates}
          onToggleCandidate={(id) =>
            setSelectedCandidates(
              selectedCandidates.includes(id)
                ? selectedCandidates.filter((item) => item !== id)
                : [...selectedCandidates, id],
            )
          }
          onCompare={compare}
        />
      </Section>

      <Section
        title="Castle battle"
        note="One rally against a structure held by several garrison squads, with turret fire on the castle's occupants."
      >
        <CastlePanel
          attacker={attackerForm}
          defender={defenderForm}
          profiles={profiles}
          assumptions={assumptions}
        />
      </Section>

      <Section title="Planning tools">
        <PlanningPanel
          attacker={attacker}
          defender={defender}
          assumptions={assumptions}
          onApplyRatio={(ratio) => setAttackerForm({ ...attackerForm, ratio: { ...ratio } })}
          onApplyJoiners={(heroIds) => setAttackerForm(withJoiners(attackerForm, heroIds))}
        />
      </Section>

      <Section title="Model assumptions">
        <AssumptionsPanel assumptions={assumptions} onChange={setAssumptions} />
      </Section>

      <Section title="Calibration">
        <CalibrationPanel
          attacker={attacker}
          defender={defender}
          policy={policy}
          assumptions={assumptions}
          onApply={setAssumptions}
          cases={calibrationCases}
          onCasesChange={setCalibrationCases}
        />
      </Section>

      <Section
        title="Scenarios"
        note="Saved in this browser. Export to share a plan with your team."
      >
        <div className="row">
          <label className="field">
            <span className="field-label">Name</span>
            <input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} />
          </label>
          <button
            type="button"
            disabled={scenarioName.trim() === ''}
            onClick={() => {
              persist([
                ...scenarios,
                { name: scenarioName.trim(), attacker: attackerForm, defender: defenderForm },
              ]);
              setScenarioName('');
            }}
          >
            Save current
          </button>
          <button type="button" onClick={exportScenarios} disabled={scenarios.length === 0}>
            Export JSON
          </button>
          <label className="field">
            <span className="field-label">Import JSON</span>
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importScenarios(file);
              }}
            />
          </label>
        </div>

        {scenarios.length > 0 ? (
          <table className="result-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Outcome</th>
                <th>K/D</th>
                <th>Attacker losses</th>
                <th>Defender losses</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario, index) => {
                const comparison = simulateBattle(toSide(scenario.attacker, 'attacker'), toSide(scenario.defender, 'defender'), {
                  assumptions,
                });
                return (
                  <tr key={`${scenario.name}-${index}`}>
                    <td>{scenario.name}</td>
                    <td>{comparison.winner}</td>
                    <td>{comparison.killDeathRatio.toFixed(2)}</td>
                    <td>
                      {formatNumber(comparison.attackerCasualties.total)} (
                      {formatPercent(comparison.attackerCasualties.fraction)})
                    </td>
                    <td>
                      {formatNumber(comparison.defenderCasualties.total)} (
                      {formatPercent(comparison.defenderCasualties.fraction)})
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setAttackerForm(scenario.attacker);
                          setDefenderForm(scenario.defender);
                        }}
                      >
                        load
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        aria-label={`Delete ${scenario.name}`}
                        onClick={() => persist(scenarios.filter((_, i) => i !== index))}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </Section>
    </div>
  );
}
