import { describe, expect, it } from "vitest";
import {
  bandFor,
  gradeSpot,
  retrievability,
  spotHealth,
  HEALTH_THRESHOLDS,
} from "./scheduler";
import { newSpot } from "../../model/atlas";

const NOW = new Date("2026-09-14T00:00:00.000Z");
const LATER = new Date("2026-10-14T00:00:00.000Z");

function freshFsrs() {
  return newSpot(0, 0, 0).fsrs;
}

describe("gradeSpot", () => {
  it("advances a fresh spot for each grade and stamps the review", () => {
    for (const grade of ["missed", "shaky", "sharp"] as const) {
      const next = gradeSpot(freshFsrs(), grade, NOW);
      expect(next.reps).toBe(1);
      expect(next.lastReview).toBe(NOW.toISOString());
      expect(new Date(next.due).getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("orders next intervals Sharp > Shaky > Missed", () => {
    const missed = gradeSpot(freshFsrs(), "missed", NOW);
    const shaky = gradeSpot(freshFsrs(), "shaky", NOW);
    const sharp = gradeSpot(freshFsrs(), "sharp", NOW);
    const due = (f: { due: string }) => new Date(f.due).getTime();
    expect(due(sharp)).toBeGreaterThan(due(shaky));
    expect(due(shaky)).toBeGreaterThan(due(missed));
  });

  it("increments lapses when a review-state spot is missed", () => {
    const reviewState = {
      stability: 10,
      difficulty: 5,
      due: NOW.toISOString(),
      lastReview: "2026-09-01T00:00:00.000Z",
      reps: 3,
      lapses: 0,
      state: 2,
    };
    const next = gradeSpot(reviewState, "missed", NOW);
    expect(next.lapses).toBe(1);
  });

  it("does not mutate its input", () => {
    const input = freshFsrs();
    const snapshot = JSON.stringify(input);
    gradeSpot(input, "sharp", NOW);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("is deterministic for the same input and clock", () => {
    const a = gradeSpot(freshFsrs(), "shaky", NOW);
    const b = gradeSpot(freshFsrs(), "shaky", NOW);
    expect(a).toEqual(b);
  });
});

describe("retrievability", () => {
  it("is null for an unwalked spot", () => {
    expect(retrievability(freshFsrs(), NOW)).toBeNull();
  });

  it("is about 1.0 immediately after a Sharp review, and lower later", () => {
    const graded = gradeSpot(freshFsrs(), "sharp", NOW);
    const rNow = retrievability(graded, NOW);
    const rLater = retrievability(graded, LATER);
    expect(rNow).not.toBeNull();
    expect(rNow!).toBeCloseTo(1, 5);
    expect(rLater!).toBeLessThan(rNow!);
    expect(rLater!).toBeGreaterThanOrEqual(0);
  });
});

describe("bandFor", () => {
  it("maps each band by its threshold", () => {
    expect(bandFor(null)).toBe("unwalked");
    expect(bandFor(1)).toBe("sharp");
    expect(bandFor(HEALTH_THRESHOLDS.sharp)).toBe("sharp");
    expect(bandFor(0.8)).toBe("holding");
    expect(bandFor(HEALTH_THRESHOLDS.holding)).toBe("holding");
    expect(bandFor(0.6)).toBe("fading");
    expect(bandFor(HEALTH_THRESHOLDS.fading)).toBe("fading");
    expect(bandFor(0.49)).toBe("atRisk");
    expect(bandFor(0)).toBe("atRisk");
  });
});

describe("spotHealth", () => {
  it("reports unwalked with no due date before any review", () => {
    const health = spotHealth(freshFsrs(), NOW);
    expect(health.label).toBe("unwalked");
    expect(health.retrievability).toBeNull();
    expect(health.due).toBeNull();
  });

  it("reports a band and a due date after a review", () => {
    const graded = gradeSpot(freshFsrs(), "sharp", NOW);
    const health = spotHealth(graded, NOW);
    expect(health.label).toBe("sharp");
    expect(health.retrievability).toBeCloseTo(1, 5);
    expect(health.due).toBe(graded.due);
  });
});
