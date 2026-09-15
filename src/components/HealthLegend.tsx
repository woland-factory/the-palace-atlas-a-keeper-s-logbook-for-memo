import type { HealthLabel } from "../features/walk/scheduler";
import { HEALTH_TEXT } from "../features/walk/healthText";
import { HealthRing } from "./HealthRing";

const BANDS: HealthLabel[] = ["sharp", "holding", "fading", "atRisk", "unwalked"];

// The key to the heat map: each band's color, its marker treatment, and its
// word. Each swatch reuses the plan's own marker classes, so the legend shows
// exactly what the plan draws and still reads with color removed.
export function HealthLegend() {
  return (
    <ul className="health-legend" aria-label="Health key">
      {BANDS.map((band) => (
        <li key={band} className="health-legend__item" data-health={band}>
          <svg
            className="health-legend__swatch"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <circle className="spot__marker" cx={12} cy={12} r={7} />
            <HealthRing label={band} cx={12} cy={12} r={7} />
          </svg>
          {HEALTH_TEXT[band]}
        </li>
      ))}
    </ul>
  );
}
