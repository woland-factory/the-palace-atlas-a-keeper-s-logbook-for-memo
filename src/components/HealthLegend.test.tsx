import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { HealthLegend } from "./HealthLegend";
import { HEALTH_TEXT } from "../features/walk/healthText";

describe("HealthLegend", () => {
  it("renders all five bands with the exact health words", () => {
    const { getByLabelText } = render(<HealthLegend />);
    const legend = getByLabelText("Health key");
    const items = legend.querySelectorAll("[data-health]");
    expect(items).toHaveLength(5);
    for (const band of ["sharp", "holding", "fading", "atRisk", "unwalked"] as const) {
      const item = legend.querySelector(`[data-health="${band}"]`)!;
      expect(item).not.toBeNull();
      expect(within(item as HTMLElement).getByText(HEALTH_TEXT[band])).toBeTruthy();
    }
  });

  it("gives every band a non-color marker treatment", () => {
    const { getByLabelText } = render(<HealthLegend />);
    const legend = getByLabelText("Health key");

    // Every band shows a marker swatch.
    for (const band of ["sharp", "holding", "fading", "atRisk", "unwalked"]) {
      expect(
        legend.querySelector(`[data-health="${band}"] .spot__marker`),
      ).not.toBeNull();
    }

    // Failing bands carry a pattern ring that reads without color:
    // fading is dashed, atRisk is a heavier solid halo.
    const fadingRing = legend.querySelector(
      `[data-health="fading"] .health-ring`,
    )!;
    expect(fadingRing).not.toBeNull();
    expect(fadingRing.getAttribute("stroke-dasharray")).toBeTruthy();

    const atRiskRing = legend.querySelector(
      `[data-health="atRisk"] .health-ring`,
    )!;
    expect(atRiskRing).not.toBeNull();
    expect(atRiskRing.getAttribute("stroke-dasharray")).toBeNull();
    expect(Number(atRiskRing.getAttribute("stroke-width"))).toBeGreaterThan(
      Number(fadingRing.getAttribute("stroke-width")),
    );

    // Healthy and unwalked bands stay ringless: solid or hollow markers.
    for (const band of ["sharp", "holding", "unwalked"]) {
      expect(legend.querySelector(`[data-health="${band}"] .health-ring`)).toBeNull();
    }
  });

  it("carries no inline fixed width that would force overflow at 390px", () => {
    const { getByLabelText } = render(<HealthLegend />);
    const legend = getByLabelText("Health key");
    const widthPinned = Array.from(legend.querySelectorAll<HTMLElement>("*")).filter(
      (el) => /width:\s*\d{3,}px/.test(el.getAttribute("style") ?? ""),
    );
    expect(widthPinned).toEqual([]);
  });
});
