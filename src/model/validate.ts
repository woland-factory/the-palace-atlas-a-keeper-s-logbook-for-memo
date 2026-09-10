import { SCHEMA_VERSION, type Atlas } from "./atlas";

export type ImportError = "too_large" | "not_json" | "bad_shape" | "bad_version";

export type ValidateResult =
  | { ok: true; atlas: Atlas }
  | { ok: false; reason: ImportError };

export const MAX_IMPORT_BYTES = 26_214_400; // 25 MB

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Validate an already-parsed value. Size is checked separately (before read)
// via validateSize, because file.size is available before we read the body.
export function validateAtlas(parsed: unknown): ValidateResult {
  // 3. Shape.
  if (!isObject(parsed) || !Array.isArray(parsed.palaces)) {
    return { ok: false, reason: "bad_shape" };
  }

  // 4. schemaVersion.
  const version = parsed.schemaVersion;
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1 ||
    version > SCHEMA_VERSION
  ) {
    return { ok: false, reason: "bad_version" };
  }

  // 5. Per-palace shape (shallow). Unknown extra fields are preserved.
  for (const palace of parsed.palaces) {
    if (
      !isObject(palace) ||
      typeof palace.id !== "string" ||
      typeof palace.name !== "string" ||
      !Array.isArray(palace.spots) ||
      !Array.isArray(palace.walks)
    ) {
      return { ok: false, reason: "bad_shape" };
    }
  }

  return { ok: true, atlas: parsed as unknown as Atlas };
}

export function validateSize(byteSize: number): ValidateResult | null {
  if (byteSize > MAX_IMPORT_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  return null;
}

// Full pipeline over raw text + declared byte size, in the spec's order.
export function validateImport(text: string, byteSize: number): ValidateResult {
  const sizeError = validateSize(byteSize);
  if (sizeError) return sizeError;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not_json" };
  }

  return validateAtlas(parsed);
}
