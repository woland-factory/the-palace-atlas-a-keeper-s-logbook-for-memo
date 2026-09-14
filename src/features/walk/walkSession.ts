// Pure, DOM-free walk-progression helpers so the flow is testable without
// rendering. The walk order is `palace.spots` as stored (index === walk order);
// nothing here re-sorts.
import type { Palace, Walk } from "../../model/atlas";
import { gradeSpot, type Grade } from "./scheduler";

export interface WalkResult {
  spotId: string;
  grade: Grade;
}

// Build the single atomic transform applied at walk end: advance every graded
// spot's fsrs at `completedAt` and append exactly one Walk record. Returns a new
// Palace; never mutates the input.
export function assembleCompletedWalk(
  palace: Palace,
  results: WalkResult[],
  startedAt: Date,
  completedAt: Date,
  walkId: string = crypto.randomUUID(),
): Palace {
  const gradeById = new Map(results.map((r) => [r.spotId, r.grade]));
  const spots = palace.spots.map((spot) => {
    const grade = gradeById.get(spot.id);
    if (!grade) return spot;
    return { ...spot, fsrs: gradeSpot(spot.fsrs, grade, completedAt) };
  });
  const walk: Walk = {
    id: walkId,
    palaceId: palace.id,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    results: results.map((r) => ({ spotId: r.spotId, grade: r.grade })),
  };
  return { ...palace, spots, walks: [...palace.walks, walk] };
}

// Tally grades for the end-of-walk summary.
export function tallyResults(results: WalkResult[]): Record<Grade, number> {
  const tally: Record<Grade, number> = { sharp: 0, shaky: 0, missed: 0 };
  for (const r of results) tally[r.grade] += 1;
  return tally;
}
