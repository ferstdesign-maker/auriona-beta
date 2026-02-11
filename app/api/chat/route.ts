import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const models = [
    preferred,
    "gpt-5-mini",
    "gpt-4o-mini",
  ].filter(Boolean);

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
    const reply =
      outText.trim() ||
      "No pude responder ahora, intentemos de nuevo.";

    return NextResponse.json({
      reply,
      used_web: useWeb,
    });
  } catch (e: any) {
    const msg =
      e?.message ||
      e?.error?.message ||
      "Error desconocido";

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
