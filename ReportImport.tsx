import { useState } from 'react';
import { TROOP_TYPES, type CasualtyTarget, type TroopType } from '../engine';
import {
  parseBattleReport,
  reportedCasualties,
  type ParsedBattleReport,
  type ReportSide,
} from '../ocr/battleReport';
import { recognizeText } from '../ocr/recognize';
import type { Scope, StatKey } from '../ocr/text';
import { formatNumber } from './model';

const STATS: StatKey[] = ['attack', 'defense', 'lethality', 'health'];
const SCOPES: Scope[] = ['all', 'infantry', 'cavalry', 'archer'];

export interface ReportImportChoices {
  report: ParsedBattleReport;
  /** True when the report's left column is the defender, i.e. the mail was received while defending. */
  swap: boolean;
  bonuses: boolean;
  troops: boolean;
  calibrate: boolean;
  /** Which casualty rows the calibration case should be fitted against. */
  target: CasualtyTarget;
}

const TARGETS: [CasualtyTarget, string][] = [
  ['dead', 'Losses only (dead - the permanent ones)'],
  ['deadAndInfirmary', 'Losses + injured (out of action until healed)'],
  ['all', 'Losses + injured + lightly injured (every troop that was hit)'],
];

const METRIC_ROWS: [keyof ReportSide & ('squad' | 'losses' | 'injured' | 'lightlyInjured'), string][] = [
  ['squad', 'squad size'],
  ['losses', 'losses (dead)'],
  ['injured', 'injured (infirmary)'],
  ['lightlyInjured', 'lightly injured'],
];

/**
 * Imports a battle-report mail. The report carries everything a fight needs - both sides' stat
 * percentages, per-type troop counts, tier and the casualties the game reported - so one mail can set
 * up both sides and become a calibration case. It arrives as several screenshots because the mail is
 * taller than a phone screen, so this takes as many images as you have.
 */
export function ReportImport(props: {
  attackerLabel: string;
  defenderLabel: string;
  onApply: (choices: ReportImportChoices) => void;
}) {
  const [texts, setTexts] = useState<string[]>([]);
  const [report, setReport] = useState<ParsedBattleReport | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swap, setSwap] = useState(false);
  const [bonuses, setBonuses] = useState(true);
  const [troops, setTroops] = useState(true);
  const [calibrate, setCalibrate] = useState(true);
  const [target, setTarget] = useState<CasualtyTarget>('deadAndInfirmary');
  const [showText, setShowText] = useState(false);
  const [applied, setApplied] = useState(false);

  const reparse = (next: string[]) => {
    setTexts(next);
    setReport(parseBattleReport(next));
    setApplied(false);
  };

  /** OCR drops the odd digit, so every read value is editable before it is applied. */
  const editSide = (which: 'left' | 'right', change: (side: ReportSide) => ReportSide) => {
    setReport((current) => (current === null ? null : { ...current, [which]: change(current[which]) }));
    setApplied(false);
  };
  const editBonus = (which: 'left' | 'right', scope: Scope, stat: StatKey, value: number) =>
    editSide(which, (side) => ({
      ...side,
      bonuses: { ...side.bonuses, [scope]: { ...side.bonuses[scope], [stat]: value } },
    }));
  const editCount = (which: 'left' | 'right', type: TroopType, value: number) =>
    editSide(which, (side) => ({
      ...side,
      counts: { ...(side.counts ?? { infantry: 0, cavalry: 0, archer: 0 }), [type]: value },
    }));

  const addFiles = async (files: File[]) => {
    setError(null);
    const collected: string[] = [];
    for (const [index, file] of files.entries()) {
      setStatus(`Reading ${file.name} (${index + 1}/${files.length})\u2026`);
      try {
        collected.push(await recognizeText(file, (stage, progress) =>
          setStatus(`${file.name}: ${stage} ${Math.round(progress * 100)}%`),
        ));
      } catch (cause) {
        setError(`OCR failed on ${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }
    setStatus(null);
    if (collected.length > 0) reparse([...texts, ...collected]);
  };

  const columns: ('left' | 'right')[] = swap ? ['right', 'left'] : ['left', 'right'];
  const attackerSide = report ? report[columns[0]] : null;
  const defenderSide = report ? report[columns[1]] : null;
  const scopes = report
    ? SCOPES.filter((scope) => report.left.bonuses[scope] ?? report.right.bonuses[scope])
    : [];

  return (
    <div className="ocr-import">
      <div
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void addFiles([...event.dataTransfer.files]);
        }}
      >
        <p>Drop the report screenshots, or pick them all at once</p>
        <input
          type="file"
          accept="image/*"
          multiple
          aria-label="Battle report screenshots"
          onChange={(event) => void addFiles([...(event.target.files ?? [])])}
        />
        <p className="note">
          Battle Overview gives squad sizes and casualties, Troop Power gives per-type counts and tier, Bonus Details
          gives both sides&rsquo; percentages. Recognition runs in this browser; the images are never uploaded.
        </p>
      </div>

      {status ? <p className="note">{status}</p> : null}
      {error ? <p className="warn">{error}</p> : null}
      {texts.length > 0 ? (
        <p className="note">
          {texts.length} screenshot(s) read.{' '}
          <button type="button" className="ghost" onClick={() => reparse([])}>
            Clear
          </button>
        </p>
      ) : null}

      {report && attackerSide && defenderSide ? (
        <>
          {report.notes.map((note) => (
            <p className="warn" key={note}>
              {note}
            </p>
          ))}
          <label className="checkbox">
            <input type="checkbox" checked={swap} onChange={(event) => setSwap(event.target.checked)} />
            The report&rsquo;s left column is the defender (tick if this mail came from a fight you defended)
          </label>
          <table className="result-table">
            <thead>
              <tr>
                <th>Read from the report</th>
                <th>{props.attackerLabel}</th>
                <th>{props.defenderLabel}</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map(([metric, label]) => (
                <tr key={metric}>
                  <td>{label}</td>
                  {columns.map((which) => (
                    <td key={which}>
                      <input
                        type="number"
                        aria-label={`${which} ${metric}`}
                        value={report[which][metric] ?? 0}
                        onChange={(event) =>
                          editSide(which, (side) => ({ ...side, [metric]: Number(event.target.value) }))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {TROOP_TYPES.map((type) => (
                <tr key={`count-${type}`}>
                  <td>{type}</td>
                  {columns.map((which) => (
                    <td key={which}>
                      <input
                        type="number"
                        aria-label={`${which} ${type} count`}
                        value={report[which].counts?.[type] ?? 0}
                        onChange={(event) => editCount(which, type, Number(event.target.value))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td>troop tier</td>
                {columns.map((which) => (
                  <td key={which}>
                    <input
                      type="number"
                      aria-label={`${which} tier`}
                      value={report[which].tier ?? 0}
                      onChange={(event) =>
                        editSide(which, (side) => ({ ...side, tier: Number(event.target.value) }))
                      }
                    />
                  </td>
                ))}
              </tr>
              {scopes.flatMap((scope) =>
                STATS.map((stat) => (
                  <tr key={`${scope}-${stat}`}>
                    <td>
                      {scope === 'all' ? '' : `${scope} `}
                      {stat}
                    </td>
                    {columns.map((which) => (
                      <td key={which}>
                        <input
                          type="number"
                          step="0.1"
                          aria-label={`${which} ${scope} ${stat}`}
                          value={report[which].bonuses[scope]?.[stat] ?? 0}
                          onChange={(event) => editBonus(which, scope, stat, Number(event.target.value))}
                        />
                        %
                      </td>
                    ))}
                  </tr>
                )),
              )}
              <tr>
                <td>Casualties used for calibration</td>
                <td>{formatNumber(reportedCasualties(attackerSide, target) ?? 0)}</td>
                <td>{formatNumber(reportedCasualties(defenderSide, target) ?? 0)}</td>
              </tr>
            </tbody>
          </table>

          <label className="checkbox">
            <input type="checkbox" checked={bonuses} onChange={(event) => setBonuses(event.target.checked)} />
            Set stat bonuses from the report (replaces the per-source rows - report percentages are totals)
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={troops} onChange={(event) => setTroops(event.target.checked)} />
            Set troop counts, ratio and tier
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={calibrate}
              disabled={reportedCasualties(attackerSide, target) === undefined}
              onChange={(event) => setCalibrate(event.target.checked)}
            />
            Add it as a calibration case
          </label>
          <label className="field">
            <span className="field-label">Fit against</span>
            <select value={target} onChange={(event) => setTarget(event.target.value as CasualtyTarget)}>
              {TARGETS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <button
              type="button"
              className="primary"
              onClick={() => {
                props.onApply({ report, swap, bonuses, troops, calibrate, target });
                setApplied(true);
              }}
            >
              Apply to both sides
            </button>
            {applied ? <span className="note">Applied.</span> : null}
          </div>
          <p className="note">
            Troop grade (TG) is a badge on the troop icons rather than text, so it is not imported - set it by hand.
          </p>
        </>
      ) : null}

      <button type="button" className="ghost" onClick={() => setShowText((value) => !value)}>
        {showText ? 'Hide' : 'Show'} raw text
      </button>
      {showText ? (
        <>
          <textarea
            className="ocr-text"
            aria-label="Report OCR text"
            rows={8}
            value={texts.join('\n')}
            placeholder="OCR output appears here; you can fix a misread line and re-read it."
            onChange={(event) => setTexts([event.target.value])}
          />
          <button type="button" onClick={() => reparse(texts)}>
            Re-read text
          </button>
        </>
      ) : null}
    </div>
  );
}
