import { useEffect, useRef, type PointerEvent, type WheelEvent, type KeyboardEvent } from "react";
import type { Palace } from "../../model/atlas";
import {
  clampPointToBounds,
  clientToLogical,
  distance,
  fitView,
  outlinePathD,
  panByClient,
  spotsPathD,
  viewBoxString,
  zoomAtPoint,
  type ElementRect,
  type Point,
  type View,
} from "../../features/sketch/geometry";

export function spotAccessibleName(order: number, label: string): string {
  const n = order + 1;
  return label.trim() ? `Spot ${n}, ${label.trim()}` : `Spot ${n}`;
}

const TAP_THRESHOLD = 6; // px of movement below which a pointer is a tap
const NUDGE = 12; // logical units per arrow press
const NUDGE_LARGE = 60; // with Shift
const OUTLINE_MIN_STEP = 12; // logical units between sampled outline points

interface Props {
  palace: Palace;
  view: View;
  onViewChange: (v: View) => void;
  onInitView: (v: View) => void;
  selectedSpotId: string | null;
  onSelectSpot: (id: string) => void;
  onPlaceSpot: (p: Point) => void;
  onNudgeSpot: (id: string, dx: number, dy: number) => void;
  tool: "place" | "outline";
  onDrawStroke: (points: Point[]) => void;
}

export function SketchSurface({
  palace,
  view,
  onViewChange,
  onInitView,
  selectedSpotId,
  onSelectSpot,
  onPlaceSpot,
  onNudgeSpot,
  tool,
  onDrawStroke,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const initialized = useRef(false);
  const bounds = palace.viewBox;

  // Track active pointers for pan/tap/pinch. Drawing accumulates outline points.
  const pointers = useRef<Map<number, Point>>(new Map());
  const drag = useRef<{
    id: number;
    startX: number;
    startY: number;
    startView: View;
    moved: boolean;
    onSpotId: string | null;
    drawing: Point[] | null;
  } | null>(null);
  const pinch = useRef<{ startDist: number; startView: View } | null>(null);

  function rectOf(): ElementRect {
    const el = svgRef.current;
    if (!el) return { left: 0, top: 0, width: 0, height: 0 };
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function aspectOf(): number {
    const r = rectOf();
    return r.height > 0 ? r.width / r.height : bounds.w / bounds.h;
  }

  // Fit the whole plan the first time we know the element's aspect.
  useEffect(() => {
    if (initialized.current) return;
    const r = rectOf();
    if (r.width > 0 && r.height > 0) {
      initialized.current = true;
      onInitView(fitView(bounds, r.width / r.height));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  function spotIdFromTarget(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) return null;
    const g = target.closest("[data-spot-id]");
    return g?.getAttribute("data-spot-id") ?? null;
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinch.current = {
        startDist: distance(pts[0], pts[1]) || 1,
        startView: view,
      };
      drag.current = null;
      return;
    }

    const onSpotId = spotIdFromTarget(e.target);
    const startDrawing =
      tool === "outline" && !onSpotId
        ? [clientToLogical(e.clientX, e.clientY, rectOf(), view)]
        : null;
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startView: view,
      moved: false,
      onSpotId,
      drawing: startDrawing,
    };
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch zoom about the midpoint.
    if (pointers.current.size >= 2 && pinch.current) {
      const pts = [...pointers.current.values()];
      const dist = distance(pts[0], pts[1]) || 1;
      const factor = pinch.current.startDist / dist;
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const focal = clientToLogical(mid.x, mid.y, rectOf(), pinch.current.startView);
      onViewChange(zoomAtPoint(pinch.current.startView, factor, focal, bounds, aspectOf()));
      return;
    }

    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > TAP_THRESHOLD) d.moved = true;

    if (d.drawing) {
      if (!d.moved) return;
      const p = clampPointToBounds(
        clientToLogical(e.clientX, e.clientY, rectOf(), view),
        bounds,
      );
      const last = d.drawing[d.drawing.length - 1];
      if (!last || distance(last, p) >= OUTLINE_MIN_STEP) d.drawing.push(p);
      return;
    }

    if (d.moved && !d.onSpotId) {
      onViewChange(panByClient(d.startView, dx, dy, rectOf(), bounds, aspectOf()));
    }
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;

    if (!d || d.id !== e.pointerId) {
      if (pointers.current.size === 0) drag.current = null;
      return;
    }
    drag.current = null;

    if (d.drawing) {
      if (d.drawing.length >= 2) onDrawStroke(d.drawing);
      return;
    }

    if (!d.moved) {
      if (d.onSpotId) {
        onSelectSpot(d.onSpotId);
      } else if (tool === "place") {
        const p = clampPointToBounds(
          clientToLogical(e.clientX, e.clientY, rectOf(), view),
          bounds,
        );
        onPlaceSpot(p);
      }
    }
  }

  function onWheel(e: WheelEvent<SVGSVGElement>) {
    const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    const focal = clientToLogical(e.clientX, e.clientY, rectOf(), view);
    onViewChange(zoomAtPoint(view, factor, focal, bounds, aspectOf()));
  }

  function onSpotKeyDown(e: KeyboardEvent<SVGGElement>, id: string) {
    const step = e.shiftKey ? NUDGE_LARGE : NUDGE;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        onNudgeSpot(id, 0, -step);
        break;
      case "ArrowDown":
        e.preventDefault();
        onNudgeSpot(id, 0, step);
        break;
      case "ArrowLeft":
        e.preventDefault();
        onNudgeSpot(id, -step, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        onNudgeSpot(id, step, 0);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onSelectSpot(id);
        break;
      default:
        break;
    }
  }

  const spots = palace.spots;
  const r = bounds.w * 0.022;
  const fontSize = r * 1.15;

  return (
    <svg
      ref={svgRef}
      className="sketch-surface__svg"
      viewBox={viewBoxString(view)}
      preserveAspectRatio="none"
      aria-label={`Plan of ${palace.name}`}
      data-tool={tool}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {(palace.outline ?? []).map((stroke, i) => (
        <path
          key={i}
          d={outlinePathD(stroke.points)}
          className="sketch-outline"
          fill="none"
        />
      ))}
      {spots.length > 1 && (
        <path d={spotsPathD(spots)} className="sketch-path" fill="none" />
      )}
      {spots.map((s) => {
        const selected = s.id === selectedSpotId;
        return (
          <g
            key={s.id}
            className={`spot${selected ? " spot--selected" : ""}`}
            data-spot-id={s.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={spotAccessibleName(s.order, s.label)}
            onKeyDown={(e) => onSpotKeyDown(e, s.id)}
          >
            {selected && (
              <circle cx={s.x} cy={s.y} r={r * 1.5} className="spot__ring" fill="none" />
            )}
            <circle cx={s.x} cy={s.y} r={r} className="spot__marker" />
            <text
              x={s.x}
              y={s.y}
              className="spot__num"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
            >
              {s.order + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
