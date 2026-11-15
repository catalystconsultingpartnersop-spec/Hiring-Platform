import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { SiteFlow } from "../SiteFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

// Analytics: how the public site is doing. For Heshy and the partner. More
// tools get added here as boxes, one under the other.
export default async function AnalyticsPage() {
  const me = await requireStaff();
  if (!me.manager) redirect("/admin");
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <h1>Analytics</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>How business owners are using the site.</p>
      </div>
      <SiteFlow always />
    </>
  );
}
