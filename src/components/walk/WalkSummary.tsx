import { Link } from "react-router-dom";
import type { Palace } from "../../model/atlas";
import { spotHealth } from "../../features/walk/scheduler";
import { HEALTH_TEXT, formatDue } from "../../features/walk/healthText";
import { tallyResults, type WalkResult } from "../../features/walk/walkSession";

// The end-of-walk summary: a grade tally and each spot's now-updated health, so
// the keeper sees the palace view reflect the walk they just finished.
export function WalkSummary({
  palace,
  results,
  now,
}: {
  palace: Palace;
  results: WalkResult[];
  now: Date;
}) {
  const tally = tallyResults(results);

  return (
    <div className="walk-summary">
      <h1 className="walk-summary__heading">Walk done.</h1>
      <p className="walk-summary__tally">
        Sharp {tally.sharp} · Shaky {tally.shaky} · Missed {tally.missed}
      </p>

      <ul className="walk-summary__spots">
        {palace.spots.map((s) => {
          const health = spotHealth(s.fsrs, now);
          const name = s.label.trim() || `Spot ${s.order + 1}`;
          return (
            <li key={s.id} className="walk-summary__spot">
              <span className="walk-summary__spot-name">
                {s.order + 1}. {name}
              </span>
              <span
                className="walk-summary__spot-health"
                data-health={health.label}
              >
                {HEALTH_TEXT[health.label]}
                {health.due ? ` · ${formatDue(health.due)}` : ""}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="walk-summary__actions">
        <Link className="btn btn--primary" to={`/palace/${palace.id}`}>
          Back to the plan
        </Link>
      </div>
    </div>
  );
}
