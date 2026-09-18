interface Props {
  steps: { text: string; done: boolean }[];
  activeIndex: number; // which step is the next action; emphasized non-color
  onSkip: () => void;
}

// A compact, non-blocking checklist that leads a new keeper through the core
// loop. Each step shows a check glyph when done and its number otherwise, so
// done state survives with color removed. The active step is emphasized by
// weight and marker, never by hue alone. A single Skip button is always here.
export function GuidedChecklist({ steps, activeIndex, onSkip }: Props) {
  return (
    <aside className="guide" aria-label="Getting started">
      <ol className="guide__steps">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          return (
            <li
              key={i}
              className={`guide__step${step.done ? " is-done" : ""}${
                isActive ? " is-active" : ""
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="guide__check" aria-hidden="true">
                {step.done ? "✓" : i + 1}
              </span>
              {step.text}
            </li>
          );
        })}
      </ol>
      <button className="btn btn--ghost guide__skip" onClick={onSkip}>
        Skip
      </button>
    </aside>
  );
}
