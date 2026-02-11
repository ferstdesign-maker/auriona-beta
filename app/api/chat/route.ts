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
    "btc",
    "bitcoin",
    "hoy",
    "mañana",
    "ayer",
    "noticias",
    "último",
    "reciente",
    "actualizado",
    "horario",
    "abierto",
    "cerrado",
    "cuánto cuesta",
    "dónde queda",
    "teléfono",
    "dirección",
  ];
  return triggers.some((t) => m.includes(t));
}

function safeStyleNote(style_notes: string | null) {
  if (!style_notes) return "";
  return style_notes.slice(0, 600);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = String(body.message ?? "");
    const history = Array.isArray(body.history) ? body.history : [];
    const lang = String(body.lang ?? "es");
    const profile = body.profile ?? {};
    const location = body.location ?? {};

    // ⚠️ Hard rules mínimas (luego las refinamos)
    const system = `
Sos Auriona (Auri). Tono: cálido, simple, rioplatense si es español.
Reglas:
- Si falta un dato (ej: ciudad para clima), pedilo UNA vez, cortito.
- Si el usuario pide datos actuales, usá web search cuando esté disponible.
- No inventes. Si no encontrás, decí "no pude confirmarlo" y ofrecé alternativa.
- Respetá privacidad: solo recordá lo que el usuario te dijo en esta sesión (o lo guardado por el sistema).
Idioma del usuario: ${lang}.
Nombre para el usuario: ${profile.callUser ?? "amiga/o"}.
Tu nombre: ${profile.callAssistant ?? "Auri"}.
Ubicación aproximada (si hay): lat=${location.lat ?? "?"}, lon=${location.lon ?? "?"}.
    `.trim();

    // Preparamos mensajes
    const messages = [
      { role: "system" as const, content: system },
      ...history
        .filter((x: any) => x?.role && x?.content)
        .map((x: any) => ({ role: x.role, content: String(x.content) })),
      { role: "user" as const, content: message },
    ];

    const useWeb = needsWeb(message);

    // ✅ Responses API con web search (cuando aplica)
    const resp = await client.responses.create({
      model: "gpt-5-mini", // podés subir luego
      input: messages,
      // si no hace falta web, no lo incluimos
      ...(useWeb
        ? {
            tools: [{ type: "web_search" }],
          }
        : {}),
      temperature: 0.6,
    });

    // sacamos el texto final (simple)
    const outText = resp.output_text ?? "";
    const reply = outText.trim() || "Perdón, no pude generar respuesta.";

    return NextResponse.json({ reply, used_web: useWeb });
  } catch (e: any) {
    return NextResponse.json({ reply: "Error de servidor. Probá de nuevo.", error: String(e?.message ?? e) }, { status: 500 });
  }
}
