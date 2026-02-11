"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Msg = { role: "user" | "auri"; text: string };

export default function AppPage() {
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // usamos metadata del onboarding (si existe)
  const [callUser, setCallUser] = useState("amiga/o");
  const [callAssistant, setCallAssistant] = useState("Auri");

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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function loadMainConversation() {
    // “1 sola conversación”: usamos conversation_id = null (legacy) como hilo principal
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
      setMsgs([
        {
          role: "auri",
          text: `Hola ${callUser}. Soy ${callAssistant}. Estoy acá para ayudarte a pensar mejor, ordenar ideas y decidir con calma.\n\n¿Arrancamos?`,
        },
      ]);
      return;
    }

    setMsgs(rows.map((r: any) => ({ role: r.role, text: r.content })));
  }

  async function saveMessage(role: "user" | "auri", content: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase.from("messages").insert({
      user_id: data.user.id,
      role,
      content,
      conversation_id: null, // SIEMPRE hilo único
    });

    if (error) console.log("DB insert error:", error.message);
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

    setMsgs([
      {
        role: "auri",
        text: `Listo ${callUser}. Empezamos de cero.\n\n¿Con qué te doy una mano hoy?`,
      },
    ]);
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
          // “humanización” simple: lo mandamos para que el modelo lo use si quiere
          profile: { callUser, callAssistant },
        }),
      });

      const data = await res.json();
      const reply = String(data.reply ?? "");

      setMsgs((m) => [...m, { role: "auri", text: reply }]);
      await saveMessage("auri", reply);
    } catch {
      const fallback = "Tuve un problema de conexión.";
      setMsgs((m) => [...m, { role: "auri", text: fallback }]);
      await saveMessage("auri", fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ height: "100vh", display: "flex", background: C.bg, color: C.text }}>
      {/* Sidebar minimal: solo logo */}
      <aside
        style={{
          width: 110,
          borderRight: `1px solid ${C.border}`,
          padding: 14,
          background: C.panel,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: 12,
        }}
      >
        <div
          style={{
            width: "100%",
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            background: "rgba(255,255,255,0.04)",
            padding: 10,
            display: "grid",
            placeItems: "center",
          }}
        >
          <img
            src="/auriona-logo.png"
            alt="Auriona"
            style={{ width: "100%", maxWidth: 90, height: 60, objectFit: "contain", display: "block" }}
          />
        </div>

        <div />

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          style={{
            padding: 10,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.text,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
          }}
          title="Cerrar sesión"
        >
          Salir
        </button>
      </aside>

      {/* Chat único */}
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 900 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {callAssistant} con {callUser} · conversación continua
            </div>
          </div>

          <button
            onClick={clearConversation}
            style={{
              padding: "9px 12px",
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12,
            }}
            title="Borrar historial (beta)"
          >
            Borrar historial
          </button>
        </header>

        <div style={{ flex: 1, padding: 18, overflowY: "auto" }}>
          {msgs.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  marginBottom: 12,
                }}
              >
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
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí o hablá (próximo paso: micrófono)…"
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
