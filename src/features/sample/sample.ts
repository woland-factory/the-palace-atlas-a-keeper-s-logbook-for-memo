import { SCHEMA_VERSION, type Atlas } from "../../model/atlas";

// A small, valid atlas so the overview shows real content on demand. The heat
// map does not exist yet, so no walk history or glowing spots are needed here.
// Palace names read plainly as a sample so the UI is honest about it.
const SAMPLE_ATLAS: Atlas = {
  schemaVersion: SCHEMA_VERSION,
  exportedAt: null,
  palaces: [
    {
      id: "sample-childhood-home",
      name: "Childhood home (sample)",
      createdAt: "2026-01-04T09:00:00.000Z",
      viewBox: { w: 1000, h: 1000 },
      spots: [],
      walks: [],
    },
    {
      id: "sample-old-library",
      name: "Old library (sample)",
      createdAt: "2026-02-18T14:30:00.000Z",
      viewBox: { w: 1000, h: 1000 },
      spots: [],
      walks: [],
    },
  ],
};

// Palace ids used by the sample, so the UI can label sample content.
export const SAMPLE_PALACE_IDS = SAMPLE_ATLAS.palaces.map((p) => p.id);

export function getSampleAtlas(): Atlas {
  return structuredClone(SAMPLE_ATLAS);
}
