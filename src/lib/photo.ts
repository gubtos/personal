/** Builds a displayable `data:` URL from a base64-encoded PNG photo, or undefined if absent. */
export function toDataUrl(base64: string | null | undefined): string | undefined {
  if (!base64) return undefined;
  return `data:image/png;base64,${base64}`;
}
