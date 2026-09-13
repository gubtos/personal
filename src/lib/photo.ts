/** Builds a displayable `data:` URL from a base64-encoded JPEG photo, or undefined if absent. */
export function toDataUrl(base64: string | null | undefined): string | undefined {
  if (!base64) return undefined;
  return `data:image/jpeg;base64,${base64}`;
}
