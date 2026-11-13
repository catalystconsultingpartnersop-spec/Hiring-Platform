import { redirect } from "next/navigation";

// "Our story" is being rewritten. Until it's ready, anyone who opens an old link
// lands on How it works, keeping "?r=" so the rep who sent it is still credited.
export default async function Why({ searchParams }: PageProps<"/why">) {
  const r = String((await searchParams).r ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  redirect(`/how-it-works${r ? `?r=${r}` : ""}`);
}
