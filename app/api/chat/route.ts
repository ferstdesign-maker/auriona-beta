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
    "dirección",
    "teléfono",
    "comprar",
    "local",
    "helado",
    "trelew",
  ];
  return triggers.some((t) => m.includes(t));
}

async function createResponseWithFallback(params: any) {
  // Intentamos en orden. Si un modelo no existe en tu cuenta, probamos otro.
  const preferred = process.env.OPENAI_MODEL?.trim();
  const models = [
    preferred,
    "gpt-5",
    "gpt-5-mini",
    "gpt-4o-mini",
    "gpt-4.1-mini",
  ].filter(Boolean);

  let lastErr: any = null;

  for (const model of models) {
    try {
      const resp = await client.responses.create({ ...params, model });
      return resp;
    } catch (e: any) {
      lastErr = e;
      // seguimos probando
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
Sos Auriona (Auri). Tono: cálido, simple y útil.
Reglas importantes:
- Si la consulta necesita datos actuales/locales (ej: lugares, horarios, clima, precios), intentá usar web search.
- No inventes. Si no encontrás, decí “No pude confirmarlo” y pedí 1 dato puntual o proponé alternativa.
- Salud: no diagnostiques. Para dolor de rodilla, da consejos generales seguros y sugerí consulta profesional si hay señales de alarma.
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
      temperature: 0.6,
      store: false,
    };

    // ✅ Solo si hace falta: habilitamos web_search
    if (useWeb) {
      params.tools = [{ type: "web_search" }];
      params.tool_choice = "auto";
      // opcional: si querés ver fuentes completas algún día:
      // params.include = ["web_search_call.action.sources"];
    }

    const resp = await createResponseWithFallback(params);

    const outText = (resp as any).output_text ?? "";
    const reply = outText.trim() || "Perdón, no pude generar respuesta.";

    return NextResponse.json({ reply, used_web: useWeb });
  } catch (e: any) {
    // ✅ MUY IMPORTANTE: devolvemos el error real para debug
    const status = e?.status || 500;
    const msg =
      e?.message ||
      e?.error?.message ||
      (typeof e === "string" ? e : "Unknown error");

    console.error("API /chat error:", e);

    return NextResponse.json(
      {
        reply: "Error de servidor. Probá de nuevo.",
        debug: String(msg),
      },
      { status }
    );
  }
}
