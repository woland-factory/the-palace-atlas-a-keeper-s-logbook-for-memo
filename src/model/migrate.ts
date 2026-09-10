import { SCHEMA_VERSION, type Atlas } from "./atlas";

// Forward-only migration framework. Each stepper takes an atlas at version N
// and returns it at version N+1. The chain runs in order until the atlas
// reaches SCHEMA_VERSION. For v1 the chain is empty (identity). A future v2
// adds one stepper here without touching any call site.
type Stepper = (raw: Atlas) => Atlas;

const STEPPERS: Record<number, Stepper> = {
  // 1: (atlas) => ({ ...atlas, schemaVersion: 2, /* v1 -> v2 changes */ }),
};

export function migrate(raw: Atlas): Atlas {
  let atlas = raw;
  // Never migrate downward. Callers reject atlases above the current version
  // before this point; this is a defensive guard.
  if (atlas.schemaVersion > SCHEMA_VERSION) {
    throw new Error("Atlas schemaVersion is newer than this app supports.");
  }
  while (atlas.schemaVersion < SCHEMA_VERSION) {
    const step = STEPPERS[atlas.schemaVersion];
    if (!step) {
      throw new Error(
        `No migration step from schemaVersion ${atlas.schemaVersion}.`,
      );
    }
    atlas = step(atlas);
  }
  return atlas;
}
