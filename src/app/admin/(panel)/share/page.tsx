import type { Metadata } from "next";
import { KitView } from "@/components/ShareTools";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { candidateLink, candidateMessage, ownerMessage, refSlug, shareLink } from "@/lib/shareKit";
import { NetworkerLink } from "./NetworkerLink";

export const metadata: Metadata = { title: "Share kit" };

export default async function ShareKit() {
  const me = await requireStaff();
  const admin = me.role === "admin";
  // Each person's link carries their name, so we know who brought each owner in.
  const ref = admin ? "" : refSlug(me.name.split(" ")[0] || me.email.split("@")[0]);
  const link = shareLink(ref);
  const { data: owners } = ref ? await db().from("owners").select("id").eq("referred_by", ref) : { data: null };
  const { data: candidates } = !admin && me.id ? await db().from("candidates").select("id").eq("added_by", me.id) : { data: null };
  return (
    <div style={{ paddingBottom: 48 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Share kit</h1>
        <p>
          One picture, one short message, your link. On your phone, tap &ldquo;Share&rdquo; and pick the person.
          {ref && " Your links carry your name, so the people who join through them are credited to you."}
        </p>
      </div>

      <h2 id="candidates" style={{ fontSize: 24, margin: "16px 0 6px", scrollMarginTop: 16 }}>
        For people looking for work
      </h2>
      <p className="small muted" style={{ margin: "0 0 16px" }}>
        Send it to your network. Candidates who sign up through your link are added as yours
        {candidates?.length ? ` (${candidates.length} so far)` : ""}.
      </p>
      <KitView message={candidateMessage(ref)} link={candidateLink(ref)} image="/share/candidate-card.png" />

      <h2 id="owners" style={{ fontSize: 24, margin: "48px 0 6px", scrollMarginTop: 16 }}>
        For business owners
      </h2>
      <p className="small muted" style={{ margin: "0 0 16px" }}>
        Know someone who owns a business? Send them this
        {owners?.length ? `. ${owners.length} owner${owners.length === 1 ? " has" : "s have"} joined through you so far` : ""}.
      </p>
      <KitView message={ownerMessage(ref)} link={link} image="/share/owner-card.png" />
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
