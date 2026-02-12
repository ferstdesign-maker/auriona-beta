import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ URL de tu policy function
const POLICY_URL =
  "https://sunvfwrcgwvyknawxgkc.supabase.co/functions/v1/auri-policy";

const MARKER = "MARKER_API_2026_02_12";

async function auriPolicyCheck(args: {
  user_message: string;
  conversation_id?: string;
  user_id?: string;
  model_version?: string;
  policy_version?: string;
}) {
  const res = await fetch(POLICY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_message: args.user_message,
      conversation_id: args.conversation_id ?? "web",
      user_id: args.user_id ?? "anon",
      model_version: args.model_version ?? "vercel-beta",
      policy_version: args.policy_version ?? "0.0.1",
    }),
  });

  if (!res.ok) {
    return {
      action: "block",
      risk_level: "high",
      reason_codes: ["POLICY_UNAVAILABLE"],
      reply: "Ahora no puedo procesar eso. Probá de nuevo en un momento.",
    };
  }

  return await res.json();
}

// ✅ Detecta consultas que NECESITAN web (local/actualidad/compra)
function needsWeb(message: string) {
  const m = message.toLowerCase();

  const triggers = [
    // local / dónde / cerca
    "donde",
    "dónde",
    "acá",
    "aca",
    "aquí",
    "aqui",
    "cerca",
    "cerca de mi",
    "cerca de mí",
    "alrededor",
    "dirección",
    "direccion",
    "teléfono",
    "telefono",
    "whatsapp",
    "horario",
    "abierto",
    "cerrado",
    // compra / disponibilidad
    "comprar",
    "conseguir",
    "venden",
    "venda",
    "venta",
    "precio",
    "cuánto",
    "cuanto",
    // actualidad / noticias / clima
    "clima",
    "tiempo",
    "pronóstico",
    "pronostico",
    "noticias",
    "hoy",
    "mañana",
    "ayer",
  ];

  return triggers.some((t) => m.includes(t));
}

async function createResponseWithFallback(params: any, requireWebTool: boolean) {
  const preferred = process.env.OPENAI_MODEL?.trim();

  // ✅ IMPORTANTÍSIMO:
  // Cuando NECESITAMOS web_search, evitamos modelos que pueden no soportar/hacer tool correctamente.
  // Priorizamos modelos “grandes”/modernos, y dejamos mini como último recurso.
  const models = requireWebTool
    ? [preferred, "gpt-5", "gpt-4o", "gpt-5-mini"].filter(Boolean)
    : [preferred, "gpt-5-mini", "gpt-4o-mini"].filter(Boolean);

  let lastErr: any = null;

  for (const model of models) {
    try {
      const resp = await client.responses.create({
        ...params,
        model,
      });
      return resp;
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw lastErr;
}

// ✅ Recorta “paredes” si el modelo se pasa
function clampReply(text: string, hardMax: number) {
  const t = (text || "").trim();
  if (!t) return t;
  if (t.length <= hardMax) return t;

  const slice = t.slice(0, hardMax);
  const lastStop = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("?"),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("\n")
  );

  if (lastStop > Math.floor(hardMax * 0.6)) return slice.slice(0, lastStop + 1).trim();
  return slice.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body.message ?? "");
    const history = Array.isArray(body.history) ? body.history : [];
    const lang = String(body.lang ?? "es");
    const profile = body.profile ?? {};
    const location = body.location ?? {};

    const conversation_id = String(body.conversation_id ?? "web");
    const user_id = String(body.user_id ?? "anon");

    // ✅ Policy pre-check
    const policy = await auriPolicyCheck({
      user_message: message,
      conversation_id,
      user_id,
      model_version: "vercel-beta",
      policy_version: "0.0.1",
    });

    if (policy?.action && policy.action !== "allow") {
      return NextResponse.json({
        reply: String(policy.reply ?? "No puedo ayudar con eso."),
        used_web: false,
        source: "policy",
        marker: MARKER,
        policy: {
          action: policy.action,
          risk_level: policy.risk_level,
          reason_codes: policy.reason_codes,
          template_id: policy.template_id,
        },
      });
    }

    const useWeb = needsWeb(message);

    // ✅ System prompt: dos modos (normal vs web)
    const system = useWeb
      ? `
Sos Auriona (Auri), cálida, humana y directa.

MODO WEB (OBLIGATORIO):
- Tenés que usar web_search (sí o sí) para responder.
- No inventes NADA (ni nombres de negocios, ni direcciones).
- Devolvé 2 a 3 opciones reales.
- Para cada opción: Nombre + Dirección + Teléfono (si aparece) + Horario (si aparece).
- Si web_search no devuelve datos suficientes: decí "No encontré resultados confiables" y pedí ciudad/barrio exacto (1 pregunta).
- NO mandes al usuario a "Googlear". Vos resolvés con web_search.

Formato:
- 2–3 líneas por opción, bien corto.
- 1 sola pregunta al final.

Idioma: ${lang}
Usuario: ${profile.callUser ?? "amiga/o"}
Tu nombre: ${profile.callAssistant ?? "Auri"}
Ubicación: lat=${location.lat ?? "?"}, lon=${location.lon ?? "?"}
`.trim()
      : `
Sos Auriona (Auri), cálida y MUY humana. Nada robótico.

Reglas:
- Respuesta corta: 1 a 3 frases.
- Sin listas largas.
- 1 sola pregunta al final.
- No inventes.
- Salud/ley/finanzas: general + sugerir profesional si aplica.

Idioma: ${lang}
Usuario: ${profile.callUser ?? "amiga/o"}
Tu nombre: ${profile.callAssistant ?? "Auri"}
Ubicación: lat=${location.lat ?? "?"}, lon=${location.lon ?? "?"}
`.trim();

    const messages = [
      { role: "system" as const, content: system },
      ...history
        .filter((x: any) => x?.role && x?.content)
        .map((x: any) => ({
          role: x.role,
          content: String(x.content),
        })),
      { role: "user" as const, content: message },
    ];

    // ✅ Params: si hay web, damos un poco más de tokens para dirección/teléfono/horario
    const params: any = {
      input: messages,
      temperature: useWeb ? 0.2 : 0.25,
      max_output_tokens: useWeb ? 220 : 110,
      store: false,
    };

    if (useWeb) {
      params.tools = [{ type: "web_search" }];
      // ✅ clave: forzamos que use el tool
      params.tool_choice = { type: "web_search" };
    }

    const resp = await createResponseWithFallback(params, useWeb);

    const outText = (resp as any).output_text ?? "";
    const replyRaw = outText.trim() || "No pude responder ahora. ¿Querés que lo intentemos de nuevo?";

    // ✅ recorte: más permisivo en modo web
    const reply = clampReply(replyRaw, useWeb ? 900 : 520);

    return NextResponse.json({
      reply,
      used_web: useWeb,
      source: "llm",
      marker: MARKER,
    });
  } catch (e: any) {
    const msg = e?.message || e?.error?.message || "Error desconocido";
    console.error("API /chat error:", e);

    return NextResponse.json(
      {
        reply: "Error de servidor. Probá de nuevo.",
        debug: String(msg),
      },
      { status: 500 }
    );
  }
}
