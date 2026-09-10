import { beforeEach, describe, expect, it } from "vitest";
import { loadAtlas, saveAtlas } from "./atlasStore";
import { resetDbForTests } from "./db";
import { newAtlas, newPalace, type Atlas } from "../model/atlas";

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
