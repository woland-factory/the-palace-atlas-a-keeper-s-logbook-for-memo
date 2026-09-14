// The guided first-run flag. UI-only state, kept in localStorage so it never
// enters the atlas and never exports. Missing or unreadable storage reads as
// "not yet onboarded", which only shows the skippable guide once.
const KEY = "palace-atlas:sketch-onboarded";

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Ignore storage failures; the guide simply may show again.
  }
}
