# The Palace Atlas

A keeper's logbook for memory palaces. People who use the memory-palace
technique build dozens of palaces and then lose them. This web workbench is
the notebook that keeps them: sketch each palace once, file what lives where,
and keep the whole atlas safe outside your head in one file you own.

It gives you the estate overview, palace records you can create, rename and
delete, and a sketch editor where you draw each palace as ordered, numbered
spots along a walk and file what lives at each one. You then run a recall walk:
step through the spots in order, reveal what you filed, and grade each one
Missed, Shaky, or Sharp. Everything autosaves to local storage, and the whole
atlas exports and imports as one file.

## Recall walks and scheduling

From a palace with spots, "Walk this palace" steps through the spots in walking
order, one at a time. Each step highlights the current spot on a read-only plan,
prompts your recall, reveals the filed contents when you ask, and takes one of
three grades. The grades feed [FSRS](https://github.com/open-spaced-repetition/ts-fsrs),
a spaced-repetition scheduler, which advances each spot's memory state and sets
its next due date. Each spot's health reads in plain words: `Not walked yet`,
`Sharp`, `Holding`, `Fading`, or `At risk`. A spot you have never walked reads
`Not walked yet`, never a fake score.

## The heat map

The floor plan you drew is also your memory's health record. Every spot on the
palace view is colored by its current recall probability, from green (`Sharp`)
through amber and orange down to red (`At risk`), and the reading never depends
on color alone: failing spots wear a dashed or heavy ring, every marker keeps
its number, each spot's health word is in its accessible name, and a compact
legend keys the bands. The moment you finish a walk, the summary shows the same
plan glowing with the grades you just gave. During a walk the plan stays
uncolored, so the colors never bias your recall.

The estate overview reads the same way at a glance: each palace card shows its
overall health (the worst walked spot governs), its next walk date (the
earliest spot due date), and a mini plan tinted by band. The most-at-risk
palace sorts first and carries a "Walk next" chip with a one-tap "Walk this
palace" action, so the next ten minutes of revision are never guesswork.

Your data stays in your browser. There is no account and no server. Nothing
you write leaves your machine unless you export it yourself.

## Run it locally

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
git clone <this-repo-url>
cd the-palace-atlas-a-keeper-s-logbook-for-memo
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

To build and preview the production bundle:

```bash
npm run build
npm run preview
```

## Run it as a container

The app builds to a static bundle served by nginx.

```bash
docker build -f docker/Dockerfile -t palace-atlas .
docker run --rm -p 8080:80 palace-atlas
```

Open http://localhost:8080.

Runtime settings are read from `/env.js`, which the container writes at start
from these environment variables (all optional, all default to empty):

| Variable | Purpose |
|---|---|
| `SENTRY_DSN` | Frontend error tracking. Off when empty. |
| `UMAMI_URL` | Analytics script URL. Off unless both Umami values are set. |
| `UMAMI_WEBSITE_ID` | Analytics site id. |
| `SEED_DEMO` | Set to `1` to seed a sample palace with real walk history on the very first boot, so the heat map shows value with no input. Only an empty store is ever seeded; once the visitor removes the sample it stays gone. Meant for demo and staging deployments. |

Copy `.env.example` to `.env` to set them for a deployment. Never commit real
values.

## Your atlas file

Settings has one primary action: export your atlas to a single JSON file.
Import reads that file back after checking its size, shape, and version, so a
truncated or foreign file is refused with a plain message instead of a crash.
The file carries every palace, its spots, and the recall-walk history with each
spot's scheduling state, so the format is stable across versions.

## Develop and test

The code lives in `src/`:

- `model/`: the `Atlas`/`Palace`/`Spot`/`Walk` types, the schema version, and
  the forward-only migration framework.
- `persistence/`: the IndexedDB layer and debounced autosave.
- `state/`: the React context that holds the current atlas.
- `features/`: export/import, the bundled samples and demo seed, and `walk/`
  (the FSRS scoring adapter, pure walk-progression helpers, and the
  palace-level health aggregates behind the heat map).
- `routes/` and `components/`: the screens and UI pieces.
- `observability/`: Sentry and Umami wiring that no-ops without config.

Tests use Vitest with Testing Library and an in-memory IndexedDB, so they run
headless with no browser or database to set up:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # type-check and bundle
```

End-to-end tests use Playwright against the production build. They start with
a clean browser profile, so there is no database to provision. Run them in the
pinned Playwright container, which carries the matching browser build:

```bash
bash scripts/e2e.sh
```

Every change should keep all of these green.

## License

MIT. See [LICENSE](./LICENSE).
