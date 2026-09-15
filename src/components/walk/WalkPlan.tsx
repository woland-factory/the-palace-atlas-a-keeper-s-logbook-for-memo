import { useMemo } from "react";
import type { Palace } from "../../model/atlas";
import { spotHealth, type HealthLabel } from "../../features/walk/scheduler";
import { HealthRing } from "../HealthRing";
import {
  outlinePathD,
  spotsPathD,
  thumbnailViewBox,
  type Point,
} from "../../features/sketch/geometry";
import { spotAccessibleName } from "../sketch/SketchSurface";

// A read-only plan for the walk. It draws the same geometry as the editor using
// the shared pure helpers, fits the whole plan so every spot is visible at
// 390px, strongly highlights the current spot, and de-emphasizes the rest. It
// has no pointer or edit handlers: nothing here can mutate the atlas.
// During the walk itself the plan stays uncolored, so the keeper is never
// biased about which spots are failing while testing recall. With `showHealth`
// and `now` (the summary payoff) every spot glows by its health band instead.
export function WalkPlan({
  palace,
  activeSpotId,
  showHealth = false,
  now,
}: {
  palace: Palace;
  activeSpotId: string | null;
  showHealth?: boolean;
  now?: Date;
}) {
  const spotPoints: Point[] = palace.spots.map((s) => ({ x: s.x, y: s.y }));
  const outlinePoints: Point[] = (palace.outline ?? []).flatMap((s) => s.points);
  const allPoints = [...outlinePoints, ...spotPoints];
  const viewBox = allPoints.length
    ? thumbnailViewBox(allPoints, palace.viewBox)
    : `0 0 ${palace.viewBox.w} ${palace.viewBox.h}`;
  const vbW = Number(viewBox.split(" ")[2]) || palace.viewBox.w;
  const r = vbW * 0.03;

  const colored = showHealth && !!now;
  const healthById = useMemo(() => {
    const map = new Map<string, HealthLabel>();
    if (!colored || !now) return map;
    for (const s of palace.spots) map.set(s.id, spotHealth(s.fsrs, now).label);
    return map;
  }, [colored, palace.spots, now]);

  const active = palace.spots.find((s) => s.id === activeSpotId);
  const label = active
    ? `Plan of ${palace.name}. Current spot: ${spotAccessibleName(
        active.order,
        active.label,
      )}.`
    : `Plan of ${palace.name}.`;

  return (
    <svg
      className={`walk-plan${colored ? " walk-plan--health" : ""}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {(palace.outline ?? []).map((stroke, i) => (
        <path
          key={i}
          d={outlinePathD(stroke.points)}
          className="walk-plan__outline"
          fill="none"
        />
      ))}
      {spotPoints.length > 1 && (
        <path d={spotsPathD(spotPoints)} className="walk-plan__path" fill="none" />
      )}
      {palace.spots.map((s) => {
        const isActive = s.id === activeSpotId;
        const health = colored ? healthById.get(s.id) : undefined;
        return (
          <g
            key={s.id}
            className={`walk-plan__spot${isActive ? " is-active" : ""}`}
            data-spot-id={s.id}
            data-active={isActive ? "true" : undefined}
            data-health={health}
          >
            {isActive && (
              <circle
                cx={s.x}
                cy={s.y}
                r={r * 1.9}
                className="walk-plan__ring"
                fill="none"
              />
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r={isActive ? r * 1.35 : r}
              className="walk-plan__marker"
            />
            {health && <HealthRing label={health} cx={s.x} cy={s.y} r={r} />}
            <text
              x={s.x}
              y={s.y}
              className="walk-plan__num"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={r * 1.15}
            >
              {s.order + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
