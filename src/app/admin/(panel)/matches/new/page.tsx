import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { PositionForm } from "../PositionForm";

export const metadata = { title: "Add an opening" };
export const maxDuration = 300;

export default async function NewPosition() {
  await requireStaff();
  return (
    <div style={{ display: "grid", gap: 14, paddingBlock: "8px 40px" }}>
      <Link href="/admin/matches" className="small muted">
        Matches
      </Link>
      <h1 style={{ margin: 0 }}>Add an opening</h1>
      <p className="muted" style={{ margin: 0 }}>Private. We write it up and find who fits, automatically.</p>
      <PositionForm id={null} start={{}} />
    </div>
  );
}
