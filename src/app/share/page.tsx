import type { Metadata } from "next";
import { KitView } from "@/components/ShareTools";
import { brandName } from "@/lib/format";
import { ownerMessage, refSlug, shareLink } from "@/lib/shareKit";

export const metadata: Metadata = {
  title: `Share ${brandName()}`,
  robots: { index: false, follow: false },
};

// For friends and networkers: everything they need to pass us along to a
// business owner, in one place. ?r=name tags the link with who sent it.
export default async function SharePage({ searchParams }: PageProps<"/share">) {
  const sp = await searchParams;
  const ref = typeof sp.r === "string" ? refSlug(sp.r) : "";
  const link = shareLink(ref);
  return (
    <div className="wrap" style={{ paddingBlock: "40px 64px" }}>
      <div className="page-head" style={{ paddingTop: 0 }}>
        <h1>Know a business owner who&rsquo;s hiring?</h1>
        <p>
          Send them this. One picture, one short message, one link. It takes ten seconds, and it might be the best hire
          they make this year.
        </p>
      </div>
      <KitView message={ownerMessage(ref)} link={link} image="/share/owner-card.png" />
    </div>
  );
}
