import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message ?? "").trim();
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ reply: "Decime algo 🙂" });
    }

    // Armamos el contexto de conversación:
    // - system: reglas claras
    // - historial: user/assistant
    // - último mensaje
    const inputMessages = [
      {
        role: "system",
        content:
          "Sos Auriona (beta). Respondés en español rioplatense, claro y directo. " +
          "Usá el historial de conversación para mantener contexto. " +
          "Si el usuario te contó un dato personal dentro del chat (por ejemplo: 'mi hija se llama Iara'), " +
          "podés recordarlo y repetirlo. No digas que no tenés acceso a info personal si ya fue mencionada en esta conversación. " +
          "Si falta un dato clave, hacé 1 pregunta corta.",
      },
      ...history
        .filter((m: any) => m && typeof m.content === "string")
        .map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content),
        })),
      { role: "user", content: message },
    ];

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: inputMessages as any,
      temperature: 0.7,
    });

    const reply =
      resp.choices?.[0]?.message?.content?.trim() ||
      "No pude generar respuesta. Probemos de nuevo.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json(
      { reply: "Error del servidor: " + (err?.message ?? "desconocido") },
      { status: 500 }
    );
  }
}
