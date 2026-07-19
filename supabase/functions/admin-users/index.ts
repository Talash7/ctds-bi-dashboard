import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ROLES = ["admin", "dean", "registrar", "coordinator"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "Ctds-" + Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 12) + "!1";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Verify the caller with their own JWT (respects RLS) before doing anything privileged.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Invalid session" }, 401);

    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin role required" }, 403);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, ...body } = await req.json();

    if (action === "list") {
      const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (authError) throw new Error(authError.message);

      const { data: profiles } = await admin.from("profiles").select("id, full_name, email");
      const { data: roles } = await admin.from("user_roles").select("user_id, role");

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
      const rolesByUser = new Map<string, string[]>();
      for (const r of roles ?? []) {
        rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role]);
      }

      const users = authUsers.users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: profileById.get(u.id)?.full_name ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: rolesByUser.get(u.id) ?? [],
      }));

      return json({ users });
    }

    if (action === "create") {
      const { email, full_name, role } = body;
      if (!email || typeof email !== "string") return json({ error: "email is required" }, 400);
      if (role && !VALID_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);

      const tempPassword = generateTempPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: full_name ? { full_name } : undefined,
      });
      if (createError) throw new Error(createError.message);

      await admin.from("profiles").insert({
        id: created.user.id,
        email,
        full_name: full_name ?? null,
      });

      if (role) {
        await admin.from("user_roles").insert({ user_id: created.user.id, role });
      }

      return json({ user_id: created.user.id, temp_password: tempPassword });
    }

    if (action === "set_role") {
      const { user_id, role } = body;
      if (!user_id || !VALID_ROLES.includes(role)) {
        return json({ error: "user_id and a valid role are required" }, 400);
      }
      await admin.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await admin.from("user_roles").insert({ user_id, role });
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (action === "remove_role") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id is required" }, 400);
      const { error } = await admin.from("user_roles").delete().eq("user_id", user_id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
