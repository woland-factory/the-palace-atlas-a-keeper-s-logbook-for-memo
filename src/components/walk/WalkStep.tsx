import { useEffect, useRef } from "react";
import type { Spot } from "../../model/atlas";
import type { Grade } from "../../features/walk/scheduler";

const GRADES: { grade: Grade; label: string }[] = [
  { grade: "missed", label: "Missed" },
  { grade: "shaky", label: "Shaky" },
  { grade: "sharp", label: "Sharp" },
];

// One step of the walk. Before reveal the only action is Reveal and the contents
// are absent from the DOM. After reveal the filed contents (or a designed empty
// line) show, and the three grade buttons form the single grading action.
export function WalkStep({
  spot,
  revealed,
  onReveal,
  onGrade,
}: {
  spot: Spot;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (grade: Grade) => void;
}) {
  const revealRef = useRef<HTMLButtonElement>(null);
  const firstGradeRef = useRef<HTMLButtonElement>(null);

  // Focus follows the one action: Reveal before, the grade group after. On a new
  // step (revealed resets to false) focus returns to Reveal.
  useEffect(() => {
    if (revealed) firstGradeRef.current?.focus();
    else revealRef.current?.focus();
  }, [revealed, spot.id]);

  const name = spot.label.trim() || `Spot ${spot.order + 1}`;
  const contents = spot.contents.trim();

  return (
    <div className="walk-step">
      <h2 className="walk-step__name">{name}</h2>
      <p className="walk-step__prompt">What lives here?</p>

      {!revealed ? (
        <div className="walk-step__actions">
          <button
            ref={revealRef}
            className="btn btn--primary walk-step__reveal"
            onClick={onReveal}
          >
            Reveal
          </button>
        </div>
      ) : (
        <>
          <div className="walk-step__contents">
            {contents ? (
              <p className="walk-step__text">{contents}</p>
            ) : (
              <p className="walk-step__empty">
                This spot is empty. Fill it in the editor.
              </p>
            )}
          </div>
          <div
            className="walk-step__grades"
            role="group"
            aria-label="Grade your recall"
          >
            {GRADES.map(({ grade, label }, i) => (
              <button
                key={grade}
                ref={i === 0 ? firstGradeRef : undefined}
                className={`btn btn--grade btn--grade-${grade}`}
                onClick={() => onGrade(grade)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
