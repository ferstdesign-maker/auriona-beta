"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Msg = { role: "user" | "auri"; text: string };

// Web Speech API types (para TS)
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function AppPage() {
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // onboarding metadata
  const [callUser, setCallUser] = useState("amiga/o");
  const [callAssistant, setCallAssistant] = useState("Auri");
  const [autoSpeak, setAutoSpeak] = useState(true);

  // dictado (push-to-talk)
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const title = useMemo(() => "Auriona", []);

  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    panel2: "#0c1322",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const meta: any = user.user_metadata || {};
      setCallUser(meta.call_user || meta.display_name || "amiga/o");
      setCallAssistant(meta.call_assistant || "Auri");

      await loadMainConversation();

      // si no hizo onboarding, lo mandamos
      if (!meta.onboarded) {
        window.location.href = "/onboarding";
        return;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // SpeechRecognition init
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "es-AR";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event: any) => {
      let finalText = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }

      setInput((prev) => {
        const base = prev.trim();
        const add = (finalText || interim).trim();
        if (!add) return prev;
        if (!base) return add;
        return base + " " + add;
      });
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
  }, []);

  function speak(text: string) {
    try {
      if (!autoSpeak) return;
      if (typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;

      // corta cualquier voz previa
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-AR";

      // intentamos elegir una voz española/latam si existe
      const voices = window.speechSynthesis.getVoices?.() || [];
      const preferred =
        voices.find((v) => /es-AR/i.test(v.lang)) ||
        voices.find((v) => /es-(ES|MX|US|CL|CO|UY|PE|AR)/i.test(v.lang)) ||
        voices.find((v) => /es/i.test(v.lang));

      if (preferred) u.voice = preferred;

      u.rate = 1.02;
      u.pitch = 1.02;

      window.speechSynthesis.speak(u);
    } catch {
      // si falla, no rompemos la app
    }
  }

  async function loadMainConversation() {
    const { data: rows, error } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .is("conversation_id", null)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      setMsgs([{ role: "auri", text: `No pude cargar el historial: ${error.message}` }]);
      return;
    }

    if (!rows || rows.length === 0) {
      const hello = `Hola ${callUser}. Soy ${callAssistant}. Estoy acá para ayudarte a pensar mejor, ordenar ideas y decidir con calma.\n\n¿Arrancamos?`;
      setMsgs([{ role: "auri", text: hello }]);
      return;
    }

    setMsgs(rows.map((r: any) => ({ role: r.role, text: r.content })));
  }

  async function saveMessage(role: "user" | "auri", content: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    await supabase.from("messages").insert({
      user_id: data.user.id,
      role,
      content,
      conversation_id: null,
    });
  }

  async function clearConversation() {
    const ok = window.confirm("¿Querés borrar todo el historial de esta conversación?");
    if (!ok) return;

    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("user_id", data.user.id)
      .is("conversation_id", null);

    if (error) {
      alert("No pude borrar: " + error.message);
      return;
    }

    const txt = `Listo ${callUser}. Empezamos de cero.\n\n¿Con qué te doy una mano hoy?`;
    setMsgs([{ role: "auri", text: txt }]);
    speak(txt);
  }

  function micStart() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !recRef.current) {
      alert("Tu navegador no soporta dictado. Probá Chrome o Edge.");
      return;
    }
    if (listening) return;
    setListening(true);
    try {
      recRef.current.start(); // requiere gesto (apretar)
    } catch {
      setListening(false);
    }
  }

  function micStop() {
    if (!listening) return;
    try {
      recRef.current.stop();
    } catch {}
    setListening(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);

    await saveMessage("user", text);

    try {
      const history = msgs.slice(-16).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          profile: { callUser, callAssistant },
        }),
      });

      const data = await res.json();
      const reply = String(data.reply ?? "");

      setMsgs((m) => [...m, { role: "auri", text: reply }]);
      await saveMessage("auri", reply);

      // ✅ habla
      speak(reply);
    } catch {
      const fallback = "Tuve un problema de conexión.";
      setMsgs((m) => [...m, { role: "auri", text: fallback }]);
      await saveMessage("auri", fallback);
      speak(fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ height: "100vh", display: "flex", background: C.bg, color: C.text }}>
      <aside
        style={{
          width: 320,
          borderRight: `1px solid ${C.border}`,
          padding: 14,
          background: C.panel,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            width: "100%",
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
            padding: 14,
            display: "grid",
            placeItems: "center",
          }}
        >
          <img
            src="/auriona-logo.png"
            alt="Auriona"
            style={{ width: "100%", maxWidth: 240, height: 70, objectFit: "contain", display: "block" }}
          />
        </div>

        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
          Conversación única (sin carpetas).
        </div>

        <button
          onClick={() => setAutoSpeak((v) => !v)}
          style={{
            padding: 12,
            width: "100%",
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.text,
            cursor: "pointer",
            fontWeight: 800,
          }}
          title="Activar/desactivar voz"
        >
          Voz: {autoSpeak ? "ON" : "OFF"}
        </button>

        <div style={{ marginTop: "auto", display: "grid", gap: 10 }}>
          <button
            onClick={clearConversation}
            style={{
              padding: 12,
              width: "100%",
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Borrar historial
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            style={{
              padding: 12,
              width: "100%",
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            padding: 14,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            background: "rgba(11,15,23,0.7)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Beta</div>
        </header>

        <div style={{ flex: 1, padding: 18, overflowY: "auto" }}>
          {msgs.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
                <div
                  style={{
                    maxWidth: 760,
                    padding: "10px 12px",
                    borderRadius: 16,
                    border: `1px solid ${C.border}`,
                    background: isUser ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.35,
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <footer style={{ padding: 16, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, background: C.panel }}>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              micStart();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              micStop();
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              micStop();
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              micStop();
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: listening ? "rgba(255,255,255,0.10)" : "transparent",
              color: C.text,
              cursor: "pointer",
              fontWeight: 900,
              minWidth: 54,
              userSelect: "none",
              touchAction: "none",
            }}
            title="Mantener apretado para hablar"
          >
            {listening ? "🎙️" : "🎤"}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí o mantené apretado el mic…"
            onKeyDown={(e) => e.key === "Enter" && send()}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              outline: "none",
            }}
          />

          <button
            onClick={send}
            disabled={busy}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: busy ? "transparent" : C.panel2,
              color: C.text,
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 900,
              minWidth: 92,
            }}
          >
            {busy ? "..." : "Enviar"}
          </button>
        </footer>
      </section>
    </main>
  );
}
