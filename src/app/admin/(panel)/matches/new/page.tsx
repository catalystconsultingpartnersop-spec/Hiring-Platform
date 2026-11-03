import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { PositionForm } from "../PositionForm";

export const metadata = { title: "Add a position" };

export default async function NewPosition() {
  await requireStaff();
  return (
    <div style={{ display: "grid", gap: 14, paddingBlock: "8px 40px" }}>
      <Link href="/admin/matches" className="small muted">
        Matches
      </Link>
      <h1 style={{ margin: 0 }}>Add a position</h1>
      <p className="muted" style={{ margin: 0 }}>Private. It&rsquo;s only used to find candidates who fit.</p>
      <PositionForm id={null} start={{}} />
    </div>
  );
}
