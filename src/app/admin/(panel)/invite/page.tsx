import type { Metadata } from "next";
import { cleanInvite, DEFAULT_INVITE } from "@/lib/repInvite";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { InviteEditor } from "./InviteEditor";

export const metadata: Metadata = { title: "Rep invitation" };

export default async function InvitePage() {
  await requireAdmin();
  const saved = await getSetting<unknown>("rep_invite", null);
  return (
    <div style={{ paddingBottom: 48 }}>
      <div className="page-head" style={{ paddingBottom: 16 }}>
        <h1>Rep invitation</h1>
        <p>
          A two-page PDF for someone you&rsquo;d like as a rep. Type their name, change any line you like, then download it
          and send it to them.
        </p>
      </div>
      <InviteEditor initial={saved ? cleanInvite(saved) : DEFAULT_INVITE} />
    </div>
  );
}
