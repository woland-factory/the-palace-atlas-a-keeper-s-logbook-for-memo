export const SCHEMA_VERSION = 1 as const;

export interface Atlas {
  schemaVersion: number; // === SCHEMA_VERSION for freshly created atlases
  exportedAt: string | null; // ISO string, stamped only at export; null in storage
  palaces: Palace[];
}

export interface Palace {
  id: string; // uuid
  name: string;
  createdAt: string; // ISO
  viewBox: { w: number; h: number }; // logical drawing size; default { w: 1000, h: 1000 }
  outline?: Path[]; // optional room shapes; EPIC 2 writes these
  spots: Spot[]; // ordered; index === walk order; [] in this EPIC
  walks: Walk[]; // append-only history; [] in this EPIC
}

export interface Path {
  points: { x: number; y: number }[];
}

export interface Spot {
  id: string;
  order: number;
  x: number;
  y: number;
  label: string;
  contents: string; // memorized material — PII-sensitive, never logged/sent
  fsrs: {
    stability: number;
    difficulty: number;
    due: string; // ISO
    lastReview?: string; // ISO
    reps: number;
    lapses: number;
    state: number;
  };
}

export interface Walk {
  id: string;
  palaceId: string;
  startedAt: string;
  completedAt: string;
  results: { spotId: string; grade: "missed" | "shaky" | "sharp" }[];
}

function newId(): string {
  return crypto.randomUUID();
}

export function newAtlas(): Atlas {
  return { schemaVersion: SCHEMA_VERSION, exportedAt: null, palaces: [] };
}

export function newPalace(name: string): Palace {
  return {
    id: newId(),
    name,
    createdAt: new Date().toISOString(),
    viewBox: { w: 1000, h: 1000 },
    spots: [],
    walks: [],
  };
}
