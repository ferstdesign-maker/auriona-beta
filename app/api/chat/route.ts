import { NextResponse } from "next/server";

function looksLikeWeatherQuestion(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("clima") ||
    m.includes("tiempo ") ||
    m.includes("temperatura") ||
    m.includes("pronóstico") ||
    m.includes("pronostico") ||
    m.includes("llueve") ||
    m.includes("va a llover") ||
    m.includes("viento")
  );
}

function extractCity(message: string) {
  // Heurística simple: "clima en X", "tiempo en X", "temperatura en X"
  const m = message.trim();

  const patterns = [
    /clima en ([^?.!,\n]+)$/i,
    /tiempo en ([^?.!,\n]+)$/i,
    /temperatura en ([^?.!,\n]+)$/i,
    /pron[oó]stico en ([^?.!,\n]+)$/i,
  ];

  for (const p of patterns) {
    const match = m.match(p);
    if (match && match[1]) return match[1].trim();
  }

  // Si pone "en Trelew?" con signo, lo capturamos
  const generic = m.match(/\ben\b\s+([^?.!,\n]+)$/i);
  if (generic && generic[1]) return generic[1].trim();

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const message = String(body?.message ?? "");
    const history = Array.isArray(body?.history) ? body.history : [];

    // location opcional desde el frontend
    const location = body?.location || {};
    const lat = location?.lat != null ? Number(location.lat) : null;
    const lon = location?.lon != null ? Number(location.lon) : null;

    // Idioma (por ahora solo lo pasamos como contexto)
    const uiLang = String(body?.lang ?? "es");

    // ✅ 1) Si es clima → respondemos con Open-Meteo (sin pasar por OpenAI)
    if (looksLikeWeatherQuestion(message)) {
      const cityFromText = extractCity(message);
      const city = cityFromText || String(location?.city ?? "").trim();

      const r = await fetch(new URL("/api/weather", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, lat, lon }),
      });

      const data = await r.json().catch(() => ({}));
      if (data?.ok && data?.text) {
        return NextResponse.json({ reply: data.text }, { status: 200 });
      }

      // Si no pudo, caemos a un mensaje humano (sin inventar)
      const fallback = data?.error
        ? `No pude obtener el clima ahora: ${data.error}`
        : "No pude obtener el clima ahora.";
      return NextResponse.json({ reply: fallback }, { status: 200 });
    }

    // ✅ 2) Si no es clima → OpenAI normal
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "Falta OPENAI_API_KEY en el servidor." }, { status: 200 });
    }

    const system = `Sos Auriona (Auri), un asistente cálido, claro y práctico.
Idioma UI: ${uiLang}.
Si el usuario pide datos en tiempo real (clima, cotizaciones), pedí permiso para consultar o aclarar límites si no hay herramienta.`;

    const input = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: message },
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: input,
        temperature: 0.7,
      }),
    });

    const j = await resp.json();
    const reply =
      j?.choices?.[0]?.message?.content ??
      (j?.error?.message ? `Error: ${j.error.message}` : "No pude responder.");

    return NextResponse.json({ reply }, { status: 200 });
  } catch {
    return NextResponse.json({ reply: "Error interno en /api/chat." }, { status: 200 });
  }
}
