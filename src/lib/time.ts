// Time-zone helpers with no extra libraries.

export const COMPANY_TZ = "America/New_York";

export const TIME_ZONES: [string, string][] = [
  ["America/New_York", "Eastern (New York)"],
  ["America/Chicago", "Central (Chicago)"],
  ["America/Denver", "Mountain (Denver)"],
  ["America/Los_Angeles", "Pacific (Los Angeles)"],
  ["Asia/Jerusalem", "Israel (Jerusalem)"],
  ["Europe/London", "UK (London)"],
];

export function validTimeZone(tz: string | null | undefined, fallback = COMPANY_TZ) {
  if (!tz) return fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

function parts(ts: number, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(ts));
  const g = (k: string) => p.find((x) => x.type === k)!.value;
  return {
    y: +g("year"),
    m: +g("month"),
    d: +g("day"),
    h: +g("hour"),
    mi: +g("minute"),
    s: +g("second"),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")),
  };
}

function offset(ts: number, tz: string) {
  const p = parts(ts, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - ts;
}

// The UTC instant for a wall-clock time in a given zone.
export function zonedToUtc(y: number, m: number, d: number, minuteOfDay: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
  const o1 = offset(guess, tz);
  let t = guess - o1;
  const o2 = offset(t, tz);
  if (o2 !== o1) t = guess - o2;
  return t;
}

// The calendar dates (in a zone) for today and the next n-1 days.
export function nextDates(n: number, tz: string, from = Date.now()) {
  const today = parts(from, tz);
  const out: { y: number; m: number; d: number; weekday: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = Date.UTC(today.y, today.m - 1, today.d + i, 12);
    const dt = new Date(t);
    out.push({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), weekday: dt.getUTCDay() });
  }
  return out;
}

export function formatInZone(iso: string | number, tz: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: validTimeZone(tz),
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...opts,
  }).format(new Date(iso));
}

export function minutesLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 && h < 24 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
}

export function isPast(iso: string) {
  return Date.parse(iso) < Date.now();
}

// Current time, for server components (keeps render code free of Date.now()).
export function nowMs() {
  return Date.now();
}
