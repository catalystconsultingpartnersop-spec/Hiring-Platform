import { siteUrl } from "./format";
import { readSignedToken, signedToken } from "./session";

// A private link to a candidate's resume and one-page summary, put inside the
// client's calendar invite: anyone they add to the invite (a partner) can open it.
export function packetLink(candidateId: string) {
  return `${siteUrl()}/p/${encodeURIComponent(signedToken(`pkt_${candidateId}`, 60))}`;
}

export function packetCandidate(token: string) {
  const id = readSignedToken(decodeURIComponent(token), "pkt_");
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
