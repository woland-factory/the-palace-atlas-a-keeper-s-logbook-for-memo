import type { Spot } from "../../model/atlas";
import { MAX_CONTENTS, MAX_LABEL } from "../../features/sketch/geometry";

interface Props {
  spot: Spot;
  total: number;
  onChangeLabel: (value: string) => void;
  onChangeContents: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAfter: () => void;
  onRemove: () => void;
}

export function SpotInspector({
  spot,
  total,
  onChangeLabel,
  onChangeContents,
  onMoveUp,
  onMoveDown,
  onAddAfter,
  onRemove,
}: Props) {
  const number = spot.order + 1;
  return (
    <section className="inspector" aria-label={`Spot ${number} details`}>
      <h2 className="inspector__title">Spot {number}</h2>
      <div className="field">
        <label htmlFor="spot-name">Spot name</label>
        <input
          id="spot-name"
          className="input"
          value={spot.label}
          maxLength={MAX_LABEL}
          onChange={(e) => onChangeLabel(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="spot-contents">What lives here</label>
        <textarea
          id="spot-contents"
          className="input inspector__textarea"
          value={spot.contents}
          maxLength={MAX_CONTENTS}
          rows={3}
          placeholder="The blue vase holds the number 7."
          onChange={(e) => onChangeContents(e.target.value)}
        />
      </div>
      <div className="inspector__actions">
        <button
          className="btn btn--secondary"
          onClick={onMoveUp}
          disabled={spot.order === 0}
        >
          Move up
        </button>
        <button
          className="btn btn--secondary"
          onClick={onMoveDown}
          disabled={spot.order >= total - 1}
        >
          Move down
        </button>
        <button className="btn btn--secondary" onClick={onAddAfter}>
          Add spot after this
        </button>
        <button className="btn btn--danger" onClick={onRemove}>
          Remove spot
        </button>
      </div>
    </section>
  );
}
