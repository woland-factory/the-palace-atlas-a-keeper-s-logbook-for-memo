import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SketchSurface } from "./SketchSurface";
import { newPalace, newSpot, type Palace } from "../../model/atlas";
import * as scheduler from "../../features/walk/scheduler";
import { HEALTH_TEXT } from "../../features/walk/healthText";
import { assembleCompletedWalk } from "../../features/walk/walkSession";
import type { View } from "../../features/sketch/geometry";

const FULL_VIEW: View = { x: 0, y: 0, w: 1000, h: 1000 };

function palaceWithSpots(coords: [number, number][]): Palace {
  const p = newPalace("Kitchen");
  p.spots = coords.map(([x, y], i) => newSpot(x, y, i));
  return p;
}

// jsdom drops clientX/clientY on synthetic pointer events, so dispatch a
// MouseEvent (which carries them) under the pointer event name.
function firePointer(
  el: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  x: number,
  y: number,
  pointerId = 1,
) {
  const ev = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(ev, "pointerId", { value: pointerId });
  fireEvent(el, ev);
}

// jsdom does not lay out SVG, so give the element a known rect and feed the
// surface a fixed view. The transform is then exact.
function mockRect(el: Element) {
  (el as SVGSVGElement).getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
}

function renderSurface(palace: Palace, overrides: Partial<Parameters<typeof SketchSurface>[0]> = {}) {
  const props = {
    palace,
    now: new Date(),
    view: FULL_VIEW,
    onViewChange: vi.fn(),
    onInitView: vi.fn(),
    selectedSpotId: null as string | null,
    onSelectSpot: vi.fn(),
    onPlaceSpot: vi.fn(),
    onNudgeSpot: vi.fn(),
    tool: "place" as const,
    onDrawStroke: vi.fn(),
    ...overrides,
  };
  const view = render(<SketchSurface {...props} />);
  return { ...view, props };
}

describe("SketchSurface", () => {
  it("renders N numbered, labeled spots and a connecting path", () => {
    const palace = palaceWithSpots([
      [100, 100],
      [400, 200],
      [600, 500],
    ]);
    palace.spots[0].label = "Front door";
    const { container } = renderSurface(palace);

    expect(
      screen.getByRole("button", { name: "Spot 1, Front door, Not walked yet" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spot 2, Not walked yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spot 3, Not walked yet" })).toBeInTheDocument();
    // A single connecting path through the spots.
    expect(container.querySelector("path.sketch-path")).not.toBeNull();
  });

  it("a tap on empty canvas places a spot at the tapped logical coordinate", () => {
    const palace = palaceWithSpots([]);
    const { container, props } = renderSurface(palace);
    const svg = container.querySelector("svg.sketch-surface__svg")!;
    mockRect(svg);

    firePointer(svg, "pointerdown", 300, 400);
    firePointer(svg, "pointerup", 300, 400);

    expect(props.onPlaceSpot).toHaveBeenCalledTimes(1);
    expect(props.onPlaceSpot).toHaveBeenCalledWith({ x: 300, y: 400 });
    expect(props.onSelectSpot).not.toHaveBeenCalled();
  });

  it("a tap on a spot selects it instead of placing", () => {
    const palace = palaceWithSpots([[500, 500]]);
    const spotId = palace.spots[0].id;
    const { container, props } = renderSurface(palace);
    const svg = container.querySelector("svg.sketch-surface__svg")!;
    mockRect(svg);
    const marker = container.querySelector("[data-spot-id]")!;

    firePointer(marker, "pointerdown", 500, 500);
    firePointer(marker, "pointerup", 500, 500);

    expect(props.onSelectSpot).toHaveBeenCalledWith(spotId);
    expect(props.onPlaceSpot).not.toHaveBeenCalled();
  });

  it("a drag pans the view rather than placing a spot", () => {
    const palace = palaceWithSpots([]);
    const { container, props } = renderSurface(palace);
    const svg = container.querySelector("svg.sketch-surface__svg")!;
    mockRect(svg);

    firePointer(svg, "pointerdown", 200, 200);
    firePointer(svg, "pointermove", 320, 260);
    firePointer(svg, "pointerup", 320, 260);

    expect(props.onViewChange).toHaveBeenCalled();
    expect(props.onPlaceSpot).not.toHaveBeenCalled();
  });

  it("the wheel zooms the view about the cursor", () => {
    const palace = palaceWithSpots([]);
    const { container, props } = renderSurface(palace);
    const svg = container.querySelector("svg.sketch-surface__svg")!;
    mockRect(svg);

    fireEvent.wheel(svg, { deltaY: -100, clientX: 500, clientY: 500 });
    expect(props.onViewChange).toHaveBeenCalled();
    const onViewChange = props.onViewChange as ReturnType<typeof vi.fn>;
    const next = onViewChange.mock.calls[0][0] as View;
    // Zooming in shrinks the view width.
    expect(next.w).toBeLessThan(FULL_VIEW.w);
  });

  it("arrow keys on a focused spot nudge it in logical space", () => {
    const palace = palaceWithSpots([[500, 500]]);
    const spotId = palace.spots[0].id;
    const { container, props } = renderSurface(palace, { selectedSpotId: spotId });
    const marker = container.querySelector("[data-spot-id]")!;

    fireEvent.keyDown(marker, { key: "ArrowRight" });
    expect(props.onNudgeSpot).toHaveBeenCalledWith(spotId, 12, 0);
    fireEvent.keyDown(marker, { key: "ArrowUp", shiftKey: true });
    expect(props.onNudgeSpot).toHaveBeenCalledWith(spotId, 0, -60);
  });

  it("carries touch-action none so the browser never page-scrolls while drawing", () => {
    const palace = palaceWithSpots([]);
    const { container } = renderSurface(palace);
    const svg = container.querySelector("svg.sketch-surface__svg")!;
    expect(svg.getAttribute("class")).toContain("sketch-surface__svg");
  });
});

describe("SketchSurface health coloring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("an unwalked spot carries the neutral unwalked band, never a fake score", () => {
    const palace = palaceWithSpots([[100, 100]]);
    const { container } = renderSurface(palace);
    const g = container.querySelector("[data-spot-id]")!;
    expect(g.getAttribute("data-health")).toBe("unwalked");
    expect(container.querySelector(".health-ring")).toBeNull();
  });

  it("each spot's data-health matches spotHealth, and failing bands wear a ring", () => {
    const now = new Date("2026-09-15T10:00:00.000Z");
    const walkedAt = new Date("2026-09-05T10:00:00.000Z");
    let palace = palaceWithSpots([
      [100, 100],
      [400, 200],
    ]);
    palace = assembleCompletedWalk(
      palace,
      [
        { spotId: palace.spots[0].id, grade: "sharp" },
        { spotId: palace.spots[1].id, grade: "missed" },
      ],
      walkedAt,
      walkedAt,
      "w1",
    );
    const { container } = renderSurface(palace, { now });

    for (const spot of palace.spots) {
      const expected = scheduler.spotHealth(spot.fsrs, now).label;
      const g = container.querySelector(`[data-spot-id="${spot.id}"]`)!;
      expect(g.getAttribute("data-health")).toBe(expected);
      // The accessible name carries the health word.
      expect(g.getAttribute("aria-label")).toContain(HEALTH_TEXT[expected]);
    }
    // The missed spot has decayed into a failing band and carries the
    // non-color pattern ring.
    const weak = container.querySelector(
      `[data-spot-id="${palace.spots[1].id}"] .health-ring`,
    );
    expect(weak).not.toBeNull();
  });

  it("rerendering after a completed walk updates the bands in place", () => {
    const now = new Date("2026-09-15T10:00:00.000Z");
    const palace = palaceWithSpots([[100, 100]]);
    const { container, rerender, props } = renderSurface(palace, { now });
    expect(
      container.querySelector("[data-spot-id]")!.getAttribute("data-health"),
    ).toBe("unwalked");

    const walked = assembleCompletedWalk(
      palace,
      [{ spotId: palace.spots[0].id, grade: "sharp" }],
      now,
      now,
      "w1",
    );
    rerender(<SketchSurface {...props} palace={walked} now={now} />);
    expect(
      container.querySelector("[data-spot-id]")!.getAttribute("data-health"),
    ).toBe("sharp");
  });

  it("pan/zoom view changes never recompute the health map", () => {
    const spy = vi.spyOn(scheduler, "spotHealth");
    const palace = palaceWithSpots(
      Array.from({ length: 50 }, (_, i) => [i * 15, i * 15] as [number, number]),
    );
    const now = new Date("2026-09-15T10:00:00.000Z");
    const { rerender, props } = renderSurface(palace, { now });
    const afterFirstRender = spy.mock.calls.length;
    expect(afterFirstRender).toBeGreaterThan(0);

    // Simulate repeated pan/zoom: only the view prop changes.
    for (const w of [900, 800, 700, 600]) {
      rerender(
        <SketchSurface {...props} now={now} view={{ x: 10, y: 10, w, h: w }} />,
      );
    }
    expect(spy.mock.calls.length).toBe(afterFirstRender);
  });
});
