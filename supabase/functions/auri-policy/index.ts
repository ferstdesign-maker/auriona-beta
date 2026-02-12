import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RiskLevel = "low" | "medium" | "high";
type ActionTaken = "allow" | "redirect" | "block";

function fp(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return `h_${h.toString(16)}`;
}

function hasAny(t: string, list: string[]) {
  return list.some((k) => t.includes(k));
}

/**
 * ✅ Detección simple (hoy) + respuestas humanas cortas (≤75 chars)
 * Luego la afinamos por categorías.
 */
function detect(userMessage: string) {
  const t = userMessage.toLowerCase();

  // Señales de instrucción/acción (cuando el usuario pide pasos)
  const wantsSteps = hasAny(t, ["paso a paso", "como hago", "cómo hago", "tutorial", "guia", "guía", "instrucciones"]);
  const evasion = hasAny(t, ["sin que se den cuenta", "indetectable", "sin rastros", "anonimo", "anónimo"]);

  // Dominios de alto riesgo (bloqueo)
  const highDomain = hasAny(t, [
    "suicid", "matarme", "me quiero morir", "autoles",
    "arma", "bomba", "explosiv", "veneno",
    "hackear", "phishing", "estafa", "carding", "lavado",
    "espiar", "grabar oculto", "stalkerware",
    "terror", "extrem", "reclut",
    "porn", "abuso", "menor"
  ]);

  // Dominios sensibles (redirección suave, sin drama)
  const mediumDomain = hasAny(t, [
    "dosis", "medicacion", "medicación", "embarazo", "sintoma", "síntoma",
    "denuncia", "abogado", "herencia",
    "deuda", "apuestas", "ludopat"
  ]);

  let risk_level: RiskLevel = "low";
  let action: ActionTaken = "allow";
  let reason_codes: string[] = ["GENERAL"];
  let template_id: string | null = null;

  // ✅ Si hay dominio high + pedido de pasos/evasión => bloqueo directo
  if ((highDomain && wantsSteps) || (highDomain && evasion)) {
    risk_level = "high";
    action = "block";
    reason_codes = ["HIGH_RISK_INSTRUCTIONS"];
    template_id = "TPL_BLOCK_ILLEGAL";
  } else if (highDomain) {
    // ✅ High sin pasos (igual bloqueamos, pero con texto corto)
    risk_level = "high";
    action = "block";
    reason_codes = ["HIGH_RISK_DOMAIN"];
    template_id = "TPL_BLOCK_ILLEGAL";
  } else if (mediumDomain) {
    // ✅ Sensible: redirección corta, humana
    risk_level = "medium";
    action = "redirect";
    reason_codes = ["SENSITIVE_DOMAIN"];
    template_id = "TPL_REDIRECT_SENSITIVE";
  }

  return { risk_level, action, reason_codes, template_id };
}

/**
 * ✅ Plantillas MUY CORTAS (≤75 caracteres)
 * Regla: sin drama, sin robot, sin sermón.
 */
function tpl(id: string) {
  if (id === "TPL_BLOCK_ILLEGAL") {
    // ≤75 chars
    return "No puedo ayudar con eso. ¿Qué querés lograr en general?";
  }
  if (id === "TPL_REDIRECT_SENSITIVE") {
    // ≤75 chars
    return "Eso es delicado. ¿Querés info general o te armo preguntas?";
  }
  // fallback ≤75 chars
  return "No puedo con eso. Contame el objetivo y buscamos otra opción.";
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const user_message = String(body?.user_message ?? "").trim();
    const conversation_id = String(body?.conversation_id ?? "");
    const user_id = String(body?.user_id ?? "anon");
    const model_version = String(body?.model_version ?? "unknown");
    const policy_version = String(body?.policy_version ?? "0.0.1");

    if (!user_message) {
      return new Response(JSON.stringify({ error: "missing user_message" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const decision = detect(user_message);

    const conversation_hash = fp(conversation_id || "no_convo");
    const user_hash = fp(user_id);
    const message_fingerprint = fp(user_message.slice(0, 200));

    // Evento mínimo siempre
    await supabase.from("policy_events").insert({
      event_type: `POLICY_${decision.action.toUpperCase()}`,
      risk_level: decision.risk_level,
      reason_codes: decision.reason_codes.join(","), // safe si tu col es text
      policy_version,
      conversation_hash,
      user_hash,
    });

    // Incidente solo si medium/high
    if (decision.risk_level !== "low") {
      await supabase.from("incident_records").insert({
        risk_level: decision.risk_level,
        action_taken: decision.action,
        reason_codes: decision.reason_codes.join(","), // safe si tu col es text
        template_id: decision.template_id,
        policy_version,
        model_version,
        conversation_hash,
        message_fingerprint,
      });
    }

    // Respuesta
    if (decision.action === "allow") {
      return new Response(JSON.stringify({
        action: "allow",
        risk_level: "low",
        reason_codes: decision.reason_codes,
      }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      action: decision.action,
      risk_level: decision.risk_level,
      reason_codes: decision.reason_codes,
      template_id: decision.template_id,
      reply: tpl(decision.template_id ?? "TPL_BLOCK_ILLEGAL"),
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
