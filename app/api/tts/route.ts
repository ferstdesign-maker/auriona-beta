import { NextResponse } from "next/server";

export const runtime = "nodejs";

// hard cap para evitar requests caros
const HARD_TTS_MAX = 160;

function clampForTTS(text: string, maxChars: number) {
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
    lastStop > Math.floor(maxChars * 0.55) ? slice.slice(0, lastStop + 1) : slice;

  return cut.trim() + "…";
}

function pickVoiceId(lang: string) {
  // prioridad: ES_AR -> ES_LATAM -> fallback genérico
  const esAr = (process.env.ELEVENLABS_VOICE_ES_AR || "").trim();
  const esLatam = (process.env.ELEVENLABS_VOICE_ES_LATAM || "").trim();
  const generic = (process.env.ELEVENLABS_VOICE_ID || "").trim();

  if ((lang || "").toLowerCase().startsWith("es")) return esAr || esLatam || generic;
  return esAr || esLatam || generic;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    vercel: Boolean(process.env.VERCEL),
    env: {
      ELEVENLABS_API_KEY: Boolean(process.env.ELEVENLABS_API_KEY),
      ELEVENLABS_VOICE_ES_AR: (process.env.ELEVENLABS_VOICE_ES_AR || "").trim(),
      ELEVENLABS_VOICE_ES_LATAM: (process.env.ELEVENLABS_VOICE_ES_LATAM || "").trim(),
      ELEVENLABS_MODEL_ID: (process.env.ELEVENLABS_MODEL_ID || "").trim() || "eleven_turbo_v2_5",
    },
    note:
      "Si ELEVENLABS_VOICE_ES_AR/ES_LATAM está vacío, la voz queda indefinida. Si ELEVENLABS_API_KEY=false, TTS nunca va a andar.",
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = (process.env.ELEVENLABS_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY", hint: "Seteala en .env.local y en Vercel (Project Settings → Environment Variables)." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const lang = String(body?.lang || "es");
    const rawText = String(body?.text || "");
    const text = clampForTTS(rawText, HARD_TTS_MAX);

    if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

    const voiceId = pickVoiceId(lang);
    if (!voiceId) {
      return NextResponse.json(
        {
          error: "Missing voice id",
          hint: "Set ELEVENLABS_VOICE_ES_AR o ELEVENLABS_VOICE_ES_LATAM (o ELEVENLABS_VOICE_ID).",
        },
        { status: 500 }
      );
    }

    const modelId = (process.env.ELEVENLABS_MODEL_ID || "").trim() || "eleven_turbo_v2_5";

    const url =
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}` +
      `?output_format=mp3_22050_32`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.85,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    const ct = (upstream.headers.get("content-type") || "").toLowerCase();

    // Si responde error (o si por alguna razón devuelve JSON), devolvemos JSON con detalle
    if (!upstream.ok || ct.includes("application/json")) {
      const detail = ct.includes("application/json")
        ? JSON.stringify(await upstream.json().catch(() => ({})))
        : await upstream.text().catch(() => "");

      const s = detail.toLowerCase();
      const isQuota =
        s.includes("quota") || s.includes("credits") || s.includes("insufficient") || s.includes("quota_exceeded");

      return NextResponse.json(
        {
          error: "TTS failed",
          status: upstream.status,
          code: isQuota ? "quota_exceeded" : "upstream_error",
          detail: detail.slice(0, 1200),
          hint: isQuota
            ? "ElevenLabs sin créditos / cuota. Bajá el texto o recargá el plan."
            : "Revisá ELEVENLABS_API_KEY, voiceId y modelId.",
        },
        { status: 502 }
      );
    }

    const audioBuf = await upstream.arrayBuffer();

    return new Response(audioBuf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store, max-age=0",
        "X-Auriona-TTS": "ok",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "TTS route error", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}