# VALIDATION — The Palace Atlas: a keeper's logbook for memory palaces

## Verdict: VIABLE (with conditions)

Viable as value, not as a business. This is a small-audience product with
a genuinely durable artifact at its center, a signature moment you can
name in one sentence, and a core loop that is cleanly agent-buildable
with zero runtime cost. The skeptic's 0.78 kill probability is mostly a
market-size and habit-sustain argument; under the factory's purpose
(durable user value over adoption), those are accepted costs, not kill
reasons. The conditions that keep it viable are listed at the end. If
the build drifts past them, the verdict flips.

## Core value proposition

A memory-palace keeper sketches each palace once as a simple floor plan
of ordered spots, files what lives at each spot, and runs scheduled
spot-by-spot recall walks. The drawn plan accumulates a per-spot failure
record and renders it in place: the floor plan you drew glows red where
your memories are dying. The whole estate exports as one file the keeper
owns. The community's own review guide prescribes exactly this record by
hand ("Have a notebook or spreadsheet... Without a record, the system
becomes guesswork") and has been improvising it with Excel files since
at least 2013. The tool they keep describing has never been built.

Value lands twice, and the first time needs no habit at all:

1. **Minute one, the backup.** The palace exists outside the keeper's
   head. The documented fear ("I found that I even forget the palace
   itself very quickly") is answered on first use. A user who never
   returns still keeps this.
2. **Around the third walk, the diagnosis.** The heat map shows a
   cluster. "Loci where you got stuck" becomes a visible place instead
   of a spreadsheet column.

## Does it survive the value tests?

**Would anyone's life be genuinely better?** Yes, for a small, named,
evidenced group: multi-palace practitioners (students, hobbyists,
competitors) whose community guide currently assigns them spreadsheet
homework. The pain quotes are specific and current (2026), and the 2013
registry thread shows the need is thirteen years persistent, not a fad.

**Couldn't a chatbot or an existing free tool do it?** No, and this is
the idea's strongest defense:

- A chatbot cannot hold a drawn spatial surface and re-render it with
  decay in place, cannot keep an honest years-long per-spot grading
  record feeding a scheduler, and cannot export both as one file. The
  core loop contains no LLM, so a better chatbot never catches up.
- Every incumbent holds one half: draw.io draws but remembers nothing;
  Anki/Mnemopal schedule but hold no space; memoryOS sells its own
  pre-built rooms, not your real places. No named tool joins the drawn
  plan of your own place to a per-spot recall history.
- The spreadsheet-substitution objection (conditional formatting is a
  heat map) is the skeptic's best shot, and the honest answer is: the
  community has had the spreadsheet for thirteen years and their guide
  still calls the result "guesswork". A spreadsheet row is not a place.
  The spatial rendering is the difference between a log about the
  palace and the palace itself, and for this audience space is the
  entire mnemonic mechanism.

**Does it leave the user something durable?** Yes, the strongest section
of the idea. The atlas compounds three ways: more palaces (registry),
more walks (diagnostic history), more years (a record no competitor or
chat log can reconstruct). For a palace the keeper is forgetting, the
export is not documentation of the asset. It is the only surviving copy
of the asset.

**Can agents deliver it at the quality bar?** Yes, cleanly. Pure
client-side web: canvas sketcher of ordered dots and paths, per-spot
records, an open-source FSRS-style scheduler, heat-map rendering, JSON
export/import. Local-first, no accounts, no external APIs, no
moderation, no network effects, no runtime LLM. The one genuinely hard
piece is the sketcher, and it is hard only if over-built (see
conditions). First-run quality bar is satisfiable with a seeded demo
palace that already carries walk history, so the heat map (the
differentiator) is visible within the first minute without hand input.

## Minimal feature set (the smallest product that delivers the value)

1. Palace sketcher: ordered dots and connecting path on a simple canvas,
   with optional rough room outlines. Dots-and-paths, never CAD.
2. Per-spot contents: what lives at each locus, plain text.
3. Recall walk: spot-by-spot self-graded pass through one palace.
4. Heat map: per-spot health rendered directly on the drawn plan.
5. Schedule: FSRS-style next-walk date per palace, visible on an estate
   overview.
6. One-file export/import (JSON), local-first storage, no account.
7. Seeded demo palace with walk history so the signature moment shows in
   minute one.

Everything else is out: LLM features of any kind (even BYOK garnish),
sharing, gamification, streaks, pre-built palaces, mobile apps,
cross-palace "rounds" (the bolder sibling is a different product).

## Main risks

1. **Tiny audience, honestly tiny.** The nearest comp sees ~80 downloads
   a month. Acceptable under the factory's purpose, but this will never
   be a widely used app, and it should ship knowing that.
2. **The habit problem.** The heat map only diagnoses if walks happen;
   a lapsed user's map is a guilt surface. Mitigation is structural:
   the minute-one backup value survives abandonment, which is exactly
   why the logbook form beats the daily-ritual sibling here.
3. **Incumbent shadow.** artofmemory.com is web-based, sits where the
   users are, and could not be probed (HTTP 403). Indirect evidence
   (their own guide still prescribes a manual spreadsheet, August 2026)
   says they lack this, but the claim is unverified.
4. **The sketcher scope trap.** The single most likely way the build
   fails is the sketcher growing toward a drawing tool. It must stay a
   click-to-place-ordered-dots surface.
5. **Onboarding cliff.** A keeper with 30 palaces must sketch them one
   by one. Mitigation: the product must deliver full value on palace
   one; the atlas is allowed to grow slowly.

## What would make me reject it

- Verified evidence that Art of Memory's platform already ships
  per-locus decay tracking rendered on a user-drawn plan with export.
  That would reduce this to a feature request on their tracker.
- A plan that requires accounts or a server for core value. Local-first
  with one-file export is load-bearing for the "artifact you own" claim;
  losing it collapses the differentiation into "another SRS webapp".
- A plan whose core loop drifts to generic flashcard SRS with a map as
  decoration, or that spends its budget on the sketcher instead of the
  heat map and history. The record in place is the product; the drawing
  is only its canvas.
- Any pivot that makes the heat map depend on typed-answer verification
  instead of self-grading. Self-grading is the audience's accepted
  convention (same as Anki); building answer-checking would balloon
  scope for negative value.
