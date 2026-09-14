// Pure geometry for the sketch surface. No DOM, no React. The component passes
// in the element rect and the current view so every transform, clamp, zoom and
// array operation is testable under jsdom (which never lays out SVG).
import type { Spot, Path } from "../../model/atlas";

export interface Bounds {
  w: number;
  h: number;
}

// A live viewBox over logical space: origin (x, y) and size (w, h).
export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The subset of a DOMRect the transforms need.
export interface ElementRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// Boundary caps (validate here, not only in the UI).
export const MAX_SPOTS = 200;
export const MAX_LABEL = 120;
export const MAX_CONTENTS = 5000;
export const MAX_OUTLINE_POINTS = 2000;

// Zoom bounds: in to about 8x (view width >= w / 8); out to the whole plan plus
// a small margin (never smaller than the plan).
export const MIN_VIEW_DIVISOR = 8;
export const FIT_MARGIN = 1.06;

// Keep at least this fraction of the view overlapping the plan when panning, so
// the plan can never be dragged fully off screen.
const PAN_KEEP = 0.15;

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Client pixel coordinate -> logical coordinate, using a linear map. The surface
// renders with preserveAspectRatio="none" and keeps the view aspect equal to the
// element aspect, so this linear map is exact and markers stay round.
export function clientToLogical(
  clientX: number,
  clientY: number,
  rect: ElementRect,
  view: View,
): Point {
  if (rect.width === 0 || rect.height === 0) {
    return { x: view.x, y: view.y };
  }
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  return { x: view.x + fx * view.w, y: view.y + fy * view.h };
}

export function clampPointToBounds(p: Point, bounds: Bounds): Point {
  return {
    x: clamp(p.x, 0, bounds.w),
    y: clamp(p.y, 0, bounds.h),
  };
}

// The most zoomed-out view: the smallest box of the element's aspect that holds
// the whole plan, times a small margin, centered on the plan.
export function fitView(bounds: Bounds, aspect: number): View {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : bounds.w / bounds.h;
  let vw = bounds.w;
  let vh = bounds.w / a;
  if (vh < bounds.h) {
    vh = bounds.h;
    vw = bounds.h * a;
  }
  vw *= FIT_MARGIN;
  vh *= FIT_MARGIN;
  return {
    x: bounds.w / 2 - vw / 2,
    y: bounds.h / 2 - vh / 2,
    w: vw,
    h: vh,
  };
}

// Clamp a view's zoom (via its width) and pan into the allowed range. Aspect is
// preserved from the element so markers stay round.
export function clampView(view: View, bounds: Bounds, aspect: number): View {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : view.w / view.h;
  const fit = fitView(bounds, a);
  const minW = bounds.w / MIN_VIEW_DIVISOR;
  const maxW = fit.w;
  const w = clamp(view.w, minW, maxW);
  const h = w / a;

  // Pan clamp: keep a slice of the view over the plan on each axis.
  const marginX = Math.min(w, bounds.w) * PAN_KEEP;
  const marginY = Math.min(h, bounds.h) * PAN_KEEP;
  const x = clamp(view.x, -w + marginX, bounds.w - marginX);
  const y = clamp(view.y, -h + marginY, bounds.h - marginY);
  return { x, y, w, h };
}

// Zoom by a factor about a logical focal point, keeping that point under the
// cursor. factor < 1 zooms in, > 1 zooms out (it scales the view size).
export function zoomAtPoint(
  view: View,
  factor: number,
  focal: Point,
  bounds: Bounds,
  aspect: number,
): View {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : view.w / view.h;
  const minW = bounds.w / MIN_VIEW_DIVISOR;
  const maxW = fitView(bounds, a).w;
  const nextW = clamp(view.w * factor, minW, maxW);
  const nextH = nextW / a;
  // Keep the focal point at the same fractional position in the view.
  const fx = view.w === 0 ? 0.5 : (focal.x - view.x) / view.w;
  const fy = view.h === 0 ? 0.5 : (focal.y - view.y) / view.h;
  const next: View = {
    x: focal.x - fx * nextW,
    y: focal.y - fy * nextH,
    w: nextW,
    h: nextH,
  };
  return clampView(next, bounds, a);
}

// Pan by a client-pixel delta, converting to logical units via the view/rect
// scale, then clamp.
export function panByClient(
  view: View,
  dxClient: number,
  dyClient: number,
  rect: ElementRect,
  bounds: Bounds,
  aspect: number,
): View {
  const scaleX = rect.width === 0 ? 1 : view.w / rect.width;
  const scaleY = rect.height === 0 ? 1 : view.h / rect.height;
  const next: View = {
    ...view,
    x: view.x - dxClient * scaleX,
    y: view.y - dyClient * scaleY,
  };
  return clampView(next, bounds, aspect);
}

export function viewBoxString(view: View): string {
  return `${view.x} ${view.y} ${view.w} ${view.h}`;
}

// The connecting path through spots in order, as an SVG path `d`.
export function spotsPathD(spots: Point[]): string {
  if (spots.length === 0) return "";
  return spots
    .map((s, i) => `${i === 0 ? "M" : "L"} ${round(s.x)} ${round(s.y)}`)
    .join(" ");
}

// A rough outline stroke as an SVG path `d`.
export function outlinePathD(points: Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${round(p.x)} ${round(p.y)}`)
    .join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Order operations, always renumbering so spots[i].order === i. ---

export function renumber(spots: Spot[]): Spot[] {
  return spots.map((s, i) => (s.order === i ? s : { ...s, order: i }));
}

export function appendSpot(spots: Spot[], spot: Spot): Spot[] {
  return renumber([...spots, spot]);
}

export function insertSpotAt(spots: Spot[], index: number, spot: Spot): Spot[] {
  const i = clamp(index, 0, spots.length);
  const next = [...spots.slice(0, i), spot, ...spots.slice(i)];
  return renumber(next);
}

export function removeSpotAt(spots: Spot[], index: number): Spot[] {
  if (index < 0 || index >= spots.length) return spots;
  const next = [...spots.slice(0, index), ...spots.slice(index + 1)];
  return renumber(next);
}

export function moveSpot(spots: Spot[], from: number, to: number): Spot[] {
  if (
    from < 0 ||
    from >= spots.length ||
    to < 0 ||
    to >= spots.length ||
    from === to
  ) {
    return spots;
  }
  const next = [...spots];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return renumber(next);
}

export function canAddSpot(count: number): boolean {
  return count < MAX_SPOTS;
}

export function clampLabel(value: string): string {
  return value.length > MAX_LABEL ? value.slice(0, MAX_LABEL) : value;
}

export function clampContents(value: string): string {
  return value.length > MAX_CONTENTS ? value.slice(0, MAX_CONTENTS) : value;
}

// --- Outline sampling: drop points closer than the minimum step, and never let
// the total across all strokes exceed the cap. ---

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Append a sampled point to a stroke in progress. Returns the same array when
// the candidate is too close to the last point or the total cap is reached.
export function appendSampledPoint(
  points: Point[],
  candidate: Point,
  minStep: number,
  totalSoFar: number,
): Point[] {
  if (totalSoFar >= MAX_OUTLINE_POINTS) return points;
  const last = points[points.length - 1];
  if (last && distance(last, candidate) < minStep) return points;
  return [...points, candidate];
}

// Count all points across every stroke of an outline.
export function outlinePointCount(outline: Path[] | undefined): number {
  if (!outline) return 0;
  return outline.reduce((sum, stroke) => sum + stroke.points.length, 0);
}

// The bounding box of a set of points, or null when empty.
export function boundsOf(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// A tight viewBox around a palace's geometry for the thumbnail, padded a little.
// Falls back to the full plan bounds when there is nothing drawn.
export function thumbnailViewBox(points: Point[], bounds: Bounds): string {
  const bb = boundsOf(points);
  if (!bb) return `0 0 ${bounds.w} ${bounds.h}`;
  const padX = Math.max((bb.maxX - bb.minX) * 0.15, bounds.w * 0.04);
  const padY = Math.max((bb.maxY - bb.minY) * 0.15, bounds.h * 0.04);
  const x = bb.minX - padX;
  const y = bb.minY - padY;
  const w = bb.maxX - bb.minX + padX * 2;
  const h = bb.maxY - bb.minY + padY * 2;
  return `${round(x)} ${round(y)} ${round(w)} ${round(h)}`;
}
