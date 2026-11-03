import { lowerRole } from "./format";
import { ROLE_LIST } from "./writingHelp";

// Reps sometimes type a role by hand ("Account Manager", "Accounting, Bookkeeping",
// "Ideal office manager of 5-10 employees"). Owners should see one tidy list, so
// each typed role is matched to our standard roles where we can.

const KEYWORDS: [RegExp, string][] = [
  [/account manag/i, "Account management"],
  [/office manag/i, "Office manager"],
  [/bookkeep/i, "Bookkeeping"],
  [/accounting|accountant|\bcpa\b/i, "Accounting"],
  [/payroll/i, "Payroll"],
  [/executive assist|\bea\b|personal assist/i, "Executive assistant"],
  [/admin|reception|secretar/i, "Administrative"],
  [/customer (service|support|success)/i, "Customer service"],
  [/sales support|inside sales/i, "Sales support"],
  [/\bsales\b|business develop/i, "Sales"],
  [/\bhr\b|human resources|recruit/i, "HR and recruiting"],
  [/project manag|program manag/i, "Project management"],
  [/operations|\bops\b/i, "Operations"],
  [/\bit\b|programm|developer|software|tech support|helpdesk/i, "IT and tech support"],
  [/social media/i, "Social media"],
  [/graphic|designer/i, "Graphic design"],
  [/marketing/i, "Marketing"],
  [/dispatch|logistic/i, "Dispatch and logistics"],
  [/property manag/i, "Property management"],
  [/estimat/i, "Estimating"],
  [/purchas|procure/i, "Purchasing"],
];

const exact = (s: string) => ROLE_LIST.find((r) => r.toLowerCase() === s.trim().toLowerCase());

export function canonicalRoles(raw: string | null | undefined): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  const whole = exact(s);
  if (whole) return [whole];
  return s
    .split(/\s*,\s*|\s*;\s*/)
    .filter(Boolean)
    .map((part) => exact(part) ?? KEYWORDS.find(([re]) => re.test(part))?.[1] ?? part.charAt(0).toUpperCase() + part.slice(1));
}

// The candidate's main role plus extra roles, tidied and without repeats.
export function tidyRoles<T extends { role_category: string | null; also_roles?: string[] }>(c: T): T {
  const main = canonicalRoles(c.role_category);
  const also = (c.also_roles ?? []).flatMap(canonicalRoles);
  const all = [...new Set([...main, ...also])];
  return { ...c, role_category: all[0] ?? null, also_roles: all.slice(1) };
}

// "Gets it done right for ideal office manager of 5-10 employees roles"
//   → "Gets it done right for office manager roles"
export function tidyHeadline(h: string | null): string | null {
  if (!h) return h;
  return h.replace(/ for (.+) roles$/i, (_m, r: string) => {
    const roles = canonicalRoles(r).map(lowerRole);
    if (!roles.length) return _m;
    return ` for ${roles.length > 1 ? `${roles.slice(0, -1).join(", ")} and ${roles[roles.length - 1]}` : roles[0]} roles`;
  });
}
