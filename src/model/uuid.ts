// A UUID v4 generator that works in every context, secure or not.
//
// crypto.randomUUID() exists ONLY in a secure context (https or localhost).
// Staging serves the app over plain HTTP, where randomUUID is undefined and
// calling it throws — which crashed the whole interactive loop (adding a
// palace, adding a spot, completing a walk). crypto.getRandomValues, by
// contrast, is available in insecure contexts too, so we build the id from it
// and only use randomUUID as a fast path when it is genuinely present.
export function uuidv4(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  // Set the version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 256; i++) {
    hex.push((i + 0x100).toString(16).slice(1));
  }
  const h = (i: number) => hex[bytes[i]];
  return (
    h(0) + h(1) + h(2) + h(3) + "-" +
    h(4) + h(5) + "-" +
    h(6) + h(7) + "-" +
    h(8) + h(9) + "-" +
    h(10) + h(11) + h(12) + h(13) + h(14) + h(15)
  );
}
