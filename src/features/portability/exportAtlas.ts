import { SCHEMA_VERSION, type Atlas } from "../../model/atlas";

// Deep-clone the atlas, stamp the current schema version and export time.
export function buildExport(atlas: Atlas): Atlas {
  const clone: Atlas = structuredClone(atlas);
  clone.schemaVersion = SCHEMA_VERSION;
  clone.exportedAt = new Date().toISOString();
  return clone;
}

export function exportFileName(exportedAt: string): string {
  // palace-atlas-YYYY-MM-DD.json
  const date = exportedAt.slice(0, 10);
  return `palace-atlas-${date}.json`;
}

export function serializeAtlas(exported: Atlas): string {
  return JSON.stringify(exported, null, 2);
}

// Build the file and trigger a browser download, then revoke the object URL.
export function downloadAtlas(atlas: Atlas): Atlas {
  const exported = buildExport(atlas);
  const text = serializeAtlas(exported);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(exported.exportedAt ?? new Date().toISOString());
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return exported;
}
