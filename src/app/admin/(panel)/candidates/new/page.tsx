import { requireStaff } from "@/lib/session";
import { CandidateForm } from "../CandidateForm";

export default async function NewCandidate() {
  const me = await requireStaff();
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Add a candidate</h1>
        <p>Five quick sections. Start with their resume and most of section 1 fills itself in.</p>
      </div>
      <CandidateForm c={null} tierFeeLabel="based on their salary" isAdmin={me.role === "admin"} />
    </>
  );
}
