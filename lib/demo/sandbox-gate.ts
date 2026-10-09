/**
 * Lifestyle / city mutations may only touch the in-memory demo sandbox when the
 * active data source is explicitly `demo`. Live (or unavailable) sessions must
 * never credit balances from client-side RNG or catalog prices.
 */
let enabled = false;

export function setDemoSandboxEnabled(value: boolean): void {
  enabled = value;
}

export function isDemoSandboxEnabled(): boolean {
  return enabled;
}

export function assertDemoSandbox(): boolean {
  return enabled;
}
