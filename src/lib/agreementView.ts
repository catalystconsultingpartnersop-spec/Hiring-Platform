import { escapeHtml } from "./email";

// Turns the stored agreement text into blocks so it can be shown nicely on
// the site and in email. Works for every version ever signed: anything that
// isn't recognised is shown as a plain paragraph.
export type Block =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "heading"; num: string; text: string }
  | { kind: "clause"; num: string; text: string }
  | { kind: "item"; num: string; text: string }
  | { kind: "para"; text: string };

const HEADING = /^(\d+)\.\s+([A-Z][A-Z0-9 ,&'’-]+)$/;
const CLAUSE = /^(\d+\.\d+)\s+(.*)$/;
const ITEM = /^\s*\(([a-z])\)\s+(.*)$/;

export function agreementBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const out: Block[] = [];
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) return;
    if (i === 0) return out.push({ kind: "title", text: titleCase(line.trim()) });
    if (i === 1 && /^Candidate\b/i.test(line.trim())) return out.push({ kind: "subtitle", text: line.trim() });
    let m = line.match(HEADING);
    if (m) return out.push({ kind: "heading", num: m[1], text: titleCase(m[2]) });
    m = line.match(ITEM);
    if (m) return out.push({ kind: "item", num: m[1], text: m[2] });
    m = line.match(CLAUSE);
    if (m) return out.push({ kind: "clause", num: m[1], text: m[2] });
    out.push({ kind: "para", text: line.trim() });
  });
  return out;
}

function titleCase(s: string) {
  if (s !== s.toUpperCase()) return s;
  const small = new Set(["and", "of", "or", "the", "a", "to", "for"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export type SignatureInfo = { name: string; company: string; email?: string; signedAt: string; ip?: string | null; version?: string };

// The same agreement as email-safe HTML (inline styles only).
export function agreementEmailHtml(text: string, sig?: SignatureInfo) {
  const body = agreementBlocks(text)
    .map((b) => {
      switch (b.kind) {
        case "title":
          return `<h1 style="font-size:20px;margin:0 0 4px;color:#17213a">${escapeHtml(b.text)}</h1>`;
        case "subtitle":
          return `<p style="margin:0 0 18px;color:#4a5570;font-size:14px">${escapeHtml(b.text)}</p>`;
        case "heading":
          return `<h2 style="font-size:15px;margin:20px 0 6px;color:#17213a">${b.num}. ${escapeHtml(b.text)}</h2>`;
        case "clause":
          return `<p style="margin:6px 0;line-height:1.55"><strong>${b.num}</strong>&nbsp; ${escapeHtml(b.text)}</p>`;
        case "item":
          return `<p style="margin:4px 0 4px 22px;line-height:1.55">(${b.num})&nbsp; ${escapeHtml(b.text)}</p>`;
        default:
          return `<p style="margin:6px 0;line-height:1.55">${escapeHtml(b.text)}</p>`;
      }
    })
    .join("\n");
  const signed = sig
    ? `<div style="margin-top:24px;padding:14px 16px;border:1.5px solid #d5dae4;border-radius:10px">
<p style="margin:0;font-size:12px;color:#4a5570;text-transform:uppercase;letter-spacing:.06em">Signed electronically</p>
<p style="margin:6px 0 0;font-size:18px;font-family:Georgia,serif;font-style:italic">${escapeHtml(sig.name)}</p>
<p style="margin:4px 0 0;font-size:13px;color:#4a5570">For ${escapeHtml(sig.company)}${sig.email ? `, ${escapeHtml(sig.email)}` : ""}<br>${escapeHtml(formatSigned(sig.signedAt))}${sig.ip ? `, from ${escapeHtml(sig.ip)}` : ""}</p>
</div>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#17213a;font-size:14.5px;max-width:640px;background:#ffffff;border:1.5px solid #d5dae4;border-radius:12px;padding:24px 26px">${body}${signed}</div>`;
}

export function formatSigned(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/New_York",
  }) + " ET";
}
