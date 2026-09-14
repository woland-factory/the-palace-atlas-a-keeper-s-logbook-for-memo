import { describe, expect, it } from "vitest";
import { newSpot, type Spot } from "../../model/atlas";
import {
  MAX_OUTLINE_POINTS,
  MAX_SPOTS,
  appendSampledPoint,
  appendSpot,
  boundsOf,
  canAddSpot,
  clampContents,
  clampLabel,
  clampPointToBounds,
  clampView,
  clientToLogical,
  fitView,
  insertSpotAt,
  moveSpot,
  removeSpotAt,
  renumber,
  spotsPathD,
  thumbnailViewBox,
  zoomAtPoint,
} from "./geometry";

const BOUNDS = { w: 1000, h: 1000 };

function spotAt(x: number, y: number): Spot {
  return newSpot(x, y, 0);
}

describe("clientToLogical", () => {
  it("maps a client pixel to a logical coordinate through the view rect", () => {
    const rect = { left: 0, top: 0, width: 500, height: 500 };
    const view = { x: 0, y: 0, w: 1000, h: 1000 };
    expect(clientToLogical(250, 250, rect, view)).toEqual({ x: 500, y: 500 });
    expect(clientToLogical(0, 0, rect, view)).toEqual({ x: 0, y: 0 });
    expect(clientToLogical(500, 500, rect, view)).toEqual({ x: 1000, y: 1000 });
  });

  it("round-trips with a zoomed, panned view", () => {
    const rect = { left: 20, top: 40, width: 400, height: 400 };
    const view = { x: 100, y: 100, w: 200, h: 200 };
    // center of the rect maps to the center of the view
    const p = clientToLogical(20 + 200, 40 + 200, rect, view);
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(200);
  });
});

describe("clampPointToBounds", () => {
  it("keeps coordinates inside the plan", () => {
    expect(clampPointToBounds({ x: -50, y: 1200 }, BOUNDS)).toEqual({
      x: 0,
      y: 1000,
    });
    expect(clampPointToBounds({ x: 500, y: 500 }, BOUNDS)).toEqual({
      x: 500,
      y: 500,
    });
  });
});

describe("fitView + zoom bounds", () => {
  it("fits the whole plan plus a margin, never smaller than the plan", () => {
    const view = fitView(BOUNDS, 1);
    expect(view.w).toBeGreaterThanOrEqual(BOUNDS.w);
    expect(view.h).toBeGreaterThanOrEqual(BOUNDS.h);
    // centered
    expect(view.x + view.w / 2).toBeCloseTo(BOUNDS.w / 2);
    expect(view.y + view.h / 2).toBeCloseTo(BOUNDS.h / 2);
  });

  it("clamps zoom-in to about 8x and zoom-out to the fit", () => {
    const focal = { x: 500, y: 500 };
    let view = fitView(BOUNDS, 1);
    // Zoom in hard: width can not go below w / 8.
    for (let i = 0; i < 20; i++) {
      view = zoomAtPoint(view, 0.5, focal, BOUNDS, 1);
    }
    expect(view.w).toBeCloseTo(BOUNDS.w / 8);
    // Zoom out hard: width can not exceed the fit width.
    const fit = fitView(BOUNDS, 1);
    for (let i = 0; i < 20; i++) {
      view = zoomAtPoint(view, 2, focal, BOUNDS, 1);
    }
    expect(view.w).toBeCloseTo(fit.w);
  });

  it("keeps the focal point under the cursor when zooming", () => {
    const focal = { x: 250, y: 250 };
    const view = { x: 0, y: 0, w: 1000, h: 1000 };
    const next = zoomAtPoint(view, 0.5, focal, BOUNDS, 1);
    const fxBefore = (focal.x - view.x) / view.w;
    const fxAfter = (focal.x - next.x) / next.w;
    expect(fxAfter).toBeCloseTo(fxBefore);
  });

  it("clampView never lets the plan leave the view entirely", () => {
    const wild = { x: 100000, y: -100000, w: 200, h: 200 };
    const clamped = clampView(wild, BOUNDS, 1);
    // The clamped view still overlaps the plan on both axes.
    expect(clamped.x).toBeLessThan(BOUNDS.w);
    expect(clamped.x + clamped.w).toBeGreaterThan(0);
    expect(clamped.y).toBeLessThan(BOUNDS.h);
    expect(clamped.y + clamped.h).toBeGreaterThan(0);
  });
});

describe("order operations renumber so order === index", () => {
  const base = renumber([
    spotAt(0, 0),
    spotAt(10, 10),
    spotAt(20, 20),
    spotAt(30, 30),
  ]);

  it("renumbers a fresh array", () => {
    base.forEach((s, i) => expect(s.order).toBe(i));
  });

  it("appendSpot puts the new spot last with the right order", () => {
    const next = appendSpot(base, spotAt(40, 40));
    expect(next).toHaveLength(5);
    next.forEach((s, i) => expect(s.order).toBe(i));
    expect(next[4].x).toBe(40);
  });

  it("insertSpotAt inserts and renumbers", () => {
    const next = insertSpotAt(base, 1, spotAt(99, 99));
    expect(next).toHaveLength(5);
    expect(next[1].x).toBe(99);
    next.forEach((s, i) => expect(s.order).toBe(i));
  });

  it("removeSpotAt deletes and renumbers", () => {
    const next = removeSpotAt(base, 1);
    expect(next).toHaveLength(3);
    expect(next.map((s) => s.x)).toEqual([0, 20, 30]);
    next.forEach((s, i) => expect(s.order).toBe(i));
  });

  it("moveSpot reorders and renumbers", () => {
    const next = moveSpot(base, 0, 2);
    expect(next.map((s) => s.x)).toEqual([10, 20, 0, 30]);
    next.forEach((s, i) => expect(s.order).toBe(i));
  });
});

describe("path builder follows spot order", () => {
  it("builds an M/L polyline through spots in order", () => {
    const d = spotsPathD([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 30, y: 5 },
    ]);
    expect(d).toBe("M 0 0 L 10 20 L 30 5");
  });

  it("is empty for no spots", () => {
    expect(spotsPathD([])).toBe("");
  });
});

describe("caps", () => {
  it("canAddSpot stops at the spot cap", () => {
    expect(canAddSpot(0)).toBe(true);
    expect(canAddSpot(MAX_SPOTS - 1)).toBe(true);
    expect(canAddSpot(MAX_SPOTS)).toBe(false);
  });

  it("clampLabel and clampContents cap length", () => {
    expect(clampLabel("a".repeat(200))).toHaveLength(120);
    expect(clampContents("b".repeat(9000))).toHaveLength(5000);
    expect(clampLabel("ok")).toBe("ok");
  });
});

describe("outline sampling", () => {
  it("drops points closer than the minimum step", () => {
    let pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    pts = appendSampledPoint(pts, { x: 1, y: 0 }, 5, pts.length);
    expect(pts).toHaveLength(1); // too close
    pts = appendSampledPoint(pts, { x: 10, y: 0 }, 5, pts.length);
    expect(pts).toHaveLength(2); // far enough
  });

  it("never exceeds the total cap", () => {
    const pts = [{ x: 0, y: 0 }];
    const next = appendSampledPoint(pts, { x: 100, y: 0 }, 5, MAX_OUTLINE_POINTS);
    expect(next).toBe(pts); // cap reached, unchanged
  });
});

describe("thumbnail geometry", () => {
  it("boundsOf returns null for no points and a box otherwise", () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([{ x: 10, y: 20 }, { x: 30, y: 5 }])).toEqual({
      minX: 10,
      minY: 5,
      maxX: 30,
      maxY: 20,
    });
  });

  it("thumbnailViewBox falls back to full bounds when empty", () => {
    expect(thumbnailViewBox([], BOUNDS)).toBe("0 0 1000 1000");
  });

  it("thumbnailViewBox tightens around drawn geometry", () => {
    const vb = thumbnailViewBox(
      [{ x: 400, y: 400 }, { x: 600, y: 600 }],
      BOUNDS,
    );
    const [x, y, w, h] = vb.split(" ").map(Number);
    expect(x).toBeLessThan(400);
    expect(y).toBeLessThan(400);
    expect(w).toBeLessThan(BOUNDS.w);
    expect(h).toBeLessThan(BOUNDS.h);
  });
});
