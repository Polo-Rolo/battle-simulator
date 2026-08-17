import {
  HEROES,
  HEROES_BY_ID,
  LINEUP_SLOTS,
  MAX_HERO_LEVEL,
  MAX_JOINERS,
  MAX_STAR,
  MAX_WIDGET_LEVEL,
  activeSkills,
  skillLevelIndex,
  slotEffects,
  type BattleRole,
  type HeroLineup,
  type HeroSlot,
} from '../engine';
import { NumberField, SelectField } from './controls';

const HERO_OPTIONS = [
  { value: '', label: 'Empty' },
  ...HEROES.map((hero) => ({ value: hero.id, label: `${hero.name} (${hero.troopClass})` })),
];

const KIND_LABELS = {
  DamageUp: 'damage up',
  DefenseUp: 'defense up',
  OppDamageDown: 'enemy damage down',
  OppDefenseDown: 'enemy defense down',
} as const;

/** What a hero as configured is actually worth in the battle formula, so the inputs are not a black box. */
function slotNote(slot: HeroSlot, role: 'lineup' | 'joiner', side: BattleRole): string {
  const hero = HEROES_BY_ID[slot.heroId];
  if (!hero) return 'empty slot';
  const effects = slotEffects(slot, role, side);
  if (effects.length === 0) return 'nothing this model can apply at this build';
  return effects
    .map((effect) => {
      const scope = effect.scope && effect.scope !== 'all' ? ` vs ${effect.scope}` : '';
      const target = effect.scopeSide === 'enemy' ? ' (enemy row)' : '';
      return `+${Number(effect.value.toFixed(1))}% ${KIND_LABELS[effect.kind]}${scope}${target} (op ${effect.op})`;
    })
    .join(' \u00b7 ');
}

/**
 * Skills the source publishes that this model cannot express - turn timers, dodges, extra strikes -
 * listed by name so a hero's real kit is never silently reduced to what happens to fit the formula.
 */
function unmodelledSkills(slot: HeroSlot, role: 'lineup' | 'joiner'): string[] {
  const hero = HEROES_BY_ID[slot.heroId];
  if (!hero) return [];
  return activeSkills(hero, role)
    .filter((skill) => skill.unmodelled && skillLevelIndex(skill, slot) >= 0)
    .map((skill) => skill.name);
}

function HeroRow(props: {
  label: string;
  slot: HeroSlot;
  role: 'lineup' | 'joiner';
  side: BattleRole;
  onChange: (slot: HeroSlot) => void;
}) {
  const { slot, onChange } = props;
  const skipped = unmodelledSkills(slot, props.role);
  return (
    <div className="hero-row">
      <div className="grid">
        <SelectField
          label={props.label}
          value={slot.heroId}
          options={HERO_OPTIONS}
          onChange={(heroId) => onChange({ ...slot, heroId })}
        />
        <NumberField
          label="Level"
          value={slot.level}
          min={1}
          max={MAX_HERO_LEVEL}
          onChange={(level) => onChange({ ...slot, level })}
          title="Hero level raises the hero's own stats and march capacity; skill percentages follow star rating instead."
        />
        <NumberField
          label="Stars"
          value={slot.star}
          min={0}
          max={MAX_STAR}
          onChange={(star) => onChange({ ...slot, star })}
          title={`1-${MAX_STAR}, ${MAX_STAR} being max. Stars set the skill level, so they pick the row of the published skill table.`}
        />
        {props.role === 'lineup' ? (
          <NumberField
            label="Widget"
            value={slot.widget}
            min={0}
            max={MAX_WIDGET_LEVEL}
            onChange={(widget) => onChange({ ...slot, widget })}
            title="Mythic heroes only. The widget's skill is applied from its published table; the widget's stat percentages are not, because your Bonus Details already includes them."
          />
        ) : null}
      </div>
      <p className="note">{slotNote(slot, props.role, props.side)}</p>
      {skipped.length > 0 ? <p className="note">not modelled: {skipped.join(', ')}</p> : null}
    </div>
  );
}

/**
 * The heroes riding with a march. Only their battle skills are modelled here: the stat percentages a
 * slotted hero contributes - talents, widget stats, gear - are already inside the Bonus Details you
 * copy in, so applying them again would double count.
 */
export function HeroPanel(props: {
  heroes: HeroLineup;
  side: BattleRole;
  onChange: (heroes: HeroLineup) => void;
}) {
  const { heroes, onChange } = props;
  const patchSlot = (which: 'lineup' | 'joiners', index: number, slot: HeroSlot) => {
    const list = [...heroes[which]];
    list[index] = slot;
    onChange({ ...heroes, [which]: list });
  };

  const joined = heroes.joiners.filter((slot) => slot.heroId !== '').length;

  return (
    <div>
      <p className="note">
        Your own lineup: the lead hero and the two riding with it. Their skills go through the battle formula, where
        skills sharing an effect_op add together and different ops multiply - so spreading ops beats stacking copies
        of one hero. Stars pick the skill level and the widget level picks the widget skill&rsquo;s row; hero level
        changes neither. Rally-only skills count for the attacker, defender-only skills for the defender.
      </p>
      {Array.from({ length: LINEUP_SLOTS }, (_, slot) => (
        <HeroRow
          key={`lineup-${slot}`}
          label={slot === 0 ? 'Lead hero' : `Hero ${slot + 1}`}
          slot={heroes.lineup[slot]}
          role="lineup"
          side={props.side}
          onChange={(next) => patchSlot('lineup', slot, next)}
        />
      ))}

      <details className="advanced" open={joined > 0}>
        <summary>
          Rally joiners{joined > 0 ? ` (${joined})` : ''}
        </summary>
        <p className="note">
          Each joining march contributes only its lead hero&rsquo;s first skill, and the game counts at most{' '}
          {MAX_JOINERS} of them. Leave these empty for a solo march.
        </p>
        {Array.from({ length: MAX_JOINERS }, (_, slot) => (
          <HeroRow
            key={`joiner-${slot}`}
            label={`Joiner ${slot + 1}`}
            slot={heroes.joiners[slot]}
            role="joiner"
            side={props.side}
            onChange={(next) => patchSlot('joiners', slot, next)}
          />
        ))}
      </details>
    </div>
  );
}
