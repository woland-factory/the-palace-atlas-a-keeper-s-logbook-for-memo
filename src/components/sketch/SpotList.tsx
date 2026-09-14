import type { Spot } from "../../model/atlas";
import { spotHealth } from "../../features/walk/scheduler";
import { HEALTH_TEXT, formatDue } from "../../features/walk/healthText";

interface Props {
  spots: Spot[];
  selectedSpotId: string | null;
  onSelect: (id: string) => void;
  now?: Date;
}

// The ordered list of spots. It is the accessible representation of the walk
// order and the primary keyboard path: selecting an item selects the spot on
// the canvas. Each item also reads its health, so the palace view reflects the
// grades from the last walk. Before any walk every spot reads "Not walked yet".
export function SpotList({ spots, selectedSpotId, onSelect, now }: Props) {
  if (spots.length === 0) return null;
  const at = now ?? new Date();
  return (
    <nav aria-label="Spots in walking order" className="spot-list">
      <ol className="spot-list__items">
        {spots.map((s) => {
          const number = s.order + 1;
          const selected = s.id === selectedSpotId;
          const name = s.label.trim() || `Spot ${number}`;
          const snippet = s.contents.trim().slice(0, 60);
          const health = spotHealth(s.fsrs, at);
          return (
            <li key={s.id}>
              <button
                className={`spot-list__item${selected ? " is-selected" : ""}`}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(s.id)}
              >
                <span className="spot-list__num" aria-hidden="true">
                  {number}
                </span>
                <span className="spot-list__text">
                  <span className="spot-list__name">{name}</span>
                  {snippet && (
                    <span className="spot-list__snippet">{snippet}</span>
                  )}
                  <span
                    className="spot-list__health"
                    data-health={health.label}
                  >
                    {HEALTH_TEXT[health.label]}
                    {health.due ? ` · ${formatDue(health.due)}` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
