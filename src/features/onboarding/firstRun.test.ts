import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasCompletedFirstRun, markFirstRunComplete } from "./firstRun";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("first-run flag", () => {
  it("reads false on a clean store and true after marking complete", () => {
    expect(hasCompletedFirstRun()).toBe(false);
    markFirstRunComplete();
    expect(hasCompletedFirstRun()).toBe(true);
  });

  it("persists under its own key, distinct from the removed sketch flag", () => {
    markFirstRunComplete();
    expect(localStorage.getItem("palace-atlas:first-run-complete")).toBe("1");
    // The old sketch-only key is never written by this module.
    expect(localStorage.getItem("palace-atlas:sketch-onboarded")).toBeNull();
  });

  it("swallows read failures and reports not-done", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => hasCompletedFirstRun()).not.toThrow();
    expect(hasCompletedFirstRun()).toBe(false);
  });

  it("swallows write failures without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(() => markFirstRunComplete()).not.toThrow();
  });
});
