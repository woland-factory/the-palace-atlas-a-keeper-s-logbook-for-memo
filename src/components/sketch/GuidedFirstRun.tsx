interface Props {
  spotCount: number;
  firstSpotNamed: boolean;
  onSkip: () => void;
}

// A skippable guide that walks a new keeper through their first spots. Each step
// is one imperative sentence anchored to a real control, and ticks itself off as
// the keeper acts. It appears only until the first spot is placed and named.
export function GuidedFirstRun({ spotCount, firstSpotNamed, onSkip }: Props) {
  const steps = [
    { text: "Tap the plan to place a spot.", done: spotCount >= 1 },
    { text: "Name it and write what lives there.", done: firstSpotNamed },
    { text: "Add the next spots in walking order.", done: spotCount >= 2 },
  ];
  return (
    <aside className="guide" aria-label="Getting started">
      <ol className="guide__steps">
        {steps.map((step, i) => (
          <li key={i} className={`guide__step${step.done ? " is-done" : ""}`}>
            <span className="guide__check" aria-hidden="true">
              {step.done ? "✓" : i + 1}
            </span>
            {step.text}
          </li>
        ))}
      </ol>
      <button className="btn btn--ghost guide__skip" onClick={onSkip}>
        Skip
      </button>
    </aside>
  );
}
