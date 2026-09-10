import { describe, expect, it } from "vitest";
import { IMPORT_ERROR_COPY, readAndImport } from "./importAtlas";
import { MAX_IMPORT_BYTES } from "../../model/validate";
import { SCHEMA_VERSION } from "../../model/atlas";

function jsonFile(body: string): File {
  return new File([body], "atlas.json", { type: "application/json" });
}

describe("readAndImport", () => {
  it("imports a valid atlas and drops the file's exportedAt", async () => {
    const body = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-09-10T12:00:00.000Z",
      palaces: [
        { id: "a", name: "Home", createdAt: "x", viewBox: { w: 1000, h: 1000 }, spots: [], walks: [] },
      ],
    });
    const result = await readAndImport(jsonFile(body));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.atlas.exportedAt).toBeNull();
      expect(result.atlas.palaces).toHaveLength(1);
    }
  });

  it("rejects malformed JSON with a friendly message", async () => {
    const result = await readAndImport(jsonFile("{ not json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_json");
      expect(result.message).toBe(IMPORT_ERROR_COPY.not_json);
    }
  });

  it("rejects a newer schemaVersion", async () => {
    const body = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, palaces: [] });
    const result = await readAndImport(jsonFile(body));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_version");
  });

  it("rejects an oversize file by declared size", async () => {
    // Small body, but pretend the file is huge via a stubbed size.
    const file = jsonFile("{}");
    Object.defineProperty(file, "size", { value: MAX_IMPORT_BYTES + 1 });
    const result = await readAndImport(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too_large");
  });
});
