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

const BUCKET = "resumes";
export const clipPath = (id: string, kind: "video" | "photo" | "face") => `clips/${id}${kind === "video" ? ".mp4" : kind === "face" ? "-face.jpg" : ".jpg"}`;
// Bump when the way clips are picked changes: older ones are quietly made again.
const CLIP_V = 2;
export type Clip = { at: string; start: number; face: boolean; v?: number };
export function clipOf(app: Record<string, string> | null | undefined): Clip | null {
  try {
    const c = JSON.parse(app?.clip ?? "null") as Clip | null;
    return c?.at && c.v === CLIP_V ? c : null;
  } catch {
    return null;
  }
}

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

type Entry = { participant: string; startTime?: string; endTime?: string };
const secs = (iso?: string) => (iso ? Date.parse(iso) / 1000 : NaN);

// The 30-second stretches where the candidate talks the most (skipping the hellos), best first.
export function topWindows(entries: { from: number; to: number }[], total: number, n = 4, len = 30): number[] {
  if (!entries.length || !(total > len)) return [Math.max(0, Math.floor(total * 0.4))];
  const skip = total > 360 ? 120 : 0;
  const all: { t: number; sum: number }[] = [];
  for (let t = skip; t <= total - len; t += 5) {
    let sum = 0;
    for (const e of entries) sum += Math.max(0, Math.min(e.to, t + len) - Math.max(e.from, t));
    all.push({ t, sum });
  }
  all.sort((x, y) => y.sum - x.sum);
  const out: number[] = [];
  for (const w of all) {
    if (out.length >= n) break;
    if (out.every((t) => Math.abs(t - w.t) >= 60)) out.push(w.t);
  }
  return out.length ? out : [skip];
}
export const bestWindow = (entries: { from: number; to: number }[], total: number) => topWindows(entries, total, 1)[0];

async function findRecording(space: string, candidateName: string, staffNames: string[]) {
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
    participants?: { name: string; signedinUser?: { displayName?: string }; anonymousUser?: { displayName?: string }; phoneUser?: { displayName?: string } }[];
  };
  const calls = ((await callsAccount())?.email ?? "").split("@")[0].toLowerCase();
  const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1);
  const cw = words(candidateName);
  const rw = staffNames.flatMap(words);
  const scored = (ps.participants ?? []).map((p) => {
    const n = p.signedinUser?.displayName || p.anonymousUser?.displayName || p.phoneUser?.displayName || "";
    const w = words(n);
    return { id: p.name, n, cand: w.filter((x) => cw.includes(x)).length, rep: w.filter((x) => rw.includes(x)).length + (calls && n.toLowerCase().includes(calls) ? 2 : 0) };
  });
  const speakers = new Map<string, { from: number; to: number }[]>();
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
      }
      page = e.nextPageToken ?? "";
    } while (page);
  }
  const talk = (id: string) => (speakers.get(id) ?? []).reduce((a, e) => a + e.to - e.from, 0);
  const cand = scored.filter((p) => p.rep === 0 || p.cand > p.rep).sort((a, b) => b.cand - a.cand || talk(b.id) - talk(a.id))[0];
  const total = pick.end - pick.start;
  return { file: pick.file, token, total, starts: topWindows(cand ? (speakers.get(cand.id) ?? []) : [], total), candidateLabel: cand?.n ?? "" };
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
    const rec = await findRecording(call.meet_space, c.full_name, staffNames);
    if (!rec) throw new Error("Google has no finished recording for this call.");
    const via = await relay(`https://www.googleapis.com/drive/v3/files/${rec.file}?alt=media&supportsAllDrives=true`, rec.token);
    const wordsOf = (x: string) => x.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
    const staffWords = staffNames.flatMap(wordsOf);
    const candWords = wordsOf(c.full_name + " " + rec.candidateLabel);
    // Look at one frame from each of the best stretches, and take the first that shows the candidate
    // (a face, and not one of our own team's name on the tile).
    let start = rec.starts[0];
    let seenCandidate = false;
    try {
      for (const t of rec.starts) {
        const shot = await look(await frameAt(via.url, t + 12, `${out}-probe.jpg`));
        if (!shot) break; // the AI can't be asked: go with the best stretch, without a face picture
        const lw = wordsOf(shot.label);
        const isStaff = lw.some((w) => staffWords.includes(w)) && !lw.some((w) => candWords.includes(w));
        if (hasFace(shot) && !isStaff) {
          start = t;
          seenCandidate = true;
          break;
        }
      }
      await cut(via.url, start, out);
    } catch (e) {
      throw new Error(via.error() || (e as Error).message);
    } finally {
      via.close();
      await rm(`${out}-probe.jpg`, { force: true }).catch(() => {});
    }
    const mp4 = await readFile(`${out}.mp4`);
    const jpg = await readFile(`${out}.jpg`);
    const store = db().storage.from(BUCKET);
    const up = async (path: string, body: Buffer, contentType: string) => {
      const { error } = await store.upload(path, body, { contentType, upsert: true });
      if (error) throw new Error(`Couldn't save ${path}: ${error.message}`);
    };
    await up(clipPath(candidateId, "video"), mp4, "video/mp4");
    await up(clipPath(candidateId, "photo"), jpg, "image/jpeg");
    // The face picture is a plain crop of the real frame, a little brighter and sharper. Nothing is invented.
    let face = false;
    try {
      const shot = seenCandidate ? await look(jpg) : null;
      const lw = shot ? wordsOf(shot.label) : [];
      const box = shot && hasFace(shot) && !(lw.some((w) => staffWords.includes(w)) && !lw.some((w) => candWords.includes(w))) ? shot : null;
      if (box) {
        const sharp = (await import("sharp")).default;
        const meta = await sharp(jpg).metadata();
        const W = meta.width ?? 0;
        const H = meta.height ?? 0;
        const side = Math.min(W, H, Math.round(Math.max(box.w * W, box.h * H) * 2.1));
        const left = Math.max(0, Math.min(W - side, Math.round((box.x + box.w / 2) * W - side / 2)));
        const top = Math.max(0, Math.min(H - side, Math.round((box.y + box.h / 2) * H - side * 0.45)));
        const img = await sharp(jpg).extract({ left, top, width: side, height: side }).resize(360, 360).normalise().modulate({ brightness: 1.05 }).sharpen().jpeg({ quality: 86 }).toBuffer();
        await up(clipPath(candidateId, "face"), img, "image/jpeg");
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
    const error = ((e as Error).message ?? String(e)).slice(0, 300);
    const { data: fresh } = await db().from("candidates").select("application").eq("id", candidateId).maybeSingle();
    const app = { ...((fresh?.application as Record<string, string>) ?? {}) };
    app.clip_error = error;
    app.clip_tried_at = new Date().toISOString();
    await db().from("candidates").update({ application: app }).eq("id", candidateId);
    await logActivity("system", "clip_failed", { candidate_id: candidateId, error });
    return { ok: false, error };
  } finally {
    await rm(`${out}.mp4`, { force: true }).catch(() => {});
    await rm(`${out}.jpg`, { force: true }).catch(() => {});
  }
}


export async function makeWaitingClips(max = 1) {
  if (!(await callsAccount())?.videos) return { made: 0, why: "Video clips aren't allowed yet." };
  const { data: calls } = await db()
    .from("onboarding_calls")
    .select("candidate_id, ends_at, candidates(application)")
    .neq("status", "cancelled")
    .not("meet_space", "is", null)
    .lt("ends_at", new Date(Date.now() - 45 * 60_000).toISOString())
    .order("ends_at", { ascending: false })
    .limit(300);
  const rows = (calls ?? []) as unknown as { candidate_id: string; candidates: { application: Record<string, string> | null } | null }[];
  const seen = new Set<string>();
  const uniq = rows.filter((r) => r.candidates && !seen.has(r.candidate_id) && seen.add(r.candidate_id));
  const done = uniq.filter((r) => clipOf(r.candidates!.application)).length;
  // A failed one waits six hours before another try, unless the failure was a setting on Google's side
  // (then it's tried again as soon as that's fixed).
  const resting = (a: Record<string, string> | null) =>
    !!a?.clip_tried_at && Date.now() - Date.parse(a.clip_tried_at) < 6 * 36e5 && !/has not been used|is disabled|isn't connected/i.test(a.clip_error ?? "");
  const todo = uniq.filter((r) => !clipOf(r.candidates!.application) && !resting(r.candidates!.application)).slice(0, max);
  let made = 0;
  for (const r of todo) if ((await makeClip(r.candidate_id)).ok) made++;
  return { made, done: done + made, waiting: uniq.length - done - made };
}

export async function clipUrl(candidateId: string, kind: "video" | "photo" | "face") {
  const { data } = await db().storage.from(BUCKET).createSignedUrl(clipPath(candidateId, kind), 3600);
  return data?.signedUrl ?? null;
}
