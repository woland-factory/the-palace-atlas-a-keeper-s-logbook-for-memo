import { SCHEMA_VERSION, type Atlas, type Spot } from "../../model/atlas";

// Inert fsrs values so a sample spot is a valid Spot. Scheduling is a later EPIC.
function sampleSpot(
  id: string,
  order: number,
  x: number,
  y: number,
  label: string,
  contents: string,
): Spot {
  return {
    id,
    order,
    x,
    y,
    label,
    contents,
    fsrs: {
      stability: 0,
      difficulty: 0,
      due: "2026-01-04T09:00:00.000Z",
      reps: 0,
      lapses: 0,
      state: 0,
    },
  };
}

// A small, valid atlas so the overview shows real content on demand. One palace
// carries a drawn plan so the thumbnail and editor look alive; the other stays
// sparse. Palace names read plainly as a sample so the UI is honest about it.
const SAMPLE_ATLAS: Atlas = {
  schemaVersion: SCHEMA_VERSION,
  exportedAt: null,
  palaces: [
    {
      id: "sample-childhood-home",
      name: "Childhood home (sample)",
      createdAt: "2026-01-04T09:00:00.000Z",
      viewBox: { w: 1000, h: 1000 },
      outline: [
        {
          points: [
            { x: 180, y: 200 },
            { x: 820, y: 190 },
            { x: 835, y: 470 },
            { x: 815, y: 800 },
            { x: 470, y: 820 },
            { x: 175, y: 810 },
            { x: 190, y: 470 },
            { x: 180, y: 200 },
          ],
        },
      ],
      spots: [
        sampleSpot("spot-front-door", 0, 250, 260, "Front door", "A red kite leans on the frame."),
        sampleSpot("spot-hall-mirror", 1, 470, 300, "Hall mirror", "The number 4 is written in the dust."),
        sampleSpot("spot-kitchen-table", 2, 690, 380, "Kitchen table", "A bowl holds seven lemons."),
        sampleSpot("spot-stairs", 3, 560, 560, "Stairs", "Each step counts up in twos."),
        sampleSpot("spot-bedroom-window", 4, 320, 640, "Bedroom window", "A blue jay taps out a rhythm."),
        sampleSpot("spot-attic-hatch", 5, 640, 720, "Attic hatch", "A brass key turns three times."),
      ],
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
