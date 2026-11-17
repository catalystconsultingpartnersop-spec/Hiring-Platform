import { spawn } from "node:child_process";
import http from "node:http";
import { Readable } from "node:stream";
import type { AddressInfo } from "node:net";
import { readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db, logActivity } from "./db";
import { accessToken, callsAccount } from "./googleCalls";

// A 30-second clip and a still picture of each candidate, cut from their recorded
// onboarding call, so the team remembers who is who. Team only. The files live
// in private storage and are only handed out to signed-in staff.

import { callTeam, noteCall, personKeys, scannedCalls } from "./callTeam";
import { CLIP_BUCKET as BUCKET, CLIP_V, clipIsOld, clipOf, clipPath, type Clip } from "./clipInfo";
import { askAI } from "./callDraft";
export { clipOf, clipPath, type Clip };

function ffmpegPath() {
  const here = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  if (existsSync(here)) return here;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("ffmpeg-static") as string;
}
function run(args: string[], ms = 150_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath(), ["-hide_banner", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, http_proxy: "", HTTP_PROXY: "", no_proxy: "127.0.0.1" } });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-1500)));
    const t = setTimeout(() => p.kill("SIGKILL"), ms);
    p.on("error", (e) => (clearTimeout(t), reject(e)));
    p.on("close", (code) => (clearTimeout(t), code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.replace(/Bearer [\w.-]+/g, "Bearer …").slice(-400)}`))));
  });
}

type Entry = { participant: string; text?: string; startTime?: string; endTime?: string };
type Span = { from: number; to: number };
const secs = (iso?: string) => (iso ? Date.parse(iso) / 1000 : NaN);
const overlap = (es: Span[], t: number, len: number) => es.reduce((a, e) => a + Math.max(0, Math.min(e.to, t + len) - Math.max(e.from, t)), 0);

// The 30-second stretches where the candidate does the talking and nobody else does
// (skipping the hellos), best first. Anyone else talking counts against a stretch.
export function topWindows(entries: Span[], total: number, n = 4, len = 30, others: Span[] = []): number[] {
  if (!entries.length || !(total > len)) return [Math.max(0, Math.floor(total * 0.4))];
  const skip = total > 360 ? 120 : 0;
  const all: { t: number; sum: number }[] = [];
  for (let t = skip; t <= total - len; t += 5) all.push({ t, sum: overlap(entries, t, len) - 2 * overlap(others, t, len) });
  all.sort((x, y) => y.sum - x.sum);
  const out: number[] = [];
  for (const w of all) {
    if (out.length >= n) break;
    if (out.every((t) => Math.abs(t - w.t) >= 40)) out.push(w.t);
  }
  return out.length ? out : [skip];
}
export const bestWindow = (entries: Span[], total: number) => topWindows(entries, total, 1)[0];

async function findRecording(space: string, candidateName: string, staffNames: string[], candidateId = "") {
  const token = await accessToken();
  if (!token) throw new Error("Google isn't connected.");
  const get = async (url: string) => {
    const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Google Meet said no (${r.status}): ${(await r.text()).slice(0, 160)}`);
    return r.json();
  };
  const recs = (await get(`https://meet.googleapis.com/v2/conferenceRecords?filter=${encodeURIComponent(`space.name="${space}"`)}`)) as { conferenceRecords?: { name: string }[] };
  let pick: { conf: string; file: string; start: number; end: number } | null = null;
  for (const c of recs.conferenceRecords ?? []) {
    const r = (await get(`https://meet.googleapis.com/v2/${c.name}/recordings`)) as { recordings?: { state?: string; startTime?: string; endTime?: string; driveDestination?: { file?: string } }[] };
    for (const x of r.recordings ?? []) {
      if (x.state !== "FILE_GENERATED" || !x.driveDestination?.file) continue;
      const start = secs(x.startTime);
      const end = secs(x.endTime);
      if (!pick || end - start > pick.end - pick.start) pick = { conf: c.name, file: x.driveDestination.file, start, end };
    }
  }
  if (!pick) return null;

  // Who is the candidate? Not the rep, not the company calls account; best name match wins.
  const ps = (await get(`https://meet.googleapis.com/v2/${pick.conf}/participants?pageSize=100`)) as {
    participants?: { name: string; signedinUser?: { user?: string; displayName?: string }; anonymousUser?: { displayName?: string }; phoneUser?: { displayName?: string } }[];
  };
  const shown = (p: NonNullable<typeof ps.participants>[number]) => p.signedinUser?.displayName || p.anonymousUser?.displayName || p.phoneUser?.displayName || "";
  // Remember who was here (that's how the site gets to know our own team), then ask who it already knows.
  if (candidateId) await noteCall(space, candidateId, (ps.participants ?? []).map((p) => ({ user: p.signedinUser?.user, name: shown(p) }))).catch(() => {});
  const known = await callTeam().catch(() => ({ keys: new Set<string>(), names: [] as string[] }));
  const calls = ((await callsAccount())?.email ?? "").split("@")[0].toLowerCase();
  const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1);
  const cw = words(candidateName);
  const rw = staffNames.flatMap(words);
  const scored = (ps.participants ?? []).map((p) => {
    const n = shown(p);
    const w = words(n);
    const ours = personKeys({ user: p.signedinUser?.user, name: n }).some((k) => known.keys.has(k));
    return { id: p.name, n, ours, cand: w.filter((x) => cw.includes(x)).length, rep: w.filter((x) => rw.includes(x)).length + (calls && n.toLowerCase().includes(calls) ? 2 : 0) + (ours ? 3 : 0) };
  });
  const speakers = new Map<string, Span[]>();
  const said = new Map<string, string[]>();
  const ts = (await get(`https://meet.googleapis.com/v2/${pick.conf}/transcripts`)) as { transcripts?: { name: string; state: string }[] };
  for (const tr of ts.transcripts ?? []) {
    if (tr.state !== "FILE_GENERATED" && tr.state !== "ENDED") continue;
    let page = "";
    do {
      const e = (await get(`https://meet.googleapis.com/v2/${tr.name}/entries?pageSize=100${page ? `&pageToken=${page}` : ""}`)) as { transcriptEntries?: Entry[]; nextPageToken?: string };
      for (const x of e.transcriptEntries ?? []) {
        const from = secs(x.startTime) - pick.start;
        const to = secs(x.endTime) - pick.start;
        if (!(to > from)) continue;
        speakers.set(x.participant, [...(speakers.get(x.participant) ?? []), { from, to }]);
        if (x.text && (said.get(x.participant)?.length ?? 0) < 40) said.set(x.participant, [...(said.get(x.participant) ?? []), x.text.slice(0, 200)]);
      }
      page = e.nextPageToken ?? "";
    } while (page);
  }
  const talk = (id: string) => (speakers.get(id) ?? []).reduce((a, e) => a + e.to - e.from, 0);
  const total = pick.end - pick.start;
  // Who is the candidate? First ask the AI to read what each person said: the candidate is the one
  // being asked about their work. Names are the fallback. If neither is sure, no clip is made:
  // no clip is better than a clip of our own rep.
  const talkers = scored.filter((p) => talk(p.id) > 20);
  let candId = "";
  // The site knows someone on this call as ours, and exactly one other person is here: that's the candidate.
  const notOurs = scored.filter((p) => p.rep === 0 && (speakers.size === 0 || talk(p.id) > 20));
  if (scored.some((p) => p.ours) && notOurs.length === 1) candId = notOurs[0].id;
  if (!candId && talkers.length >= 2 && process.env.ANTHROPIC_API_KEY) {
    try {
      const letters = "ABCDEFGH";
      const { text } = await askAI(`This is from a recorded video call where a recruiter interviews a job candidate named ${candidateName}. The recruiter asks about the candidate's work history and what they want; the candidate talks about their own jobs, skills and goals. Our recruiters are: ${staffNames.join(", ")}.

Which speaker is the candidate? Reply with only JSON: {"candidate":"A"} using the speaker's letter, or {"candidate":""} if you can't tell.

${talkers.slice(0, 8).map((p, i) => `Speaker ${letters[i]} (shown as "${p.n || "unknown"}"):\n${(said.get(p.id) ?? []).slice(4, 24).join("\n")}`).join("\n\n")}`);
      const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { candidate?: string };
      const i = letters.indexOf(String(j.candidate ?? "").trim().toUpperCase());
      // Never someone the site knows as ours, whatever the reading says.
      if (j.candidate && i >= 0 && talkers[i] && !talkers[i].ours) candId = talkers[i].id;
    } catch {}
  }
  if (!candId) {
    // By name only: someone whose shown name matches the candidate and not our team, or the only non-team person there.
    const byName = scored.filter((p) => p.cand > 0 && p.cand > p.rep);
    // (When Google kept no written record of the call, nobody has talking time: then anyone not on our team counts.)
    const outsiders = scored.filter((p) => p.rep === 0 && (speakers.size === 0 || talk(p.id) > 20));
    candId = byName[0]?.id ?? (outsiders.length === 1 ? outsiders[0].id : "");
  }
  if (!candId) {
    const who = scored.map((p) => `"${p.n || "no name"}"${p.ours ? " (ours)" : ""} ${Math.round(talk(p.id))}s`).join(", ");
    throw new Error(`Couldn't tell which person on the call is the candidate (on the call: ${who || "nobody listed"}${speakers.size ? "" : "; Google kept no written record of this call"}).`);
  }
  const cand = scored.find((p) => p.id === candId)!;
  const mine = speakers.get(candId) ?? [];
  const others = [...speakers.entries()].filter(([id]) => id !== candId).flatMap(([, es]) => es);
  const starts = topWindows(mine, total, 8, 30, others);
  // How much of each stretch is the candidate talking, and how much is anyone else.
  const share = (t: number) => ({ cand: overlap(mine, t, 30), others: overlap(others, t, 30) });
  // Moments when the candidate is mid-sentence: the places to look for a clear picture of them.
  const moments: number[] = [];
  for (const e of [...mine].sort((x, y) => y.to - y.from - (x.to - x.from))) {
    if (moments.length >= 10 || e.to - e.from < 3) break;
    const m = (e.from + e.to) / 2;
    if (moments.every((x) => Math.abs(x - m) >= 20)) moments.push(m);
  }
  // How much talking is written down for the part clips are taken from (after the hellos).
  const from = total > 360 ? 120 : 0;
  const covered = overlap([...mine, ...others], from, Math.max(0, total - from));
  // noWords: Google kept no written record of who spoke when (or none for the part that was recorded),
  // so the picture is all there is to go on.
  return { file: pick.file, token, total, starts, share, moments, candidateLabel: cand.n, noWords: overlap(mine, 0, total) < 5 || covered < 30, teamLabels: scored.filter((p) => p.ours).map((p) => p.n) };
}

// Ask the AI to look at one frame: whose name is on screen, and where the main face is.
// null means the AI couldn't be asked at all.
type Look = { label: string; x: number; y: number; w: number; h: number };
async function look(jpg: Buffer): Promise<Look | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const prompt = `This is one frame from a recorded video call. Video tiles usually show the person's name in a corner.
Reply with only JSON: {"label":"the name text shown on the main (largest) video tile, or empty","x":0.0,"y":0.0,"w":0.0,"h":0.0} where x,y,w,h are the left, top, width and height of the face of the person in that main tile, as fractions of the image. If no face is clearly visible (camera off, avatar, shared screen), use zeros.`;
  for (const model of ["claude-sonnet-5-5", "claude-sonnet-4-5"]) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 200, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpg.toString("base64") } }, { type: "text", text: prompt }] }] }),
    });
    if (!r.ok) {
      if (r.status === 404 || r.status === 400) continue;
      return null;
    }
    try {
      const j = (await r.json()) as { content: { text?: string }[] };
      const text = j.content.map((x) => x.text ?? "").join("");
      const b = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Look;
      return { label: String(b.label ?? ""), x: +b.x || 0, y: +b.y || 0, w: +b.w || 0, h: +b.h || 0 };
    } catch {
      return null;
    }
  }
  return null;
}
const hasFace = (b: Look) => b.w > 0.03 && b.h > 0.03 && b.x >= 0 && b.y >= 0 && b.x + b.w <= 1.01 && b.y + b.h <= 1.01;

// ffmpeg reads the video through a tiny local relay: this code fetches the pieces
// it asks for from Google (with our access), so ffmpeg never touches the network
// or the access key itself, and only the part of the video we need is downloaded.
async function relay(url: string, token: string) {
  const server = http.createServer(async (req, res) => {
    try {
      const r = await fetch(url, { headers: { authorization: `Bearer ${token}`, ...(req.headers.range ? { range: String(req.headers.range) } : {}) } });
      const head: Record<string, string> = { "content-type": "video/mp4", "accept-ranges": "bytes" };
      for (const h of ["content-length", "content-range"]) if (r.headers.get(h)) head[h] = r.headers.get(h)!;
      if (!r.ok && r.status !== 206) relayError = `Google Drive said no (${r.status}): ${(await r.text()).slice(0, 200)}`;
      res.writeHead(r.ok || r.status === 206 ? r.status : 502, head);
      if (!r.body || (!r.ok && r.status !== 206)) return void res.end();
      Readable.fromWeb(r.body as import("node:stream/web").ReadableStream).on("error", () => res.destroy()).pipe(res);
    } catch (e) {
      relayError = String((e as Error).message ?? e);
      res.destroy();
    }
  });
  let relayError = "";
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v.mp4`, close: () => server.close(), error: () => relayError };
}

// Cut the clip and the still from a video (a file path or a web address).
export async function cut(input: string, start: number, out: string) {
  await run(["-y", "-ss", String(Math.max(0, start)), "-i", input, "-t", "30", "-vf", "scale=-2:480", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-ac", "1", "-movflags", "+faststart", `${out}.mp4`]);
  await run(["-y", "-ss", "8", "-i", `${out}.mp4`, "-frames:v", "1", "-q:v", "3", `${out}.jpg`], 30_000);
}

async function frameAt(input: string, at: number, out: string) {
  await run(["-y", "-ss", String(Math.max(0, at)), "-i", input, "-frames:v", "1", "-vf", "scale=-2:480", "-q:v", "3", out], 90_000);
  return readFile(out);
}

// The face picture is a plain crop of a real frame, a little brighter and sharper. Nothing is invented.
async function faceCrop(jpg: Buffer, box: Look) {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(jpg).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const side = Math.min(W, H, Math.round(Math.max(box.w * W, box.h * H) * 2.1));
  const left = Math.max(0, Math.min(W - side, Math.round((box.x + box.w / 2) * W - side / 2)));
  const top = Math.max(0, Math.min(H - side, Math.round((box.y + box.h / 2) * H - side * 0.45)));
  return sharp(jpg).extract({ left, top, width: side, height: side }).resize(360, 360).normalise().modulate({ brightness: 1.05 }).sharpen().jpeg({ quality: 86 }).toBuffer();
}

// A clip that came out without a face picture gets one more look, once: the clip itself is left alone.
export async function addPhoto(candidateId: string): Promise<boolean> {
  const { data: c } = await db().from("candidates").select("id, full_name, application").eq("id", candidateId).maybeSingle();
  const clip = clipOf(c?.application as Record<string, string> | null);
  if (!c || !clip || clip.face) return false;
  const out = join(tmpdir(), `photo-${candidateId}.jpg`);
  let face = false;
  try {
    const { data: calls } = await db().from("onboarding_calls").select("meet_space, staff(full_name)").eq("candidate_id", candidateId).neq("status", "cancelled").not("meet_space", "is", null).order("starts_at", { ascending: false }).limit(1);
    const call = (calls ?? [])[0] as unknown as { meet_space: string; staff: { full_name: string | null } | null } | undefined;
    const { data: team } = await db().from("staff").select("full_name");
    const staffNames = [...((team ?? []) as { full_name: string | null }[]).map((t) => t.full_name ?? ""), call?.staff?.full_name ?? ""].filter(Boolean);
    const rec = call ? await findRecording(call.meet_space, c.full_name, staffNames, candidateId) : null;
    if (rec) {
      const wordsOf = (x: string) => x.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
      const staffWords = [...staffNames, ...rec.teamLabels].flatMap(wordsOf);
      const candWords = wordsOf(c.full_name + " " + rec.candidateLabel);
      const via = await relay(`https://www.googleapis.com/drive/v3/files/${rec.file}?alt=media&supportsAllDrives=true`, rec.token);
      const began = Date.now();
      try {
        // Their speaking moments, plus a few from inside the clip itself.
        for (const m of [...rec.moments, clip.start + 4, clip.start + 12, clip.start + 20]) {
          if (Date.now() - began > 110_000) break;
          const frame = await frameAt(via.url, m, out).catch(() => null);
          const shot = frame ? await look(frame) : null;
          const lw = shot ? wordsOf(shot.label) : [];
          if (frame && shot && hasFace(shot) && !(lw.some((w) => staffWords.includes(w)) && !lw.some((w) => candWords.includes(w)))) {
            const { error } = await db().storage.from(BUCKET).upload(clipPath(candidateId, "face"), await faceCrop(frame, shot), { contentType: "image/jpeg", upsert: true });
            face = !error;
            if (face) break;
          }
        }
      } finally {
        via.close();
      }
    }
  } catch {
  } finally {
    await rm(out, { force: true }).catch(() => {});
  }
  const { data: fresh } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
  const app = { ...((fresh?.application as Record<string, string>) ?? {}) };
  const now = clipOf(app);
  if (!now) return false;
  app.clip = JSON.stringify({ ...now, face: now.face || face, pt: 1 } satisfies Clip);
  await db().from("candidates").update({ application: app }).eq("id", candidateId);
  if (face) await logActivity("system", "clip_photo_added", { candidate_id: candidateId });
  return face;
}

export async function makeClip(candidateId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: c } = await db().from("candidates").select("id, full_name, application").eq("id", candidateId).maybeSingle();
  if (!c) return { ok: false, error: "No such candidate." };
  const out = join(tmpdir(), `clip-${candidateId}`);
  try {
    const { data: calls } = await db().from("onboarding_calls").select("meet_space, staff(full_name)").eq("candidate_id", candidateId).neq("status", "cancelled").not("meet_space", "is", null).order("starts_at", { ascending: false }).limit(1);
    const call = (calls ?? [])[0] as unknown as { meet_space: string; staff: { full_name: string | null } | null } | undefined;
    if (!call) throw new Error("No recorded call.");
    const { data: team } = await db().from("staff").select("full_name");
    const staffNames = [...((team ?? []) as { full_name: string | null }[]).map((t) => t.full_name ?? ""), call.staff?.full_name ?? ""].filter(Boolean);
    const rec = await findRecording(call.meet_space, c.full_name, staffNames, candidateId);
    if (!rec) throw new Error("Google has no finished recording for this call.");
    const via = await relay(`https://www.googleapis.com/drive/v3/files/${rec.file}?alt=media&supportsAllDrives=true`, rec.token);
    const wordsOf = (x: string) => x.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
    const staffWords = [...staffNames, ...rec.teamLabels].flatMap(wordsOf);
    const candWords = wordsOf(c.full_name + " " + rec.candidateLabel);
    // Only stretches where the candidate does most of the talking. Then look at two frames from each,
    // and take the first stretch that shows the candidate both times (a face, and not our own team's name on the tile).
    const solo = rec.starts.filter((t) => rec.share(t).cand >= 12 && rec.share(t).others <= 6);
    // No stretch where they talk quite alone? Then the ones where they talk clearly more than anyone else.
    const mostly = rec.starts.filter((t) => rec.share(t).cand >= 8 && rec.share(t).cand > rec.share(t).others);
    // No written record of the call? Then look at moments spread through it and keep one where the
    // candidate is the person on screen, twice in a row.
    const spread = rec.noWords && rec.total > 240 ? Array.from({ length: 8 }, (_, i) => Math.round(120 + ((rec.total - 210) * i) / 8)) : [];
    const tries = rec.noWords ? spread : (solo.length ? solo : mostly).slice(0, 5);
    if (!tries.length) {
      if (rec.noWords) throw new Error("Google kept no written record of this call, and it's too short to pick a moment from.");
      const b = rec.share(rec.starts[0]);
      throw new Error(`No 30 seconds where the candidate does most of the talking (best stretch: candidate ${Math.round(b.cand)}s, others ${Math.round(b.others)}s, shown as "${rec.candidateLabel}").`);
    }
    const staffOn = (label: string) => {
      const lw = wordsOf(label);
      return lw.some((w) => staffWords.includes(w)) && !lw.some((w) => candWords.includes(w));
    };
    const isThem = (shot: Look | null): shot is Look => !!shot && hasFace(shot) && !staffOn(shot.label);
    let start = tries[0];
    let seenCandidate = false;
    let aiUp = true;
    // The best still of the candidate found so far: the frame and where their face is in it.
    let pic: { jpg: Buffer; box: Look } | null = null;
    let mp4: Buffer;
    let jpg: Buffer;
    try {
      for (const t of tries) {
        const frame = await frameAt(via.url, t + 6, `${out}-probe.jpg`);
        const first = await look(frame);
        if (!first) {
          aiUp = false; // the AI can't be asked: go with the best stretch, without a face picture
          break;
        }
        if (!isThem(first)) continue;
        pic ??= { jpg: frame, box: first };
        const later = await look(await frameAt(via.url, t + 22, `${out}-probe.jpg`));
        if (later && staffOn(later.label)) continue;
        // Going by the picture alone, the candidate has to be there the second time too.
        if (rec.noWords && !isThem(later)) continue;
        start = t;
        seenCandidate = true;
        break;
      }
      if (rec.noWords && !seenCandidate) throw new Error("Google kept no written record of this call, and the candidate wasn't clearly on screen at the moments checked.");
      await cut(via.url, start, out);
      mp4 = await readFile(`${out}.mp4`);
      jpg = await readFile(`${out}.jpg`);
      // No picture yet? There is always a moment when the candidate is talking: go through those
      // moments, wherever they are in the call, until one shows their face clearly.
      if (!pic && aiUp) {
        for (const m of rec.moments) {
          const frame = await frameAt(via.url, m, `${out}-probe.jpg`).catch(() => null);
          const shot = frame ? await look(frame) : null;
          if (frame && isThem(shot)) {
            pic = { jpg: frame, box: shot };
            break;
          }
        }
      }
    } catch (e) {
      throw new Error(via.error() || (e as Error).message);
    } finally {
      via.close();
      await rm(`${out}-probe.jpg`, { force: true }).catch(() => {});
    }
    const store = db().storage.from(BUCKET);
    const up = async (path: string, body: Buffer, contentType: string) => {
      const { error } = await store.upload(path, body, { contentType, upsert: true });
      if (error) throw new Error(`Couldn't save ${path}: ${error.message}`);
    };
    await up(clipPath(candidateId, "video"), mp4, "video/mp4");
    await up(clipPath(candidateId, "photo"), jpg, "image/jpeg");
    let face = false;
    try {
      if (pic) {
        await up(clipPath(candidateId, "face"), await faceCrop(pic.jpg, pic.box), "image/jpeg");
        face = true;
      }
    } catch {}
    const { data: fresh } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
    const app = { ...((fresh?.application as Record<string, string>) ?? {}) };
    delete app.clip_error;
    app.clip = JSON.stringify({ at: new Date().toISOString(), start: Math.round(start), face, v: CLIP_V } satisfies Clip);
    await db().from("candidates").update({ application: app }).eq("id", candidateId);
    await logActivity("system", "clip_made", { candidate_id: candidateId, start: Math.round(start), face, seen: seenCandidate });
    return { ok: true };
  } catch (e) {
    const raw = ((e as Error).message ?? String(e)).slice(0, 300);
    // "ffmpeg null" is the video tool being stopped for taking too long: a slow moment, not a real problem.
    const slow = /^ffmpeg null/.test(raw);
    const error = slow ? "The recording took too long to read. Trying again soon." : raw;
    const { data: fresh } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
    const app = { ...((fresh?.application as Record<string, string>) ?? {}) };
    app.clip_error = error;
    // An older clip that can't be made again the careful way comes down: it may be showing the rep.
    if (!slow && clipIsOld(clipOf(app))) delete app.clip;
    app.clip_tried_at = new Date().toISOString();
    await db().from("candidates").update({ application: app }).eq("id", candidateId);
    await logActivity("system", "clip_failed", { candidate_id: candidateId, error });
    return { ok: false, error };
  } finally {
    await rm(`${out}.mp4`, { force: true }).catch(() => {});
    await rm(`${out}.jpg`, { force: true }).catch(() => {});
  }
}


async function learnTeam(calls: { candidate_id: string; meet_space: string }[], max: number) {
  const token = await accessToken();
  if (!token) return;
  const done = await scannedCalls();
  const get = async (url: string) => {
    const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  };
  let n = 0;
  for (const c of calls) {
    if (n >= max) break;
    if (!c.meet_space || done.has(c.meet_space)) continue;
    n++;
    try {
      const recs = (await get(`https://meet.googleapis.com/v2/conferenceRecords?filter=${encodeURIComponent(`space.name="${c.meet_space}"`)}`)) as { conferenceRecords?: { name: string }[] };
      const people: { user?: string; name: string }[] = [];
      for (const conf of recs.conferenceRecords ?? []) {
        const ps = (await get(`https://meet.googleapis.com/v2/${conf.name}/participants?pageSize=100`)) as {
          participants?: { signedinUser?: { user?: string; displayName?: string }; anonymousUser?: { displayName?: string }; phoneUser?: { displayName?: string } }[];
        };
        for (const p of ps.participants ?? []) people.push({ user: p.signedinUser?.user, name: p.signedinUser?.displayName || p.anonymousUser?.displayName || p.phoneUser?.displayName || "" });
      }
      // A call nobody joined yet isn't counted, so it's looked at again later.
      if (people.length) await noteCall(c.meet_space, c.candidate_id, people);
    } catch {}
  }
}

export async function makeWaitingClips(max = 1) {
  if (!(await callsAccount())?.videos) return { made: 0, why: "Video clips aren't allowed yet." };
  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("candidate_id, meet_space, ends_at, candidates(application)")
    .neq("status", "cancelled")
    .not("meet_space", "is", null)
    .lt("ends_at", new Date(Date.now() - 45 * 60_000).toISOString())
    .order("ends_at", { ascending: false })
    .limit(300);
  // First, a quick look at who was on calls not counted yet: that's how the site learns who our own team is.
  await learnTeam(((calls ?? []) as unknown as { candidate_id: string; meet_space: string }[]), 25).catch(() => {});
  const rows = (calls ?? []) as unknown as { candidate_id: string; candidates: { application: Record<string, string> | null } | null }[];
  const seen = new Set<string>();
  const uniq = rows.filter((r) => r.candidates && !seen.has(r.candidate_id) && seen.add(r.candidate_id));
  const done = uniq.filter((r) => clipOf(r.candidates!.application)).length;
  // A failed one waits six hours before another try (half an hour if it only ran out of time), unless the failure was a setting on Google's side
  // (then it's tried again as soon as that's fixed).
  const resting = (a: Record<string, string> | null) =>
    !!a?.clip_tried_at && Date.now() - Date.parse(a.clip_tried_at) < (/took too long|^ffmpeg null/i.test(a.clip_error ?? "") ? 30 * 60e3 : 6 * 36e5) && !/has not been used|is disabled|isn't connected/i.test(a.clip_error ?? "") &&
    // Notes written before the site learned to handle calls with no written record: those get a new try now.
    !/is the candidate\.$|without the rep\.$|\(best: candidate 0s, others 0s/.test(a.clip_error ?? "");
  // Older clips that should be made again the careful way go first, then calls that have none yet.
  const fresh = uniq.filter((r) => !clipOf(r.candidates!.application) && !resting(r.candidates!.application));
  const redo = uniq.filter((r) => clipIsOld(clipOf(r.candidates!.application)) && !resting(r.candidates!.application));
  // A call with no recording fails in a second: don't let those use up the run. Keep going
  // until enough clips are made or the time is nearly up.
  const began = Date.now();
  let made = 0;
  let tried = 0;
  for (const r of [...redo, ...fresh]) {
    if (made >= max || Date.now() - began > 150_000) break;
    tried++;
    if ((await makeClip(r.candidate_id)).ok) made++;
  }
  // Nothing made this run? Use the time for one clip that's still missing its face picture.
  let photo = false;
  if (!made && Date.now() - began < 60_000) {
    const need = uniq.find((r) => {
      const k = clipOf(r.candidates!.application);
      return k && !clipIsOld(k) && !k.face && !k.pt;
    });
    if (need) photo = await addPhoto(need.candidate_id);
  }
  return { made, tried, photo, done: done + made, waiting: redo.length + fresh.length - tried };
}

export async function clipUrl(candidateId: string, kind: "video" | "photo" | "face") {
  const { data } = await db().storage.from(BUCKET).createSignedUrl(clipPath(candidateId, kind), 3600);
  return data?.signedUrl ?? null;
}
