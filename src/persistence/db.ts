import { openDB, type IDBPDatabase } from "idb";
import type { Atlas } from "../model/atlas";

const DB_NAME = "palace-atlas";
const DB_VERSION = 1;
const STORE = "atlas";
export const CURRENT_KEY = "current";

interface AtlasDB {
  atlas: {
    key: string;
    value: Atlas;
  };
}

let dbPromise: Promise<IDBPDatabase<AtlasDB>> | null = null;

function getDB(): Promise<IDBPDatabase<AtlasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AtlasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function getAtlasRecord(): Promise<Atlas | undefined> {
  const db = await getDB();
  return db.get(STORE, CURRENT_KEY);
}

export async function putAtlasRecord(atlas: Atlas): Promise<void> {
  const db = await getDB();
  await db.put(STORE, atlas, CURRENT_KEY);
}
