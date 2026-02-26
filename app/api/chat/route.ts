import { NextResponse } from "next/server";

export const runtime = "nodejs";

const POLICY_URL =
  "https://sunvfwrcgwvyknawxgkc.supabase.co/functions/v1/auri-policy";

const MARKER = "MARKER_API_2026_02_12";

const HARD_MAX_SHORT = 260;
const HARD_MAX_LONG = 900;

const TOKENS_SHORT = 110;
const TOKENS_LONG = 260;

const OPENAI_TIMEOUT_MS = 15000;

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
  ui_mode?: UiMode;
  has_headphones?: boolean;
  stream?: boolean; // ignorado (JSON-only)
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    marker: MARKER,
    runtime,
    vercel: Boolean(process.env.VERCEL),
    env: {
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      OPENAI_MODEL: String(process.env.OPENAI_MODEL || ""),
    },
    note:
      "Si ok:true, existe /api/chat. Si OPENAI_API_KEY=false, falta setearla.",
  });
}

async function auriPolicyCheck(args: {
  user_message: string;
  conversation_id?: string;
  user_id?: string;
  model_version?: string;
  policy_version?: string;
}): Promise<PolicyResult> {
  try {
    const res = await fetch(POLICY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        user_message: args.user_message,
        conversation_id: args.conversation_id ?? "web",
        user_id: args.user_id ?? "anon",
        model_version: args.model_version ?? "vercel-beta",
        policy_version: args.policy_version ?? "0.0.1",
      }),
    });

    if (!res.ok) {
      // ✅ si policy está caído, NO bloqueamos el chat: seguimos, pero marcamos reason
      return {
        action: "allow",
        risk_level: "medium",
        reason_codes: ["POLICY_UNAVAILABLE_ALLOW_FALLBACK"],
      };
    }

    return (await res.json()) as PolicyResult;
  } catch {
    return {
      action: "allow",
      risk_level: "medium",
      reason_codes: ["POLICY_EXCEPTION_ALLOW_FALLBACK"],
    };
  }
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

function stripSpeakerPrefixes(text: string, callAssistant?: string) {
  let t = String(text || "").trim();
  if (!t) return t;

  t = t.replace(/^\s*(auri|auriona)\s*:\s*/i, "");
  t = t.replace(/^\s*(assistant|asistente)\s*:\s*/i, "");

  const name = String(callAssistant || "").trim();
  if (name) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`^\\s*${esc}\\s*:\\s*`, "i"), "");
  }

  t = t
    .split("\n")
    .map((line) =>
      line.replace(/^\s*(auri|auriona|assistant|asistente)\s*:\s*/i, "").trimEnd()
    )
    .join("\n")
    .trim();

  return t;
}

function sanitizeReply(raw: string, callAssistant?: string) {
  let t = String(raw || "");

  // ✅ limpia citas raras si aparecieran
  t = t.replace(/]+/g, " ");
  t = t.replace(/]+/g, " ");

  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1");
  t = t.replace(/https?:\/\/[^\s]+/gi, " ");
  t = t.replace(/\bwww\.[^\s]+/gi, " ");

  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");

  t = t.trim();
  t = stripSpeakerPrefixes(t, callAssistant);
  return t.trim();
}

function userAskedLong(message: string) {
  const m = message.toLowerCase();

  const shortHints = ["corto", "breve", "resumen", "en 2 frases", "en una frase", "sin vueltas"];
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
  if (m === "auri silencio" || m === "/silencio" || m === "modo silencio") return "silence";
  if (m === "auri peligro" || m === "/peligro" || m === "modo peligro") return "danger";
  if (m === "auri normal" || m === "/normal" || m === "modo normal") return "normal";
  return null;
}

function buildSystemPrompt(args: {
  lang: string;
  callUser: string;
  callAssistant: string;
  allowLong: boolean;
  effectiveMode: UiMode;
  hasHeadphones: boolean;
}) {
  const { lang, callUser, callAssistant, allowLong, effectiveMode, hasHeadphones } = args;

  let base = `
Sos Auriona (Auri), cálida y MUY humana. Nada robótico.

Reglas duras:
- Por defecto: respuesta corta (1 a 3 frases).
- Sin listas largas.
- 1 sola pregunta al final.
- NO pegues links, NO cites fuentes, NO markdown.
- No inventes.
- NO escribas tu nombre como prefijo (nunca "Auri:" / "Auriona:").
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

function buildInputString(history: ChatHistoryItem[], message: string) {
  const last = (history || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-10)
    .map((m) => (m.role === "user" ? `Usuario: ${m.content}` : `Auri: ${m.content}`))
    .join("\n");

  return last ? `${last}\nUsuario: ${message}` : `Usuario: ${message}`;
}

function parseOpenAIError(raw: string) {
  try {
    const j = JSON.parse(raw);
    const msg = String(j?.error?.message ?? j?.message ?? "").trim();
    const code = String(j?.error?.code ?? j?.code ?? "").trim();
    return { msg, code };
  } catch {
    return { msg: "", code: "" };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callOpenAIOnce(args: {
  model: string;
  instructions: string;
  inputText: string;
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
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: args.model,
      instructions: args.instructions,
      input: args.inputText,
      max_output_tokens: args.maxTokens,
      stream: false,
      store: false,
    }),
    signal: args.signal,
  });

  const raw = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, raw };
}

async function callWithRetry(args: {
  model: string;
  instructions: string;
  inputText: string;
  maxTokens: number;
  signal?: AbortSignal;
}) {
  const waits = [0, 250, 700];
  let last: { ok: boolean; status: number; raw: string } | null = null;

  for (let i = 0; i < waits.length; i++) {
    if (waits[i] > 0) await sleep(waits[i]);
    const r = await callOpenAIOnce(args);
    last = r;

    if (r.ok) return r;
    if (r.status === 502 || r.status === 503 || r.status === 504) continue;
    return r;
  }
  return last!;
}

function extractOutputText(j: any): string {
  const direct =
    String(j?.output_text ?? "").trim() ||
    String(j?.response?.output_text ?? "").trim();
  if (direct) return direct;

  const out = j?.output ?? j?.response?.output;
  if (Array.isArray(out)) {
    let acc = "";
    for (const item of out) {
      if (typeof item?.output_text === "string") acc += item.output_text;
      if (typeof item?.text === "string") acc += item.text;

      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (typeof c?.text === "string" && c.text) acc += c.text;
          if (typeof c?.value === "string" && c.value) acc += c.value;
        }
      }
    }
    if (acc.trim()) return acc.trim();
  }

  return "";
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
    const callAssistant = profile.callAssistant ?? "Auri";

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

    const cmd = detectCommandMode(message);
    if (cmd) {
      const speak = cmd === "normal" ? true : cmd === "danger" ? hasHeadphones : false;
      const reply = "Ok.";
      return NextResponse.json({
        reply: clamp(reply, HARD_MAX_SHORT),
        used_web: false,
        source: "mode_command",
        marker: MARKER,
        speak,
        effective_mode: cmd,
      });
    }

    const policy = await auriPolicyCheck({
      user_message: message,
      conversation_id,
      user_id,
      model_version: "vercel-beta",
      policy_version: "0.0.1",
    });

    if (policy?.action && policy.action !== "allow") {
      const safe = clamp(
        sanitizeReply(String(policy.reply ?? "No puedo ayudar con eso."), callAssistant),
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

    const allowLong = userAskedLong(message);
    const maxChars = allowLong ? HARD_MAX_LONG : HARD_MAX_SHORT;
    const maxTokens = allowLong ? TOKENS_LONG : TOKENS_SHORT;

    const instructions = buildSystemPrompt({
      lang,
      callUser: profile.callUser ?? "amiga/o",
      callAssistant,
      allowLong,
      effectiveMode: uiMode,
      hasHeadphones,
    });

    const inputText = buildInputString(history, message);

    const preferred = String(process.env.OPENAI_MODEL || "").trim();
    const models = [preferred, "gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"].filter(Boolean);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let lastStatus = 0;
    let lastModel = "";
    let lastRaw = "";
    let lastMsg = "";
    let lastCode = "";
    let lastOk = false;

    let outputText = "";

    try {
      for (const model of models) {
        const r = await callWithRetry({
          model,
          instructions,
          inputText,
          maxTokens,
          signal: controller.signal,
        });

        lastStatus = r.status;
        lastModel = model;
        lastRaw = r.raw;
        lastOk = r.ok;

        if (r.ok) {
          try {
            const j = JSON.parse(r.raw);
            outputText = extractOutputText(j);
          } catch {
            outputText = "";
          }
          if (outputText) break;
        } else {
          const { msg, code } = parseOpenAIError(r.raw);
          lastMsg = msg || lastMsg;
          lastCode = code || lastCode;
          if (r.status === 401 || r.status === 403 || r.status === 429) break;
        }
      }
    } finally {
      clearTimeout(t);
    }

    const speak = uiMode === "normal" ? true : uiMode === "danger" ? hasHeadphones : false;

    if (!outputText) {
      return NextResponse.json(
        {
          reply: `Error en OpenAI (status ${lastStatus || 502}).`,
          debug: {
            model: lastModel,
            ok: lastOk,
            status: lastStatus,
            code: lastCode || null,
            message: (lastMsg || "").slice(0, 180) || null,
            raw_head: (lastRaw || "").slice(0, 260) || null,
            policy_reason: policy?.reason_codes || null,
          },
          marker: MARKER,
          speak: false,
          effective_mode: uiMode,
        },
        { status: 502 }
      );
    }

    const finalText = clamp(sanitizeReply(outputText, callAssistant), maxChars);

    return NextResponse.json({
      reply: finalText || "No pude responder ahora. ¿Querés que lo intentemos de nuevo?",
      used_web: false,
      source: "llm_json",
      marker: MARKER,
      speak,
      effective_mode: uiMode,
    });
  } catch (e: any) {
    const msg = e?.message || e?.error?.message || "Error desconocido";
    console.error("API /chat error:", e);

    return NextResponse.json(
      { reply: "Error de servidor. Probá de nuevo.", debug: String(msg).slice(0, 400), marker: MARKER },
      { status: 500 }
    );
  }
}