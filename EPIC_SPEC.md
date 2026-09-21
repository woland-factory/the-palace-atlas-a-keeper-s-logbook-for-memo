# EPIC SPEC — Polish pass (no new features)

A UX, performance, and copy pass over the whole delivered product against the
QUALITY BAR and the quality differentiator. Every screen, state, and string
already ships. This EPIC tightens what exists and adds nothing. It is an
audit-and-tune pass: measure each surface against the bar, fix the defects the
audit finds, and prove each fix with an automated test. When a surface already
clears the bar, leave it alone and record that it was checked.

**This is a refinement pass. No new feature, control, screen, route, data field,
or setting is in scope, even one that seems easy or obviously nice.** If an
audit turns up something that would need a new capability to fix, it is a
`requested_task`, not work for this EPIC.

---

## Quality differentiator (hold every relevant decision to this)

**Decay you can read at a glance.** Every alternative shows a list, a streak, or
a schedule. This app colors the floor plan the keeper drew so the spots their
memory is losing are obvious in one look.

**What it demands of THIS EPIC:** the heat map already ships (EPIC 4). This is
the pass where its reading is proven **instant, honest, and unmistakable** on
real data, or tuned until it is. The bar for this EPIC is not "the colors
render" — it is "a keeper glances at the seeded demo, or at their own palace
after a third walk, and the failing spots jump out without study." Any polish
choice that touches the plan, the card thumbnails, the legend, or the health
palette is held to that standard, not just the baseline bar. Speed and copy work
elsewhere in this EPIC serve the same end: nothing may slow or clutter the one
reading the product wins on.

---

## Scope

### In scope

A measured pass over the shipped surfaces below, fixing only defects found:

- **Signature-moment reading.** Audit the heat map on the seeded demo and on a
  freshly-walked palace (a simulated third walk) and confirm the failing spots
  read at a glance. Tune only the existing health tokens
  (`src/styles/tokens.css`) and the non-color ring treatment
  (`src/components/HealthRing.tsx`, `.health-ring` CSS) if the reading is not
  instant. No new signals, no new markup.
- **Designed empty / loading / error states** across every screen: the estate
  overview, the palace editor, the walk, the walk summary, settings, the
  not-found route, and the app-level error boundary. Each must hold the layout
  steady while loading, tell a first-time viewer what the screen is for, and, on
  error, say what to do next in the product's voice.
- **One primary action per screen; copy cut to the shortest unambiguous form.**
  Confirm each screen has exactly one obvious primary action with secondary
  actions visibly subordinate, and trim any redundant control or wording.
- **Mobile pass at 390px** across every screen: no horizontal scroll, tap
  targets about 44px, text readable without zoom, every feature reachable.
- **Accessibility pass**: color contrast, visible focus on every interactive
  element, every input labeled, a sane heading hierarchy and landmarks on every
  route, and keyboard reach for everything a pointer can do (including the modal
  dialog and the SVG plan).
- **Performance pass**: first meaningful render within about 1s; every
  interaction acknowledged within 100ms; the heat map and estate overview stay
  smooth with a large atlas (many palaces, dozens of spots each).
- **Mechanical copy sweep** over every user-visible string (components, routes,
  the demo/sample fixtures, onboarding copy): zero em-dashes, zero banned LLM
  vocabulary, zero negative empty-state phrasing.
- **README verification** against the actual `package.json`, `docker/Dockerfile`,
  `docker/docker-entrypoint.sh`, `public/env.js`, and `docker-compose.staging.yml`.

### Out of scope (do not build)

- **No new features of any kind.** No new screen, route, control, setting, data
  field, chart, or interaction. Refinement only.
- **No gold-plating past the bar.** No animations, transitions, or motion beyond
  what already ships. No design system, no theming controls, no new component
  abstractions for three screens.
- **No premature optimization beyond the stated budgets.** Do not add
  virtualization, workers, or caching layers unless a measured 390px + large-atlas
  check actually misses the 100ms / 1s budget; if it does and the fix needs new
  infrastructure, file a `requested_task`.
- **No data-model, schema, migration, or persistence-format change.**
  `SCHEMA_VERSION` stays `1`. Do not touch `src/model/atlas.ts` types,
  `migrate.ts`, `validate.ts`, or the IndexedDB store shape.
- **No change to the FSRS math or thresholds** (`scheduler.ts`:
  `retrievability`, `bandFor`, `spotHealth`, `HEALTH_THRESHOLDS`). Health-color
  tuning changes token values only, never the band boundaries.
- **No change to what the seeded demo or manual sample contain** beyond copy
  fixes the sweep requires. The demo's spot count, coordinates, and grade
  pattern stay as shipped unless the signature-moment audit proves the spread
  does not read (see T1).

### Non-goals (binding — building any of these is a defect)

Inherited verbatim from the product plan; named here so this pass does not drift
into them under the banner of "polish":

- No accounts, login, cloud sync, or server-stored user data.
- No LLM features of any kind, including a bring-your-own-key garnish.
- No sharing, public library, collaboration, or multiplayer.
- No gamification: no streaks, badges, points, levels, or activity analytics.
- No pre-built or template palaces beyond the single seeded demo.
- No CAD-grade drawing (dimensions, layers, snapping, image floor plans, art
  tools).
- No typed-answer verification; recall stays self-graded.
- No cross-palace daily-rounds medley.
- No native mobile apps.

---

## Current state (the audit's starting point)

The whole core loop is delivered and tested. Screens and the components behind
them:

| Route | Screen | File | Primary action |
|---|---|---|---|
| `/` | Estate overview | `src/routes/EstateOverview.tsx` | Add a palace (`NewPalaceForm`) |
| `/palace/:id` | Palace editor + heat map | `src/routes/PalaceEditor.tsx` | Walk this palace |
| `/palace/:id/walk` | Recall walk / summary | `src/routes/WalkSession.tsx` | Grade and advance |
| `/settings` | Data (export / import / sample) | `src/routes/Settings.tsx` | Export atlas |
| `*` | Not found | `src/routes/NotFound.tsx` | Go to your palaces |

Shared: `AppHeader`, `FirstRunWalkthrough` + `GuidedChecklist`, `EmptyState`,
`SaveStatus`, `Toast`, `ConfirmDialog`, `ErrorBoundary`, the sketch surface and
health rendering (`SketchSurface`, `WalkPlan`, `PalaceThumbnail`, `HealthLegend`,
`HealthRing`), and the tokens/global stylesheet (`src/styles/`).

Known-good baseline the audit must not regress: memoized per-`(spots, now)`
health maps so pan/zoom never recompute FSRS; a color-blind-safe reading
(band-specific ring shape + spot number + accessible health word + legend, never
hue alone); a designed empty state, loading skeleton, and not-found on the
overview, editor, and walk; a first-run walkthrough that retires after the first
success; `SEED_DEMO=1` wired in staging compose.

### Concrete candidate defects the audit already surfaced

These were found while scoping and are the audit's first targets. Each is a
refinement of an existing surface, not a new feature. The implementer confirms,
fixes, and tests each; if any turns out to already clear the bar, record that.

1. **Settings has no loading state and can act on an unloaded atlas.**
   `Settings.tsx` reads `atlas` directly and never consults `loading`. During the
   initial async load `atlas` is the empty `newAtlas()`, so opening `/settings`
   directly and pressing **Export atlas** before the load resolves downloads an
   empty file. Fix: hold Settings steady while `loading` (a skeleton or a disabled
   export in place, matching the other screens), so no action fires against an
   unloaded atlas. This is the §3 "loading state holds the layout steady" clause,
   currently missing on this one screen.

2. **The in-progress walk screen has no `h1`.** On `/palace/:id/walk` before the
   summary, the top heading is `WalkStep`'s `h2` (the spot name) with no `h1`
   above it, so that route's heading hierarchy starts at `h2`. The done-summary
   correctly uses an `h1`. Fix: give the active walk a single `h1` (the progress
   line "Spot N of M", or the palace name) so every route has one top-level
   heading. Semantic structure only; no visible clutter added.

3. **The confirmation dialog does not trap focus.** `ConfirmDialog` focuses the
   confirm button and closes on Escape and backdrop click, but Tab can move focus
   to the controls behind the modal. Fix: keep focus within the dialog while it is
   open and return focus to the trigger on close, so a keyboard user is not
   dropped behind an `aria-modal` surface. Minimal change to the existing
   component; no new dialog behavior.

4. **Possible duplicate route to Settings on the overview.** The overview
   `page-head` carries an "Export or import" ghost button while the header nav
   already links to Settings. Audit whether both are needed; if the ghost button
   is redundant it is a candidate to cut under §7 (one obvious primary action,
   subordinate secondaries). This is a judgment call: cut only if it genuinely
   reduces competition for attention, and keep the export path reachable.

5. **Copy sweep candidates.** The bulk of the copy is already tight. The sweep
   (T7) must still mechanically re-check every string. Watch specifically:
   `WalkStep`'s revealed-empty line ("This spot is empty. Fill it in the editor.")
   and `SaveStatus`'s error line ("Your last change did not save. Try again.") —
   both must state what to do next and avoid the banned negative patterns. Do not
   "fix" them into a banned pattern (for example "Nothing filed yet" would newly
   violate the "No … yet" rule).

---

## Quality bar mapping (how the written bar applies to this pass)

- **§1 Perceived speed.** First render is a static bundle behind nginx; confirm
  real content (not a blank page) is on screen within about 1s and that the
  initial load shows the skeleton, never a white screen. Every interaction
  (add spot, grade, reveal, rename, delete-confirm) acknowledges within 100ms.
  Preserve the memoized health map: pan/zoom of a 200-spot plan must not
  recompute FSRS.
- **§2 Mobile-first.** Every screen fully usable at 390px: the glowing plan,
  legend, card chips, toolbar, walk grade grid, dialog, toasts, and the guided
  checklist all fit with no horizontal scroll; tap targets about 44px; text
  readable without zoom.
- **§3 Designed states.** Every screen's empty, loading, and error surface is
  designed (see candidate defect 1 for the one known gap). Errors say what to do
  next in the product's voice; no raw trace, error code, or dead end.
- **§4 First-run.** The walkthrough already leads a new keeper through the loop
  and retires after first success. Confirm it still appears only for a brand-new
  keeper, is skippable, and never returns; do not add a second onboarding
  surface. The seeded demo still shows the differentiator within a minute on
  staging.
- **§5 Security hygiene.** No backend and no new route, so no server authz to
  add. Keep the import boundary validation intact. The sweep and any logging
  touched must never put spot `label`/`contents` (the keeper's memorized
  material) into a Sentry or Umami payload.
- **§6 Accessibility.** Contrast on text and health colors, visible focus on
  every interactive element (buttons, links, inputs, the SVG spot `<g>`s, the
  dialog), every input labeled, a heading/landmark structure that is correct on
  every route (see candidate defect 2), and full keyboard reach including the
  modal (see candidate defect 3).
- **§7 Radically simple.** One obvious primary action per screen, secondaries
  subordinate, copy cut to the shortest unambiguous form (see candidate
  defect 4). The plan is the product; no paragraph explains the colors.
- **§8 Human-voice copy.** The mechanical sweep (T7) covers every user-visible
  string, including the demo and sample fixtures and the walkthrough steps.
- **§9 README.** Verify the README against the actual build, container, and
  compose files (T8); fix any command or claim that has drifted.

---

## Technical design

No new modules. The pass touches existing files only, and only where the audit
finds a defect. Expected touch set (a file appears only if its audit fails):

```
src/routes/Settings.tsx          # loading state; guard export until loaded (defect 1)
src/routes/WalkSession.tsx       # single h1 on the active walk (defect 2)
src/components/ConfirmDialog.tsx # focus trap + return focus (defect 3)
src/routes/EstateOverview.tsx    # possible cut of the redundant Settings link (defect 4)
src/styles/tokens.css            # health token tuning ONLY if the reading fails (T1)
src/components/HealthRing.tsx    # ring treatment tuning ONLY if the reading fails (T1)
src/styles/global.css            # spacing/contrast/tap-target fixes the audit finds
  (various components)           # copy fixes the sweep finds (T7)
README.md                        # verified/corrected against the real files (T8)
```

Guardrails that bound every change:

- Token tuning changes color/ring **values and geometry**, never the band
  thresholds or the `data-health` contract the tests key off.
- Any contrast or color change to `tokens.css` must be re-validated against the
  parchment surfaces (light `#f6f3ec` / `#ffffff`, dark `#1c1a16` / `#262320`)
  for both text (≥ 4.5:1) and the spot-number ink on each band fill, in light
  and dark. Record the validated ratios.
- The heat-map reading must not depend on hue: whatever tuning happens, each spot
  keeps its band ring shape, its number, its accessible health word, and the
  legend row.
- No change may cause a per-frame FSRS recompute or otherwise regress the
  memoized health map.

---

## Ordered task list (each task carries its own acceptance criteria)

**T1 — Signature-moment reading.** Audit the heat map at a glance on (a) the
seeded demo (`buildDemoAtlas(now)`) and (b) a fresh palace after a simulated
third walk with a mixed grade pattern. Confirm failing spots read instantly:
distinct band fills, `fading`/`atRisk` wearing their ring treatment, legible
numbers, and the most-at-risk palace surfacing first on the overview. Tune only
the health tokens and `HealthRing` geometry if the reading is not instant; leave
them untouched if it already reads.
- **Provable:** a test builds a palace, replays three walks whose grades span
  strong/weak spots, and asserts the palace-view plan shows at least one spot in
  `{sharp, holding}` and at least one in `{fading, atRisk}`, with the failing
  spots carrying a `HealthRing`. The seeded demo's spread test still passes. Any
  token change is re-validated for contrast (ratios recorded); no threshold or
  `data-health` change. Manual 390px glance at the demo noted in the result.

**T2 — Designed states sweep.** Walk every screen's empty, loading, and error
surface. Fix the Settings loading gap (defect 1): hold the layout steady while
`loading` and prevent export/import against an unloaded atlas. Confirm the
overview, editor, walk, summary, not-found, and error boundary each hold layout
while loading, name their purpose when empty, and say what to do next on error.
- **Provable:** a test mounts Settings while the atlas is still loading and
  asserts the layout is held (skeleton or disabled primary in place) and that
  Export does not fire against the empty initial atlas. Existing empty/loading/
  not-found tests on the other screens stay green. No raw trace or error code is
  rendered anywhere (error boundary and import-failure paths asserted).

**T3 — Primary action + copy trim.** Confirm each screen has one obvious primary
action with subordinate secondaries. Resolve defect 4 (cut the redundant
overview Settings link if it competes with the primary action). Trim any wording
that can shrink without losing meaning.
- **Provable:** each route renders exactly one `.btn--primary` as its main
  action (asserted per screen), and secondary/ghost actions carry the
  subordinate classes. If the overview ghost link is cut, a test confirms the
  export path is still reachable (header Settings link). No new control added.

**T4 — Mobile 390px pass.** Verify every screen at a 390px viewport: no
horizontal scroll, tap targets about 44px, readable text, every feature
reachable, the dialog and toasts fit. Fix any overflow or small-target the audit
finds in `global.css`.
- **Provable:** extend `responsive.test.tsx` so each screen (overview, editor,
  walk, summary, settings) asserts no inline fixed width wider than the viewport
  and that interactive controls carry the tap-target `.btn`/link classes. Manual
  390px pass across all screens noted in the result.

**T5 — Accessibility pass.** Fix the heading hierarchy on the active walk
(defect 2) and the dialog focus trap (defect 3). Confirm every input is labeled,
focus is visible on every interactive element including the SVG spot `<g>`s, and
the keyboard reaches everything a pointer can (place via "Add spot", nudge with
arrows, grade, confirm/cancel the dialog, skip the walkthrough).
- **Provable:** a test asserts the active walk route exposes a single `h1`; a
  dialog test asserts focus starts on the confirm control, Tab stays within the
  dialog, and Escape/close returns focus to the trigger; existing label/focus
  tests stay green. Contrast of text and health colors is documented as
  validated.

**T6 — Performance pass.** Confirm first meaningful render is fast and that the
heat map and overview stay smooth with a large atlas. Verify the memoized health
map is not recomputed on pan/zoom. Add nothing (no virtualization) unless a
measured check misses budget; if it does, file a `requested_task`.
- **Provable:** a test asserts that for a 50+-spot palace, repeated view
  (viewBox) changes do not recompute the per-spot health map (spy on
  `spotHealth` or assert a stable memoized reference). Manual large-atlas
  smooth-pan and sub-1s first-render checks noted in the result.

**T7 — Mechanical copy sweep.** Search every user-visible string across
`src/components/`, `src/routes/`, `src/features/sample/` (demo + manual sample
fixtures), and `src/features/onboarding/` for the characters `—` and `–`, the
banned LLM vocabulary, and negative empty-state phrasing ("You don't have",
"No … yet", "Nothing … here", "Unable to", "Something went wrong"). Fix every hit
in a user-visible string; keep it positive and direct. Code comments are exempt.
- **Provable:** a test (or documented grep) shows zero em-dashes, zero banned
  vocabulary, and zero negative empty-state phrasing in user-visible strings,
  including the demo/sample fixture copy and the walkthrough steps. Any string
  changed still reads as a person wrote it.

**T8 — README verification + gate.** Verify the README against
`package.json` (scripts), `docker/Dockerfile`, `docker/docker-entrypoint.sh`,
`public/env.js`, and `docker-compose.staging.yml`: the clone/dev/build/preview
commands, the container build/run commands and exposed port, the `/env.js`
variable table (`SENTRY_DSN`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `SEED_DEMO`), and
the test commands (`npm run typecheck`, `npm test`, `npm run build`,
`bash scripts/e2e.sh`). Correct any drift; no factory internals. Then run the
full gate.
- **Provable:** every command in the README maps to a real script/file and runs
  as written (verification noted in the result). `npm run typecheck`,
  `npm run build`, `npm test`, and the Playwright e2e (`bash scripts/e2e.sh`) all
  pass. Manual 390px check of the glow, legend, cards, and lead noted.

---

## Test plan (Vitest + Testing Library + fake-indexeddb; Playwright e2e where noted)

Each planner acceptance criterion maps to at least one automated test. Prefer
extending the existing suites (`EstateOverview.test.tsx`, `PalaceEditor.test.tsx`,
`WalkSession.test.tsx`, `Settings.test.tsx`, `responsive.test.tsx`,
`HealthLegend.test.tsx`, `PalaceCard.test.tsx`, `SketchSurface.test.tsx`,
`demoSeed.test.ts`, `palaceHealth.test.ts`, `e2e/atlas.spec.ts`).

| Planner criterion | Test(s) |
|---|---|
| Signature moment lands on the demo and on a real third walk, readable in one look | New/extended `SketchSurface.test.tsx` or `PalaceEditor.test.tsx`: after three replayed walks with mixed grades, the plan shows a band spread (≥1 healthy, ≥1 failing) and failing spots carry a `HealthRing`. `demoSeed.test.ts` spread test stays green. e2e (`atlas.spec.ts`): open the seeded/sample palace and assert colored spots are visible on the plan. |
| Every empty/loading/error state designed, layout held, errors say what to do next | `Settings.test.tsx`: layout held while loading; Export does not act on the unloaded atlas. Existing overview/editor/walk empty + loading + not-found tests stay green; error-boundary fallback renders no raw trace. |
| One obvious primary action per screen; copy cut | Per-screen assertion that exactly one primary action is the main control and secondaries are subordinate; if the overview Settings link is cut, a test confirms export stays reachable. |
| Full mobile pass at 390px, no horizontal scroll, ~44px targets | Extended `responsive.test.tsx` covering overview, editor, walk, summary, settings: no inline fixed width past the viewport; interactive controls carry the tap-target classes. Manual 390px pass noted. |
| Accessibility: contrast, focus, labels, semantic headings/landmarks, keyboard reach | `WalkSession.test.tsx`: active walk exposes a single `h1`. `ConfirmDialog` test: focus starts on confirm, stays trapped, returns to trigger on close. Existing label/focus tests stay green; contrast ratios documented. |
| Performance: <1s first render, 100ms feedback, smooth with a large atlas | `SketchSurface.test.tsx`: the memoized health map is not recomputed across repeated view changes for a 50+-spot palace. Manual large-atlas smooth-pan and first-render checks noted. |
| Copy sweep finds zero em-dashes, banned vocab, negative empty-state phrasing | A sweep test (or documented grep) over user-visible strings including fixtures and walkthrough steps. |
| README verified accurate against the actual compose/build files | Documented verification that each README command maps to a real script/file and runs; the gate suites pass. |

CI gate for DONE: `npm run typecheck`, `npm run build`, `npm test` pass, and the
Playwright e2e is green via `bash scripts/e2e.sh`.

---

## Definition of done

- The heat map reads at a glance on the seeded demo and on a palace after a third
  walk: failing spots are unmistakable, the failing bands carry their ring
  treatment, numbers stay legible, and the most-at-risk palace surfaces first. If
  tuning was needed, only token values and ring geometry changed and the new
  contrast ratios are recorded.
- Every screen's empty, loading, and error state is designed and holds layout;
  the Settings loading gap is closed so no action fires against an unloaded
  atlas; no raw trace, code, or dead end appears anywhere.
- Each screen has one obvious primary action with subordinate secondaries, and
  redundant wording/controls are trimmed.
- Every screen is fully usable at 390px with no horizontal scroll, ~44px tap
  targets, and readable text.
- Accessibility clears the bar: the active walk has a single `h1`, the dialog
  traps and returns focus, every input is labeled, focus is visible everywhere,
  and the keyboard reaches everything a pointer can.
- Performance clears the budgets: sub-1s first render, ~100ms interaction
  feedback, and a smooth heat map / overview on a large atlas with no per-frame
  FSRS recompute.
- The mechanical copy sweep finds zero em-dashes, zero banned LLM vocabulary, and
  zero negative empty-state phrasing across every user-visible string, including
  the demo/sample fixtures and the walkthrough steps.
- The README is verified accurate against `package.json`, the Dockerfile, the
  entrypoint, `public/env.js`, and the staging compose file, with no factory
  internals.
- No data-model/schema/migration/persistence change; `SCHEMA_VERSION` stays `1`;
  the FSRS math and thresholds are untouched; no new feature, control, or route
  was added.
- `npm run typecheck`, `npm run build`, `npm test`, and the Playwright e2e pass;
  a manual 390px check of the glow, legend, cards, and lead is noted in the
  result.
