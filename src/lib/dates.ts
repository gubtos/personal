/** Full age in years from an ISO date (YYYY-MM-DD), accounting for whether the birthday already passed. Defaults to today. */
export function calculateAge(iso: string, at: Date = new Date()): number | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const hadBirthday =
    at.getMonth() + 1 > month ||
    (at.getMonth() + 1 === month && at.getDate() >= day);
  const age = at.getFullYear() - year - (hadBirthday ? 0 : 1);
  return age >= 0 ? age : null;
}

export interface AgeParts {
  years: number;
  months: number;
  days: number;
}

/** Age broken into years, months and days from an ISO date (YYYY-MM-DD) at a reference date. */
export function calculateAgeParts(iso: string, at: Date = new Date()): AgeParts | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;

  let years = at.getFullYear() - year;
  let months = at.getMonth() + 1 - month;
  let days = at.getDate() - day;

  if (days < 0) {
    months -= 1;
    days += new Date(at.getFullYear(), at.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;

  return { years, months, days };
}

/** Formats an age breakdown in Portuguese, e.g. "34 anos, 5 meses, 12 dias". */
export function formatAgeParts(parts: AgeParts): string {
  const years = `${parts.years} ${parts.years === 1 ? "ano" : "anos"}`;
  const months = `${parts.months} ${parts.months === 1 ? "mês" : "meses"}`;
  const days = `${parts.days} ${parts.days === 1 ? "dia" : "dias"}`;
  return `${years}, ${months}, ${days}`;
}

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
