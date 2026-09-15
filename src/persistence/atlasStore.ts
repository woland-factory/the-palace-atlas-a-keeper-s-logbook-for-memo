import { newAtlas, type Atlas } from "../model/atlas";
import { migrate } from "../model/migrate";
import { buildDemoAtlas } from "../features/sample/demoSeed";
import { getAtlasRecord, putAtlasRecord } from "./db";

// Read the single atlas record. A fresh DB yields a new empty atlas WITHOUT
// writing on read. A present record is migrated forward before returning.
export async function loadAtlas(): Promise<Atlas> {
  const record = await getAtlasRecord();
  if (!record) return newAtlas();
  return migrate(record);
}

// The app's initial load. Seeds the demo palace exactly once: only when the
// deployment asks for it AND no atlas record exists yet. A present record,
// even an empty one, always wins, which is why removing the demo is permanent.
// Without the seed flag the fresh-DB path stays read-only.
export async function loadAtlasOrSeedDemo(opts: {
  seedDemo: boolean;
  now: Date;
}): Promise<Atlas> {
  const record = await getAtlasRecord();
  if (record) return migrate(record);
  if (!opts.seedDemo) return newAtlas();
  const atlas = buildDemoAtlas(opts.now);
  await saveAtlas(atlas);
  return atlas;
}

// Write the whole atlas. Storage always holds exportedAt: null; that field
// belongs to an exported file, not to persisted state.
export async function saveAtlas(atlas: Atlas): Promise<void> {
  const toStore: Atlas = { ...atlas, exportedAt: null };
  await putAtlasRecord(toStore);
}
