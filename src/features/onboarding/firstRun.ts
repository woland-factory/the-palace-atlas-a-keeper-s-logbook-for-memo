// The first-run walkthrough flag. UI-only state, kept in localStorage so it
// never enters the atlas and never exports. Missing or unreadable storage reads
// as "not yet done", which only lets the walkthrough show for a genuinely new
// keeper. A new key so it never collides with the removed sketch-only flag.
const KEY = "palace-atlas:first-run-complete";

export function hasCompletedFirstRun(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstRunComplete(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Ignore storage failures; the walkthrough may simply show again.
  }
}
