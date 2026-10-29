import type { Metadata } from "next";
import { KitView } from "@/components/ShareTools";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { ownerMessage, refSlug, shareLink } from "@/lib/shareKit";
import { NetworkerLink } from "./NetworkerLink";

export const metadata: Metadata = { title: "Share with owners" };

export default async function ShareKit() {
  const me = await requireStaff();
  const admin = me.role === "admin";
  // Each person's link carries their name, so we know who brought each owner in.
  const ref = admin ? "" : refSlug(me.name.split(" ")[0] || me.email.split("@")[0]);
  const link = shareLink(ref);
  const { data: owners } = ref ? await db().from("owners").select("id").eq("referred_by", ref) : { data: null };
  return (
    <div style={{ paddingBottom: 48 }}>
      <div className="page-head" style={{ paddingBottom: 16 }}>
        <h1>Share with business owners</h1>
        <p>
          You know people who own businesses. Send them this: one picture, one short message, your link. On your phone,
          tap &ldquo;Share&rdquo; and pick the person.
          {ref && (
            <>
              {" "}
              Your link is tagged with your name, so owners who join through it are credited to you
              {owners?.length ? ` (${owners.length} so far)` : ""}.
            </>
          )}
        </p>
      </div>
      <KitView message={ownerMessage(link)} link={link} image="/share/owner-card.png" />
      {admin && (
        <section className="panel" style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 19, margin: 0 }}>Give the kit to a networker</h2>
          <p className="small muted" style={{ margin: "6px 0 12px" }}>
            Type their name to make their own page. Send them the page link. They get the picture, the message and a link
            tagged with their name, so you can see which owners came from them on the Clients page.
          </p>
          <NetworkerLink base={`${siteUrl()}/share`} />
        </section>
      )}
    </div>
  );
}
