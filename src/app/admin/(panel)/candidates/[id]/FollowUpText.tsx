"use client";

import { useState } from "react";
import { SmsCode } from "./PointToOwner";

// "Follow up by text": opens Messages on a phone; on a computer, shows a code to scan.
export function FollowUpText({ intl, body }: { intl: string; body: string }) {
  const [show, setShow] = useState(false);
  const href = `sms:+${intl}?&body=${encodeURIComponent(body)}`;
  return (
    <>
      <a
        className="btn btn-ghost btn-small"
        href={href}
        onClick={(e) => {
          if (!window.matchMedia("(pointer: coarse)").matches) {
            e.preventDefault();
            setShow((v) => !v);
          }
        }}
      >
        Follow up by text
      </a>
      {show && (
        <div style={{ flexBasis: "100%", display: "flex", gap: 12, alignItems: "center" }}>
          <SmsCode to={intl} body={body} />
          <span className="small muted">Point your phone&rsquo;s camera at this code. Messages opens with the follow-up ready.</span>
        </div>
      )}
    </>
  );
}
