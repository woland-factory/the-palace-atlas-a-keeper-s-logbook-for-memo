import { describe, expect, it } from "vitest";
import { MAX_IMPORT_BYTES, validateImport } from "./validate";
import { SCHEMA_VERSION } from "./atlas";

const goodAtlas = {
  schemaVersion: SCHEMA_VERSION,
  exportedAt: "2026-09-10T12:00:00.000Z",
  palaces: [
    { id: "a", name: "Home", createdAt: "x", viewBox: { w: 1000, h: 1000 }, spots: [], walks: [] },
  ],
};

describe("validateImport", () => {
  it("accepts a well-formed atlas", () => {
    const text = JSON.stringify(goodAtlas);
    const result = validateImport(text, text.length);
    expect(result.ok).toBe(true);
  });

  it("rejects a file over the size cap before parsing", () => {
    const result = validateImport("{}", MAX_IMPORT_BYTES + 1);
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects malformed JSON", () => {
    const text = "{ not json";
    expect(validateImport(text, text.length)).toEqual({
      ok: false,
      reason: "not_json",
    });
  });

  it("rejects a non-object body", () => {
    const text = "[1,2,3]";
    expect(validateImport(text, text.length)).toEqual({
      ok: false,
      reason: "bad_shape",
    });
  });

  it("rejects when palaces is not an array", () => {
    const text = JSON.stringify({ schemaVersion: 1, palaces: {} });
    expect(validateImport(text, text.length)).toEqual({
      ok: false,
      reason: "bad_shape",
    });
  });

  it("rejects a missing schemaVersion", () => {
    const text = JSON.stringify({ palaces: [] });
    expect(validateImport(text, text.length)).toEqual({
      ok: false,
      reason: "bad_version",
    });
  });

  it("rejects a schemaVersion newer than this app", () => {
    const text = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, palaces: [] });
    expect(validateImport(text, text.length)).toEqual({
      ok: false,
      reason: "bad_version",
    });
  });

  it("rejects a non-integer schemaVersion", () => {
    const text = JSON.stringify({ schemaVersion: 1.5, palaces: [] });
    expect(validateImport(text, text.length)).toEqual({
      ok: false,
      reason: "bad_version",
    });
  });

  it("rejects a palace missing required fields", () => {
    const text = JSON.stringify({
      schemaVersion: 1,
      palaces: [{ id: "a" }],
    });
    expect(validateImport(text, text.length)).toEqual({
      ok: false,
      reason: "bad_shape",
    });
  });

  it("preserves unknown extra fields on a valid atlas", () => {
    const withExtra = {
      schemaVersion: 1,
      palaces: [
        {
          id: "a",
          name: "Home",
          createdAt: "x",
          viewBox: { w: 1000, h: 1000 },
          spots: [],
          walks: [],
          futureField: { keep: true },
        },
      ],
      topLevelExtra: 42,
    };
    const text = JSON.stringify(withExtra);
    const result = validateImport(text, text.length);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.atlas as unknown as typeof withExtra).topLevelExtra).toBe(42);
      expect(
        (result.atlas.palaces[0] as unknown as { futureField: unknown }).futureField,
      ).toEqual({ keep: true });
    }
  });
});
