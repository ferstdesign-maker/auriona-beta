import { NextResponse } from "next/server";

function looksLikeWeatherQuestion(text: string) {
  const m = (text || "").toLowerCase();
  return (
    m.includes("clima") ||
    m.includes("tiempo") ||
    m.includes("temperatura") ||
    m.includes("pronóstico") ||
    m.includes("pronostico") ||
    m.includes("llueve") ||
    m.includes("va a llover") ||
    m.includes("viento")
  );
}

function extractCity(message: string) {
  const m = (message || "").trim();

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

  const generic = m.match(/\ben\b\s+([^?.!,\n]+)$/i);
  if (generic && generic[1]) return generic[1].trim();

  return "";
}

function isProbablyJustACity(message: string) {
  const m = (message || "").trim();
  // “Trelew”, “Buenos Aires”, “Rio de Janeiro”
  // no números, no signos, no frases largas
  if (m.length < 2 || m.length > 40) return false;
  if (/[0-9]/.test(m)) return false;
  if (/[?!.]/.test(m)) return false;
  // 1 a 4 palabras
  const parts = m.split(/\s+/).filter(Boolean);
  if (parts.length > 4) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message ?? "");
    const history = Array.isArray(body?.history) ? body.history : [];
    const location = body?.location || {};
    const lat = location?.lat != null ? Number(location.lat) : null;
    const lon = location?.lon != null ? Number(location.lon) : null;
    const uiLang = String(body?.lang ?? "es");

    // ✅ Detectar “modo clima” también si el mensaje anterior fue de clima
    const lastUserFromHistory =
      [...history].reverse().find((x: any) => x?.role === "user")?.content ?? "";
    const weatherMode = looksLikeWeatherQuestion(message) || looksLikeWeatherQuestion(lastUserFromHistory);

    if (weatherMode) {
      let city = extractCity(message);
      if (!city && isProbablyJustACity(message)) {
        // el usuario escribió solo “Trelew”
        city = message.trim();
      }

      // Si no hay city y tampoco coords, damos instrucción clara (sin OpenAI)
      if (!city && (lat == null || lon == null)) {
        const txt =
          uiLang === "en"
            ? "To check the weather, tell me a city (e.g. “weather in Trelew”) or press “Use my location” first."
            : uiLang === "pt"
            ? "Para ver o clima, me diga uma cidade (ex: “clima em Trelew”) ou aperte “Usar minha localização”."
            : "Para ver el clima, decime una ciudad (ej: “clima en Trelew”) o primero apretá “Usar mi ubicación”.";
        return NextResponse.json({ reply: txt }, { status: 200 });
      }

      const r = await fetch(new URL("/api/weather", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, lat, lon }),
      });

      const data = await r.json().catch(() => ({}));
      if (data?.ok && data?.text) {
        return NextResponse.json({ reply: data.text }, { status: 200 });
      }

      const fallback = data?.error ? `No pude obtener el clima ahora: ${data.error}` : "No pude obtener el clima ahora.";
      return NextResponse.json({ reply: fallback }, { status: 200 });
    }

    // ✅ OpenAI normal
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: "Falta OPENAI_API_KEY en el servidor." }, { status: 200 });

    const system = `Sos Auriona (Auri), un asistente cálido, claro y práctico. Idioma UI: ${uiLang}.`;

    const input = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: message },
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
