import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    // Supabase inyecta las claves modernas como JSON. Dejamos
    // compatibilidad con las variables legacy por si el proyecto aún las expone.
    const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

    let publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    let serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    try {
      if (!publishableKey && publishableKeysRaw) {
        publishableKey = JSON.parse(publishableKeysRaw)?.default || "";
      }
      if (!serviceRoleKey && secretKeysRaw) {
        serviceRoleKey = JSON.parse(secretKeysRaw)?.default || "";
      }
    } catch (parseError) {
      console.error("No se pudieron interpretar las claves modernas de Supabase:", parseError);
    }

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      console.error("Faltan variables de entorno de Supabase.");
      return json({ error: "La función no está configurada correctamente." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "No hay una sesión autenticada." }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    // Cliente con la clave pública: se usa únicamente para validar quién llama.
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return json({ error: "Sesión no válida o expirada." }, 401);
    }

    // Cliente administrativo: SOLO vive dentro de la Edge Function.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: masterProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("id,rol,activo")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !masterProfile || masterProfile.rol !== "MASTER" || masterProfile.activo !== true) {
      return json({ error: "Solo el usuario MASTER puede realizar esta operación." }, 403);
    }

    const body = await req.json();
    const action = String(body?.action || "reset").trim().toLowerCase();

    if (action === "list") {
      const { data: profiles, error: listError } = await adminClient
        .from("profiles")
        .select("id,nombre,email,rol,activo")
        .in("rol", ["ADMIN", "VENTAS"])
        .order("rol", { ascending: true });

      if (listError) {
        console.error("Error al listar usuarios:", listError);
        return json({ error: "No se pudieron consultar los usuarios." }, 500);
      }

      return json({ ok: true, profiles: profiles || [] });
    }

    if (action !== "reset") {
      return json({ error: "Operación no válida." }, 400);
    }

    const targetUserId = String(body?.targetUserId || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!targetUserId || !newPassword) {
      return json({ error: "Falta el usuario o la nueva contraseña." }, 400);
    }

    if (newPassword.length < 6) {
      return json({ error: "La nueva contraseña debe tener al menos 6 caracteres." }, 400);
    }

    if (targetUserId === userData.user.id) {
      return json({ error: "Para MASTER, utiliza Mi cuenta → Cambiar contraseña." }, 400);
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id,nombre,email,rol,activo")
      .eq("id", targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return json({ error: "No se encontró el perfil seleccionado." }, 404);
    }

    if (!["ADMIN", "VENTAS"].includes(targetProfile.rol)) {
      return json({ error: "MASTER solo puede restablecer ADMIN o VENTAS." }, 403);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword },
    );

    if (updateError) {
      console.error("Error de Supabase Auth:", updateError);
      return json({ error: updateError.message || "No se pudo restablecer la contraseña." }, 500);
    }

    return json({
      ok: true,
      message: `Contraseña de ${targetProfile.rol} restablecida correctamente.`,
    });
  } catch (error) {
    console.error("Error inesperado:", error);
    return json({ error: "Ocurrió un error al restablecer el acceso." }, 500);
  }
});
