import { describe, expect, it } from "vitest";
import { buildDemoAtlas, DEMO_PALACE_ID } from "./demoSeed";
import { isSamplePalace, SAMPLE_PALACE_IDS } from "./sample";
import { spotHealth } from "../walk/scheduler";
import { buildExport, serializeAtlas } from "../portability/exportAtlas";
import { validateImport } from "../../model/validate";
import { SCHEMA_VERSION } from "../../model/atlas";

const NOW = new Date("2026-09-15T10:00:00.000Z");

describe("buildDemoAtlas", () => {
  it("builds one clearly labeled sample palace with real walk history", () => {
    const atlas = buildDemoAtlas(NOW);
    expect(atlas.schemaVersion).toBe(SCHEMA_VERSION);
    expect(atlas.exportedAt).toBeNull();
    expect(atlas.palaces).toHaveLength(1);

    const palace = atlas.palaces[0];
    expect(palace.id).toBe(DEMO_PALACE_ID);
    expect(palace.name).toBe("Corner bakery (sample)");
    expect(palace.spots).toHaveLength(8);
    expect(palace.outline?.length).toBeGreaterThan(0);
    // Genuine walks, not hand-written fsrs: four full sessions.
    expect(palace.walks).toHaveLength(4);
    for (const walk of palace.walks) {
      expect(walk.results).toHaveLength(8);
      expect(walk.palaceId).toBe(DEMO_PALACE_ID);
      expect(new Date(walk.completedAt).getTime()).toBeLessThan(NOW.getTime());
    }
    // Every spot carries advanced scheduling state.
    for (const spot of palace.spots) {
      expect(spot.fsrs.reps).toBeGreaterThan(0);
      expect(spot.fsrs.lastReview).toBeTruthy();
    }
  });

  it("spans healthy and failing bands at the seed moment, never one flat band", () => {
    const atlas = buildDemoAtlas(NOW);
    const bands = atlas.palaces[0].spots.map(
      (s) => spotHealth(s.fsrs, NOW).label,
    );
    expect(bands).not.toContain("unwalked");
    expect(bands.some((b) => b === "sharp" || b === "holding")).toBe(true);
    expect(bands.some((b) => b === "fading" || b === "atRisk")).toBe(true);
    expect(new Set(bands).size).toBeGreaterThan(1);
  });

  it("holds the spread on any date, since everything is relative to now", () => {
    const other = new Date("2031-02-03T21:30:00.000Z");
    const bands = buildDemoAtlas(other).palaces[0].spots.map(
      (s) => spotHealth(s.fsrs, other).label,
    );
    expect(bands.some((b) => b === "sharp" || b === "holding")).toBe(true);
    expect(bands.some((b) => b === "fading" || b === "atRisk")).toBe(true);
  });

  it("is deterministic for a fixed now", () => {
    expect(buildDemoAtlas(NOW)).toEqual(buildDemoAtlas(NOW));
  });

  it("round-trips through export and import unchanged", () => {
    const atlas = buildDemoAtlas(NOW);
    const text = serializeAtlas(buildExport(atlas));
    const result = validateImport(text, new Blob([text]).size);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect({ ...result.atlas, exportedAt: null }).toEqual(atlas);
    }
  });
});

describe("isSamplePalace", () => {
  it("recognizes the demo palace and the manual sample palaces", () => {
    expect(isSamplePalace(DEMO_PALACE_ID)).toBe(true);
    for (const id of SAMPLE_PALACE_IDS) expect(isSamplePalace(id)).toBe(true);
    expect(isSamplePalace("some-user-palace")).toBe(false);
  });
});
