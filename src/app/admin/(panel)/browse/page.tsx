import { redirect } from "next/navigation";

// "Browse candidates" now lives at /admin/candidates. Old bookmarks land there.
export default function Browse() {
  redirect("/admin/candidates");
}
