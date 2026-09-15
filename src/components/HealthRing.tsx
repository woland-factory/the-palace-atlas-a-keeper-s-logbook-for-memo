import type { HealthLabel } from "../features/walk/scheduler";

// The non-color signal for failing bands, sized relative to the marker it
// wraps: fading wears a dashed ring, atRisk a heavier solid halo. Healthy and
// unwalked bands render nothing extra (solid and hollow markers carry them).
// Color arrives from CSS via the ancestor's data-health; the geometry here
// reads in grayscale on its own.
export function HealthRing({
  label,
  cx,
  cy,
  r,
}: {
  label: HealthLabel;
  cx: number;
  cy: number;
  r: number;
}) {
  if (label === "fading") {
    return (
      <circle
        className="health-ring"
        cx={cx}
        cy={cy}
        r={r * 1.5}
        strokeWidth={r * 0.2}
        strokeDasharray={`${r * 0.45} ${r * 0.35}`}
      />
    );
  }
  if (label === "atRisk") {
    return (
      <circle
        className="health-ring"
        cx={cx}
        cy={cy}
        r={r * 1.5}
        strokeWidth={r * 0.36}
      />
    );
  }
  return null;
}
