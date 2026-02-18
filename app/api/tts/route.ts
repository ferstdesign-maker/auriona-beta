import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ✅ cortito para no gastar créditos y para evitar “biblia hablada”
function clampText(text: string, maxChars: number) {
  const t = String(text || "").trim();
  if (!t) return "";
  if (t.length <= maxChars) return t;

  const slice = t.slice(0, maxChars);
  const lastStop = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("?"),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("\n")
  );

  const cut =
    lastStop > Math.floor(maxChars * 0.55)
      ? slice.slice(0, lastStop + 1)
      : slice;

  return cut.trim() + "…";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const textRaw = String(body.text ?? "");
    const lang = String(body.lang ?? "es");

    const text = clampText(textRaw, 120);
    if (!text) {
      return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID || "ZScDvbhkt3lKiar8WknB";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta ELEVENLABS_API_KEY (en Vercel o en .env.local)" },
        { status: 500 }
      );
    }

    // ✅ IMPORTANTE:
    // - NO mandamos speech_rate (rompe)
    // - el “ritmo/punch” lo controlás con playbackRate en el navegador
    const payload: any = {
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.28,
        similarity_boost: 0.85,
        style: 0.55,
        use_speaker_boost: true,
      },
    };

    // Si querés, mantenemos language_code SOLO si está soportado.
    // Si llegara a fallar, lo sacamos del todo.
    if (lang === "es") payload.language_code = "es";
    if (lang === "en") payload.language_code = "en";
    if (lang === "pt") payload.language_code = "pt";

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return NextResponse.json(
        {
          error: "ElevenLabs falló",
          status: r.status,
          detail,
        },
        { status: 502 }
      );
    }

    const audio = await r.arrayBuffer();

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "TTS error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
