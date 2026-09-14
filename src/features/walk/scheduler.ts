// The one seam over ts-fsrs. Every rating math and every clock read lives here,
// so a future ts-fsrs upgrade or replacement touches this file alone. Each
// exported function takes an explicit `now: Date` so tests are deterministic.
import {
  createEmptyCard,
  fsrs,
  Rating,
  type Card,
  type Grade as FsrsGrade,
} from "ts-fsrs";
import type { Spot } from "../../model/atlas";

export type Grade = "missed" | "shaky" | "sharp";

export type HealthLabel = "unwalked" | "sharp" | "holding" | "fading" | "atRisk";

type SpotFsrs = Spot["fsrs"];

// The only grade->rating mapping in the app. Three grades, three ratings.
// Missed -> Again, Shaky -> Hard, Sharp -> Good. There is no Easy.
const RATING: Record<Grade, FsrsGrade> = {
  missed: Rating.Again,
  shaky: Rating.Hard,
  sharp: Rating.Good,
};

// Retrievability band thresholds. EPIC 4 reuses these exact numbers for the
// color scale so the map's color and this text can never disagree.
export const HEALTH_THRESHOLDS = {
  sharp: 0.9,
  holding: 0.7,
  fading: 0.5,
} as const;

// One scheduler with default (FSRS-6) parameters, shared across calls. It holds
// no per-spot state; every function passes the card in and out explicitly.
const scheduler = fsrs();

// A never-reviewed spot: the inert placeholder `newSpot` writes.
function isFresh(f: SpotFsrs): boolean {
  return f.state === 0 && f.reps === 0;
}

function hasBeenWalked(f: SpotFsrs): boolean {
  return f.reps > 0 && !!f.lastReview;
}

// Rebuild a ts-fsrs card from our stored shape. A fresh spot maps to an empty
// card so the algorithm computes its initial state from scratch.
function toCard(f: SpotFsrs, now: Date): Card {
  if (isFresh(f)) return createEmptyCard(now);
  return {
    due: new Date(f.due),
    stability: f.stability,
    difficulty: f.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: f.reps,
    lapses: f.lapses,
    state: f.state,
    last_review: f.lastReview ? new Date(f.lastReview) : undefined,
  };
}

// Serialize a ts-fsrs card back into our stored shape. `next` always stamps
// last_review to `now`, so a graded card carries a real review date.
function fromCard(card: Card, now: Date): SpotFsrs {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due.toISOString(),
    lastReview: (card.last_review ?? now).toISOString(),
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  };
}

// Apply a grade at `now` and return the advanced state. Pure: never mutates the
// input.
export function gradeSpot(f: SpotFsrs, grade: Grade, now: Date): SpotFsrs {
  const { card } = scheduler.next(toCard(f, now), now, RATING[grade]);
  return fromCard(card, now);
}

// Probability of recall right now in [0, 1], or null when the spot has never
// been reviewed. Never fabricate a number for an unwalked spot.
export function retrievability(f: SpotFsrs, now: Date): number | null {
  if (!hasBeenWalked(f)) return null;
  return scheduler.get_retrievability(toCard(f, now), now, false);
}

// Map a retrievability value (or null) to its text band.
export function bandFor(r: number | null): HealthLabel {
  if (r === null) return "unwalked";
  if (r >= HEALTH_THRESHOLDS.sharp) return "sharp";
  if (r >= HEALTH_THRESHOLDS.holding) return "holding";
  if (r >= HEALTH_THRESHOLDS.fading) return "fading";
  return "atRisk";
}

export interface SpotHealth {
  retrievability: number | null;
  label: HealthLabel;
  due: string | null;
}

export function spotHealth(f: SpotFsrs, now: Date): SpotHealth {
  const r = retrievability(f, now);
  return {
    retrievability: r,
    label: bandFor(r),
    due: hasBeenWalked(f) ? f.due : null,
  };
}
