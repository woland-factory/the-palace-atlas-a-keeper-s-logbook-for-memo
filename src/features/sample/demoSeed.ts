// The staging demo palace: one small bakery whose plan glows with a real mix
// of healthy and failing spots the moment a fresh visitor arrives. Nothing is
// hand-written into the fsrs blocks; a fixed set of past walk sessions is
// replayed through the production end-of-walk transform, so the walks and the
// scheduling state are genuine and the whole atlas round-trips. Everything is
// relative to `now`, so the band spread holds on any date.
import { SCHEMA_VERSION, type Atlas, type Palace, type Spot } from "../../model/atlas";
import { assembleCompletedWalk } from "../walk/walkSession";
import type { Grade } from "../walk/scheduler";

export const DEMO_PALACE_ID = "demo-corner-bakery";

const DAY = 24 * 60 * 60 * 1000;

// Days before `now` of each replayed walk, oldest first. The nine-day gap
// since the last walk is what lets the weakest spots decay into the red.
const SESSION_OFFSETS_DAYS = [50, 32, 18, 9];

// One spot per row: position on the plan, its label and contents, and the
// grade it earned in each session. Repeated sharps build lasting stability;
// repeated misses keep it low, so at `now` the spots span the health bands
// even though every spot was last walked on the same day.
const DEMO_SPOTS: {
  x: number;
  y: number;
  label: string;
  contents: string;
  grades: [Grade, Grade, Grade, Grade];
}[] = [
  { x: 260, y: 300, label: "Front counter", contents: "A brass bell rings twice.", grades: ["sharp", "sharp", "sharp", "sharp"] },
  { x: 520, y: 250, label: "Bread racks", contents: "Seven rye loaves in a row.", grades: ["sharp", "sharp", "sharp", "sharp"] },
  { x: 760, y: 300, label: "Coffee machine", contents: "Steam curls into the letter S.", grades: ["sharp", "shaky", "sharp", "shaky"] },
  { x: 780, y: 540, label: "Chalkboard menu", contents: "Today's number is twelve.", grades: ["shaky", "shaky", "missed", "shaky"] },
  { x: 690, y: 760, label: "Window seat", contents: "A grey cat sleeps in the sun.", grades: ["shaky", "shaky", "missed", "shaky"] },
  { x: 450, y: 700, label: "Back kitchen", contents: "Three copper pots hang by size.", grades: ["missed", "shaky", "missed", "missed"] },
  { x: 250, y: 740, label: "Storeroom", contents: "A blue crate holds nine apples.", grades: ["missed", "missed", "missed", "missed"] },
  { x: 210, y: 520, label: "Side door", contents: "The key turns the wrong way once.", grades: ["missed", "missed", "missed", "missed"] },
];

const OUTLINE = [
  {
    points: [
      { x: 150, y: 180 },
      { x: 850, y: 180 },
      { x: 860, y: 560 },
      { x: 840, y: 860 },
      { x: 420, y: 870 },
      { x: 160, y: 850 },
      { x: 150, y: 520 },
      { x: 150, y: 180 },
    ],
  },
];

export function buildDemoAtlas(now: Date): Atlas {
  const firstSession = new Date(
    now.getTime() - SESSION_OFFSETS_DAYS[0] * DAY,
  );
  const createdAt = new Date(firstSession.getTime() - 2 * DAY).toISOString();

  const spots: Spot[] = DEMO_SPOTS.map((s, i) => ({
    id: `demo-spot-${i + 1}`,
    order: i,
    x: s.x,
    y: s.y,
    label: s.label,
    contents: s.contents,
    // Inert placeholder, exactly like a freshly placed spot; the first
    // replayed session gives every spot its real scheduling state.
    fsrs: {
      stability: 0,
      difficulty: 0,
      due: firstSession.toISOString(),
      reps: 0,
      lapses: 0,
      state: 0,
    },
  }));

  let palace: Palace = {
    id: DEMO_PALACE_ID,
    name: "Corner bakery (sample)",
    createdAt,
    viewBox: { w: 1000, h: 1000 },
    outline: OUTLINE,
    spots,
    walks: [],
  };

  SESSION_OFFSETS_DAYS.forEach((days, session) => {
    const completedAt = new Date(now.getTime() - days * DAY);
    const startedAt = new Date(completedAt.getTime() - 7 * 60 * 1000);
    const results = palace.spots.map((spot, i) => ({
      spotId: spot.id,
      grade: DEMO_SPOTS[i].grades[session],
    }));
    palace = assembleCompletedWalk(
      palace,
      results,
      startedAt,
      completedAt,
      `demo-walk-${session + 1}`,
    );
  });

  return { schemaVersion: SCHEMA_VERSION, exportedAt: null, palaces: [palace] };
}
