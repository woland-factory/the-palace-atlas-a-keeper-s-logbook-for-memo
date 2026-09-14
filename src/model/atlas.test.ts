import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, newAtlas, newPalace, newSpot } from "./atlas";
import { migrate } from "./migrate";

describe("model factories", () => {
  it("newAtlas is empty and versioned", () => {
    const atlas = newAtlas();
    expect(atlas).toEqual({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: null,
      palaces: [],
    });
  });

  it("newPalace has a uuid id, timestamp, default viewBox and empty lists", () => {
    const p = newPalace("Childhood home");
    expect(p.name).toBe("Childhood home");
    expect(p.id).toMatch(/[0-9a-f-]{36}/);
    expect(Number.isNaN(Date.parse(p.createdAt))).toBe(false);
    expect(p.viewBox).toEqual({ w: 1000, h: 1000 });
    expect(p.spots).toEqual([]);
    expect(p.walks).toEqual([]);
  });

  it("newPalace ids are unique", () => {
    expect(newPalace("a").id).not.toBe(newPalace("b").id);
  });

  it("newSpot is a valid spot with inert fsrs at the given coord and order", () => {
    const s = newSpot(120, 340, 2);
    expect(s.id).toMatch(/[0-9a-f-]{36}/);
    expect(s.x).toBe(120);
    expect(s.y).toBe(340);
    expect(s.order).toBe(2);
    expect(s.label).toBe("");
    expect(s.contents).toBe("");
    expect(s.fsrs).toMatchObject({
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      state: 0,
    });
    expect(Number.isNaN(Date.parse(s.fsrs.due))).toBe(false);
  });
});

describe("migrate", () => {
  it("is identity for a current-version atlas", () => {
    const atlas = newAtlas();
    expect(migrate(atlas)).toEqual(atlas);
  });

  it("rejects an atlas newer than this app", () => {
    const future = { ...newAtlas(), schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => migrate(future)).toThrow();
  });
});
