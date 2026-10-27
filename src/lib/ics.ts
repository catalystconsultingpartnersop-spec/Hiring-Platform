// A calendar file (.ics) attached to booking emails, so the call lands in the
// candidate's and rep's calendars with one tap.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function callIcs(opts: {
  uid: string;
  start: string;
  end: string;
  title: string;
  description: string;
  location?: string | null;
  cancelled?: boolean;
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hiring Platform//Onboarding call//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${opts.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(opts.start)}`,
    `DTEND:${stamp(opts.end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    ...(opts.location ? [`LOCATION:${esc(opts.location)}`, `URL:${esc(opts.location)}`] : []),
    `STATUS:${opts.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return Buffer.from(lines.join("\r\n") + "\r\n");
}
