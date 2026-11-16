import { redirect } from "next/navigation";

// The memory cards now live on Browse candidates.
export default function Glance() {
  redirect("/admin/candidates");
}
