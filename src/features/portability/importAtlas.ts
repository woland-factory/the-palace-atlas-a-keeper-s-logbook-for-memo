import { migrate } from "../../model/migrate";
import { MAX_IMPORT_BYTES, type ImportError, validateImport } from "../../model/validate";
import type { Atlas } from "../../model/atlas";

export const IMPORT_ERROR_COPY: Record<ImportError, string> = {
  too_large:
    "That file is over 25 MB. Pick an atlas you exported from this app.",
  not_json:
    "That file is not a readable atlas. Pick an atlas you exported from this app.",
  bad_shape:
    "That file is not a readable atlas. Pick an atlas you exported from this app.",
  bad_version:
    "That atlas comes from a newer version. Update the app, then import again.",
};

export type ImportResult =
  | { ok: true; atlas: Atlas }
  | { ok: false; reason: ImportError; message: string };

// Read a File as text. Uses FileReader so it works both in browsers and in
// the jsdom test environment (which does not implement File.text()).
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

// Read a picked file, validate it before touching storage, and on success
// return the migrated atlas for replaceAtlas. Never throws on bad input.
export async function readAndImport(file: File): Promise<ImportResult> {
  // Check the declared size before reading the body.
  if (file.size > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      reason: "too_large",
      message: IMPORT_ERROR_COPY.too_large,
    };
  }

  let text: string;
  try {
    text = await readFileText(file);
  } catch {
    return {
      ok: false,
      reason: "not_json",
      message: IMPORT_ERROR_COPY.not_json,
    };
  }

  const result = validateImport(text, file.size);
  if (!result.ok) {
    return { ok: false, reason: result.reason, message: IMPORT_ERROR_COPY[result.reason] };
  }

  // Storage always holds exportedAt: null; drop the file's stamp on import.
  const migrated = migrate({ ...result.atlas, exportedAt: null });
  return { ok: true, atlas: migrated };
}
