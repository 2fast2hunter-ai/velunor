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

// supabase/functions/delete-account/index.ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await caller(req);
  if (!user) return json({ error: "auth" }, 401);
  const db = admin();
  await db.rpc("guild_act", { p_user: user.id, p_body: { action: "leave" } });
  await db.rpc("anonymize_chat", { p_user: user.id });
  await db.from("reports").update({ reporter: null }).eq("reporter", user.id);
  await db.from("monsters_owned").delete().eq("owner", user.id);
  await db.from("blocks").delete().eq("owner", user.id);
  await db.from("player_names").delete().eq("user_id", user.id);
  await db.from("profiles").delete().eq("user_id", user.id);
  await db.from("saves").delete().eq("user_id", user.id);
  await db.from("events").delete().eq("player_id", user.id);
  const removed = await db.auth.admin.deleteUser(user.id);
  if (removed.error) return json({ error: "auth" }, 500);
  return json({ ok: true });
});
