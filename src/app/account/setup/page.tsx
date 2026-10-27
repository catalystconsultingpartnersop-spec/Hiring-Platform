import { redirect } from "next/navigation";
import { currentOwner } from "@/lib/session";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: PageProps<"/account/setup">) {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/candidates";
  return (
    <div className="wrap narrow" style={{ maxWidth: 520 }}>
      <div className="page-head">
        <h1>About you</h1>
        <p>This goes on the agreements you sign, so use your real name and company.</p>
      </div>
      <SetupForm next={next} owner={owner} />
    </div>
  );
}
