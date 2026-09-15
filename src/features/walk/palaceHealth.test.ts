import { describe, expect, it } from "vitest";
import { mostAtRisk, palaceHealth, sortByRisk } from "./palaceHealth";
import { formatNextWalk } from "./healthText";
import { assembleCompletedWalk } from "./walkSession";
import { spotHealth, type Grade } from "./scheduler";
import { newPalace, newSpot, type Palace } from "../../model/atlas";

const NOW = new Date("2026-09-01T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY);
}

function palaceWithSpots(name: string, count: number): Palace {
  const p = newPalace(name);
  p.spots = Array.from({ length: count }, (_, i) => newSpot(i * 10, i * 10, i));
  return p;
}

// Walk every spot with one grade at a fixed past moment.
function walkAll(palace: Palace, grade: Grade, at: Date, walkId: string): Palace {
  return assembleCompletedWalk(
    palace,
    palace.spots.map((s) => ({ spotId: s.id, grade })),
    new Date(at.getTime() - 5 * 60 * 1000),
    at,
    walkId,
  );
}

describe("palaceHealth", () => {
  it("reports the honest unwalked state for a palace with spots but no walk", () => {
    const health = palaceHealth(palaceWithSpots("Home", 3), NOW);
    expect(health.overall).toBe("unwalked");
    expect(health.worstRetrievability).toBeNull();
    expect(health.nextDue).toBeNull();
    expect(health.spotCount).toBe(3);
    expect(health.walkedCount).toBe(0);
    expect(health.atRiskCount).toBe(0);
  });

  it("nextDue is the earliest due among walked spots; unwalked spots add none", () => {
    let palace = palaceWithSpots("Home", 3);
    // Walk only the first two spots; the third stays unwalked.
    palace = assembleCompletedWalk(
      palace,
      [
        { spotId: palace.spots[0].id, grade: "sharp" },
        { spotId: palace.spots[1].id, grade: "missed" },
      ],
      daysAgo(10),
      daysAgo(10),
      "w1",
    );
    const health = palaceHealth(palace, NOW);
    expect(health.walkedCount).toBe(2);
    const dues = palace.spots
      .map((s) => spotHealth(s.fsrs, NOW).due)
      .filter((d): d is string => d !== null);
    expect(health.nextDue).toBe([...dues].sort()[0]);
  });

  it("overall is the worst walked spot's band", () => {
    let palace = palaceWithSpots("Home", 2);
    palace = assembleCompletedWalk(
      palace,
      [
        { spotId: palace.spots[0].id, grade: "sharp" },
        { spotId: palace.spots[1].id, grade: "missed" },
      ],
      daysAgo(30),
      daysAgo(30),
      "w1",
    );
    const health = palaceHealth(palace, NOW);
    const bands = palace.spots.map((s) => spotHealth(s.fsrs, NOW));
    const worst = Math.min(...bands.map((b) => b.retrievability as number));
    expect(health.worstRetrievability).toBeCloseTo(worst, 10);
    // 30 days after a missed first review, the weak spot has decayed hard.
    expect(health.overall).toBe("atRisk");
    expect(health.atRiskCount).toBeGreaterThan(0);
  });

  it("a new walk moves nextDue to the new earliest due", () => {
    let palace = palaceWithSpots("Home", 2);
    palace = walkAll(palace, "shaky", daysAgo(20), "w1");
    const before = palaceHealth(palace, NOW);
    palace = walkAll(palace, "sharp", daysAgo(1), "w2");
    const after = palaceHealth(palace, NOW);
    expect(after.nextDue).not.toBe(before.nextDue);
    const dues = palace.spots.map((s) => spotHealth(s.fsrs, NOW).due).sort();
    expect(after.nextDue).toBe(dues[0]);
  });
});

describe("sortByRisk and mostAtRisk", () => {
  it("orders the lowest-retrievability palace first and never-walked ones last by name", () => {
    const strong = walkAll(palaceWithSpots("Strong", 2), "sharp", daysAgo(1), "w1");
    const weak = walkAll(palaceWithSpots("Weak", 2), "missed", daysAgo(30), "w2");
    const zed = palaceWithSpots("Zed unwalked", 1);
    const anna = palaceWithSpots("Anna unwalked", 1);

    const sorted = sortByRisk([strong, zed, weak, anna], NOW);
    expect(sorted.map((p) => p.name)).toEqual([
      "Weak",
      "Strong",
      "Anna unwalked",
      "Zed unwalked",
    ]);
    expect(mostAtRisk([strong, zed, weak, anna], NOW)?.name).toBe("Weak");
  });

  it("mostAtRisk is null when no palace has a walked spot", () => {
    expect(mostAtRisk([palaceWithSpots("A", 2), palaceWithSpots("B", 0)], NOW)).toBeNull();
  });

  it("does not mutate the input order", () => {
    const a = walkAll(palaceWithSpots("A", 1), "missed", daysAgo(30), "w1");
    const b = walkAll(palaceWithSpots("B", 1), "sharp", daysAgo(1), "w2");
    const input = [b, a];
    sortByRisk(input, NOW);
    expect(input.map((p) => p.name)).toEqual(["B", "A"]);
  });
});

describe("formatNextWalk", () => {
  it("reads the unwalked words when there is no due date", () => {
    expect(formatNextWalk(null, NOW)).toBe("Not walked yet");
  });

  it("reads due-now when the earliest due is at or before now", () => {
    expect(formatNextWalk(daysAgo(2).toISOString(), NOW)).toBe("Walk due now");
    expect(formatNextWalk(NOW.toISOString(), NOW)).toBe("Walk due now");
  });

  it("names the date when the walk is ahead", () => {
    const ahead = new Date(NOW.getTime() + 3 * DAY);
    expect(formatNextWalk(ahead.toISOString(), NOW)).toMatch(/^Next walk /);
  });
});
