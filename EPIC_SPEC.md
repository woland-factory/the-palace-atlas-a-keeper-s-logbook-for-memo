# EPIC SPEC — Foundation & the empty atlas

The first EPIC of The Palace Atlas. It builds the skeleton every later EPIC
stands on: the app scaffold, the `Atlas` data model, an IndexedDB
persistence layer with autosave, the estate overview with a designed empty
state, whole-atlas export/import with validation, the staging deploy
scaffold, error/analytics wiring, and a README for strangers.

This EPIC ships NO drawing surface, NO recall walk, and NO heat map. Those
are EPICs 2, 3, and 4. Read the Non-Goals section before writing any code.

---

## Quality differentiator (hold every relevant decision to this)

**Decay you can read at a glance.** Every competitor shows a list, a streak,
or a schedule. This app colors the floor plan the keeper drew so the spots
their memory is losing are obvious in one look.

**What it demands of THIS EPIC:** the signature moment does not render here.
This EPIC's job is to make it *possible and inevitable* later. Two things
carry the burden:

1. The `Atlas` data model must store, per spot, the exact per-spot decay
   state (`fsrs`) that EPIC 4 will color the plan from, and it must survive
   reload and a full export/import round-trip losslessly. If this EPIC drops
   or lossily serializes per-spot state, the heat map has nothing honest to
   read. Round-trip fidelity is the differentiator's foundation, not a
   nicety.
2. The estate overview is the frame the glowing plan will hang in. Build it
   so a palace card has an obvious slot for the mini-plan thumbnail and a
   health summary (EPIC 2 and EPIC 4 fill them). Do not paint yourself into
   a layout that cannot show health at a glance.

---

## Scope

### In scope

- React + TypeScript + Vite single-page app with a client-side router.
- The `Atlas` / `Palace` / `Spot` / `Walk` TypeScript data model and a
  `SCHEMA_VERSION` constant, plus a forward-only migration framework.
- An IndexedDB persistence layer holding one `Atlas` record, with debounced
  autosave and a visible save-status indicator.
- The estate overview screen (`/`) rendering palace cards, with a designed
  empty state.
- Minimal palace **create / read / update / delete as data records**: name a
  new palace, rename it, delete it. No drawing surface (EPIC 2). This exists
  only to prove the persistence criterion and to give the overview real
  content.
- A settings/data screen (`/settings`): export the atlas, import an atlas,
  load the bundled sample, clear the sample.
- Whole-atlas export to one versioned JSON file, and import back with strict
  validation (malformed JSON, wrong/missing `schemaVersion`, oversize file).
- A bundled sample atlas fixture and a one-action "Load sample".
- Runtime env plumbing for `SENTRY_DSN`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`,
  `SEED_DEMO` via a container-start-generated `env.js` (never baked into the
  bundle, never committed).
- Sentry (frontend errors) and Umami (analytics) wiring that no-ops when its
  env is unset and never sends spot contents or PII.
- A multi-stage `Dockerfile`, `nginx.conf`, entrypoint script, and
  `docker-compose.staging.yml` that build and serve the static app.
- `.env.example`, a README written for strangers, and the Vitest test suite.

### Out of scope (this EPIC only — later EPICs own these)

- The SVG sketcher / drawing surface, placing dots, paths, outlines, spot
  labels and contents editing (EPIC 2).
- The mini-plan thumbnail rendering (EPIC 2 fills the card's reserved slot).
- The recall walk and the FSRS scoring engine that mutates `fsrs` state
  (EPIC 3). This EPIC only *stores and round-trips* the `fsrs` field; it
  never computes or updates it.
- The living heat map, per-spot color, next-walk ordering on the overview,
  and the `SEED_DEMO` auto-seed-on-first-load behavior (EPIC 4). This EPIC
  *reads* `SEED_DEMO` into runtime config but does not act on it beyond the
  no-op default.
- The guided first-run walkthrough (EPIC 5).

### Non-goals (binding — building any of these is a defect)

- No accounts, login, cloud sync, or server-stored/multi-user data. There is
  no backend and no server route in this EPIC.
- No secrets committed to the git tree.
- No LLM features of any kind, including bring-your-own-key.
- No gamification, sharing, template palaces beyond the one sample, or CAD
  drawing tools.

---

## Quality bar mapping (how the written bar applies to a phased EPIC 1)

The bar is binding spec. Because this is the first of six EPICs, three bar
clauses are met by later EPICs by design. State this honestly; do not build
them here (that is drift) and do not skip what IS owed here.

- **§4 First-run "walk the first success"** is EPIC 5. **The seeded glowing
  demo** (`SEED_DEMO` auto-seed) is EPIC 4. EPIC 1's first-run contribution
  is a designed empty state with one obvious primary action plus a working
  "Load sample" so the first screen is never blank and the core direction is
  clear. Do not build a guided walkthrough in this EPIC.
- **§1 Perceived speed, §2 Mobile-first, §3 Designed states, §5 Security
  hygiene, §6 Accessibility, §7 Radically simple, §8 Human-voice copy, §9
  README** all apply fully to every screen this EPIC ships.
- **§5 Security** for a no-backend app maps to: import is the only untrusted
  boundary, so it is size-capped, schema-validated, and version-checked
  before it touches storage; secrets are env-only; no PII (spot contents) in
  logs or error reports. There are no server routes to authorize; if a later
  EPIC adds one it gets full authz.

---

## Technical design

### Stack and dependencies (keep the list small and pinned)

- `react`, `react-dom`, `react-router-dom` (client-side routing).
- `vite`, `@vitejs/plugin-react`, `typescript`.
- `idb` (MIT, tiny) for the IndexedDB wrapper. Hand-rolling is acceptable if
  the implementer prefers, but do not add a heavier storage library.
- `@sentry/react` for frontend error tracking.
- Dev/test: `vitest`, `@testing-library/react`, `@testing-library/user-event`,
  `jsdom`, `fake-indexeddb`.
- Pin every dependency to an exact version. No state-management library, no
  UI-component library, no CSS framework — plain CSS with design tokens is
  enough for these screens.

### File / module layout

```
index.html
package.json  tsconfig.json  vite.config.ts  .dockerignore  .env.example
public/
  env.js                       # dev placeholder: window.__ENV__ = {} (all empty, no secrets)
src/
  main.tsx                     # mount, init observability, wrap in ErrorBoundary + AtlasProvider
  App.tsx                      # <BrowserRouter> + routes + app shell (header)
  config/
    runtimeConfig.ts           # read window.__ENV__ with safe empty defaults
  model/
    atlas.ts                   # Atlas/Palace/Spot/Walk types, SCHEMA_VERSION, factories, ids
    validate.ts                # validateImport(unknown, byteSize): Ok<Atlas> | Err<reason>
    migrate.ts                 # migrate(atlas): Atlas — forward-only version steppers
  persistence/
    db.ts                      # openDB, low-level get/put for the single atlas record
    atlasStore.ts              # loadAtlas(), saveAtlas(atlas) — the persistence API
    autosave.ts                # debounce + SaveStatus ('idle'|'saving'|'saved'|'error')
  state/
    AtlasContext.tsx           # provider: current atlas + actions + save status
  features/
    portability/
      exportAtlas.ts           # buildExport(atlas) + downloadAtlas(atlas)
      importAtlas.ts           # readAndImport(file): Promise<Ok|Err> (uses validate.ts)
    sample/
      sample.ts                # SAMPLE_ATLAS fixture + loadSample()
  routes/
    EstateOverview.tsx         # "/"
    Settings.tsx               # "/settings"
    NotFound.tsx               # "*"
  components/
    AppHeader.tsx  EmptyState.tsx  PalaceCard.tsx  NewPalaceForm.tsx
    SaveStatus.tsx  Toast.tsx  ErrorBoundary.tsx  ConfirmDialog.tsx
  styles/
    tokens.css  global.css
docker/
  Dockerfile
  nginx.conf
  docker-entrypoint.sh
docker-compose.staging.yml
README.md
```

### Data model (`src/model/atlas.ts`) — the forward-only contract

The persisted and exported root object is exactly this. Define the full
model now even though only names/ids are edited in this EPIC, because export
and IndexedDB must store the whole thing losslessly for later EPICs.

```ts
export const SCHEMA_VERSION = 1 as const;

export interface Atlas {
  schemaVersion: number;      // === SCHEMA_VERSION for freshly created atlases
  exportedAt: string | null;  // ISO string, stamped only at export; null in storage
  palaces: Palace[];
}

export interface Palace {
  id: string;                 // uuid
  name: string;
  createdAt: string;          // ISO
  viewBox: { w: number; h: number };   // logical drawing size; default { w: 1000, h: 1000 }
  outline?: Path[];           // optional room shapes; EPIC 2 writes these
  spots: Spot[];              // ordered; index === walk order; [] in this EPIC
  walks: Walk[];              // append-only history; [] in this EPIC
}

export interface Path { points: { x: number; y: number }[]; }

export interface Spot {
  id: string;
  order: number;
  x: number; y: number;
  label: string;
  contents: string;           // memorized material — PII-sensitive, never logged/sent
  fsrs: {
    stability: number; difficulty: number;
    due: string;                // ISO
    lastReview?: string;        // ISO
    reps: number; lapses: number; state: number;
  };
}

export interface Walk {
  id: string;
  palaceId: string;
  startedAt: string; completedAt: string;
  results: { spotId: string; grade: 'missed' | 'shaky' | 'sharp' }[];
}
```

Factories: `newAtlas(): Atlas` returns `{ schemaVersion: SCHEMA_VERSION,
exportedAt: null, palaces: [] }`. `newPalace(name: string): Palace` returns a
palace with a fresh uuid, `createdAt` now, default `viewBox`, and empty
`spots`/`walks`. Generate ids with `crypto.randomUUID()`.

**Migration framework (`migrate.ts`), forward-only.** `migrate(raw): Atlas`
reads `raw.schemaVersion` and applies an ordered chain of pure stepper
functions `vN -> vN+1` until it reaches `SCHEMA_VERSION`. For v1 the chain is
empty (identity), but the structure must exist so a future v2 adds one
stepper without touching call sites. Never mutate downward: an atlas whose
`schemaVersion > SCHEMA_VERSION` is unmigratable and is rejected at import.

### Persistence (`src/persistence/`)

- IndexedDB database name `palace-atlas`, version `1`, one object store
  `atlas`. Store the single current atlas under the fixed key `"current"`.
- `loadAtlas(): Promise<Atlas>` — read key `"current"`; if absent, return
  `newAtlas()` (do not write on read). If present, run it through `migrate()`
  before returning.
- `saveAtlas(atlas: Atlas): Promise<void>` — write the whole atlas under
  `"current"`. Storage always holds `exportedAt: null`; `exportedAt` is a
  property of an exported *file*, stamped in `buildExport`, never persisted.
- **Autosave (`autosave.ts`):** every mutation through `AtlasContext` marks
  the store dirty and schedules a debounced save (300–500ms). Additionally
  flush pending saves on `visibilitychange` (hidden) and `beforeunload` so a
  quick edit-then-close never loses data. Expose `SaveStatus`
  (`'idle' | 'saving' | 'saved' | 'error'`) for the indicator. On a rejected
  write, set `'error'` and surface the copy in §Designed states.

### State (`src/state/AtlasContext.tsx`)

A single React context is the app's source of truth in memory, mirrored to
IndexedDB by autosave. Actions (all persist via autosave):

- `createPalace(name)` → append `newPalace(name)`.
- `renamePalace(id, name)` → update `name`.
- `deletePalace(id)` → remove the palace.
- `replaceAtlas(atlas)` → wholesale replace (used by import and load-sample);
  writes immediately (not debounced) so an import is durable at once.

On mount, the provider calls `loadAtlas()` and holds a `loading` flag so the
overview can show a skeleton (not a blank white screen) during the async
read.

### Portability contract (`src/features/portability/`)

**Export file format** — the exact bytes written to disk:

```json
{ "schemaVersion": 1, "exportedAt": "2026-09-10T12:34:56.789Z", "palaces": [ /* full Palace[] */ ] }
```

- `buildExport(atlas)` deep-clones the current atlas, sets `schemaVersion =
  SCHEMA_VERSION` and `exportedAt = new Date().toISOString()`.
- `downloadAtlas(atlas)` serializes with `JSON.stringify(obj, null, 2)`,
  builds a `Blob` (`type: application/json`), and triggers a download named
  `palace-atlas-YYYY-MM-DD.json` (date from `exportedAt`). Revoke the object
  URL after the click.
- The export is byte-for-byte re-importable: exporting then importing the
  same file yields an identical `palaces` array (this is the round-trip test).

**Import validation (`validate.ts` + `importAtlas.ts`)** — reject BEFORE
touching storage, each with a friendly in-app message and no crash. Validate
in this order:

1. **Size cap.** Reject files larger than **25 MB** (`26_214_400` bytes)
   using `file.size`, before reading contents.
2. **JSON parse.** Reject a body that is not valid JSON.
3. **Shape.** Reject if the parsed value is not an object, or `palaces` is
   not an array.
4. **schemaVersion.** Reject if `schemaVersion` is missing, not an integer,
   `< 1`, or `> SCHEMA_VERSION`. (Known versions are migrated by
   `migrate()`; only `1` exists today.)
5. **Per-palace shape (shallow).** Reject if any palace is missing a string
   `id` or `name`, or `spots`/`walks` is not an array. Keep this shallow;
   deep per-spot validation is not required in this EPIC, but unknown extra
   fields must be preserved, not stripped, so future-version files survive a
   round trip when their `schemaVersion` is accepted.

`validate.ts` returns a discriminated result:
`{ ok: true; atlas: Atlas } | { ok: false; reason: ImportError }` where
`ImportError` is one of `'too_large' | 'not_json' | 'bad_shape' |
'bad_version'`. `importAtlas` maps each reason to the exact copy in
§Designed states and calls `replaceAtlas` only on success.

### Runtime config and observability

Static bundles cannot read container env at build time, so inject at
container start:

- `src/config/runtimeConfig.ts` reads `window.__ENV__` (shape:
  `{ SENTRY_DSN?, UMAMI_URL?, UMAMI_WEBSITE_ID?, SEED_DEMO? }`) and returns a
  typed config with empty-string/undefined treated as "unset". `index.html`
  loads `/env.js` with a plain `<script src="/env.js"></script>` BEFORE the
  app bundle.
- Committed `public/env.js` sets `window.__ENV__ = {}` (all unset) so `npm
  run dev` and the built bundle run with no observability and no secrets in
  the tree.
- At container start, `docker-entrypoint.sh` writes a fresh
  `/usr/share/nginx/html/env.js` from the process env
  (`SENTRY_DSN`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `SEED_DEMO`), then execs
  nginx. Values absent from env become empty strings.
- **Sentry (`observability/sentry.ts`):** `initSentry()` runs only when
  `SENTRY_DSN` is set; otherwise it is a no-op. Configure `sendDefaultPii:
  false`, a `beforeSend` that drops any event body beyond message + stack +
  release, and a `beforeBreadcrumb` that drops console/DOM breadcrumbs that
  could carry `contents`. Never attach the atlas or any spot `contents`/
  `label` to an event. `SEED_DEMO` is read into config and otherwise unused
  this EPIC.
- **Umami (`observability/umami.ts`):** inject the Umami script tag only when
  BOTH `UMAMI_URL` and `UMAMI_WEBSITE_ID` are set. Track page views only; do
  not send any custom event carrying user text.

### Docker / staging

- **`docker/Dockerfile`** multi-stage: stage 1 `node:20-alpine`, `npm ci`,
  `npm run build` → `/app/dist`. Stage 2 `nginx:1.27-alpine`, copy `dist` to
  `/usr/share/nginx/html`, copy `nginx.conf` and `docker-entrypoint.sh`.
  Entrypoint generates `env.js` then `exec nginx -g 'daemon off;'`.
- **`docker/nginx.conf`** serves the static app with SPA fallback
  (`try_files $uri /index.html`) so client routes deep-link, and must NOT
  cache `env.js` (so redeploys pick up new config).
- **`docker-compose.staging.yml`** builds the image, maps a port, and passes
  `SENTRY_DSN`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `SEED_DEMO` through
  `environment:` (values from the host env, defaulting empty). `docker
  compose -f docker-compose.staging.yml up` must serve the working app with
  all four unset.
- **`.env.example`** lists the four vars with placeholder/empty values and a
  one-line comment each. `.env` stays untracked (add to `.gitignore`).

### Screens, states, and copy

Mobile-first: design at 390px, single column, `max-width` container centered
on desktop, no horizontal scroll, tap targets ≥ 44px, visible focus rings,
labeled inputs, semantic headings/landmarks.

**Estate overview (`/`):**
- Loading: a skeleton list holds the layout steady while `loadAtlas`
  resolves. Never a white screen.
- Populated: one `PalaceCard` per palace showing the name, created date, spot
  count, a **reserved slot for the mini-plan thumbnail** (EPIC 2) and a
  **reserved health line** (EPIC 4) rendered as neutral placeholders now
  (e.g. "Not walked yet"), plus Rename and Delete. One primary action in the
  header: "Add your first palace" / "Add a palace".
- Empty state (`EmptyState.tsx`): a heading, one short line of what the
  screen is for, one primary button "Add your first palace", and a
  subordinate "Load the sample". No blank region.

**Settings / data (`/settings`):** primary action "Export atlas"; secondary
"Import atlas" (file picker), "Load sample", "Remove sample". Import errors
render as a `Toast`/inline message, never a crash.

**Copy (already swept for the human-voice rules — use verbatim or plainer):**
- Empty-state heading: `Start your atlas`
- Empty-state line: `Draw the buildings you memorize in and keep them safe outside your head.`
- Primary button: `Add your first palace`
- Secondary: `Load the sample`
- Card placeholder health line: `Not walked yet`
- Rename / Delete labels: `Rename`, `Delete`
- Delete confirm: `Delete this palace? Its spots and history go with it.`
- Save status: `Saving`, `Saved`, and on failure `Your last change did not save. Try again.`
- Export button: `Export atlas`
- Import button: `Import atlas`
- Import error `too_large`: `That file is over 25 MB. Pick an atlas you exported from this app.`
- Import error `not_json`: `That file is not a readable atlas. Pick an atlas you exported from this app.`
- Import error `bad_shape`: `That file is not a readable atlas. Pick an atlas you exported from this app.`
- Import error `bad_version`: `That atlas comes from a newer version. Update the app, then import again.`
- Import success: `Atlas imported.`
- Load sample / remove sample: `Load the sample`, `Remove sample`

No em-dashes, no banned LLM vocabulary, positive/direct phrasing. Any new
string added during implementation must pass the same sweep before the run
ends.

### Sample fixture (`src/features/sample/sample.ts`)

A small, valid `Atlas` with one or two palaces so the overview shows real
content on demand. Because the heat map does not exist yet, the sample does
NOT need walk history or glowing spots (that is EPIC 4's seeded demo). Keep
it a real, importable atlas: valid ids, `schemaVersion: 1`, palaces with a
name and empty `spots`/`walks` is sufficient. `loadSample()` calls
`replaceAtlas(SAMPLE_ATLAS)` (deep-cloned). The sample must be clearly a
sample in the UI and removable with `Remove sample` in one action.

---

## Ordered task list (each task lists its own acceptance criteria)

**T1 — Scaffold and app shell.** Vite + React + TS project, router with `/`,
`/settings`, `*`, an `AppHeader`, `tokens.css`/`global.css`, `ErrorBoundary`
wrapping the app. `npm ci && npm run build` succeeds; `npm run dev` serves
the shell. First meaningful render (header + skeleton) is visible without a
blank white flash.

**T2 — Data model and migration.** `atlas.ts` types, `SCHEMA_VERSION`,
`newAtlas`/`newPalace`, uuid ids; `migrate.ts` forward-only framework
(identity for v1). Types compile with `tsc --noEmit`; `migrate(newAtlas())`
returns an equal atlas.

**T3 — Persistence + autosave.** `db.ts`, `atlasStore.ts`, `autosave.ts`,
`AtlasContext`. `loadAtlas` returns an empty atlas on a fresh DB and a
migrated atlas when present; `saveAtlas` round-trips through IndexedDB;
autosave debounces and flushes on hide/unload; `SaveStatus` transitions
`saving → saved` and `→ error` on a rejected write.
- **Provable:** create a palace, reload the page (or re-open the DB in a
  test), the palace is still there. Rename persists. Delete persists.

**T4 — Estate overview + minimal CRUD.** `EstateOverview`, `PalaceCard`,
`EmptyState`, `NewPalaceForm`, `ConfirmDialog`, `SaveStatus`. Loading
skeleton, designed empty state with primary action + load-sample, populated
list with rename/delete. One obvious primary action per screen.
- **Provable:** empty state shows the exact copy and both actions; adding a
  palace moves the screen from empty to populated; the reserved thumbnail and
  health slots render as neutral placeholders.

**T5 — Export.** `exportAtlas.ts`: `buildExport` stamps `schemaVersion` and
`exportedAt`; `downloadAtlas` produces a single well-named JSON blob and
revokes the URL.
- **Provable:** `buildExport(atlas)` output has `schemaVersion === 1`, a
  valid ISO `exportedAt`, and the full `palaces`.

**T6 — Import + validation.** `validate.ts`, `importAtlas.ts`, wired into
Settings with toasts. All five validation steps in order; success calls
`replaceAtlas` and persists immediately.
- **Provable:** a good file restores state; malformed JSON, missing/`>current`
  `schemaVersion`, and a >25 MB file each return the right `ImportError` and
  show the matching friendly message with no crash.

**T7 — Round-trip guarantee.** Export → import → deep-equal `palaces`
(including a palace carrying populated `spots` with `fsrs` and `walks`, to
prove later-EPIC data survives losslessly even though this EPIC does not
create it).
- **Provable:** the round-trip test passes on a fixture with full spot/walk
  data.

**T8 — Sample fixture.** `sample.ts` + Load sample / Remove sample in
Settings and the empty state.
- **Provable:** load sample fills the overview with real content; remove
  sample clears it in one action; the sample is labeled as a sample.

**T9 — Runtime config + observability.** `runtimeConfig.ts`, committed
`public/env.js` (empty), `index.html` loads `/env.js` first, `sentry.ts`,
`umami.ts`. App runs with all env unset. Sentry inits only with a DSN and
scrubs PII; Umami injects only with both IDs.
- **Provable:** with no env, no Sentry init and no Umami tag; a thrown error
  reaches Sentry only when a DSN is configured; no `contents`/`label` ever
  appears in an outgoing event payload (assert via `beforeSend`).

**T10 — Docker, staging, README, env example.** Multi-stage `Dockerfile`,
`nginx.conf` (SPA fallback, no-cache `env.js`), `docker-entrypoint.sh`
generating `env.js` from env, `docker-compose.staging.yml`, `.env.example`,
`.gitignore` for `.env`, and `README.md` for strangers.
- **Provable:** `docker compose -f docker-compose.staging.yml up` builds and
  serves the working app with all four vars unset; the generated `env.js`
  reflects any vars that ARE set; no secret is committed; the README's clone
  → env → compose-up commands match the actual files, and it points to where
  code and tests live with no factory internals.

---

## Test plan (automated — Vitest, jsdom, fake-indexeddb)

Each planner acceptance criterion maps to at least one automated test.
Configure `fake-indexeddb/auto` in the test setup so the persistence layer
runs headless.

| Planner criterion | Test(s) |
|---|---|
| App builds; overview loads real content within ~1s, not blank | `EstateOverview.test.tsx`: renders a skeleton while loading, then content, never an empty white node. Plus `npm run build` in CI. |
| Empty state names the screen, one action + load sample, no blank region | `EstateOverview.test.tsx`: empty atlas → heading, primary "Add your first palace", "Load the sample" all present. |
| Create/read/update persists across reload via IndexedDB; autosave | `atlasStore.test.ts`: `saveAtlas` then fresh `loadAtlas` returns equal atlas. `autosave.test.ts`: mutation schedules a debounced save and flushes on `visibilitychange`. `AtlasContext.test.tsx`: create/rename/delete persist. |
| Export = single JSON with `schemaVersion` + `exportedAt`; import restores exactly | `exportAtlas.test.ts`: `buildExport` shape. `roundtrip.test.ts`: export → import → deep-equal `palaces`. |
| Import rejects malformed JSON, wrong/missing version, oversize; friendly message, no crash | `validate.test.ts`: each `ImportError` case. `importAtlas.test.tsx`: each rejection renders its message and does not throw or replace state. |
| Docker/compose build and serve behind nginx; env read at start, absent from tree, runs unset | Manual/CI: run `docker compose -f docker-compose.staging.yml up`, curl the served index and `/env.js`. `git grep` proves no `.env` or secret committed. Documented in result summary. |
| Sentry captures on DSN, no-ops without; Umami only with IDs; no PII sent | `sentry.test.ts`: `initSentry` is a no-op with empty DSN; with a DSN, a captured error's `beforeSend` output contains no `contents`/`label`. `umami.test.ts`: tag injected only when both IDs set. |
| README lets a stranger understand, run, and contribute; no factory internals | Manual review against the compose files; `git grep` for factory terms returns nothing in `README.md`. |
| Usable at 390px, no horizontal scroll, ~44px targets | `responsive.test.tsx` (jsdom asserts container has no fixed width forcing overflow and buttons carry the min-target class) plus a manual 390px check noted in the result. |

`package.json` scripts: `dev`, `build`, `preview`, `test`
(`vitest run`), `typecheck` (`tsc --noEmit`), `lint` (optional). CI-relevant
gate for DONE: `npm run typecheck`, `npm run build`, and `npm run test` all
pass, and `docker compose -f docker-compose.staging.yml up` serves the app.

---

## Definition of done

- Every planner acceptance criterion has a passing automated test (or, where
  only a running container can prove it, a documented manual verification in
  the result summary) per the table above.
- `npm run typecheck`, `npm run build`, `npm run test` pass.
- The staging compose stack builds and serves the working app with all env
  vars unset, and reflects set vars in the generated `env.js`.
- No secret is committed; `.env` is gitignored; `.env.example` holds
  placeholders only.
- Every user-visible string passes the human-voice sweep (no `—`/`–`, no
  banned LLM vocabulary, no negative empty-state phrasing).
- The app is usable at 390px with no horizontal scroll and ~44px targets.
- Later-EPIC data (`spots` with `fsrs`, `walks`) survives an export/import
  round trip losslessly, even though this EPIC never creates it.
