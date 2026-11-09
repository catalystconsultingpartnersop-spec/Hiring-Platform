"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { replyAsOwner } from "@/app/candidates/talkActions";

export function OwnerReply({ token, rep }: { token: string; rep: string }) {
  const [state, action, pending] = useActionState(replyAsOwner.bind(null, token), null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  return (
    <form ref={form} action={action} className="talk-reply">
      <textarea className="textarea" name="text" rows={3} required placeholder={`Write to ${rep}…`} />
      {state && !state.ok && (
        <p className="notice notice-bad" role="alert">
          {state.error === "cutoff" ? "This conversation has wrapped up." : state.error}
        </p>
      )}
      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
