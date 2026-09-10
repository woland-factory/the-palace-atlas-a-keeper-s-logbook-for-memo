import { newAtlas, type Atlas } from "../model/atlas";
import { migrate } from "../model/migrate";
import { getAtlasRecord, putAtlasRecord } from "./db";

// Read the single atlas record. A fresh DB yields a new empty atlas WITHOUT
// writing on read. A present record is migrated forward before returning.
export async function loadAtlas(): Promise<Atlas> {
  const record = await getAtlasRecord();
  if (!record) return newAtlas();
  return migrate(record);
}

// Write the whole atlas. Storage always holds exportedAt: null; that field
// belongs to an exported file, not to persisted state.
export async function saveAtlas(atlas: Atlas): Promise<void> {
  const toStore: Atlas = { ...atlas, exportedAt: null };
  await putAtlasRecord(toStore);
}
