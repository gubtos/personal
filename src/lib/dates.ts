/** Days until the next birthday (0 if today). Handles the year wrap. */
export function daysUntilBirthday(iso: string): number | null {
  const [, month, day] = iso.split("-").map(Number);
  if (!month || !day) return null;
  const today = new Date();
  const current = new Date(today.getFullYear(), month - 1, day);
  const next = new Date(today.getFullYear() + 1, month - 1, day);
  const msPerDay = 86_400_000;
  const diff = Math.ceil((current.getTime() - today.getTime()) / msPerDay);
  return diff >= 0 ? diff : Math.ceil((next.getTime() - today.getTime()) / msPerDay);
}
