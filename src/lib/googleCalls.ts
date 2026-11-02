import { randomBytes } from "crypto";
import { siteUrl } from "./format";
import { getSetting, setSetting } from "./settings";

// One company Google account makes a Google Meet room for every onboarding
// call, set to record, transcribe and take notes automatically. Reps keep their
// own email: they just get the link. Heshy connects the account once, from
// Settings.

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/meetings.space.settings",
  "https://www.googleapis.com/auth/meetings.space.readonly",
];

type Saved = { refresh_token: string; email: string; connected_at: string };

const clientId = () => process.env.GOOGLE_CALLS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
const clientSecret = () => process.env.GOOGLE_CALLS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
// Google sends people back to the same address they started from (main site or team.).
export const callsRedirectUri = (origin?: string) => `${origin || siteUrl()}/api/google/calls/callback`;
export const googleCallsConfigured = () => !!(clientId() && clientSecret());

export async function callsAccount(): Promise<Saved | null> {
  const v = await getSetting<Saved | null>("google_calls", null);
  return v?.refresh_token ? v : null;
}

export function connectUrl(origin: string) {
  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: callsRedirectUri(origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  }).toString();
  return { url: url.toString(), state };
}

export async function finishConnect(code: string, origin: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: callsRedirectUri(origin), grant_type: "authorization_code" }),
  });
  if (!res.ok) throw new Error(`Google said no (${res.status}): ${await res.text()}`);
  const tok = (await res.json()) as { access_token: string; refresh_token?: string; scope?: string };
  if (!tok.refresh_token) throw new Error("Google didn't give us lasting access. Try connecting again.");
  const missing = SCOPES.filter((s) => s.startsWith("https://") && !(tok.scope ?? "").includes(s));
  if (missing.length) throw new Error("Please tick every box Google asks about, then connect again.");
  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tok.access_token}` } });
  const { email } = (await info.json()) as { email?: string };
  await setSetting("google_calls", { refresh_token: tok.refresh_token, email: email ?? "", connected_at: new Date().toISOString() } satisfies Saved);
  return email ?? "";
}

export async function disconnect() {
  await setSetting("google_calls", {});
}

async function accessToken(): Promise<string | null> {
  const acct = await callsAccount();
  if (!acct || !googleCallsConfigured()) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), refresh_token: acct.refresh_token, grant_type: "refresh_token" }),
  });
  if (!res.ok) throw new Error(`Google access expired (${res.status}). Reconnect it in Settings.`);
  return ((await res.json()) as { access_token: string }).access_token;
}

// A fresh Meet room: anyone with the link joins without waiting, and it
// records, transcribes and takes notes on its own.
export async function newRecordedMeeting(): Promise<{ link: string; space: string } | null> {
  const token = await accessToken();
  if (!token) return null;
  const res = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      config: {
        accessType: "OPEN",
        entryPointAccess: "ALL",
        artifactConfig: {
          recordingConfig: { autoRecordingGeneration: "ON" },
          transcriptionConfig: { autoTranscriptionGeneration: "ON" },
          smartNotesConfig: { autoSmartNotesGeneration: "ON" },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Google Meet said no (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const s = (await res.json()) as { name: string; meetingUri: string };
  return { link: s.meetingUri, space: s.name };
}

// What Google saved for a Meet room: recordings, transcripts and notes.
export async function roomArtifacts(space: string) {
  const token = await accessToken();
  if (!token) return null;
  const get = async (url: string) => {
    const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Google Meet said no (${r.status}): ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
  // A meeting code (abc-defg-hij) works as an alias; look up the room's real name.
  if (/^spaces\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(space)) space = ((await get(`https://meet.googleapis.com/v2/${space}`)) as { name: string }).name;
  const recs = (await get(`https://meet.googleapis.com/v2/conferenceRecords?filter=${encodeURIComponent(`space.name="${space}"`)}`)) as {
    conferenceRecords?: { name: string; startTime?: string; endTime?: string }[];
  };
  const out: { started?: string; ended?: string; recordings: string[]; transcripts: string[]; notes: string[] }[] = [];
  for (const c of recs.conferenceRecords ?? []) {
    const [r, t, n] = await Promise.all([
      get(`https://meet.googleapis.com/v2/${c.name}/recordings`).catch(() => ({})),
      get(`https://meet.googleapis.com/v2/${c.name}/transcripts`).catch(() => ({})),
      get(`https://meet.googleapis.com/v2/${c.name}/smartNotes`).catch(() => ({})),
    ]);
    out.push({
      started: c.startTime,
      ended: c.endTime,
      recordings: ((r as { recordings?: { state: string }[] }).recordings ?? []).map((x) => x.state),
      transcripts: ((t as { transcripts?: { state: string }[] }).transcripts ?? []).map((x) => x.state),
      notes: ((n as { smartNotes?: { state: string }[] }).smartNotes ?? []).map((x) => x.state),
    });
  }
  return out;
}

// The full transcript of every call held in a Meet room, as "Name: words" lines.
// Returns null while Google is still working on it.
export async function roomTranscript(space: string): Promise<string | null> {
  const token = await accessToken();
  if (!token) throw new Error("Google isn't connected. Connect it in Settings.");
  const get = async (url: string) => {
    const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Google Meet said no (${r.status}): ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
  const recs = (await get(`https://meet.googleapis.com/v2/conferenceRecords?filter=${encodeURIComponent(`space.name="${space}"`)}`)) as {
    conferenceRecords?: { name: string }[];
  };
  const lines: string[] = [];
  for (const c of recs.conferenceRecords ?? []) {
    const names = new Map<string, string>();
    const ps = (await get(`https://meet.googleapis.com/v2/${c.name}/participants?pageSize=100`)) as {
      participants?: { name: string; signedinUser?: { displayName?: string }; anonymousUser?: { displayName?: string }; phoneUser?: { displayName?: string } }[];
    };
    for (const p of ps.participants ?? [])
      names.set(p.name, p.signedinUser?.displayName || p.anonymousUser?.displayName || p.phoneUser?.displayName || "Someone");
    const ts = (await get(`https://meet.googleapis.com/v2/${c.name}/transcripts`)) as { transcripts?: { name: string; state: string }[] };
    for (const tr of ts.transcripts ?? []) {
      if (tr.state !== "FILE_GENERATED" && tr.state !== "ENDED") return null;
      let page = "";
      do {
        const e = (await get(`https://meet.googleapis.com/v2/${tr.name}/entries?pageSize=100${page ? `&pageToken=${page}` : ""}`)) as {
          transcriptEntries?: { participant: string; text: string }[];
          nextPageToken?: string;
        };
        for (const x of e.transcriptEntries ?? []) lines.push(`${names.get(x.participant) ?? "Someone"}: ${x.text}`);
        page = e.nextPageToken ?? "";
      } while (page);
    }
  }
  return lines.length ? lines.join("\n") : null;
}
