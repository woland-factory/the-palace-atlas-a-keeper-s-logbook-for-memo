import type { Palace } from "../../model/atlas";
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
// has no pointer or edit handlers: nothing here can mutate the atlas. It does
// NOT color spots by health; that is EPIC 4.
export function WalkPlan({
  palace,
  activeSpotId,
}: {
  palace: Palace;
  activeSpotId: string | null;
}) {
  const spotPoints: Point[] = palace.spots.map((s) => ({ x: s.x, y: s.y }));
  const outlinePoints: Point[] = (palace.outline ?? []).flatMap((s) => s.points);
  const allPoints = [...outlinePoints, ...spotPoints];
  const viewBox = allPoints.length
    ? thumbnailViewBox(allPoints, palace.viewBox)
    : `0 0 ${palace.viewBox.w} ${palace.viewBox.h}`;
  const vbW = Number(viewBox.split(" ")[2]) || palace.viewBox.w;
  const r = vbW * 0.03;

  const active = palace.spots.find((s) => s.id === activeSpotId);
  const label = active
    ? `Plan of ${palace.name}. Current spot: ${spotAccessibleName(
        active.order,
        active.label,
      )}.`
    : `Plan of ${palace.name}.`;

  return (
    <svg
      className="walk-plan"
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
        return (
          <g
            key={s.id}
            className={`walk-plan__spot${isActive ? " is-active" : ""}`}
            data-spot-id={s.id}
            data-active={isActive ? "true" : undefined}
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
