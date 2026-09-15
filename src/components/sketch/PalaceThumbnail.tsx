import type { Palace } from "../../model/atlas";
import { spotHealth } from "../../features/walk/scheduler";
import {
  outlinePathD,
  spotsPathD,
  thumbnailViewBox,
  type Point,
} from "../../features/sketch/geometry";

// A cheap, static mini plan of a palace's real geometry. No interactivity, so an
// overview of many palaces stays fast. Decorative: the caller labels it. When
// `now` is given, each spot glows by its health band, so the estate reads at a
// glance.
export function PalaceThumbnail({ palace, now }: { palace: Palace; now?: Date }) {
  const spotPoints: Point[] = palace.spots.map((s) => ({ x: s.x, y: s.y }));
  const outlinePoints: Point[] = (palace.outline ?? []).flatMap((s) => s.points);
  const hasGeometry = spotPoints.length > 0 || outlinePoints.length > 0;

  if (!hasGeometry) {
    return (
      <svg
        className="thumb thumb--empty"
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="18"
          y="18"
          width="64"
          height="64"
          rx="8"
          className="thumb__placeholder"
        />
      </svg>
    );
  }

  const allPoints = [...outlinePoints, ...spotPoints];
  const viewBox = thumbnailViewBox(allPoints, palace.viewBox);
  const vbW = Number(viewBox.split(" ")[2]) || palace.viewBox.w;
  const r = vbW * 0.03;
  const stroke = vbW * 0.006;

  return (
    <svg
      className="thumb"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {(palace.outline ?? []).map((stroke, i) => (
        <path
          key={i}
          d={outlinePathD(stroke.points)}
          className="thumb__outline"
          fill="none"
        />
      ))}
      {spotPoints.length > 1 && (
        <path d={spotsPathD(spotPoints)} className="thumb__path" fill="none" />
      )}
      {palace.spots.map((s) => (
        <g key={s.id} data-health={now ? spotHealth(s.fsrs, now).label : undefined}>
          <circle
            cx={s.x}
            cy={s.y}
            r={r}
            className="thumb__spot"
            strokeWidth={stroke}
          />
        </g>
      ))}
    </svg>
  );
}
