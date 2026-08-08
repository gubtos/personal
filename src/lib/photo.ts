/** Reads a File/Blob and resolves with its base64-encoded content (no `data:` prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.substring(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Builds a displayable `data:` URL from a base64-encoded photo, or undefined if absent. */
export function toDataUrl(
  base64: string | null | undefined,
  mimeType = "image/jpeg",
): string | undefined {
  if (!base64) return undefined;
  return `data:${mimeType};base64,${base64}`;
}
