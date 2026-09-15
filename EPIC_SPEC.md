# EPIC SPEC — The living heat map & the schedule

This EPIC delivers the product's signature moment: the floor plan the keeper
drew glows where recall is failing. It paints each spot's FSRS health as color
directly on the plan, surfaces per-palace overall health and next-walk date on
the estate overview, leads the keeper to the palace most at risk, and seeds a
demo palace with real walk history so the heat map is visible on staging within
a minute of first load without hand input.

Everything the heat map needs already exists and is untouched by earlier EPICs:
the FSRS seam (`src/features/walk/scheduler.ts`) exposes a 0–1 `retrievability`,
five labeled `HealthLabel` bands with fixed thresholds, `spotHealth`, and the
`data-health` render hooks in the spot list and walk summary. This EPIC adds the
color layer, the palace-level aggregates (overall health + earliest-due next
walk, which do not exist yet), the overview at-risk lead, and the `SEED_DEMO`
auto-seed. **No data-model or schema change. `SCHEMA_VERSION` stays `1`. No
migration is added this EPIC.**

---

## Quality differentiator (hold every relevant decision to this)

**Decay you can read at a glance.** Every competitor shows a list, a streak, or
a schedule. This app colors the floor plan the keeper drew so the spots their
memory is losing are obvious in one look.

**What it demands of THIS EPIC:** this is the EPIC where the differentiator
ships or fails. The reading must be **instant** (color is CSS keyed off a
pre-computed health map, so a plan of dozens of spots pans and zooms with no
recompute), **honest** (color comes straight from `spotHealth`/`retrievability`;
an unwalked spot is neutral, never a faked score), and **unmistakable** (the
worst spots read as failing at a glance, and the color is never the only signal:
each spot also carries a shape/pattern, a number, an accessible health word, and
a legend). If the plan does not visibly glow red where memory is dying, the EPIC
has not shipped, regardless of passing tests.

---

## Scope

### In scope

- **Per-spot color on the drawn plan.** Color every spot marker on the palace
  view plan (`SketchSurface`) by its current `HealthLabel`, driven by
  `spotHealth(spot.fsrs, now)`. Color updates immediately after a walk. Color is
  never the only signal (band-specific marker shape/outline pattern, the spot
  number, the health word in the accessible name, and an on-plan legend).
- **Health color tokens + legend.** A five-band health scale as CSS design
  tokens (light and dark), validated for contrast against the app's parchment
  surfaces, and a compact `HealthLegend` that reads without relying on color
  alone.
- **Palace-level aggregates (new code).** A pure `palaceHealth(palace, now)`
  giving overall health (the worst walked spot governs), the earliest-due
  next-walk date, and counts; plus `sortByRisk` / `mostAtRisk` helpers. Nothing
  like this exists yet.
- **Estate overview health.** Each `PalaceCard` shows its overall health and its
  next-walk date, and its thumbnail glows by health. The overview orders palaces
  so the most-at-risk one is first and flags it with a "Walk next" chip.
- **Immediate post-walk payoff.** The walk summary shows the just-updated plan,
  glowing, so the keeper sees the walk reflected before leaving the walk screen.
- **`SEED_DEMO` auto-seed (new code).** On first boot only, when `SEED_DEMO` is
  on and no atlas is stored yet, seed one demo palace carrying real walk history
  so its plan glows with a mix of healthy and failing spots. It is clearly
  labeled a sample and removable in one action, and never re-seeds after removal.
- **README + copy sweep** for the shipped heat map, next-walk schedule, and
  `SEED_DEMO` behavior.

### Out of scope (this EPIC only — do not build)

- **No data-model, schema, migration, or persistence-format change.** The
  `fsrs` block and `walks` history already store everything. Do not touch
  `src/model/atlas.ts` types, `SCHEMA_VERSION`, `migrate.ts`, `validate.ts`, or
  the IndexedDB store shape.
- **No change to the FSRS math or thresholds.** Reuse `scheduler.ts` exactly:
  `retrievability`, `bandFor`, `spotHealth`, `HEALTH_THRESHOLDS`. Do not add a
  second retrievability path or re-tune the bands.
- **No coloring of the in-progress walk plan.** During an active walk,
  `WalkPlan` keeps its current active-spot focus and stays uncolored, so the
  keeper is not biased about which spots are "red" while testing recall. The
  glow lands on the summary and the palace view.
- **No change to the existing manual "Load the sample" fixture or behavior**
  (`getSampleAtlas`, the two walk-less sample palaces). The required glowing
  sample is the `SEED_DEMO` auto-seed, a distinct palace. (A follow-up may give
  the manual sample walk history; it is not this EPIC.)
- **No walk-history editing, no walk log/detail screen, no export/import
  changes.**

### Non-goals (binding — building any of these is a defect)

- **No cross-palace daily-round medley.**
- **No pre-built template palaces beyond the single seeded demo.**
- **No streak, calendar, or habit analytics of the user's activity.** Health is
  about the palace, not the habit. Do not add "days practiced", "current
  streak", "walks this week", or any activity chart.

---

## Quality bar mapping (how the written bar applies here)

- **§1 Perceived speed.** The heat reads on first render. Compute a single `now`
  per view and memoize the per-spot health map so pan/zoom (which only change the
  SVG `viewBox`) trigger zero FSRS recompute; color is pure CSS off
  `data-health`. A plan at the 200-spot cap must pan smoothly. No new hot-path
  work per frame.
- **§2 Mobile-first.** The glowing plan, the legend, the card health chips, and
  the "Walk next" lead are all fully usable and readable at 390px with no
  horizontal scroll. The legend wraps or compacts; it never forces overflow.
- **§3 Designed states.** A palace with spots but no walk yet reads "Not walked
  yet" with neutral markers, not a fake glow. A palace with zero spots shows no
  health chip (its card invites drawing). The overview with no walked palace
  shows no "Walk next" lead, not an empty banner.
- **§4 First-run / staging.** `SEED_DEMO` is already hardcoded `"1"` in
  `docker-compose.staging.yml`, so once the seed builder exists staging shows the
  glowing demo within a minute with zero input. (The guided walkthrough is a
  separate EPIC and already ships; do not add another.)
- **§5 Security.** No backend, no new route. The only new persisted content is
  the demo atlas, which contains no secrets and no real PII. Never log or send
  spot `contents`/`label`; the seed and health code must not add any Sentry/Umami
  payload carrying spot text.
- **§6 Accessibility.** Health color meets contrast against the parchment
  surfaces; the marker number stays legible on every band; each spot's health is
  conveyed by shape/pattern + accessible word + legend, never color alone; the
  legend and chips keep visible focus/semantics; keyboard reaches everything.
- **§7 Radically simple.** The plan is the product. No paragraphs explaining the
  colors. The legend is a compact key, the card chip is a few words, the lead is
  a chip plus one primary action.
- **§8 Human-voice copy.** Every new string is swept (no `—`/`–`, no banned LLM
  vocabulary, positive/direct phrasing). Reuse the existing band words in
  `HEALTH_TEXT`.
- **§9 README.** Update the README so the heat map and schedule are described as
  shipped, and `SEED_DEMO` is documented as the staging demo seed (no factory
  internals).

---

## Technical design

### Reused building blocks (do not modify)

- `src/features/walk/scheduler.ts` — `retrievability(f, now): number | null`
  (0–1, `null` when never walked), `bandFor(r): HealthLabel`,
  `spotHealth(f, now): { retrievability, label, due }`, `HealthLabel =
  "unwalked" | "sharp" | "holding" | "fading" | "atRisk"`, `HEALTH_THRESHOLDS =
  { sharp: 0.9, holding: 0.7, fading: 0.5 }`.
- `src/features/walk/healthText.ts` — `HEALTH_TEXT` (`unwalked: "Not walked
  yet"`, `sharp: "Sharp"`, `holding: "Holding"`, `fading: "Fading"`, `atRisk:
  "At risk"`), `formatDue(iso)`.
- `src/features/walk/walkSession.ts` — `assembleCompletedWalk(palace, results,
  startedAt, completedAt, walkId?)` (the atomic end-of-walk transform; reuse it
  to build the demo's real walk history).
- `src/features/sketch/geometry.ts` — `spotsPathD`, `outlinePathD`,
  `thumbnailViewBox`, `MAX_SPOTS = 200`, `Point`.
- Spot geometry: logical `x,y` in `viewBox` space (default 1000×1000).

### New / changed files

```
src/features/walk/
  palaceHealth.ts            # NEW: palaceHealth(), mostAtRisk(), sortByRisk()
  palaceHealth.test.ts       # NEW
  healthText.ts              # CHANGED: add formatNextWalk()
src/features/sample/
  demoSeed.ts                # NEW: buildDemoAtlas(now), DEMO_PALACE_ID, patterns
  demoSeed.test.ts           # NEW
  sample.ts                  # CHANGED: export isSamplePalace(id) covering demo id
src/persistence/
  atlasStore.ts              # CHANGED: loadAtlasOrSeedDemo({seedDemo, now})
  atlasStore.test.ts         # CHANGED: seed-once behavior
src/state/
  AtlasContext.tsx           # CHANGED: initial load calls loadAtlasOrSeedDemo
components/
  HealthLegend.tsx           # NEW: the color+shape+word key
  HealthLegend.test.tsx      # NEW
  PalaceCard.tsx             # CHANGED: real health chip + next-walk + glow thumb
  sketch/SketchSurface.tsx   # CHANGED: color markers by health + pattern + a11y
  sketch/PalaceThumbnail.tsx # CHANGED: color spots by health
  walk/WalkPlan.tsx          # CHANGED: optional showHealth+now (summary payoff)
  walk/WalkSummary.tsx       # CHANGED: render the glowing plan
routes/
  EstateOverview.tsx         # CHANGED: sortByRisk + "Walk next" lead + pass now
  PalaceEditor.tsx           # CHANGED: capture now once; show HealthLegend
styles/
  tokens.css                 # CHANGED: health color tokens (light + dark)
  global.css                 # CHANGED: [data-health] rules, legend, chip
README.md                    # CHANGED
```

### Palace-level health (`src/features/walk/palaceHealth.ts`) — new, pure

Every function takes explicit `now: Date` (deterministic tests), reuses
`spotHealth`, and never fabricates a number for an unwalked spot.

```ts
export interface PalaceHealth {
  overall: HealthLabel;          // worst walked spot's band; "unwalked" if none walked
  worstRetrievability: number | null; // min retrievability among walked spots; null if none
  nextDue: string | null;        // earliest due ISO among walked spots; null if none
  spotCount: number;
  walkedCount: number;           // spots with retrievability !== null
  atRiskCount: number;           // spots whose band is "atRisk"
}

export function palaceHealth(palace: Palace, now: Date): PalaceHealth;
```

Rules:
- Compute `spotHealth(s.fsrs, now)` for every spot.
- `walked` = spots whose `retrievability !== null`.
- `nextDue` = the earliest (min ISO) `due` among `walked`; `null` if none walked.
  **This is the "next-walk date = earliest spot due date."** It is derived, not
  stored, so it recomputes on every render and therefore after each walk.
- `worstRetrievability` = min `retrievability` among `walked`; `null` if none.
- `overall` = `bandFor(worstRetrievability)` when any spot is walked, else
  `"unwalked"`. (Deliberately: never-walked spots do not fabricate a due date or
  a score, matching `spotHealth`'s contract. Do not "fix" this by treating a
  fresh spot's placeholder `due` as a real schedule.)
- `atRiskCount` = count of spots whose band is `"atRisk"`.

```ts
// Palaces sorted most-at-risk first. Walked palaces order by ascending
// worstRetrievability (lower = worse), tiebreak by earliest nextDue, then name.
// Palaces with no walked spot sort after all walked ones, by name. Stable.
export function sortByRisk(palaces: Palace[], now: Date): Palace[];

// The single most-at-risk palace (first of sortByRisk that has a walked spot),
// or null when no palace has been walked.
export function mostAtRisk(palaces: Palace[], now: Date): Palace | null;
```

`healthText.ts` gains one display helper (keep display strings here):

```ts
// "Walk due now" when nextDue is at/earlier than now; "Next walk Oct 2"
// otherwise; "Not walked yet" when nextDue is null.
export function formatNextWalk(nextDue: string | null, now: Date): string;
```

### The health color scale (tokens + legend)

Map the five bands to a good→failing ramp so failing spots read as heat. Add
tokens to `tokens.css` for both modes; the marker uses the band fill, and the
`data-health` value selects it. **Starting values (from the validated dataviz
status palette; the implementer MUST re-run the palette validator against the
app's parchment surfaces — light `#f6f3ec`, dark `#262320` — and adjust any step
that fails the lightness/chroma/CVD/contrast checks):**

```css
:root {
  --health-sharp:   #0ca30c; /* good     */
  --health-holding: #d98a00; /* warning  */
  --health-fading:  #e06a2c; /* serious  */
  --health-atrisk:  #cc3b3b; /* critical */
  --health-unwalked:#8a8272; /* neutral, reads as "no reading yet" */
}
@media (prefers-color-scheme: dark) {
  :root {
    --health-sharp:   #3fbf4a;
    --health-holding: #e7a52a;
    --health-fading:  #e88a55;
    --health-atrisk:  #e06b63;
    --health-unwalked:#7d7566;
  }
}
```

Non-color redundancy (all required, so the reading never depends on hue alone):
- **Shape / pattern per band on the plan.** Healthy bands (`sharp`, `holding`)
  render a solid marker outline; failing bands (`fading`, `atRisk`) render a
  distinct outline treatment that reads in grayscale and under CVD (for example
  `fading` a dashed ring, `atRisk` a heavier double/halo ring); `unwalked`
  renders a light hollow marker. Pattern is driven by `data-health`, so it is
  testable and needs no color.
- **The spot number stays on every marker** (identity, not health) and must keep
  ≥ 4.5:1 contrast against its marker fill in both modes. Give the marker a 2px
  surface ring (parchment-colored) separating fill from the connecting path, and
  choose the number ink per band so it always clears contrast (dark ink on the
  amber `holding` step; light ink on the darker green/orange/red steps). Do not
  let the number wash out on any band.
- **Accessible word.** Each interactive spot `<g>`'s `aria-label` includes the
  health word, e.g. `Spot 3, Kitchen table, At risk`.
- **Legend.** `HealthLegend` lists the five bands, each row a color swatch **plus
  its shape/pattern plus its word** (reuse `HEALTH_TEXT`). It reads with color
  removed. Compact enough for 390px (wraps, no overflow).

`HealthLegend` renders on the palace view (`PalaceEditor`, near the plan) and on
the walk summary. Keep it small; it is a key, not an essay.

### Coloring the surfaces

- **`SketchSurface` (palace view plan — the signature surface).** For each spot,
  compute `spotHealth(s.fsrs, now)` and set `data-health={label}` on the spot
  `<g>` (and/or its `spot__marker`). CSS colors the marker fill from the band
  token and applies the band pattern. Include the health word in the existing
  `spotAccessibleName`-based `aria-label`. Capture `now` once and memoize the
  per-spot health map (`useMemo` keyed on `spots` + `now`) so pan/zoom do not
  recompute FSRS. Editing a spot (place/move/rename) keeps working; a newly
  placed, unwalked spot shows the neutral `unwalked` marker.
- **`PalaceThumbnail` (overview card mini-plan).** Accept `now` and color each
  thumbnail spot circle by `spotHealth` via `data-health`. This is what makes the
  estate readable at a glance. Keep it cheap (no interactivity, no legend).
- **`WalkPlan` (reused for the summary payoff).** Add optional props `showHealth?:
  boolean` and `now?: Date`. When `showHealth` is true, color spots by
  `spotHealth` with `data-health` (no active-spot highlight needed). When absent
  (the in-progress walk), behavior is unchanged and uncolored.
- **`WalkSummary`.** Render `<WalkPlan palace={palace} activeSpotId={null}
  showHealth now={now} />` above the existing tally/list, plus a `HealthLegend`,
  so the keeper sees the plan glow with the walk they just finished before
  leaving. Keep the existing per-spot text list (it already carries
  `data-health`); color its health text from the same tokens.
- **`SpotList` / `WalkSummary` text health.** Color the existing
  `.spot-list__health` / `.walk-summary__spot-health` text by `data-health` from
  the band tokens so the words and the plan agree.

### Estate overview

- `PalaceCard`: replace the hardcoded `Not walked yet` line with real output
  from `palaceHealth(palace, now)`:
  - Health chip: the overall band word (`HEALTH_TEXT[overall]`), colored by
    `data-health`, reusing the existing `.palace-card__health::before` dot (now
    tinted by band).
  - Next-walk: `formatNextWalk(nextDue, now)` beside it (e.g. `At risk · Walk
    due now` or `Holding · Next walk Oct 2`).
  - When `spotCount === 0`, show no health chip (the card already reads `0
    spots`); do not print a band for a palace with nothing drawn.
  - Pass `now` to `PalaceThumbnail` so the mini-plan glows.
- `EstateOverview`:
  - Capture one `now`. Order the list with `sortByRisk(palaces, now)` so the
    most-at-risk palace is first.
  - Flag the top at-risk palace with a **"Walk next"** chip on its card, and give
    that card a primary "Walk this palace" action linking to
    `/palace/:id/walk`. When `mostAtRisk` is null (no palace walked yet), show no
    flag and no lead — just the list.
  - Do not duplicate the palace (flag in place; do not also render a separate
    banner card for the same palace).

### `SEED_DEMO` auto-seed (`src/features/sample/demoSeed.ts`)

Goal: on first boot on staging (`SEED_DEMO=1`, already wired), a fresh visitor
with no data sees a real palace whose plan glows with a mix of healthy and
failing spots, with zero hand input, clearly labeled a sample, removable in one
action, and never re-seeded after removal.

`buildDemoAtlas(now: Date): Atlas` — fully deterministic given `now`:
- One palace, `id = DEMO_PALACE_ID` (a stable constant), `name = "Corner bakery
  (sample)"`, with an `outline` and **8 spots** (fixed ids `demo-spot-1..8`,
  fixed logical coords, human labels/contents). Concrete, swept fixture:

  | # | label | contents |
  |---|-------|----------|
  | 1 | Front counter | A brass bell rings twice. |
  | 2 | Bread racks | Seven rye loaves in a row. |
  | 3 | Coffee machine | Steam curls into the letter S. |
  | 4 | Chalkboard menu | Today's number is twelve. |
  | 5 | Window seat | A grey cat sleeps in the sun. |
  | 6 | Back kitchen | Three copper pots hang by size. |
  | 7 | Storeroom | A blue crate holds nine apples. |
  | 8 | Side door | The key turns the wrong way once. |

- **Real walk history that produces the band spread honestly.** Do NOT
  hand-write `fsrs` values. Replay a fixed set of past walk sessions through the
  production transform `assembleCompletedWalk`, so the demo carries genuine
  `walks` records and genuine advanced `fsrs`, and the whole thing round-trips.
  - Sessions at `now − {40, 25, 12, 4}` days (fixed offsets; `startedAt`/
    `completedAt` derived from `now`; fixed deterministic `walkId`s).
  - A per-spot grade pattern across the four sessions, chosen so that at `now`
    the spots span the bands. Strong spots graded `sharp` repeatedly build high
    stability and stay `sharp`/`holding`; weak spots graded `missed`/`shaky`
    stay low and land `fading`/`atRisk` even though last reviewed the same day.
    Suggested patterns (tune to hit the spread; the test asserts it):
    - spots 1–2: `[sharp, sharp, sharp, sharp]`
    - spots 3–4: `[sharp, shaky, sharp, shaky]`
    - spots 5–6: `[shaky, shaky, missed, shaky]`
    - spots 7–8: `[missed, shaky, missed, missed]`
  - Fold chronologically: for each session build `results` for all spots and call
    `assembleCompletedWalk`, threading the returned palace forward.
- Wrap the palace in a valid `Atlas` (`schemaVersion: SCHEMA_VERSION,
  exportedAt: null`).
- **Guarantee (asserted by test):** evaluated at the seed `now`, at least one
  spot is in `{sharp, holding}` and at least one is in `{fading, atRisk}`, and
  not all spots share one band. Because everything is relative to `now`, the
  spread is invariant to the absolute date, so it holds within a minute of any
  first load.

Labeling + removal:
- `sample.ts` exports `isSamplePalace(id)` recognizing both the manual sample ids
  (`SAMPLE_PALACE_IDS`) and `DEMO_PALACE_ID`. `PalaceCard`'s "Sample" tag and
  the Settings "Remove sample" action both use it, so the demo shows a "Sample"
  tag and is cleared by the existing one-action "Remove sample" (and by the
  card's own Delete). No new removal UI is required.

Seed-once wiring (`atlasStore.ts` + `AtlasContext`):

```ts
// Seed the demo exactly once, on the very first boot, and never again.
export async function loadAtlasOrSeedDemo(opts: {
  seedDemo: boolean;
  now: Date;
}): Promise<Atlas>;
```
- If an atlas record already exists → `migrate()` it and return (never seed;
  this is why removing the demo is permanent — an empty stored record still
  counts as "present").
- Else if `opts.seedDemo` → `atlas = buildDemoAtlas(opts.now)`; persist it with
  `saveAtlas` (so it is durable and behaves like the user's own data); return it.
- Else → return `newAtlas()` **without writing** (unchanged fresh-DB behavior;
  non-staging builds are untouched).

`AtlasContext`'s initial load calls
`loadAtlasOrSeedDemo({ seedDemo: getRuntimeConfig().seedDemo, now: new Date() })`
instead of `loadAtlas()`. Keep the existing "do not write on plain read"
behavior for the non-seed path. Leave `loadAtlas` in place for existing callers/
tests.

### Performance & correctness notes

- One `now` per view, memoized health maps; color via CSS only. A 200-spot plan
  must pan/zoom without recomputing FSRS per frame.
- `now` advancing in real time drifts bands honestly (that is the point). The
  seeded spread is anchored to elapsed time, not an absolute date, so it never
  goes stale for "within a minute of first load."
- Coloring must not introduce any Sentry/Umami payload carrying `label` or
  `contents`.

---

## Ordered task list (each task lists its own acceptance criteria)

**T1 — Health color tokens + legend.** Add the five band tokens to `tokens.css`
(light + dark), run the palette validator against the parchment surfaces and
adjust failing steps, add `[data-health]` CSS (marker fill + band pattern, and
text-health color), and build `HealthLegend` (swatch + pattern + word).
- **Provable:** tokens exist for both modes; `HealthLegend` renders all five
  bands with the exact `HEALTH_TEXT` words and a non-color shape per band; the
  legend reads at 390px with no overflow; number/marker contrast is documented as
  validated.

**T2 — Palace-level health helpers.** `palaceHealth`, `sortByRisk`,
`mostAtRisk`, and `formatNextWalk`.
- **Provable:** `nextDue` equals the earliest `due` among walked spots and is
  `null` when none walked; `overall` is the worst walked band (`"unwalked"` when
  none walked); after a simulated walk that changes due dates, `palaceHealth`
  returns the new earliest due; `sortByRisk` puts the lowest-retrievability
  walked palace first and never-walked palaces last.

**T3 — Color the palace view plan.** Wire `data-health` + band pattern +
accessible word into `SketchSurface`; capture one `now`; memoize the health map;
show `HealthLegend` in `PalaceEditor`.
- **Provable:** each spot `<g>` carries the correct `data-health`; an unwalked
  spot is `unwalked` (neutral, no fake score); after completing a walk and
  returning to the palace view the affected spots' `data-health` reflects the new
  bands; editing/placing spots still works.

**T4 — Post-walk payoff.** Extend `WalkPlan` with `showHealth`/`now`; render the
glowing plan + legend in `WalkSummary`; color the summary/list health text.
- **Provable:** the summary shows a colored plan whose spot `data-health` matches
  the just-updated `spotHealth`; the in-progress walk plan is unchanged and
  uncolored.

**T5 — Overview health + at-risk lead.** Real health chip + `formatNextWalk` on
`PalaceCard`, glowing `PalaceThumbnail`, `sortByRisk` ordering, and the "Walk
next" flag + primary action on the most-at-risk card.
- **Provable:** each card shows its overall band and next-walk text; a 0-spot
  palace shows no band; the thumbnail spots carry `data-health`; the most-at-risk
  palace is first and flagged with "Walk next" and a "Walk this palace" action;
  with no walked palace there is no flag.

**T6 — `SEED_DEMO` auto-seed.** `buildDemoAtlas`, `DEMO_PALACE_ID`,
`isSamplePalace`, and `loadAtlasOrSeedDemo`; wire `AtlasContext` to it.
- **Provable:** with a fresh (empty) DB and `seedDemo: true`, the loaded atlas
  contains the demo palace with non-empty `walks` and, at the seed `now`, a mix
  of `{sharp|holding}` and `{fading|atRisk}` spots; the demo card shows the
  "Sample" tag; "Remove sample" clears it; a second load after removal does NOT
  re-seed; with `seedDemo: false` and an empty DB, no palace is seeded and
  nothing is written.

**T7 — Copy sweep + README.** Sweep every new string; update README for the
shipped heat map, the next-walk schedule, and `SEED_DEMO` as the staging demo.
- **Provable:** no `—`/`–`, no banned vocabulary, no negative empty-state
  phrasing in any new user-visible string (including the demo fixture); README
  describes the heat map/schedule as shipped and documents `SEED_DEMO` with no
  factory internals.

**T8 — Gate.** `npm run typecheck`, `npm run build`, `npm test` all green;
manual 390px check of the glowing plan, legend, card chips, and lead noted in the
result.

---

## Test plan (Vitest, jsdom, fake-indexeddb; e2e where noted)

Each planner acceptance criterion maps to at least one automated test.

| Planner criterion | Test(s) |
|---|---|
| Each spot colored by current retrievability on a clear scale, updating immediately after a walk; color never the only signal | `SketchSurface.test.tsx`: spots render the `data-health` matching `spotHealth`; an unwalked spot is `unwalked`; after applying `assembleCompletedWalk` the rerendered plan's `data-health` changes. `HealthLegend.test.tsx`: five bands, each with its word and a non-color shape marker; legend readable with color removed. Marker/number contrast validated (documented). |
| Overview shows per-palace overall health + next-walk date and makes the most-at-risk obvious | `EstateOverview.test.tsx`: cards show the overall band word and `formatNextWalk` text; most-at-risk palace is first and flagged "Walk next" with a "Walk this palace" action; 0-spot palace shows no band; no flag when nothing walked. `PalaceCard.test.tsx`: chip + next-walk render from `palaceHealth`. |
| SEED_DEMO shows a real glowing sample (mix of healthy/failing) within a minute, zero input, labeled + removable in one action | `demoSeed.test.ts`: `buildDemoAtlas(now)` yields one labeled sample palace with non-empty `walks`; at `now` ≥1 spot in `{sharp,holding}` and ≥1 in `{fading,atRisk}`, not all one band; round-trips through export/import unchanged. `atlasStore.test.ts`: empty DB + `seedDemo:true` seeds and persists once; present record never re-seeds; `seedDemo:false` writes nothing. `isSamplePalace(DEMO_PALACE_ID) === true`. |
| Next-walk date = earliest spot due date, recomputed after each walk | `palaceHealth.test.ts`: `nextDue` equals the min walked `due`; `null` when none walked; changes to the new earliest due after a simulated walk. |
| Heat map reads at 390px and renders with no perceptible lag for dozens of spots | `responsive.test.tsx`: the plan container and legend carry no fixed width forcing overflow at 390px. `SketchSurface.test.tsx`: the memoized health map is not recomputed on a view (pan/zoom) change (assert via a spy/`useMemo` dependency, or that health is computed once for a 50-spot palace across repeated view updates). Manual 390px + large-palace smooth-pan check noted in the result. |
| Health colors meet contrast; legend/key reads without relying on color alone | Palette validator run against parchment surfaces (light `#f6f3ec`, dark `#262320`), results documented; `HealthLegend.test.tsx`: every row exposes its band word and shape (identity survives color removal). |
| Signature moment reachable end-to-end | `e2e/atlas.spec.ts` (extend): load with the seeded demo (or load sample then walk), open the palace, assert colored spots are visible on the plan and the summary. |

CI gate for DONE: `npm run typecheck`, `npm run build`, `npm test` pass; e2e
green via `bash scripts/e2e.sh`.

---

## Definition of done

- The palace view plan colors every spot by its `spotHealth` band, updates
  immediately after a walk, and the reading never depends on color alone (shape/
  pattern + number + accessible word + legend). An unwalked spot is neutral, not
  a fake score.
- The estate overview shows each palace's overall health and next-walk date,
  orders palaces most-at-risk first, and flags the most-at-risk one with a "Walk
  next" primary action. Thumbnails glow by health.
- `next-walk date` equals the earliest walked-spot due date and recomputes after
  each walk.
- `SEED_DEMO=1` on a fresh boot seeds one clearly-labeled sample palace whose
  plan glows with a mix of healthy and failing spots within a minute, removable
  in one action, and it never re-seeds after removal. `SEED_DEMO` off / a present
  atlas seeds nothing.
- Health colors are validated for contrast against the parchment surfaces; the
  legend reads without color; the plan, legend, cards, and lead are usable at
  390px with no horizontal scroll; a dozens-of-spots plan pans without FSRS
  recompute.
- No data-model/schema/migration/persistence change; `SCHEMA_VERSION` stays `1`;
  the FSRS math and thresholds are untouched.
- Every new user-visible string passes the human-voice sweep (no `—`/`–`, no
  banned LLM vocabulary, no negative empty-state phrasing), including the demo
  fixture copy.
- `npm run typecheck`, `npm run build`, `npm test`, and the Playwright e2e pass;
  a manual 390px check of the glow, legend, chips, and lead is noted in the
  result.
```
