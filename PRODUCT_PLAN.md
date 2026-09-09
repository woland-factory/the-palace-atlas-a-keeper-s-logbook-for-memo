# PRODUCT PLAN — The Palace Atlas

A keeper's logbook for memory palaces.

## Core value (one sentence)

A memory-palace keeper sketches each palace once as a simple floor plan of
ordered spots, files what lives at each spot, and runs self-graded recall
walks. The drawn plan then colors in to show exactly which spots are being
forgotten, and the whole estate lives in one file the keeper owns.

## North star

A keeper who has practiced for years opens the Atlas and trusts it
completely. Every building they have ever built is safe outside their head,
and one glance at a plan tells them precisely where their memory is thinning
and where to spend the next ten minutes. Revision has stopped being
guesswork. The atlas has become the estate's own memory of itself, steadier
than the keeper's, and losing it is unthinkable because it is the only place
the whole estate lives at once.

## Quality differentiator (the one dimension we beat everyone on)

**Decay you can read at a glance.** Every alternative shows you a list, a
streak, or a schedule. This app shows you the failure *in place*: the floor
plan you drew, colored so that the spots your memory is losing are obvious in
one look. Not a table about the palace. The palace itself, visibly rotting
where you fail. We commit the whole build to making that one reading instant,
honest, and unmistakable. Everything else is subordinate to it.

The signature moment: **the floor plan you drew glows red where your memories
are dying.**

## Who it is for

Multi-palace practitioners whose own community guide currently assigns them
spreadsheet homework: students memorizing anatomy or scripture, hobbyists on
the Art of Memory forum, memory-sport competitors. They have built more
palaces than they can maintain and have no tool whose value grows with the
years they have already put in. Evidence and competitive analysis are in
`VALIDATION.md` and the dossier.

---

## Architecture at a glance

Pure client-side, local-first web app. No backend, no accounts, no network
calls for the core loop.

- **Frontend**: React + TypeScript + Vite, client-side routing.
- **Drawing surface**: SVG (not raster canvas). SVG makes ordered dots easy
  to hit-test, recolor for the heat map, keyboard-focus for accessibility,
  and pan/zoom on a 390px phone.
- **Storage**: the browser's IndexedDB, wrapped in a thin persistence layer.
  Autosave on every change. The single source of truth is one `Atlas` object.
- **Scheduling / decay engine**: the open-source FSRS algorithm (`ts-fsrs`,
  MIT). Each spot is one card with its own stability, difficulty, due date,
  and retrievability. Both the heat-map color and the next-walk date derive
  from the same per-spot state, so the map and the schedule never disagree.
- **Portability**: the entire atlas exports as one versioned JSON file and
  imports back. This file is the durable artifact; local storage is just its
  working copy.
- **Serving & staging**: a multi-stage Dockerfile builds the static bundle
  and serves it behind nginx. `docker-compose.staging.yml` runs it. Runtime
  env (`SENTRY_DSN`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `SEED_DEMO`) is injected
  at container start, never baked into the bundle or committed.
- **Observability**: Sentry browser SDK for errors, Umami script for
  analytics. Both no-op cleanly when their env vars are absent (local dev).

### Security posture (honest mapping to the QUALITY BAR)

This app has no backend and no multi-user data, so several bar items map
differently than they would for a client/server app. Stated plainly so
reviewers can check the right things:

- **No server routes, so no server-side authorization to enforce.** All data
  is local to the user's own browser. There is no shared or cross-user data
  to leak. If a later change ever introduces a server route, that route gets
  full authz. Until then it is genuinely N/A.
- **Input validation at the boundary that exists**: the import file. Imported
  JSON is size-capped, schema-validated, and version-checked before it
  touches storage. Malformed or oversized files are rejected with a friendly
  message, never a crash.
- **Secrets via env only**: `SENTRY_DSN` and the Umami IDs arrive at
  container start. `.env` stays untracked; `.env.example` holds placeholders.
- **No PII in logs or error reports.** Spot contents (the user's memorized
  material) are never sent to Sentry. Error payloads are scrubbed to app
  state and stack traces only.
- **Dependency hygiene**: the dependency list stays small and pinned.

---

## Data model sketch

One exportable root object. IndexedDB holds exactly this; export writes
exactly this.

```
Atlas
  schemaVersion: number
  exportedAt: ISO string (stamped at export time)
  palaces: Palace[]

Palace
  id: string
  name: string
  createdAt: ISO string
  viewBox: { w, h }              // logical drawing size, for pan/zoom
  outline?: Path[]               // optional rough room shapes, freehand
  spots: Spot[]                  // ordered; index = walk order
  walks: Walk[]                  // append-only history

Spot
  id: string
  order: number                  // position in the journey
  x, y: number                   // location on the plan
  label: string                  // short name, e.g. "front door"
  contents: string               // what is memorized here (plain text)
  fsrs: {                        // per-spot decay state (ts-fsrs)
    stability, difficulty,
    due: ISO string,
    lastReview?: ISO string,
    reps, lapses, state
  }

Walk
  id: string
  palaceId: string
  startedAt, completedAt: ISO string
  results: { spotId, grade }[]   // grade: "missed" | "shaky" | "sharp"
```

**Grades map onto FSRS**: Missed → Again, Shaky → Hard, Sharp → Good. Three
buttons keep the walk fast and unambiguous. A spot's heat color is its
current FSRS retrievability (probability you would recall it right now):
green when high, red as it decays. A palace's next-walk date is the earliest
due date among its spots.

---

## Screens / routes (all client-side)

| Route | Screen | Primary action |
|---|---|---|
| `/` | Estate overview: every palace as a card with a mini-plan thumbnail, a health summary, and its next-walk date | Walk a due palace, or draw a new one |
| `/palace/:id` | Palace view: the full plan with the live heat map, the ordered spot list | Walk this palace |
| `/palace/new`, `/palace/:id/edit` | Sketcher: place ordered dots, draw the connecting path, optional room outline, name each spot, file its contents | Save |
| `/palace/:id/walk` | Recall walk: one spot at a time, its place highlighted on the plan, recall then reveal then grade | Grade and advance |
| `/settings` | Data: export the atlas, import an atlas, load or clear the sample | Export atlas |

No screen has a secondary action competing with its primary one.

---

## User stories (MVP only)

- As a keeper, I sketch a palace as ordered dots on a simple plan and file
  what lives at each spot, so it is safe outside my head from the first
  session.
- As a keeper, I run a spot-by-spot recall walk and grade each spot honestly,
  so the app learns where I am strong and weak.
- As a keeper, I look at a palace and see at a glance which spots are fading,
  because the plan I drew is colored by health.
- As a keeper, I open the estate and see which palace is due next, so review
  stops being guesswork.
- As a keeper, I export my whole atlas as one file and import it back, so the
  record is mine for life and survives any single device.
- As a brand-new visitor, I see a real palace already glowing with history
  within a minute, and a short guided path walks me through drawing and
  walking my own first palace once.

---

## EPIC list (build order)

Each EPIC is small, independently reviewable, and has testable acceptance
criteria. The build goes depth-first toward the signature moment: the heat
map is EPIC 4's whole reason to exist, and earlier EPICs exist to feed it.

### EPIC 1 — Foundation & the empty atlas

**Scope.** App scaffold (React + TS + Vite, client-side router). The `Atlas`
data model and an IndexedDB persistence layer with autosave. The estate
overview screen with a designed empty state. Export the atlas to a versioned
JSON file and import one back with validation. The staging deploy scaffold.
Error and analytics wiring. A README written for strangers.

**Acceptance criteria.**
- App builds and runs; the estate overview loads with real content (not a
  blank page) within ~1s on an ordinary connection.
- The empty state names what the screen is for and offers one obvious action
  to begin, plus a way to load the sample. No blank region.
- Creating, reading, and updating an `Atlas` persists across a full page
  reload via IndexedDB. All writes autosave.
- Export downloads a single JSON file containing the whole atlas with
  `schemaVersion` and `exportedAt`. Import reads that file back and restores
  state exactly.
- Import rejects malformed JSON, wrong or missing `schemaVersion`, and files
  over a sane size cap, each with a friendly in-app message and no crash.
- A multi-stage `Dockerfile` and `docker-compose.staging.yml` build and serve
  the static app behind nginx. `docker compose -f docker-compose.staging.yml
  up` serves the working app. `SENTRY_DSN`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`,
  and `SEED_DEMO` are read from env at container start, absent from the git
  tree, and the app runs fine when they are unset.
- Sentry captures a frontend error when `SENTRY_DSN` is set and no-ops when
  it is not. Umami loads only when its IDs are set. No spot contents or PII
  are ever sent to either.
- `README.md` lets a stranger understand the app in two or three plain
  sentences, run it with exact verified commands (clone, env, compose up),
  and find where the code and tests live. No factory internals.
- Fully usable at 390px wide: no horizontal scroll, tap targets ~44px.

### EPIC 2 — The palace sketcher

**Scope.** The SVG drawing surface. Click or tap to place ordered dots along
a journey; a path connects them in order; an optional rough room outline can
be drawn behind them. Name each spot and file its plain-text contents. Pan
and zoom on the plan. This is the scope-trap EPIC: it stays a
dots-and-paths sketch, never a drawing tool.

**Acceptance criteria.**
- Tapping the surface places a numbered spot; spots connect in placement
  order along a visible path; the order is editable (reorder, insert,
  delete).
- Each spot has a short label and a plain-text contents field, both saved to
  the atlas and surviving reload.
- An optional freehand room outline can be added and removed; it is purely
  visual and never required.
- The plan pans and zooms with touch and mouse; the whole surface is usable
  at 390px with no horizontal page scroll.
- Every control is keyboard-reachable, every input is labeled, focus is
  visible, and placed spots are announced to assistive tech.
- A saved palace appears on the estate overview with a correct mini-plan
  thumbnail.
- Loading, saving, and error states are designed: saving shows inline
  progress, a save failure explains what to do next in the product's voice.
- No dimensions, layers, snapping, image import, or freeform art tools ship.

### EPIC 3 — The recall walk & scoring engine

**Scope.** The spot-by-spot recall walk over one palace, in journey order.
Each step: prompt recall, reveal the filed contents, grade Missed / Shaky /
Sharp. The FSRS engine turns grades into per-spot stability, retrievability,
and due date, and appends each walk to history.

**Acceptance criteria.**
- Starting a walk steps through the palace's spots in order, one at a time,
  showing each spot's place highlighted on the plan.
- Each step reveals the contents on demand and records a grade; grades map to
  FSRS Again / Hard / Good and update that spot's stored state.
- Every completed walk is appended to the palace's `walks` history with
  timestamps and per-spot results, and survives reload and export/import.
- After a walk, the palace view reflects each spot's updated health from the
  new grades.
- The walk is fully usable one-handed at 390px: large grade buttons, clear
  progress, one primary action per step.
- Each interaction gives feedback within 100ms (pressed states, immediate
  advance). Grading never blocks on a slow operation.
- Interrupting a walk partway leaves the atlas in a consistent state (either
  the graded spots are saved or the walk is cleanly discarded, never a
  corrupt half-walk).

### EPIC 4 — The living heat map & the schedule (signature moment)

**Scope.** Render each spot's health as color directly on the drawn plan:
the map glows red where recall is failing and green where it holds. Surface
each palace's next-walk date and overall health on the estate overview, and
lead the keeper to the palace that needs a walk most. Ship a seeded demo
palace that already carries walk history so the heat map is visible on
staging within a minute without any hand input (`SEED_DEMO`).

**Acceptance criteria.**
- Each spot on the plan is colored by its current FSRS retrievability along a
  clear health scale; the coloring updates immediately after a walk. Color is
  never the only signal (a shape, value, or label also conveys health) so it
  reads for color-blind users and passes contrast.
- The estate overview shows, per palace, its overall health and its next-walk
  date, and orders or flags palaces so the most-at-risk one is obvious.
- With `SEED_DEMO` enabled, a fresh visitor with no data sees a real sample
  palace whose plan is visibly glowing with a mix of healthy and failing
  spots within a minute of first load, with zero hand-crafted input. The
  sample is clearly labeled as a sample and is removable in one action.
- The next-walk date equals the earliest spot due date and is recomputed
  after each walk.
- The heat map reads correctly at 390px and renders instantly (no perceptible
  lag) for a palace with dozens of spots.
- Health color choices meet accessibility contrast; the health scale has a
  legend or key that reads without relying on color alone.

### EPIC 5 — First-run guided walkthrough

**Scope.** A short guided path that leads a brand-new keeper through
completing the core action once: draw a palace, file a spot, run a walk, see
the heat map. Anchored to the real controls, one short imperative sentence
per step, skippable at any step, shown only until the first success and never
again.

**Acceptance criteria.**
- A first-time user is led through 2 to 4 steps anchored to the real
  controls (a highlighted next step or a tiny self-ticking checklist), each
  step one short imperative sentence, ending at the user seeing their own
  heat map for the first time.
- The walkthrough is skippable at every step and never blocks normal use.
- Once the user completes their first success (or skips), the walkthrough
  never appears again, including across reloads. A returning user with any
  data never sees it.
- The walkthrough points at controls; it is not a modal essay and adds no new
  wall of text. §4 and §7 of the quality bar are met together.
- All walkthrough copy passes the human-voice sweep: no em-dashes, no banned
  LLM vocabulary, positive and direct phrasing.

### EPIC 6 — Polish pass (no new features)

**Scope.** A UX, performance, and copy pass over the whole delivered product
against the QUALITY BAR and the quality differentiator. Tighten what exists;
add nothing.

**Acceptance criteria.**
- The signature moment lands: on the seeded demo and on a real user's third
  walk, the plan unmistakably shows where memory is failing, readable in one
  look. If it does not read instantly, the heat map is tuned until it does.
- Every empty, loading, and error state across all screens is designed and on
  brand: layout held steady while loading, errors say what to do next, no raw
  traces or dead ends.
- Every screen has one obvious primary action; secondary actions are visibly
  subordinate. Copy is cut to the shortest unambiguous form.
- Full mobile pass at 390px: every feature reachable, no horizontal scroll,
  tap targets ~44px, text readable without zoom.
- Accessibility pass: contrast, visible focus, labeled inputs, semantic
  headings and landmarks, keyboard reaches everything a mouse can.
- Performance pass: first meaningful render within ~1s, every interaction
  acknowledged within 100ms, the heat map and estate overview stay smooth
  with a large atlas (many palaces, dozens of spots each).
- A mechanical copy sweep over every user-visible string finds zero
  em-dashes, zero banned LLM vocabulary, and zero negative empty-state
  phrasing.
- README verified accurate against the actual compose files.

---

## Non-Goals / Out of scope

Named so later agents do not drift into them.

- **No accounts, login, cloud sync, or server-stored user data.** Local-first
  with one-file export is load-bearing for the "artifact you own" claim.
- **No LLM features of any kind**, including a bring-your-own-key garnish. The
  core loop has nothing for an LLM to do, and the validation puts even
  optional AI out of scope. There is no `llm_request`.
- **No sharing, no public palace library, no collaboration, no multiplayer.**
  This is a single-keeper tool by design.
- **No gamification**: no streaks, badges, points, or levels.
- **No pre-built or template palaces** beyond the single seeded demo used for
  onboarding. The whole point is the keeper's own real places.
- **No CAD-grade drawing**: no precise dimensions, layers, grid snapping,
  photo or image floor plans, or freeform art tools. Only ordered dots, a
  connecting path, and optional rough room outlines.
- **No typed-answer verification or answer-checking.** Recall is self-graded,
  the audience's accepted convention.
- **No cross-palace "daily rounds"** medley (the bolder sibling from the
  dossier is a different product).
- **No native mobile apps.** The web app is mobile-first and that is the
  whole delivery.
- **No spaced repetition of arbitrary flashcards** detached from the spatial
  plan. Space is the product.
