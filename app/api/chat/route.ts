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

// ✅ Pre-check (Gobernanza) — se ejecuta ANTES de llamar al LLM
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

  // Fail-safe: si policy falla, bloqueamos (mejor seguro)
  if (!res.ok) {
    return {
      action: "block",
      risk_level: "high",
      reason_codes: ["POLICY_UNAVAILABLE"],
      reply: "No puedo procesar esto ahora. Probá de nuevo en un momento.",
    };
  }

  return await res.json();
}

function needsWeb(message: string) {
  const m = message.toLowerCase();
  const triggers = [
    "clima",
    "tiempo",
    "pronóstico",
    "precio",
    "dólar",
    "noticias",
    "hoy",
    "mañana",
    "dónde",
    "dirección",
    "comprar",
    "horario",
    "trelew",
  ];
  return triggers.some((t) => m.includes(t));
}

async function createResponseWithFallback(params: any) {
  const preferred = process.env.OPENAI_MODEL?.trim();

  const models = [preferred, "gpt-5-mini", "gpt-4o-mini"].filter(Boolean);

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body.message ?? "");
    const history = Array.isArray(body.history) ? body.history : [];
    const lang = String(body.lang ?? "es");
    const profile = body.profile ?? {};
    const location = body.location ?? {};

    // ✅ IDs simples (no te rompo nada)
    // Si después tenés auth real, acá metemos el user_id real.
    const conversation_id = String(body.conversation_id ?? "web");
    const user_id = String(body.user_id ?? "anon");

    // ✅ PASO 10: Policy pre-check ANTES de OpenAI
    const policy = await auriPolicyCheck({
      user_message: message,
      conversation_id,
      user_id,
      model_version: "vercel-beta",
      policy_version: "0.0.1",
    });

    // Si no es allow: devolvemos plantilla segura y NO llamamos al LLM
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

    const system = `
Sos Auriona (Auri), asistente cálida y humana.

Reglas:
- Respondé breve.
- Frases cortas.
- Nada robotizado.
- Sin listas largas.
- 1 pregunta al final.
- Tono rioplatense amigable.
- Si requiere datos actuales/locales → usá web search.
- No inventes.
- Salud → consejos generales + sugerir profesional si aplica.

Idioma: ${lang}
Usuario: ${profile.callUser ?? "amiga/o"}
Tu nombre: ${profile.callAssistant ?? "Auri"}
Ubicación: lat=${location.lat ?? "?"}, lon=${location.lon ?? "?"}

Estilo: conversación natural, como hablar con un amigo.
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

    const useWeb = needsWeb(message);

    const params: any = {
      input: messages,
      temperature: 0.35,
      max_output_tokens: 140,
      store: false,
    };

    if (useWeb) {
      params.tools = [{ type: "web_search" }];
      params.tool_choice = "auto";
    }

    const resp = await createResponseWithFallback(params);

    const outText = (resp as any).output_text ?? "";
    const reply = outText.trim() || "No pude responder ahora, intentemos de nuevo.";

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
