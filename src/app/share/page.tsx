import type { Metadata } from "next";
import { KitPicker } from "@/components/ShareTools";
import { brandName } from "@/lib/format";
import { candidateKits, ownerKits, refSlug, shelf } from "@/lib/shareKit";

export const metadata: Metadata = {
  title: `Share ${brandName()}`,
  robots: { index: false, follow: false },
};

// For friends and networkers: everything they need to pass us along to a
// business owner, in one place. ?r=name tags the link with who sent it.
export default async function SharePage({ searchParams }: PageProps<"/share">) {
  const sp = await searchParams;
  const ref = typeof sp.r === "string" ? refSlug(sp.r) : "";
  return (
    <div className="wrap" style={{ paddingBlock: "40px 64px" }}>
      <div className="page-head" style={{ paddingTop: 0 }}>
        <h1>Know a business owner who&rsquo;s hiring?</h1>
        <p>
          Pick a picture and send it. One picture, one short message, one link. It takes ten seconds, and it might be
          the best hire they make this year.
        </p>
      </div>
      <KitPicker kits={(await shelf(ownerKits(ref))).shown} />
      <h2 style={{ fontSize: 26, margin: "56px 0 6px" }}>Know someone looking for work?</h2>
      <p className="muted" style={{ margin: "0 0 18px" }}>
        Send them this one. It&rsquo;s free for them, private, and starts with a real conversation.
      </p>
      <KitPicker kits={(await shelf(candidateKits(ref))).shown} />
    </div>
  );
}
