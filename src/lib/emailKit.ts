import { legalEntity } from "./agreement";
import { brandName, candidateUrl, contactPhone, siteUrl, teamUrl } from "./format";

// One look for every email: the logo letterhead, the same buttons, and a
// footer that fits who it's for. Bodies use the small helpers below.

export type Audience = "owner" | "candidate" | "team";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const INK = "#17213a";
const GOLD = "#f2b300";
const MUTED = "#5b667e";

const LABEL: Record<Audience, string> = { owner: "For employers", candidate: "For candidates", team: "Team" };

function logo() {
  const name = brandName();
  const i = name.lastIndexOf(" ");
  const words = i > 0 ? `${esc(name.slice(0, i))} <span style="color:#c99600">${esc(name.slice(i + 1))}</span>` : esc(name);
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding:6px 10px 0 0"><div style="width:13px;height:13px;border-radius:4px;background:${GOLD}"></div></td>
<td style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:19px;letter-spacing:-0.3px;color:${INK}">${words}</td>
</tr></table>`;
}

function footer(a: Audience) {
  const phone = esc(contactPhone());
  const line =
    a === "candidate"
      ? `Every person is built for something. We're in your corner.<br>Questions? Text or call ${phone}, or just reply.`
      : a === "owner"
        ? `Questions? Text or call ${phone}, or just reply. A real person answers.<br><a href="${siteUrl()}/candidates" style="color:${MUTED}">Browse candidates</a> · <a href="${siteUrl()}/hiring-help" style="color:${MUTED}">Hiring help</a>`
        : `<a href="${teamUrl()}/admin" style="color:${MUTED}">Back office</a> · <a href="${teamUrl()}/admin/guide" style="color:${MUTED}">Rep guide</a>`;
  return `<p style="margin:0 0 8px">${line}</p><p style="margin:0;font-size:11.5px;color:#8a93a6">${esc(brandName())} is a service of ${esc(legalEntity())}.</p>`;
}

export function layout(body: string, a: Audience = "team") {
  return `<div style="background:#f4f6fa;padding:24px 12px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e3e7ef">
<div style="padding:20px 26px 16px;border-bottom:3px solid ${GOLD}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>${logo()}</td>
<td style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9a7300">${LABEL[a]}</td>
</tr></table>
</div>
<div style="padding:22px 26px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.6;color:${INK}">${body}</div>
<div style="padding:16px 26px 20px;background:#fafbfd;border-top:1px solid #eef1f6;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.55;color:${MUTED}">${footer(a)}</div>
</div></div>`;
}

// ----- Body helpers (all inputs already safe HTML unless noted) -----

export const kit = {
  esc,
  hi: (name: string | null | undefined) => `<p style="margin:0 0 14px">Hi ${esc((name ?? "").split(" ")[0] || "there")},</p>`,
  p: (html: string) => `<p style="margin:0 0 14px">${html}</p>`,
  big: (html: string) => `<p style="margin:4px 0 16px;font-size:19px;font-weight:700">${html}</p>`,
  button: (href: string, label: string) =>
    `<p style="margin:18px 0 20px"><a href="${href}" style="display:inline-block;background:${GOLD};color:${INK};padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:bold;font-size:15px">${esc(label)}</a></p>`,
  quiet: (html: string) => `<p style="margin:0 0 14px;font-size:13.5px;color:${MUTED}">${html}</p>`,
  box: (html: string) => `<div style="margin:6px 0 16px;padding:14px 16px;background:#f4f6fa;border-radius:10px;font-size:14.5px">${html}</div>`,
  quote: (text: string) => `<p style="margin:0 0 14px;padding-left:12px;border-left:3px solid ${GOLD};color:${MUTED};font-style:italic">${esc(text)}</p>`,
  facts: (rows: [string, string | null | undefined][]) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;font-size:14.5px">${rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:${MUTED};vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0">${v}</td></tr>`)
      .join("")}</table>`,
  list: (items: string[]) => `<ul style="margin:0 0 14px;padding-left:20px">${items.map((i) => `<li style="margin:4px 0">${i}</li>`).join("")}</ul>`,
  candidatePage: () => `${candidateUrl()}/me`,
};
