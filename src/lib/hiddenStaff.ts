import { getSetting, setSetting } from "./settings";

// Team members Heshy has hidden (test accounts). They can still sign in, but
// they don't show on the Reps page, the application form, Move lists or Finance.
const KEY = "hidden_staff";

export async function hiddenStaffIds(): Promise<Set<string>> {
  return new Set(await getSetting<string[]>(KEY, []).catch(() => [] as string[]));
}

export async function setStaffHidden(id: string, hidden: boolean) {
  const now = await hiddenStaffIds();
  if (hidden) now.add(id);
  else now.delete(id);
  await setSetting(KEY, [...now]);
}
