// "Add to calendar" buttons for any email that carries a calendar file. The .ics
// attachment alone often shows up in Gmail as just a file, so every such email
// also gets one-tap Google Calendar and Outlook buttons. Built from the same file,
// so the buttons and the attachment always match.

const unesc = (s: string) => s.replace(/\\n/g, "\n").replace(/\\([,;\\])/g, "$1");

function field(ics: string, name: string) {
  // Unfold wrapped lines first.
  const flat = ics.replace(/\r?\n[ \t]/g, "");
  const m = flat.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, "m"));
  return m ? unesc(m[1].trim()) : "";
}

const toIso = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;

export function calendarButtons(ics: string): string | null {
  if (/^METHOD:CANCEL/m.test(ics) || /^STATUS:CANCELLED/m.test(ics)) return null;
  const start = field(ics, "DTSTART");
  const end = field(ics, "DTEND");
  if (!/^\d{8}T\d{6}Z$/.test(start) || !/^\d{8}T\d{6}Z$/.test(end)) return null;
  const title = field(ics, "SUMMARY");
  const details = field(ics, "DESCRIPTION");
  const location = field(ics, "LOCATION");
  const google =
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${start}/${end}`, details, ...(location ? { location } : {}) }).toString();
  const outlook =
    "https://outlook.live.com/calendar/0/deeplink/compose?" +
    new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: title, startdt: toIso(start), enddt: toIso(end), body: details, ...(location ? { location } : {}) }).toString();
  const a = (href: string, label: string) =>
    `<a href="${href.replace(/&/g, "&amp;")}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:999px;background:#17213a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">${label}</a>`;
  return `<div style="margin:22px 0 4px"><p style="margin:0 0 10px;font-weight:700">📅 Add it to your calendar</p>${a(google, "Google Calendar")}${a(outlook, "Outlook")}<p style="margin:2px 0 0;font-size:13px;color:#5b6475">iPhone or Apple Calendar: tap the calendar file attached below.</p></div>`;
}
