import { describe, expect, it } from "vitest";
import { buildExport, exportFileName, serializeAtlas } from "./exportAtlas";
import { SCHEMA_VERSION, newAtlas, newPalace } from "../../model/atlas";

describe("buildExport", () => {
  it("stamps schemaVersion and a valid ISO exportedAt", () => {
    const atlas = { ...newAtlas(), palaces: [newPalace("Home")] };
    const exported = buildExport(atlas);
    expect(exported.schemaVersion).toBe(SCHEMA_VERSION);
    expect(exported.exportedAt).not.toBeNull();
    expect(Number.isNaN(Date.parse(exported.exportedAt as string))).toBe(false);
    expect(exported.palaces).toEqual(atlas.palaces);
  });

  it("deep-clones so the source is untouched", () => {
    const atlas = { ...newAtlas(), palaces: [newPalace("Home")] };
    const exported = buildExport(atlas);
    exported.palaces[0].name = "changed";
    expect(atlas.palaces[0].name).toBe("Home");
  });
});

describe("exportFileName", () => {
  it("uses the export date", () => {
    expect(exportFileName("2026-09-10T12:34:56.789Z")).toBe(
      "palace-atlas-2026-09-10.json",
    );
  });
});

describe("serializeAtlas", () => {
  it("produces pretty-printed JSON", () => {
    const text = serializeAtlas(buildExport(newAtlas()));
    expect(text).toContain("\n");
    expect(JSON.parse(text).schemaVersion).toBe(SCHEMA_VERSION);
  });
});
