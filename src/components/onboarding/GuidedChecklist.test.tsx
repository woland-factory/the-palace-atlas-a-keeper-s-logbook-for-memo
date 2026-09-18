import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidedChecklist } from "./GuidedChecklist";

const STEPS = [
  { text: "Add your first palace.", done: true },
  { text: "Place a spot and name what lives there.", done: false },
  { text: "Walk it and grade each spot.", done: false },
  { text: "See where memory is fading.", done: false },
];

describe("GuidedChecklist", () => {
  it("renders exactly the passed steps as a labeled list", () => {
    render(<GuidedChecklist steps={STEPS} activeIndex={1} onSkip={() => {}} />);
    const region = screen.getByRole("complementary", { name: "Getting started" });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    for (const step of STEPS) {
      expect(region).toHaveTextContent(step.text);
    }
    // No paragraph essay: the content is the list plus Skip, nothing more.
    expect(region.querySelector("p")).toBeNull();
  });

  it("conveys done state with a glyph and text, not color alone", () => {
    render(<GuidedChecklist steps={STEPS} activeIndex={1} onSkip={() => {}} />);
    const items = screen.getAllByRole("listitem");
    // The done row carries the check glyph and the is-done class.
    expect(items[0]).toHaveTextContent("✓");
    expect(items[0].className).toContain("is-done");
    // Not-done rows show their step number instead of the glyph.
    expect(items[1]).toHaveTextContent("2");
    expect(items[1]).not.toHaveTextContent("✓");
  });

  it("emphasizes the active row without relying on hue", () => {
    render(<GuidedChecklist steps={STEPS} activeIndex={1} onSkip={() => {}} />);
    const items = screen.getAllByRole("listitem");
    // A structural, non-color signal marks the active step.
    expect(items[1].className).toContain("is-active");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
  });

  it("shows a Skip button that calls onSkip", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<GuidedChecklist steps={STEPS} activeIndex={1} onSkip={onSkip} />);
    const skip = screen.getByRole("button", { name: "Skip" });
    await user.click(skip);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
