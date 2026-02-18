import { NextResponse } from "next/server";

export const runtime = "nodejs";

const POLICY_URL =
  "https://sunvfwrcgwvyknawxgkc.supabase.co/functions/v1/auri-policy";

const MARKER = "MARKER_API_2026_02_12";

// 🔒 anti-biblia
const HARD_MAX_SHORT = 260;
const HARD_MAX_LONG = 900;

const TOKENS_SHORT = 110;
const TOKENS_LONG = 260;

type PolicyResult = {
  action?: "allow" | "block" | "redirect";
  risk_level?: "low" | "medium" | "high";
  reason_codes?: string[];
  reply?: string;
};

type ChatHistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

type UiMode = "normal" | "silence" | "danger";

type ChatBody = {
  message?: string;
  history?: ChatHistoryItem[];
  lang?: string;
  profile?: { callUser?: string; callAssistant?: string };
  location?: { lat?: number; lon?: number };
  conversation_id?: string;
  user_id?: string;

  // ✅ modo desde front
  ui_mode?: UiMode;
  has_headphones?: boolean;

  // ✅ streaming flag (por si querés apagarlo a futuro)
  stream?: boolean;
};

async function auriPolicyCheck(args: {
  user_message: string;
  conversation_id?: string;
  user_id?: string;
  model_version?: string;
  policy_version?: string;
}): Promise<PolicyResult> {
  const res = await fetch(POLICY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_message: args.user_message,
      conversation_id: args.conversation_id ?? "web",
      user_id: args.user_id ?? "anon",
      model_version: args.model_version ?? "vercel-beta",
      policy_version: args.policy_version ?? "0.0.1",
    }),
  });

  if (!res.ok) {
    return {
      action: "block",
      risk_level: "high",
      reason_codes: ["POLICY_UNAVAILABLE"],
      reply: "Ahora no puedo procesar eso. Probá de nuevo en un momento.",
    };
  }

  return (await res.json()) as PolicyResult;
}

function clamp(text: string, max: number) {
  const t = String(text || "").trim();
  if (!t) return t;
  if (t.length <= max) return t;

  const slice = t.slice(0, max);
  const lastStop = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("?"),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("\n")
  );

  const cut =
    lastStop > Math.floor(max * 0.6) ? slice.slice(0, lastStop + 1) : slice;

  return cut.trim() + "…";
}

function sanitizeReply(raw: string) {
  let t = String(raw || "");

  // tags raras de citas (si aparecieran)
  t = t.replace(/]*/g, " ");

  // Markdown links: [Texto](https://...) => Texto
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1");

  // URLs sueltas
  t = t.replace(/https?:\/\/[^\s]+/gi, " ");
  t = t.replace(/\bwww\.[^\s]+/gi, " ");

  // URLs entre paréntesis
  t = t.replace(/\(\s*(https?:\/\/[^\s)]+)\s*\)/gi, " ");
  t = t.replace(/\(\s*\)/g, " ");

  // símbolos sueltos
  t = t.replace(/[]/g, " ");

  // compacta espacios
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");

  return t.trim();
}

function isWeatherQuery(message: string) {
  const m = message.toLowerCase();
  const keys = [
    "clima",
    "tiempo",
    "pronóstico",
    "pronostico",
    "temperatura",
    "lluvia",
    "llueve",
    "viento",
    "humedad",
    "tormenta",
    "nublado",
    "soleado",
    "granizo",
  ];
  return keys.some((k) => m.includes(k));
}

function userAskedLong(message: string) {
  const m = message.toLowerCase();

  const shortHints = [
    "corto",
    "breve",
    "resumen",
    "en 2 frases",
    "en una frase",
    "sin vueltas",
  ];
  if (shortHints.some((k) => m.includes(k))) return false;

  const triggers = [
    "detallado",
    "detallada",
    "paso a paso",
    "explicame",
    "explícame",
    "completo",
    "completa",
    "a fondo",
    "con ejemplos",
    "profundo",
    "profunda",
    "extendido",
    "extendida",
    "desarrolla",
    "desarrollame",
  ];
  return triggers.some((k) => m.includes(k));
}

function detectCommandMode(message: string): UiMode | null {
  const m = message.trim().toLowerCase();
  if (m === "auri silencio" || m === "/silencio" || m === "modo silencio")
    return "silence";
  if (m === "auri peligro" || m === "/peligro" || m === "modo peligro")
    return "danger";
  if (m === "auri normal" || m === "/normal" || m === "modo normal")
    return "normal";
  return null;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&zoom=12&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "AurionaBeta/1.0 (contact: ferstdesign@gmail.com)",
      },
    });
    if (!res.ok) return null;

    const j = (await res.json()) as any;
    const a = j?.address || {};
    const city =
      a.city || a.town || a.village || a.municipality || a.county || null;
    if (city) return String(city);

    const dn = String(j?.display_name || "")
      .split(",")
      .slice(0, 2)
      .join(",")
      .trim();

    return dn || null;
  } catch {
    return null;
  }
}

async function getTomorrowForecastByGPS(lat: number, lon: number) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max" +
    "&forecast_days=2" +
    "&timezone=auto";

  const res = await fetch(url);
  if (!res.ok) throw new Error("weather_unavailable");

  const j = (await res.json()) as any;
  const d = j?.daily;
  if (!d || !Array.isArray(d.time) || d.time.length < 2)
    throw new Error("weather_bad_data");

  const date = d.time[1];
  const tmax = d.temperature_2m_max?.[1];
  const tmin = d.temperature_2m_min?.[1];
  const pop = d.precipitation_probability_max?.[1];
  const wind = d.windspeed_10m_max?.[1];

  return {
    date: String(date),
    tmax: typeof tmax === "number" ? Math.round(tmax) : null,
    tmin: typeof tmin === "number" ? Math.round(tmin) : null,
    pop: typeof pop === "number" ? Math.round(pop) : null,
    wind: typeof wind === "number" ? Math.round(wind) : null,
  };
}

function buildDangerCoverText(lang: string) {
  if (lang === "en") return "Tomorrow looks calm. Want today’s forecast too?";
  if (lang === "pt") return "Amanhã parece tranquilo. Quer o de hoje também?";
  return "Mañana parece tranqui. ¿Querés que te diga también el de hoy?";
}

function buildSystemPrompt(args: {
  lang: string;
  callUser: string;
  callAssistant: string;
  allowLong: boolean;
  effectiveMode: UiMode;
  hasHeadphones: boolean;
}) {
  const { lang, callUser, callAssistant, allowLong, effectiveMode, hasHeadphones } =
    args;

  let base = `
Sos Auriona (Auri), cálida y MUY humana. Nada robótico.

Reglas duras:
- Por defecto: respuesta corta (1 a 3 frases).
- Sin listas largas.
- 1 sola pregunta al final.
- NO pegues links, NO cites fuentes, NO markdown.
- No inventes.
- Si el usuario pide “detallado / paso a paso”, podés extenderte (máximo 6 pasos).

Idioma: ${lang}
Usuario: ${callUser}
Tu nombre: ${callAssistant}
`.trim();

  if (effectiveMode === "silence") {
    base += `

Modo: SILENCIO.
- Discreto, neutro, cero show.
- No menciones “silencio” ni que estás en modo.
`.trim();
  }

  if (effectiveMode === "danger") {
    base += `

Modo: PELIGRO.
- Discreto al máximo.
- Nada de “¿estás en peligro?”.
- Respuestas cortísimas.
- Jamás sugerir grabar a terceros sin consentimiento.
Auriculares: ${hasHeadphones ? "SI" : "NO"}
`.trim();
  }

  if (allowLong) {
    base += `

El usuario pidió detalle: podés extenderte, sin links, con pasos (máximo 6) y 1 pregunta final.
`.trim();
  }

  return base;
}

/**
 * ✅ Llamada streaming a OpenAI /v1/responses (SSE) y extrae deltas.
 * Importante: NO mandamos temperature (gpt-5-mini no lo soporta).
 */
async function streamOpenAIResponse(args: {
  model: string;
  messages: ChatHistoryItem[];
  maxTokens: number;
  signal?: AbortSignal;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      input: args.messages,
      max_output_tokens: args.maxTokens,
      stream: true,
      store: false,
    }),
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${txt}`.slice(0, 400));
  }

  return res.body;
}

// ==== SSE helpers ====
function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}

function sseData(obj: any) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;

    const message = String(body.message ?? "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const lang = String(body.lang ?? "es");
    const profile = body.profile ?? {};
    const location = body.location ?? {};
    const conversation_id = String(body.conversation_id ?? "web");
    const user_id = String(body.user_id ?? "anon");

    const uiMode: UiMode = (body.ui_mode as UiMode) || "normal";
    const hasHeadphones = Boolean(body.has_headphones);

    if (!message) {
      return NextResponse.json({
        reply: "Decime qué necesitás y te ayudo 🙂 ¿Qué estás buscando?",
        used_web: false,
        source: "guard_empty",
        marker: MARKER,
        speak: uiMode === "normal",
        effective_mode: uiMode,
      });
    }

    // ✅ comandos por frase (hard rule tuya)
    const cmd = detectCommandMode(message);
    if (cmd) {
      const speak = cmd === "normal" ? true : cmd === "danger" ? hasHeadphones : false;
      const reply =
        cmd === "danger" && !hasHeadphones ? buildDangerCoverText(lang) : "Ok.";
      return NextResponse.json({
        reply: clamp(reply, HARD_MAX_SHORT),
        used_web: false,
        source: "mode_command",
        marker: MARKER,
        speak,
        effective_mode: cmd,
      });
    }

    // ✅ Policy pre-check
    const policy = await auriPolicyCheck({
      user_message: message,
      conversation_id,
      user_id,
      model_version: "vercel-beta",
      policy_version: "0.0.1",
    });

    if (policy?.action && policy.action !== "allow") {
      const safe = clamp(
        sanitizeReply(String(policy.reply ?? "No puedo ayudar con eso.")),
        HARD_MAX_SHORT
      );
      return NextResponse.json({
        reply: safe,
        used_web: false,
        source: "policy",
        marker: MARKER,
        speak: false,
        effective_mode: "silence",
      });
    }

    // ✅ PELIGRO sin auriculares: tapadera (y NO hablar)
    if (uiMode === "danger" && !hasHeadphones) {
      const wantWeather = isWeatherQuery(message);
      const hasGeo =
        typeof location?.lat === "number" && typeof location?.lon === "number";

      if (wantWeather && hasGeo) {
        const lat = Number(location.lat);
        const lon = Number(location.lon);
        const city = await reverseGeocode(lat, lon);
        const f = await getTomorrowForecastByGPS(lat, lon);

        const header = city ? `Mañana en ${city}:` : `Mañana (según tu GPS):`;
        const tLine =
          f.tmax !== null && f.tmin !== null
            ? `Máx ${f.tmax}° / mín ${f.tmin}°`
            : "Temperatura no disponible ahora";

        const extra: string[] = [];
        if (f.pop !== null) extra.push(`lluvia ${f.pop}%`);
        if (f.wind !== null) extra.push(`viento ${f.wind} km/h`);

        const line2 = extra.length ? `${tLine} • ${extra.join(" • ")}` : tLine;
        const reply = `${header}\n${line2}\n¿Te digo también el de hoy?`;

        return NextResponse.json({
          reply: clamp(sanitizeReply(reply), HARD_MAX_SHORT),
          used_web: false,
          source: "danger_weather_cover",
          marker: MARKER,
          speak: false,
          effective_mode: "danger",
        });
      }

      return NextResponse.json({
        reply: clamp(buildDangerCoverText(lang), HARD_MAX_SHORT),
        used_web: false,
        source: "danger_cover",
        marker: MARKER,
        speak: false,
        effective_mode: "danger",
      });
    }

    // ✅ clima real normal/silence o peligro con auriculares
    const wantWeather = isWeatherQuery(message);
    const hasGeo = typeof location?.lat === "number" && typeof location?.lon === "number";
    if (wantWeather) {
      if (!hasGeo) {
        return NextResponse.json({
          reply:
            "Para darte el pronóstico exacto necesito tu GPS activo o que me digas tu ciudad. ¿Dónde estás ahora?",
          used_web: false,
          source: "weather_guard",
          marker: MARKER,
          speak: uiMode === "normal" ? true : uiMode === "danger" ? hasHeadphones : false,
          effective_mode: uiMode,
        });
      }

      const lat = Number(location.lat);
      const lon = Number(location.lon);

      const city = await reverseGeocode(lat, lon);
      const f = await getTomorrowForecastByGPS(lat, lon);

      const header = city ? `Mañana en ${city}:` : `Mañana (según tu GPS):`;
      const tLine =
        f.tmax !== null && f.tmin !== null
          ? `Máx ${f.tmax}° / mín ${f.tmin}°`
          : "Temperatura no disponible ahora";

      const extra: string[] = [];
      if (f.pop !== null) extra.push(`lluvia ${f.pop}%`);
      if (f.wind !== null) extra.push(`viento ${f.wind} km/h`);
      const line2 = extra.length ? `${tLine} • ${extra.join(" • ")}` : tLine;

      const reply = `${header}\n${line2}\n¿Te digo también el de hoy?`;

      return NextResponse.json({
        reply: clamp(sanitizeReply(reply), HARD_MAX_SHORT),
        used_web: false,
        source: "weather_gps",
        marker: MARKER,
        speak: uiMode === "normal" ? true : uiMode === "danger" ? hasHeadphones : false,
        effective_mode: uiMode,
      });
    }

    // ✅ STREAMING LLM
    const allowLong = userAskedLong(message);
    const maxChars = allowLong ? HARD_MAX_LONG : HARD_MAX_SHORT;
    const maxTokens = allowLong ? TOKENS_LONG : TOKENS_SHORT;

    const system = buildSystemPrompt({
      lang,
      callUser: profile.callUser ?? "amiga/o",
      callAssistant: profile.callAssistant ?? "Auri",
      allowLong,
      effectiveMode: uiMode,
      hasHeadphones,
    });

    const messages: ChatHistoryItem[] = [
      { role: "system", content: system },
      ...history
        .filter((x) => x?.role && x?.content)
        .map((x) => ({ role: x.role, content: String(x.content) })),
      { role: "user", content: message },
    ];

    const modelPreferred = String(process.env.OPENAI_MODEL || "").trim();
    const model = modelPreferred || "gpt-5-mini"; // fallback simple

    const upstream = await streamOpenAIResponse({
      model,
      messages,
      maxTokens,
      signal: req.signal,
    });

    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    const speak =
      uiMode === "normal" ? true : uiMode === "danger" ? hasHeadphones : false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            sseData({
              type: "meta",
              marker: MARKER,
              effective_mode: uiMode,
              speak,
            })
          )
        );

        try {
          const reader = upstream.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const parts = buffer.split("\n\n");
            buffer = parts.pop() || "";

            for (const part of parts) {
              const line = part.split("\n").find((l) => l.startsWith("data: "));
              if (!line) continue;

              const payload = line.slice(6).trim();
              if (payload === "[DONE]") {
                const finalText = clamp(sanitizeReply(full), maxChars);
                controller.enqueue(
                  new TextEncoder().encode(
                    sseData({
                      type: "final",
                      text: finalText,
                      marker: MARKER,
                      effective_mode: uiMode,
                      speak,
                      used_web: false,
                      source: "llm_stream",
                    })
                  )
                );
                controller.close();
                return;
              }

              let evt: any = null;
              try {
                evt = JSON.parse(payload);
              } catch {
                continue;
              }

              if (
                evt?.type === "response.output_text.delta" &&
                typeof evt.delta === "string"
              ) {
                const delta = evt.delta;
                full += delta;
                controller.enqueue(
                  new TextEncoder().encode(sseData({ type: "delta", delta }))
                );
              }

              if (evt?.type === "response.completed") {
                const finalText = clamp(sanitizeReply(full), maxChars);
                controller.enqueue(
                  new TextEncoder().encode(
                    sseData({
                      type: "final",
                      text: finalText,
                      marker: MARKER,
                      effective_mode: uiMode,
                      speak,
                      used_web: false,
                      source: "llm_stream",
                    })
                  )
                );
                controller.close();
                return;
              }
            }
          }

          const finalText = clamp(sanitizeReply(full), maxChars);
          controller.enqueue(
            new TextEncoder().encode(
              sseData({
                type: "final",
                text: finalText,
                marker: MARKER,
                effective_mode: uiMode,
                speak,
                used_web: false,
                source: "llm_stream",
              })
            )
          );
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            new TextEncoder().encode(
              sseData({
                type: "error",
                message: String(err?.message || "stream_error"),
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  } catch (e: any) {
    const msg = e?.message || e?.error?.message || "Error desconocido";
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
