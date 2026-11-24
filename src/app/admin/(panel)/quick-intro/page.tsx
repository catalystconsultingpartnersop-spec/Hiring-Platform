import type { Metadata } from "next";
import { requireStaff } from "@/lib/session";
import { QuickIntroForm } from "./QuickIntro";

export const metadata: Metadata = { title: "Quick intro" };

export default async function QuickIntroPage() {
  await requireStaff();
  return (
    <div style={{ maxWidth: 640, paddingBottom: 48 }}>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Quick intro</h1>
        <p>Met someone? Introduce them to a business owner in under a minute. We write the profile; the owner signs and puts a card on file before seeing their name.</p>
      </div>
      <QuickIntroForm />
    </div>
  );
}
