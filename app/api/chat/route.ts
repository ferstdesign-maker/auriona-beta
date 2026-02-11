import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function needsWeb(message: string) {
  const m = message.toLowerCase();
  const triggers = [
    "clima",
    "tiempo",
    "pronóstico",
    "precio",
    "cotización",
    "dólar",
    "noticias",
    "hoy",
    "mañana",
    "ayer",
    "horario",
    "abierto",
    "cerrado",
    "dónde",
    "direccion",
    "dirección",
    "teléfono",
    "telefono",
    "comprar",
    "local",
    "cerca",
    "trelew",
    "helado",
    "farmacia",
    "hospital",
  ];
  return triggers.some((t) => m.includes(t));
}

async function createResponseWithFallback(params: any) {
  const preferred = process.env.OPENAI_MODEL?.trim();
  const models = [preferred, "gpt-5", "gpt-5-mini", "gpt-4o-mini", "gpt-4.1-mini"].filter(Boolean);

  let lastErr: any = null;
  for (const model of models) {
    try {
      return await client.responses.create({ ...params, model });
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

    // ✅ Estilo “Auri”: corto + progresivo
    const system = `
Sos Auriona ("Auri"). Tono: cálido, rioplatense, mujer, cercano, sin exagerar.
Formato obligatorio:
- Máximo 6 líneas.
- Si el usuario pide lugares/recomendaciones: primero listá SOLO nombres (3–6) y preguntá cuál prefiere o qué zona.
- NO pongas direcciones, teléfonos, horarios, ratings, precios, ni links en el primer mensaje.
- Si el usuario también mete un tema de salud en la misma pregunta:
  - respondé en 2 partes: (1) lugares (corto) + (2) consejos generales seguros (corto)
  - sin diagnosticar. Indicá “señales de alarma” y sugerí consulta profesional si aplica.
Web:
- Si necesita datos actuales/locales, usá web search. Si no encontrás, decí “no pude confirmarlo” y pedí 1 dato.
No uses markdown pesado (no guiones bajos, no listas largas). Nada de “Cerrado · 4.5 (X reseñas)”.
Idioma: ${lang}
Nombre del usuario: ${profile.callUser ?? "amiga/o"}
Tu nombre: ${profile.callAssistant ?? "Auri"}
Ubicación (si hay): lat=${location.lat ?? "?"}, lon=${location.lon ?? "?"}
    `.trim();

    const messages = [
      { role: "system" as const, content: system },
      ...history
        .filter((x: any) => x?.role && x?.content)
        .map((x: any) => ({ role: x.role, content: String(x.content) })),
      { role: "user" as const, content: message },
    ];

    const useWeb = needsWeb(message);

    const params: any = {
      input: messages,
      temperature: 0.5,
      store: false,
      max_output_tokens: 220, // ✅ evita biblias
    };

    if (useWeb) {
      params.tools = [{ type: "web_search" }];
      params.tool_choice = "auto";
    }

    const resp = await createResponseWithFallback(params);

    const outText = (resp as any).output_text ?? "";
    const reply = outText.trim() || "Perdón, no pude generar respuesta.";

    return NextResponse.json({ reply, used_web: useWeb });
  } catch (e: any) {
    const status = e?.status || 500;
    const msg = e?.message || e?.error?.message || (typeof e === "string" ? e : "Unknown error");
    console.error("API /chat error:", e);
    return NextResponse.json({ reply: "Error de servidor. Probá de nuevo.", debug: String(msg) }, { status });
  }
}
