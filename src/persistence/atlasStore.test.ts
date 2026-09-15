import { beforeEach, describe, expect, it } from "vitest";
import { loadAtlas, loadAtlasOrSeedDemo, saveAtlas } from "./atlasStore";
import { getAtlasRecord, resetDbForTests } from "./db";
import { newAtlas, newPalace, type Atlas } from "../model/atlas";
import { DEMO_PALACE_ID } from "../features/sample/demoSeed";

beforeEach(async () => {
  await resetDbForTests();
});

describe("atlasStore", () => {
  it("returns a fresh empty atlas on an empty DB without writing", async () => {
    const atlas = await loadAtlas();
    expect(atlas.palaces).toEqual([]);
    // A second load still yields empty (read did not persist anything odd).
    expect((await loadAtlas()).palaces).toEqual([]);
  });

  it("round-trips a saved atlas through IndexedDB", async () => {
    const atlas: Atlas = { ...newAtlas(), palaces: [newPalace("Home")] };
    await saveAtlas(atlas);
    const loaded = await loadAtlas();
    expect(loaded.palaces).toEqual(atlas.palaces);
  });

  it("always stores exportedAt as null", async () => {
    const atlas: Atlas = { ...newAtlas(), exportedAt: "2026-01-01T00:00:00.000Z" };
    await saveAtlas(atlas);
    expect((await loadAtlas()).exportedAt).toBeNull();
  });
});

describe("loadAtlasOrSeedDemo", () => {
  const NOW = new Date("2026-09-15T10:00:00.000Z");

  it("seeds and persists the demo once on an empty DB when asked", async () => {
    const atlas = await loadAtlasOrSeedDemo({ seedDemo: true, now: NOW });
    expect(atlas.palaces.map((p) => p.id)).toEqual([DEMO_PALACE_ID]);
    expect(atlas.palaces[0].walks.length).toBeGreaterThan(0);
    // The seed is durable: a plain load sees it too.
    expect((await loadAtlas()).palaces.map((p) => p.id)).toEqual([DEMO_PALACE_ID]);
  });

  it("never seeds over a present record, even an empty one", async () => {
    // The keeper removed the sample: an empty atlas record exists.
    await saveAtlas(newAtlas());
    const atlas = await loadAtlasOrSeedDemo({ seedDemo: true, now: NOW });
    expect(atlas.palaces).toEqual([]);
    expect((await loadAtlas()).palaces).toEqual([]);
  });

  it("keeps the keeper's own data untouched when a record exists", async () => {
    await saveAtlas({ ...newAtlas(), palaces: [newPalace("Mine")] });
    const atlas = await loadAtlasOrSeedDemo({ seedDemo: true, now: NOW });
    expect(atlas.palaces.map((p) => p.name)).toEqual(["Mine"]);
  });

  it("writes nothing on an empty DB when the seed flag is off", async () => {
    const atlas = await loadAtlasOrSeedDemo({ seedDemo: false, now: NOW });
    expect(atlas.palaces).toEqual([]);
    expect(await getAtlasRecord()).toBeUndefined();
  });
});
