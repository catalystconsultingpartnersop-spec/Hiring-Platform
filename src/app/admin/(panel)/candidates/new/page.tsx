import { CandidateForm } from "../CandidateForm";

export default function NewCandidate() {
  return (
    <>
      <div className="page-head" style={{ paddingBottom: 8 }}>
        <h1>Add a candidate</h1>
        <p>For someone you&rsquo;re coaching who didn&rsquo;t apply through the site.</p>
      </div>
      <CandidateForm c={null} tierFeeLabel="based on their salary" />
    </>
  );
}
