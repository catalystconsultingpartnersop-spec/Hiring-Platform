import { legalEntity } from "./agreement";
import { escapeHtml } from "./email";
import { brandName, money, siteUrl } from "./format";

export function receiptNumber(hireId: string) {
  return "R-" + hireId.replace(/-/g, "").slice(-8).toUpperCase();
}

export type ReceiptData = {
  hireId: string;
  paidAt: string;
  amountCents: number;
  company: string;
  ownerName: string;
  ownerEmail: string;
  candidateName: string;
  candidateRef: string;
  paidWith: string;
  agreementSignedAt: string;
  jobTitle?: string;
  startDate?: string;
};

export function dateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "America/New_York" });
}

// Email version of the receipt (inline styles only).
export function receiptEmailHtml(r: ReceiptData) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:7px 0;color:#4a5570;font-size:13.5px;width:44%">${k}</td><td style="padding:7px 0;font-size:14px">${v}</td></tr>`;
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#17213a;max-width:560px;border:1.5px solid #d5dae4;border-radius:12px;overflow:hidden">
<div style="background:#17213a;color:#fff;padding:18px 22px">
<div style="font-size:12px;opacity:.75;letter-spacing:1px;text-transform:uppercase">Receipt</div>
<div style="font-size:22px;font-weight:bold;margin-top:2px">${receiptNumber(r.hireId)}</div>
</div>
<div style="padding:20px 22px">
<div style="font-size:13px;color:#4a5570">Amount paid</div>
<div style="font-size:32px;font-weight:bold;margin:2px 0 4px">${money(r.amountCents)}</div>
<div style="font-size:13.5px;color:#2f6b47;font-weight:bold">Paid ${escapeHtml(dateLong(r.paidAt))}</div>
<table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #d5dae4">
${row("Description", `Placement fee: ${escapeHtml(r.candidateName)} (candidate ${escapeHtml(r.candidateRef)})`)}
${r.jobTitle ? row("Role", escapeHtml(r.jobTitle)) : ""}
${r.startDate ? row("Expected start", escapeHtml(dateLong(r.startDate + "T12:00:00Z"))) : ""}
${row("Billed to", `${escapeHtml(r.company)}<br>${escapeHtml(r.ownerName)}, ${escapeHtml(r.ownerEmail)}`)}
${row("Paid with", escapeHtml(r.paidWith))}
${row("Agreement signed", escapeHtml(dateLong(r.agreementSignedAt)))}
</table>
<p style="margin:18px 0 0"><a href="${siteUrl()}/account/receipts/${r.hireId}" style="color:#17213a;font-weight:bold">View or print this receipt</a></p>
</div>
<div style="background:#eef1f6;padding:12px 22px;font-size:12.5px;color:#4a5570">From ${escapeHtml(legalEntity())}, doing business as ${escapeHtml(brandName())}.</div>
</div>`;
}
