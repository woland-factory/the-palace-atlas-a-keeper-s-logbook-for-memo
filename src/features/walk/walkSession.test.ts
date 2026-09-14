import { describe, expect, it } from "vitest";
import { assembleCompletedWalk, tallyResults } from "./walkSession";
import { gradeSpot } from "./scheduler";
import { newPalace, newSpot, type Palace } from "../../model/atlas";

const STARTED = new Date("2026-09-14T10:00:00.000Z");
const COMPLETED = new Date("2026-09-14T10:04:00.000Z");

function palaceWithSpots(): Palace {
  const p = newPalace("Childhood home");
  p.spots = [newSpot(100, 100, 0), newSpot(200, 200, 1), newSpot(300, 300, 2)];
  return p;
}

describe("assembleCompletedWalk", () => {
  it("appends exactly one walk with timestamps, id, palaceId and results", () => {
    const palace = palaceWithSpots();
    const results = [
      { spotId: palace.spots[0].id, grade: "sharp" as const },
      { spotId: palace.spots[1].id, grade: "shaky" as const },
      { spotId: palace.spots[2].id, grade: "missed" as const },
    ];
    const next = assembleCompletedWalk(palace, results, STARTED, COMPLETED, "walk-1");

    expect(next.walks).toHaveLength(1);
    const walk = next.walks[0];
    expect(walk.id).toBe("walk-1");
    expect(walk.palaceId).toBe(palace.id);
    expect(walk.startedAt).toBe(STARTED.toISOString());
    expect(walk.completedAt).toBe(COMPLETED.toISOString());
    expect(walk.results).toEqual(results);
  });

  it("advances each graded spot's fsrs via gradeSpot at completedAt", () => {
    const palace = palaceWithSpots();
    const results = [
      { spotId: palace.spots[0].id, grade: "sharp" as const },
      { spotId: palace.spots[1].id, grade: "missed" as const },
    ];
    const next = assembleCompletedWalk(palace, results, STARTED, COMPLETED, "w");

    expect(next.spots[0].fsrs).toEqual(
      gradeSpot(palace.spots[0].fsrs, "sharp", COMPLETED),
    );
    expect(next.spots[1].fsrs).toEqual(
      gradeSpot(palace.spots[1].fsrs, "missed", COMPLETED),
    );
    // The ungraded spot keeps its inert placeholder state.
    expect(next.spots[2].fsrs).toEqual(palace.spots[2].fsrs);
    expect(next.spots[2].fsrs.reps).toBe(0);
  });

  it("does not mutate the input palace", () => {
    const palace = palaceWithSpots();
    const snapshot = JSON.stringify(palace);
    assembleCompletedWalk(
      palace,
      [{ spotId: palace.spots[0].id, grade: "sharp" }],
      STARTED,
      COMPLETED,
      "w",
    );
    expect(JSON.stringify(palace)).toBe(snapshot);
  });

  it("keeps prior walks and appends after them", () => {
    const palace = palaceWithSpots();
    const first = assembleCompletedWalk(
      palace,
      [{ spotId: palace.spots[0].id, grade: "sharp" }],
      STARTED,
      COMPLETED,
      "w1",
    );
    const second = assembleCompletedWalk(
      first,
      [{ spotId: first.spots[0].id, grade: "shaky" }],
      STARTED,
      COMPLETED,
      "w2",
    );
    expect(second.walks.map((w) => w.id)).toEqual(["w1", "w2"]);
  });
});

describe("tallyResults", () => {
  it("counts each grade", () => {
    expect(
      tallyResults([
        { spotId: "a", grade: "sharp" },
        { spotId: "b", grade: "sharp" },
        { spotId: "c", grade: "shaky" },
        { spotId: "d", grade: "missed" },
      ]),
    ).toEqual({ sharp: 2, shaky: 1, missed: 1 });
  });
});
