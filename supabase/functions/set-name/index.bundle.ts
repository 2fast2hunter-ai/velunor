// src/adventure/online/name.ts
var NAME_MIN = 3;
var NAME_MAX = 16;
var NAME_CHANGE_MS = 7 * 24 * 60 * 60 * 1e3;
var BLOCKED = /* @__PURE__ */ new Set([
  "arsch",
  "fotze",
  "hurensohn",
  "missgeburt",
  "nazi",
  "neger",
  "nigger",
  "faggot",
  "fuck",
  "fuk",
  "fack",
  "shit",
  "bitch",
  "cunt",
  "retard",
  "whore",
  "hitler"
]);
var LEET = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s"
};
var HOMO = {
  "\u0430": "a",
  "\u0410": "a",
  "\u0435": "e",
  "\u0415": "e",
  "\u043E": "o",
  "\u041E": "o",
  "\u0440": "p",
  "\u0420": "p",
  "\u0441": "c",
  "\u0421": "c",
  "\u0443": "y",
  "\u0423": "y",
  "\u0445": "x",
  "\u0425": "x",
  "\u0456": "i",
  "\u0406": "i",
  "\u0455": "s",
  "\u0405": "s",
  "\u03BF": "o",
  "\u039F": "o",
  "\u03BD": "v"
};
function nameLetters(raw) {
  const lower = raw.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
  const swapped = [...lower].map((ch) => HOMO[ch] ?? LEET[ch] ?? ch).join("").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/ph/g, "f").replace(/v/g, "u");
  return swapped.replace(/[^a-z]/g, "");
}
function collapseRepeats(letters, keep) {
  return letters.replace(/(.)\1+/g, (run, ch) => ch.repeat(Math.min(keep, run.length)));
}
function nameIssue(raw) {
  const name = raw.trim();
  if (name.length < NAME_MIN) return "short";
  if (name.length > NAME_MAX) return "long";
  if (!/^[\p{L}\p{N} ]+$/u.test(name)) return "chars";
  const letters = nameLetters(name);
  const forms = [collapseRepeats(letters, 2), collapseRepeats(letters, 1)];
  if (forms.some((form) => BLOCKED.has(form))) return "word";
  return null;
}
function planNameSave(existing, nextName, now) {
  if (existing && !nameChangeAllowed(existing.changedAt, now)) return { ok: false, error: "wait" };
  return { ok: true, hidden: Boolean(existing?.hidden), same: existing?.name === nextName.trim() };
}
function nameChangeAllowed(changedAt, now) {
  if (changedAt == null || !(changedAt > 0)) return true;
  return now - changedAt >= NAME_CHANGE_MS;
}
function pickTag(taken, rng) {
  const used = new Set(taken);
  for (let i = 0; i < 40; i += 1) {
    const tag = String(Math.floor(rng() * 1e4)).padStart(4, "0");
    if (!used.has(tag)) return tag;
  }
  for (let n = 0; n < 1e4; n += 1) {
    const tag = String(n).padStart(4, "0");
    if (!used.has(tag)) return tag;
  }
  return null;
}
function publicLabel(name, tag, hidden) {
  return hidden ? `Spieler#${tag}` : `${name}#${tag}`;
}

// supabase/functions/_shared/admin.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
var cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
function admin() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}
async function caller(req) {
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
  });
  const { data } = await client.auth.getUser();
  return data.user ? { id: data.user.id } : null;
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

// supabase/functions/set-name/index.ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await caller(req);
  if (!user) return json({ error: "auth" }, 401);
  const body = await req.json().catch(() => ({}));
  const issue = nameIssue(String(body.name ?? ""));
  if (issue) return json({ error: issue }, 400);
  const name = String(body.name).trim();
  const db = admin();
  const existing = await db.from("player_names").select("name, tag, hidden, changed_at").eq("user_id", user.id).maybeSingle();
  const row = existing.data;
  const plan = planNameSave(row ? {
    name: String(row.name),
    tag: String(row.tag),
    hidden: Boolean(row.hidden),
    changedAt: Date.parse(String(row.changed_at))
  } : null, name, Date.now());
  if (!plan.ok) return json({ error: plan.error }, 400);
  let tag = row?.tag ?? "";
  if (!row || row.name !== name) {
    const taken = await db.from("player_names").select("tag").eq("name", name).neq("user_id", user.id);
    const tags = (taken.data ?? []).map((item) => String(item.tag));
    if (row && !tags.includes(row.tag)) tag = row.tag;
    else {
      const next = pickTag(tags, Math.random);
      if (!next) return json({ error: "taken" }, 409);
      tag = next;
    }
  }
  const display = publicLabel(name, tag, plan.hidden);
  const { error } = await db.from("player_names").upsert({
    user_id: user.id,
    name,
    tag,
    display,
    hidden: plan.hidden,
    changed_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) return json({ error: "taken" }, 409);
  return json({ label: display });
});
