import { getSetting, setSetting } from "./settings";

// Each rep's company Google account for recorded calls (like shloimy@thecandidatecollection.com).
// Google only starts recording once someone from our Google Workspace joins, so reps
// join their calls with this account. They keep signing in to the site with their own email.

export async function callAccounts(): Promise<Record<string, string>> {
  return getSetting<Record<string, string>>("call_accounts", {});
}

export async function setCallAccount(staffId: string, email: string) {
  const all = { ...(await callAccounts()) };
  const clean = email.trim().toLowerCase();
  if (clean) all[staffId] = clean;
  else delete all[staffId];
  await setSetting("call_accounts", all);
}

// The Google account a rep joins calls with: their company account if they have one.
export async function callEmailFor(staff: { id: string; email: string }): Promise<string> {
  return (await callAccounts())[staff.id] || staff.email;
}
