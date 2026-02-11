"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Msg = { role: "user" | "auri"; text: string };

type Lang = "es" | "pt" | "en";

type LocationState = {
  lat: number | null;
  lon: number | null;
  city?: string; // opcional
  label?: string; // "Trelew, Chubut" si algún día lo hacemos
};

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

  // idioma (viene del login por banderitas)
  const [lang, setLang] = useState<Lang>("es");

  // voz (TTS)
  const [autoSpeak, setAutoSpeak] = useState(true);

  // dictado (push-to-talk)
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  // ubicación
  const [loc, setLoc] = useState<LocationState>({ lat: null, lon: null });

  const title = useMemo(() => "Auriona", []);

  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    panel2: "#0c1322",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
    soft: "rgba(255,255,255,0.06)",
  };

  // Helpers localStorage
  function getStoredLang(): Lang {
    const v = (typeof window !== "undefined" && localStorage.getItem("auri_lang")) || "es";
    if (v === "pt" || v === "en" || v === "es") return v;
    return "es";
  }

  function getStoredLoc(): LocationState {
    if (typeof window === "undefined") return { lat: null, lon: null };
    const raw = localStorage.getItem("auri_loc");
    if (!raw) return { lat: null, lon: null };
    try {
      const j = JSON.parse(raw);
      const lat = typeof j.lat === "number" ? j.lat : null;
      const lon = typeof j.lon === "number" ? j.lon : null;
      return { lat, lon };
    } catch {
      return { lat: null, lon: null };
    }
  }

  function storeLoc(next: LocationState) {
    if (typeof window === "undefined") return;
    localStorage.setItem("auri_loc", JSON.stringify({ lat: next.lat, lon: next.lon }));
  }

  useEffect(() => {
    // carga idioma y ubicación guardadas
    setLang(getStoredLang());
    setLoc(getStoredLoc());
  }, []);

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

      // si no hizo onboarding → mandarlo
      if (!meta.onboarded) {
        window.location.href = "/onboarding";
        return;
      }

      await loadMainConversation();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Inicializa SpeechRecognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = lang === "pt" ? "pt-BR" : lang === "en" ? "en-US" : "es-AR";
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
  }, [lang]);

  function speak(text: string) {
    try {
      if (!autoSpeak) return;
      if (typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);

      // Idioma de la voz según selección
      u.lang = lang === "pt" ? "pt-BR" : lang === "en" ? "en-US" : "es-AR";

      const voices = window.speechSynthesis.getVoices?.() || [];
      const preferred =
        voices.find((v) => v.lang.toLowerCase() === u.lang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase())) ||
        voices.find((v) => /es|pt|en/i.test(v.lang));

      if (preferred) u.voice = preferred;

      u.rate = 1.02;
      u.pitch = 1.02;

      window.speechSynthesis.speak(u);
    } catch {
      // silencioso
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
      const hello =
        lang === "en"
          ? `Hi ${callUser}. I'm ${callAssistant}. I'm here to help you think clearer and decide calmly.\n\nShall we start?`
          : lang === "pt"
          ? `Oi ${callUser}. Eu sou ${callAssistant}. Estou aqui para te ajudar a pensar melhor e decidir com calma.\n\nVamos começar?`
          : `Hola ${callUser}. Soy ${callAssistant}. Estoy acá para ayudarte a pensar mejor, ordenar ideas y decidir con calma.\n\n¿Arrancamos?`;

      setMsgs([{ role: "auri", text: hello }]);
      // opcional hablar el saludo
      // speak(hello);
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
    const ok = window.confirm(
      lang === "en"
        ? "Do you want to delete the full history?"
        : lang === "pt"
        ? "Quer apagar todo o histórico?"
        : "¿Querés borrar todo el historial de esta conversación?"
    );
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

    const txt =
      lang === "en"
        ? `Done ${callUser}. Fresh start.\n\nWhat do you need?`
        : lang === "pt"
        ? `Pronto ${callUser}. Começamos do zero.\n\nComo posso ajudar?`
        : `Listo ${callUser}. Empezamos de cero.\n\n¿Con qué te doy una mano hoy?`;

    setMsgs([{ role: "auri", text: txt }]);
    speak(txt);
  }

  function micStart() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !recRef.current) {
      alert(lang === "en" ? "Dictation not supported. Try Chrome/Edge." : "Tu navegador no soporta dictado. Probá Chrome o Edge.");
      return;
    }
    if (listening) return;
    setListening(true);
    try {
      recRef.current.start(); // requiere gesto del usuario
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

  async function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert(lang === "en" ? "Geolocation not available." : "Tu navegador no permite geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLoc(next);
        storeLoc(next);
      },
      (e) => {
        alert(
          (lang === "en"
            ? "Location permission denied."
            : lang === "pt"
            ? "Permissão de localização negada."
            : "Permiso de ubicación denegado.") + ` (${e.code})`
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
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
          lang, // ✅ idioma elegido
          location: loc, // ✅ lat/lon si existe
          profile: { callUser, callAssistant },
        }),
      });

      const data = await res.json();
      const reply = String(data.reply ?? "");

      setMsgs((m) => [...m, { role: "auri", text: reply }]);
      await saveMessage("auri", reply);

      speak(reply);
    } catch {
      const fallback = lang === "en" ? "Connection problem." : lang === "pt" ? "Problema de conexão." : "Tuve un problema de conexión.";
      setMsgs((m) => [...m, { role: "auri", text: fallback }]);
      await saveMessage("auri", fallback);
      speak(fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ height: "100vh", display: "flex", background: C.bg, color: C.text }}>
      {/* Sidebar */}
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

        {/* ✅ Ubicación */}
        <button
          onClick={useMyLocation}
          style={{
            padding: 12,
            width: "100%",
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.text,
            cursor: "pointer",
            fontWeight: 900,
          }}
          title="Usar mi ubicación"
        >
          📍 Usar mi ubicación
        </button>

        <div style={{ fontSize: 12, color: C.muted }}>
          {loc.lat != null && loc.lon != null ? (
            <>
              Ubicación lista: {loc.lat.toFixed(3)}, {loc.lon.toFixed(3)}
            </>
          ) : (
            <>Ubicación: sin configurar</>
          )}
        </div>

        {/* ✅ Voz */}
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
            fontWeight: 900,
          }}
          title="Activar/desactivar voz"
        >
          🔊 Voz: {autoSpeak ? "ON" : "OFF"}
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
              fontWeight: 900,
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
              fontWeight: 900,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Chat */}
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
          {/* 🎤 Push-to-talk */}
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
            placeholder={lang === "en" ? "Type or hold the mic…" : lang === "pt" ? "Digite ou segure o microfone…" : "Escribí o mantené apretado el mic…"}
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
            {busy ? "..." : lang === "en" ? "Send" : lang === "pt" ? "Enviar" : "Enviar"}
          </button>
        </footer>
      </section>
    </main>
  );
}
