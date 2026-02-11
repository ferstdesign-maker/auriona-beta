import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message ?? "").trim();

    if (!message) return NextResponse.json({ title: "Conversación" });

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generá un título corto (máx 5 palabras) para una conversación según el primer mensaje del usuario. Sin comillas.",
        },
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    const title = (resp.choices?.[0]?.message?.content ?? "Conversación")
      .replace(/["“”]/g, "")
      .trim()
      .slice(0, 60);

    return NextResponse.json({ title: title || "Conversación" });
  } catch {
    return NextResponse.json({ title: "Conversación" });
  }
}
