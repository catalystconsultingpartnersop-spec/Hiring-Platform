"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { recordingStatuses, type RecStatus } from "../../actions";

// Whether Google actually recorded each call. Asked once for the whole list, after the
// page has loaded, so the page itself stays fast.
const Ctx = createContext<Record<string, RecStatus> | null>(null);

export function RecProvider({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const [map, setMap] = useState<Record<string, RecStatus> | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    let live = true;
    recordingStatuses(key ? key.split(",") : [])
      .then((m) => live && setMap(m))
      .catch(() => live && setMap({}));
    return () => {
      live = false;
    };
  }, [key]);
  return <Ctx.Provider value={map}>{children}</Ctx.Provider>;
}

export const REC_LABEL: Partial<Record<RecStatus, [string, string]>> = {
  recorded: ["Recorded", "tag-good"],
  processing: ["Recording processing", ""],
  not_recorded: ["Not recorded", "tag-bad"],
  no_call_yet: ["Nobody joined the room", "tag-bad"],
};

export function RecBadge({ id }: { id: string }) {
  const map = useContext(Ctx);
  const s = map?.[id];
  const l = s ? REC_LABEL[s] : undefined;
  if (!l) return null;
  return (
    <span className={`tag ${l[1]}`} style={{ marginLeft: 6 }} title="What Google saved for this call">
      {l[0]}
    </span>
  );
}
