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

// supabase/functions/admin-decide/index.ts
var DECISIONS = ["keine", "verwarnen", "24h", "7tage", "dauerhaft", "name"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await caller(req);
  if (!user) return json({ error: "auth" }, 401);
  let body = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = {};
  }
  const decision = String(body.decision ?? "");
  if (!DECISIONS.includes(decision)) return json({ error: "decision" }, 400);
  const db = admin();
  const adminRow = await db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!adminRow.data) return json({ error: "admin" }, 403);
  const applied = await db.rpc("admin_apply", {
    p_admin: user.id,
    p_report: body.report,
    p_decision: decision,
    p_note: typeof body.note === "string" ? body.note.slice(0, 200) : ""
  });
  return json(applied.data ?? { error: "apply" });
});
