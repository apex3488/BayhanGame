/**
 * Client-side randomness for PRACTICE rounds only. Real-currency outcomes must be
 * generated on the server (the bot uses secrets.SystemRandom) and never trusted from the client.
 */

export function randomFloat(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] ?? 0) / 4294967296;
}

export function randomInt(maxExclusive: number): number {
  return Math.floor(randomFloat() * maxExclusive);
}

export function weightedPick<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = randomFloat() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error("weightedPick: empty entries");
  return last[0];
}
