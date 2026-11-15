import { redirect } from "next/navigation";

// Older share graphics printed "thecandidatecollection.com/why". Anyone who
// types or opens that lands on the front page, keeping "?r=" so the person who
// sent it is still credited.
export default async function Why({ searchParams }: PageProps<"/why">) {
  const r = String((await searchParams).r ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  redirect(`/${r ? `?r=${r}` : ""}`);
}
