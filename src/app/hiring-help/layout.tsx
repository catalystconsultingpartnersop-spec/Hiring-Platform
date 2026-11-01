import { keepCandidatesOut } from "@/lib/candidateMode";

// Hidden from candidates while the catalog fills up (see lib/candidateMode).
export default async function Layout({ children }: { children: React.ReactNode }) {
  await keepCandidatesOut();
  return children;
}
