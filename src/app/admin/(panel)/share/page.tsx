import type { Metadata } from "next";
import { KitPicker } from "@/components/ShareTools";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { candidateKits, ownerKits, refSlug, shelf } from "@/lib/shareKit";
import { joinedKits } from "@/lib/joined";
import { deletePoster, setPosterHidden, setPosterLabel } from "./shelf";
import { NetworkerLink } from "./NetworkerLink";

export const metadata: Metadata = { title: "Share kit" };

export default async function ShareKit() {
  const me = await requireStaff();
  const admin = me.role === "admin";
  // Each person's link carries their name, so we know who brought each owner in.
  const ref = me.id ? refSlug(me.name.split(" ")[0] || me.email.split("@")[0]) : "";
  const owner = await shelf(ownerKits(ref));
  const cand = await shelf(candidateKits(ref));
  const fresh = await joinedKits(ref).catch(() => []);
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

      <nav aria-label="Sections" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "4px 0 20px" }}>
        <a className="btn btn-small btn-ghost" href="#owners">For business owners</a>
        <a className="btn btn-small btn-ghost" href="#joined">Just joined{fresh.length ? ` (${fresh.length})` : ""}</a>
        <a className="btn btn-small btn-ghost" href="#candidates">For candidates</a>
      </nav>

      <h2 id="candidates" style={{ fontSize: 24, margin: "16px 0 6px", scrollMarginTop: 16 }}>
        Posters to attract candidates
      </h2>
      <p className="small muted" style={{ margin: "0 0 16px" }}>
        Pick a picture and send it to your network. Candidates who sign up through your link are added as yours
        {candidates?.length ? ` (${candidates.length} so far)` : ""}.
      </p>
      <KitPicker
        kits={cand.shown}
        removed={me.manager ? cand.removed : []}
        setHidden={me.manager ? setPosterHidden : undefined}
        setLabel={me.manager ? setPosterLabel : undefined}
        setDeleted={me.manager ? deletePoster : undefined}
      />

      <h2 id="owners" style={{ fontSize: 24, margin: "48px 0 6px", scrollMarginTop: 16 }}>
        Posters to attract business owners
      </h2>
      <p className="small muted" style={{ margin: "0 0 16px" }}>
        Know someone who owns a business? Pick a picture and send it
        {owners?.length ? `. ${owners.length} owner${owners.length === 1 ? " has" : "s have"} joined through you so far` : ""}.
      </p>
      <KitPicker
        kits={owner.shown}
        removed={me.manager ? owner.removed : []}
        setHidden={me.manager ? setPosterHidden : undefined}
        setLabel={me.manager ? setPosterLabel : undefined}
        setDeleted={me.manager ? deletePoster : undefined}
      />
      <h2 id="joined" style={{ fontSize: 24, margin: "48px 0 6px", scrollMarginTop: 16 }}>
        Just joined
      </h2>
      <p className="small muted" style={{ margin: "0 0 16px" }}>
        A fresh poster for each candidate who joined in the last two weeks, made automatically. No names, only what&rsquo;s
        already on their public card. Each link opens that candidate&rsquo;s card. They drop off here after two weeks.
      </p>
      {fresh.length ? <KitPicker kits={fresh} /> : <p className="panel panel-wash">No one new in the last two weeks. The next candidate who&rsquo;s listed shows up here.</p>}
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
