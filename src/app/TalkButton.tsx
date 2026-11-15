"use client";

import Link from "next/link";
import { mark } from "@/components/Seen";

// "Talk to our team": brings the call-back form into view and puts the cursor
// in its first box, so on a computer (where the form is already on screen) the
// button visibly does something.
export function TalkButton({ className }: { className: string }) {
  return (
    <a
      href="#callback"
      className={className}
      onClick={() => {
        mark("talk");
        setTimeout(() => (document.querySelector("#callback input[name=role]") as HTMLInputElement | null)?.focus({ preventScroll: true }), 350);
      }}
    >
      Talk to our team
    </a>
  );
}

// "Browse candidates yourself": the other way in.
export function BrowseButton({ className }: { className: string }) {
  return (
    <Link href="/candidates" className={className} onClick={() => mark("browse_click")}>
      Browse candidates yourself <span aria-hidden>→</span>
    </Link>
  );
}
