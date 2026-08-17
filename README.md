# Kingshot battle simulator

A browser-based battle planner for Kingshot: enter both marches (heroes, the Bonus Details percentages from a
recent battle report, and troop level/count/ratio), then run a single battle or a few hundred and compare loadouts.

Everything runs client-side — there is no backend and no data leaves the browser.

## Running it

Node 22 is required — on older npm the platform binaries Vite and oxlint need are silently skipped, and the dev
server then fails with "Cannot find native binding". With [nvm](https://github.com/nvm-sh/nvm) installed, `nvm use`
picks it up from `.nvmrc`; otherwise install Node 22 from nodejs.org.

```bash
nvm use          # or: nvm install 22
npm install      # npm ci if the lockfile is present
npm run dev      # dev server
npm test         # engine unit tests
npm run lint     # oxlint
npm run typecheck
npm run build    # static bundle in dist/
```

## What the numbers are worth

The simulator separates what the game is known to do from what is a model of it:

| Layer | Confidence |
| --- | --- |
| Troop base stats (T1–T11, TG0–TG5) | Datamined from the public Kingshot simulator bundle |
| Buff stacking (`effect_op`: same op adds, different ops multiply) | Community-tested; reproduced by unit tests against published worked examples |
| Kill formula shape — `troops × Attack × Lethality / (enemy Defense × enemy Health) × SkillMod` | Community-reverse-engineered |
| Counter-triangle magnitude, cavalry bypass rate, round structure, battle intensity | **Unknown** — modelled as editable assumptions |
| Hero skill and widget skill values per level | Taken from kingshotoptimizer.com's per-hero tables — community-maintained, not official |
| Casualty split (dead / infirmary / lightly injured) | Only the Town Center 35% death rate and the King's Castle rule are official; the rest are estimates |
| Where troops actually die: a direct city attack, a full infirmary, or a level 4 outpost (~10% dead, ~30% heavily injured) | Player-reported; the other policies therefore kill nobody except through infirmary overflow |

Consequently: treat the *comparison* between two loadouts as the useful output, and absolute casualty counts as
indicative until you have calibrated. The Model assumptions panel exposes every uncertain parameter with its
confidence, and the Calibration panel fits them to real battle reports — enter both sides as they were and the
losses the game reported, add a few cases, and the fitted values drop into the model.

## What you enter

Four things per side, and nothing is applied that you did not enter.

**Heroes** — the lead hero and the two riding with it, plus up to four rally joiners, each with hero level, star
rating (5 = max) and widget level. Only their battle skills are modelled here, through `effect_op` arithmetic: skills
sharing an op add, different ops multiply, so spreading ops beats stacking copies of one hero. A joining march
contributes only its lead hero's *first* skill, and at most four joiners count.

Star rating picks which row of a skill's published level table is used (5★ = the maxed value), and widget level picks
the row of the widget skill's table (levels 2/4/6/8/10 are published; anything between falls back to the last
published row, and level 0 means no widget skill). Nothing is interpolated or scaled by a guessed multiplier. Hero
level is recorded but changes no value, and the widget's *stat* percentages and the heroes' flat troop-stat talents
are deliberately not added, because Bonus Details already contains them. Skills the aggregate model cannot express —
periodic procs, single-target hits, healing, mode-specific effects — are kept in the data with the reason they are
unmodelled and listed as such under the hero, rather than approximated. Skills marked rally-only count for the
attacker, defence-only ones for the defender, and a skill naming one troop type only applies to that type's
exchanges. A chance-based skill is folded in as its expected value (chance × magnitude).

**Bonus details** — the twelve percentages (Attack/Defense/Lethality/Health per troop type) a battle report lists,
or the same numbers off your own stat screens. They are the single source of truth for stats, and they are *totals*:
research, hero gear, governor gear, charms, widgets, masters, pets and the stat skills of whichever heroes you had
slotted are all already in them, which is why nothing else in the app adds to them. Import a report and both sides
fill in at once.

**Troops** — troop level (T1-T11), troop grade, total march size and the Infantry/Cavalry/Archer ratio, with the
formation presets as a starting point.

**Extras** — optional, and only for bonuses the percentages above do *not* contain: an on-demand buff item you are
about to fire, or a pet skill you were not running when the report was generated. Enter what the item or pet screen
says and tick it; unticked rows are ignored, so one loadout covers buffed and unbuffed marches.

**Profiles** save a whole side — heroes, stats, troops, extras — under a name, and load into either the attacker or
the defender. Enter your own account once, your teammates' and known enemies' as you learn them, and a fight becomes
two dropdowns. They live in this browser's local storage.

### Importing a whole battle report

*Import a battle report* takes the screenshots of a report mail and fills in both sides at once. Give it as
many images as the mail needed — Battle Overview for squad sizes, losses, injured and lightly injured, Troop Power
Comparison for the per-type counts and troop tier, Bonus Details for all twelve percentages on each side — and
they are read together and merged. The report is two columns, so which side a number belongs to is decided by
whether it sits left or right of its label; tick *the left column is the defender* when the mail came from a fight
you defended. Every value lands in an editable review table, and per-type counts are cross-checked against the
squad totals — if they disagree, or if the two columns look swapped, you get a warning rather than a silent guess.

Applying it sets each side's troop counts, ratio and tier and *replaces* the bonus details grid, since the report's
percentages are already totals; extras are switched off for the same reason. It can also become a calibration case in
one step. Troop grade is a badge on the icons rather than text, so it stays manual.

The report splits casualties three ways and they are not interchangeable: **Losses** are dead at battle end,
**Injured** go to the infirmary and heal, and **Lightly Injured** stay in the squad — unable to fight — until it
returns to the city, after which they recover in full. So a squad whose three rows add up to its whole size was not
wiped. Pick which rows your observed number covers (Losses only, Losses + Injured, or all three) and the fit compares
the matching part of the predicted breakdown; the default is Losses + Injured, i.e. everything that cannot fight again
this march. The same choice appears on hand-entered cases.

### Importing bonuses from a stat screen

Typing four numbers per screen gets old, so *Import from screenshot…* under each side's bonus table reads them off
an in-game stat screen: drop, paste (Ctrl+V) or pick a screenshot, and the percentages come back as a review table
you can correct before they land in the bonus details grid. A troop name in a line or as a heading above one scopes the values
("Infantry Attack 152.5%", or `Cavalry` followed by `Attack 40%`), stats split across lines are paired up, and
common OCR damage is repaired — `1S2.5%` reads as 152.5, `Lethaiity` as Lethality. Lines with a percentage but no
troop stat (construction speed and the like) are listed as ignored rather than guessed at.

OCR is not reliable on game fonts, so nothing is applied until you have checked it — 0/8 and 1/7 are the usual
misreads. The parse is a pure function in `src/ocr/statSheet.ts` with tests, so a layout it mishandles can be added
as a case there. Recognition runs in the browser via tesseract.js and the image is never uploaded; the wasm engine
and English model (a few MB) are fetched from a CDN on first use and cached, so the first import needs a network
connection.

### Castle battles

A Castle Battle structure is not held by a single march, so the *Castle battle* panel fights one rally against a
stack of garrison squads: each squad is a loadout (either side's panel, or a saved profile) plus a troop count, they
are fought in the order listed, and the rally carries its survivors from one squad into the next until either the
stack is empty or the rally is spent. *You are* flips which panel brings the rally, so the same model covers rallying
a castle or turret and holding one — the rally is read as an attacker and every garrison squad as a defender, so
rally-only and garrison-only hero skills and widgets land on the right side. Casualties use the King's Castle rule
(everything to the infirmary until it is full, then deaths), with the capacity as an input.

Turret fire is applied to the garrison before the rally lands, because the turrets have been shooting for the whole
hold. Official, from the game's help centre: a turret only damages the team occupying the King's Castle, it does
nothing to a team that holds the castle and that turret at once, and its interval shortens the longer it is held.
The magnitudes are *not* published — the defaults (2% of the occupier per turret per volley, interval starting at 4
minutes and speeding up to 1) are player-reported, so they are editable fields rather than constants, and each volley
takes its share of what is left rather than of the original squad. A turret fight itself takes no turret fire.

Not modelled yet: chained rallies against an already-weakened garrison (this is one rally per run), occupation
timers, and event scoring.

### What is deliberately not modelled

Per-item gear, charm and governor-gear calculators, per-level master skills and hero flat-stat skills were all built
at one point and taken back out of the flow: every one of them describes a number that Bonus Details already contains,
so they could only ever disagree with it. Masters' published tables live on in `src/engine/data/masters.ts` and each
hero's flat troop-stat talent in `heroes.ts` (`talents`), and `resolveArmy` will still apply either if a caller opts
in — but nothing in the UI does.

Hero data in `src/engine/data/heroes.ts` is generated from kingshotoptimizer.com, which is fan-maintained: each skill
keeps its in-game wording next to the values, so check anything surprising against the hero screen in game.

## Layout

- `src/engine/` — the simulator, dependency-free and independently testable
  - `effects.ts` — `effect_op` bucket arithmetic and SkillMod
  - `army.ts` — base stats, bonus application, ratio-to-count conversion
  - `battle.ts` — simultaneous per-round resolution with rows, counters and cavalry bypass
  - `montecarlo.ts` — repeat runs over the random terms, seeded and reproducible
  - `lineup.ts` — hero lineup and rally joiners resolved into skill effects
  - `castle.ts` — one rally against a stack of garrison squads, plus turret attrition
  - `analysis.ts` — formation sweep and joiner optimiser
  - `calibration.ts` — fits the unknown constants to battle reports
  - `data/` — troop base stats, hero skills, formation presets
- `src/ocr/` — screenshot import: `text.ts` shared OCR repair and fuzzy label matching, `statSheet.ts` parses a stat
  screen into percentages, `battleReport.ts` parses a two-column battle report, `recognize.ts` wraps tesseract.js
- `src/ui/` — React panels
