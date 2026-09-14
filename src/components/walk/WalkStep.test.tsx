import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalkStep } from "./WalkStep";
import { newSpot, type Spot } from "../../model/atlas";

function spotWith(label: string, contents: string): Spot {
  return { ...newSpot(0, 0, 0), label, contents };
}

describe("WalkStep", () => {
  it("hides contents until Reveal, then shows them with three grade buttons", async () => {
    const user = userEvent.setup();
    const spot = spotWith("Front door", "A red kite leans on the frame.");
    const onGrade = vi.fn();
    const { rerender } = render(
      <WalkStep spot={spot} revealed={false} onReveal={() => {}} onGrade={onGrade} />,
    );

    // Before reveal: contents absent, only action is Reveal.
    expect(screen.queryByText("A red kite leans on the frame.")).toBeNull();
    expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sharp" })).toBeNull();

    // After reveal: contents and the three labeled grade buttons.
    rerender(
      <WalkStep spot={spot} revealed onReveal={() => {}} onGrade={onGrade} />,
    );
    expect(screen.getByText("A red kite leans on the frame.")).toBeInTheDocument();
    for (const name of ["Missed", "Shaky", "Sharp"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "Shaky" }));
    expect(onGrade).toHaveBeenCalledWith("shaky");
  });

  it("shows the designed empty line when a revealed spot has no contents", () => {
    render(
      <WalkStep
        spot={spotWith("Attic", "")}
        revealed
        onReveal={() => {}}
        onGrade={() => {}}
      />,
    );
    expect(
      screen.getByText("This spot is empty. Fill it in the editor."),
    ).toBeInTheDocument();
  });

  it("prompts recall with the spot name", () => {
    render(
      <WalkStep
        spot={spotWith("Front door", "x")}
        revealed={false}
        onReveal={() => {}}
        onGrade={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { name: "Front door" })).toBeInTheDocument();
    expect(screen.getByText("What lives here?")).toBeInTheDocument();
  });
});
