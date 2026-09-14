import { describe, expect, it } from "vitest";
import { buildExport, serializeAtlas } from "./exportAtlas";
import { readAndImport } from "./importAtlas";
import {
  SCHEMA_VERSION,
  newAtlas,
  newPalace,
  newSpot,
  type Atlas,
} from "../../model/atlas";
import { assembleCompletedWalk } from "../walk/walkSession";

// A palace carrying full spot (with fsrs) and walk data, to prove later-EPIC
// state survives a round trip losslessly even though EPIC 1 never creates it.
const richAtlas: Atlas = {
  schemaVersion: SCHEMA_VERSION,
  exportedAt: null,
  palaces: [
    {
      id: "p1",
      name: "Childhood home",
      createdAt: "2026-01-01T00:00:00.000Z",
      viewBox: { w: 1200, h: 800 },
      outline: [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }],
      spots: [
        {
          id: "s1",
          order: 0,
          x: 100,
          y: 200,
          label: "Front door",
          contents: "The number 7",
          fsrs: {
            stability: 3.2,
            difficulty: 5.1,
            due: "2026-09-20T00:00:00.000Z",
            lastReview: "2026-09-01T00:00:00.000Z",
            reps: 4,
            lapses: 1,
            state: 2,
          },
        },
      ],
      walks: [
        {
          id: "w1",
          palaceId: "p1",
          startedAt: "2026-09-01T10:00:00.000Z",
          completedAt: "2026-09-01T10:05:00.000Z",
          results: [{ spotId: "s1", grade: "shaky" }],
        },
      ],
    },
  ],
};

describe("export/import round trip", () => {
  it("preserves palaces including spots, fsrs and walks", async () => {
    const exported = buildExport(richAtlas);
    const text = serializeAtlas(exported);
    const file = new File([text], "palace-atlas.json", {
      type: "application/json",
    });

    const result = await readAndImport(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.atlas.palaces).toEqual(richAtlas.palaces);
    }
  });

  it("preserves a walk produced by the walk engine, with its updated fsrs", async () => {
    const palace = newPalace("Grandmother's flat");
    palace.spots = [newSpot(100, 100, 0), newSpot(200, 200, 1)];
    const walked = assembleCompletedWalk(
      palace,
      [
        { spotId: palace.spots[0].id, grade: "sharp" },
        { spotId: palace.spots[1].id, grade: "missed" },
      ],
      new Date("2026-09-14T10:00:00.000Z"),
      new Date("2026-09-14T10:03:00.000Z"),
      "walk-produced",
    );
    const atlas: Atlas = { ...newAtlas(), palaces: [walked] };

    const text = serializeAtlas(buildExport(atlas));
    const file = new File([text], "palace-atlas.json", {
      type: "application/json",
    });
    const result = await readAndImport(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.atlas.palaces).toEqual(atlas.palaces);
      expect(result.atlas.palaces[0].walks).toHaveLength(1);
      expect(result.atlas.palaces[0].spots[0].fsrs.reps).toBe(1);
    }
  });
});
