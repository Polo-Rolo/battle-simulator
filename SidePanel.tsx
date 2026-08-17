import {
  FORMATION_PRESETS,
  MAX_TG,
  MAX_TIER,
  MIN_TG,
  MIN_TIER,
  TROOP_TYPES,
  countsFromRatio,
  type BattleRole,
  type TroopType,
} from '../engine';
import { useState } from 'react';
import { NumberField, SelectField } from './controls';
import { HeroPanel } from './HeroPanel';
import { ScreenshotImport } from './ScreenshotImport';
import {
  STATS,
  formatNumber,
  newId,
  profileToForm,
  setBonusDetail,
  totalBonuses,
  type ExtraBonus,
  type Profile,
  type SideForm,
} from './model';

const SCOPES: { value: ExtraBonus['scope']; label: string }[] = [
  { value: 'all', label: 'All troops' },
  { value: 'infantry', label: 'Infantry only' },
  { value: 'cavalry', label: 'Cavalry only' },
  { value: 'archer', label: 'Archers only' },
];

function typeLabel(type: TroopType): string {
  return type[0].toUpperCase() + type.slice(1);
}

export function SidePanel(props: {
  form: SideForm;
  onChange: (form: SideForm) => void;
  /** Which end of the fight this side is, so rally-only and defender-only hero skills apply correctly. */
  side: BattleRole;
  /** Saved loadouts, shared with the other side so either can load any of them. */
  profiles: Profile[];
  onProfilesChange: (profiles: Profile[]) => void;
}) {
  const { form, onChange } = props;
  const patch = (changes: Partial<SideForm>) => onChange({ ...form, ...changes });
  const [importing, setImporting] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileId, setProfileId] = useState('');

  const patchExtra = (index: number, changes: Partial<ExtraBonus>) => {
    const extras = [...form.extras];
    extras[index] = { ...extras[index], ...changes };
    patch({ extras });
  };

  const saveProfile = () => {
    const name = profileName.trim();
    if (name === '') return;
    const existing = props.profiles.find((profile) => profile.name === name);
    const profile: Profile = { id: existing?.id ?? newId('profile'), name, form: { ...form } };
    props.onProfilesChange(
      existing
        ? props.profiles.map((item) => (item.id === existing.id ? profile : item))
        : [...props.profiles, profile],
    );
    setProfileId(profile.id);
    setProfileName('');
  };

  const counts = countsFromRatio(Math.max(0, Math.round(form.total)), form.ratio);
  const ratioSum = TROOP_TYPES.reduce((acc, type) => acc + form.ratio[type], 0);
  const totals = totalBonuses(form);

  return (
    <div className="side-panel">
      <input
        className="side-label"
        value={form.label}
        aria-label="Side name"
        onChange={(event) => patch({ label: event.target.value })}
      />

      <h3>Profile</h3>
      <p className="note">
        Enter a loadout once and reuse it: save it as a profile, then load it into either side. Profiles keep the
        heroes, stats, troops and extras, and stay in this browser.
      </p>
      <div className="row">
        <SelectField
          label="Load a profile"
          value={profileId}
          options={[
            { value: '', label: props.profiles.length === 0 ? 'No saved profiles' : 'Choose a profile\u2026' },
            ...props.profiles.map((profile) => ({ value: profile.id, label: profile.name })),
          ]}
          onChange={(id) => {
            setProfileId(id);
            const profile = props.profiles.find((item) => item.id === id);
            if (profile) onChange(profileToForm(profile, form.label));
          }}
        />
        <label className="field">
          <span className="field-label">Save as</span>
          <input
            value={profileName}
            placeholder="Profile name"
            onChange={(event) => setProfileName(event.target.value)}
          />
        </label>
        <button type="button" onClick={saveProfile} disabled={profileName.trim() === ''}>
          Save profile
        </button>
        <button
          type="button"
          className="ghost"
          disabled={profileId === ''}
          onClick={() => {
            props.onProfilesChange(props.profiles.filter((profile) => profile.id !== profileId));
            setProfileId('');
          }}
        >
          Delete
        </button>
      </div>

      <h3>Heroes</h3>
      <HeroPanel heroes={form.heroes} side={props.side} onChange={(heroes) => patch({ heroes })} />

      <h3>Troops</h3>
      <div className="grid">
        <NumberField label="Total troops" value={form.total} step={1000} min={0} onChange={(total) => patch({ total })} />
        <NumberField
          label="Troop level"
          value={form.tier}
          min={MIN_TIER}
          max={MAX_TIER}
          onChange={(tier) => patch({ tier })}
          title="T1-T11"
        />
        <NumberField
          label="Troop grade"
          value={form.tg}
          min={MIN_TG}
          max={MAX_TG}
          onChange={(tg) => patch({ tg })}
          title="TG0-TG5 upgrade track"
        />
      </div>

      <div className="grid">
        {TROOP_TYPES.map((type) => (
          <NumberField
            key={type}
            label={typeLabel(type)}
            suffix="%"
            value={form.ratio[type]}
            min={0}
            max={100}
            onChange={(value) => patch({ ratio: { ...form.ratio, [type]: value } })}
          />
        ))}
      </div>
      <p className="note">
        {TROOP_TYPES.map((type) => `${formatNumber(counts[type])} ${type}`).join(' \u00b7 ')}
        {ratioSum !== 100 ? ` (ratio sums to ${ratioSum}%, normalised)` : null}
      </p>
      <div className="row">
        <SelectField
          label="Formation preset"
          value=""
          options={[
            { value: '', label: 'Apply a preset\u2026' },
            ...FORMATION_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
          ]}
          onChange={(id) => {
            const preset = FORMATION_PRESETS.find((item) => item.id === id);
            if (preset) patch({ ratio: { ...preset.ratio } });
          }}
        />
      </div>

      <h3>Bonus details</h3>
      <p className="note">
        The twelve percentages from a recent battle report&rsquo;s Bonus Details, or your own stat screens. They are
        totals - gear, charms, research, masters, pets, widgets and the stat skills of the heroes you had slotted are
        all already inside them - so this grid is the only place stats come from. Import a battle report below both
        sides to fill all twenty-four at once.
      </p>
      <table className="bonus-table">
        <thead>
          <tr>
            <th>Troop type</th>
            {STATS.map((stat) => (
              <th key={stat}>{stat}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TROOP_TYPES.map((type) => (
            <tr key={type}>
              <td>{typeLabel(type)}</td>
              {STATS.map((stat) => (
                <td key={stat}>
                  <input
                    type="number"
                    aria-label={`${type} ${stat}`}
                    value={form.bonusDetails[type][stat] ?? 0}
                    onChange={(event) => onChange(setBonusDetail(form, type, stat, Number(event.target.value) || 0))}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr className="totals">
            <td>In effect</td>
            {STATS.map((stat) => (
              <td key={stat}>
                {TROOP_TYPES.map((type) =>
                  Number(((totals[type][stat] ?? 0) + (totals.all[stat] ?? 0)).toFixed(1)),
                ).join(' / ')}
                %
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="note">
        In effect is infantry / cavalry / archer once the extras you ticked below are added.
      </p>
      <button type="button" className="ghost" onClick={() => setImporting((value) => !value)}>
        {importing ? 'Close screenshot import' : 'Read a stat screenshot instead\u2026'}
      </button>
      {importing ? (
        <ScreenshotImport
          sideLabel={form.label}
          onImport={(stats) => {
            let next = form;
            for (const parsed of stats) {
              const types = parsed.scope === 'all' ? TROOP_TYPES : [parsed.scope];
              for (const type of types) next = setBonusDetail(next, type, parsed.stat, parsed.value);
            }
            onChange(next);
          }}
        />
      ) : null}

      <h3>Extras</h3>
      <p className="note">
        Only for bonuses the percentages above do <em>not</em> already contain: an on-demand buff item you are about to
        fire, or a pet skill you were not running when that report was generated. Enter what the item or pet screen
        says and tick it; unticked rows are ignored, so one profile covers buffed and unbuffed marches.
      </p>
      <table className="bonus-table">
        <thead>
          <tr>
            <th>Active</th>
            <th>Source</th>
            <th>Applies to</th>
            {STATS.map((stat) => (
              <th key={stat}>{stat}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {form.extras.map((extra, index) => (
            <tr key={extra.id} className={extra.active ? undefined : 'muted-row'}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`${extra.label} active`}
                  checked={extra.active}
                  onChange={(event) => patchExtra(index, { active: event.target.checked })}
                />
              </td>
              <td>
                <input
                  value={extra.label}
                  aria-label="Extra bonus name"
                  onChange={(event) => patchExtra(index, { label: event.target.value })}
                />
              </td>
              <td>
                <select
                  value={extra.scope}
                  aria-label="Extra bonus scope"
                  onChange={(event) => patchExtra(index, { scope: event.target.value as ExtraBonus['scope'] })}
                >
                  {SCOPES.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </td>
              {STATS.map((stat) => (
                <td key={stat}>
                  <input
                    type="number"
                    aria-label={`${extra.label} ${stat}`}
                    value={extra.bonus[stat] ?? 0}
                    onChange={(event) =>
                      patchExtra(index, { bonus: { ...extra.bonus, [stat]: Number(event.target.value) || 0 } })
                    }
                  />
                </td>
              ))}
              <td>
                <button
                  type="button"
                  className="ghost"
                  aria-label={`Remove ${extra.label}`}
                  onClick={() => patch({ extras: form.extras.filter((other) => other.id !== extra.id) })}
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
          patch({
            extras: [...form.extras, { id: newId('extra'), label: 'New bonus', scope: 'all', bonus: {}, active: true }],
          })
        }
      >
        Add extra bonus
      </button>
    </div>
  );
}
