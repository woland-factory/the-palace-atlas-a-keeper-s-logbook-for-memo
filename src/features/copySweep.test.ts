import { describe, expect, it } from "vitest";

// The mechanical copy sweep (QUALITY BAR §8). It scans every copy-bearing
// source file for the tells that mark machine-written text: em/en dashes, the
// banned LLM vocabulary, and negative empty-state phrasing. Code comments are
// exempt, so full-line comments are stripped before scanning. Files are pulled
// in as raw text via Vite's import.meta.glob so no filesystem access is needed.
const modules = import.meta.glob(
  [
    "../components/**/*.{ts,tsx}",
    "../routes/**/*.{ts,tsx}",
    "./sample/**/*.{ts,tsx}",
    "./onboarding/**/*.{ts,tsx}",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const BANNED_VOCAB =
  /\b(seamless(ly)?|effortless(ly)?|unlock|elevate|empower|leverage|robust|dive in|in today's fast-paced world|we've got you covered)\b/i;

const NEGATIVE_EMPTY =
  /(you don'?t have|no [a-z]+ yet|nothing[^.]*here|unable to|something went wrong)/i;

// Drop full-line comments (`//`, `/* ... */`, and continuation `*` lines) so
// the sweep judges only strings that reach the user.
function stripComments(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
}

describe("copy sweep over user-visible strings", () => {
  const files = Object.keys(modules).filter(
    (path) => !/\.test\.(ts|tsx)$/.test(path),
  );

  it("scans a non-trivial set of files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    it(`${file} has no em-dash, banned vocab, or negative empty-state copy`, () => {
      const text = stripComments(modules[file]);
      expect(text).not.toMatch(/[—–]/);
      expect(text).not.toMatch(BANNED_VOCAB);
      expect(text).not.toMatch(NEGATIVE_EMPTY);
    });
  }
});
