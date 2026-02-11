"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Msg = { role: "user" | "auri"; text: string };
type Lang = "es" | "pt" | "en";
type LocationState = { lat: number | null; lon: number | null };

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

  const [callUser, setCallUser] = useState("amiga/o");
  const [callAssistant, setCallAssistant] = useState("Auri");

  const [lang, setLang] = useState<Lang>("es");
  const [autoSpeak, setAutoSpeak] = useState(true);

  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const [loc, setLoc] = useState<LocationState>({ lat: null, lon: null });

  // responsive
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  // refs para scroll y tamaños
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);

  // padding inferior del chat (para que no lo tape el footer)
  const [bottomPad, setBottomPad] = useState(120);

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
      return { lat: typeof j.lat === "number" ? j.lat : null, lon: typeof j.lon === "number" ? j.lon : null };
    } catch {
      return { lat: null, lon: null };
    }
  }

  function storeLoc(next: LocationState) {
    if (typeof window === "undefined") return;
    localStorage.setItem("auri_loc", JSON.stringify(next));
  }

  // init stored lang/loc
  useEffect(() => {
    setLang(getStoredLang());
    setLoc(getStoredLoc());
  }, []);

  // detect mobile + resize
  useEffect(() => {
    function onResize() {
      const m = window.innerWidth < 900;
      setIsMobile(m);
      if (!m) setShowMenu(false);
      measureFooter();
      // al resize (incluye teclado en algunos browsers), bajamos al final
      scrollToBottom(true);
    }

    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cuando cambia el texto del input, puede cambiar el footer height en móviles
  useEffect(() => {
    measureFooter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isMobile, showMenu]);

  // auth + load
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

      if (!meta.onboarded) {
        window.location.href = "/onboarding";
        return;
      }

      await loadMainConversation();
      // al cargar, al final
      setTimeout(() => scrollToBottom(true), 50);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scroll al final cuando llegan mensajes
  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs]);

  function measureFooter() {
    const h = footerRef.current?.getBoundingClientRect?.().height ?? 96;
    // 18 extra para “aire”
    setBottomPad(Math.ceil(h + 18));
  }

  function scrollToBottom(instant: boolean) {
    // usa anchor al final
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "end" });
  }

  // speech recognition init
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
    } catch {}
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
          ? `Hi ${callUser}. I'm ${callAssistant}. Shall we start?`
          : lang === "pt"
          ? `Oi ${callUser}. Eu sou ${callAssistant}. Vamos começar?`
          : `Hola ${callUser}. Soy ${callAssistant}. ¿Arrancamos?`;
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
    const ok = window.confirm(lang === "en" ? "Delete the full history?" : lang === "pt" ? "Apagar todo o histórico?" : "¿Borrar todo el historial?");
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
        ? `Done ${callUser}. Fresh start.`
        : lang === "pt"
        ? `Pronto ${callUser}. Começamos do zero.`
        : `Listo ${callUser}. Empezamos de cero.`;

    setMsgs([{ role: "auri", text: txt }]);
    speak(txt);
    setShowMenu(false);
    setTimeout(() => scrollToBottom(true), 50);
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
      recRef.current.start();
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

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert(lang === "en" ? "Geolocation not available." : "Geolocalización no disponible.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLoc(next);
        storeLoc(next);
        setShowMenu(false);
      },
      () => {
        alert(lang === "en" ? "Location permission denied." : lang === "pt" ? "Permissão negada." : "Permiso de ubicación denegado.");
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
        body: JSON.stringify({ message: text, history, lang, location: loc, profile: { callUser, callAssistant } }),
      });

      const data = await res.json();
      const reply = String(data.reply ?? "");

      setMsgs((m) => [...m, { role: "auri", text: reply }]);
      await saveMessage("auri", reply);
      speak(reply);

      setTimeout(() => scrollToBottom(false), 50);
    } catch {
      const fallback = lang === "en" ? "Connection problem." : lang === "pt" ? "Problema de conexão." : "Tuve un problema de conexión.";
      setMsgs((m) => [...m, { role: "auri", text: fallback }]);
      await saveMessage("auri", fallback);
      speak(fallback);
      setTimeout(() => scrollToBottom(false), 50);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const topBtnStyle = {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: "transparent",
    color: C.text,
    cursor: "pointer",
    fontWeight: 900 as const,
    whiteSpace: "nowrap" as const,
    fontSize: 13,
  };

  // ✅ logo centrado siempre en mobile
  const headerCenterLogo = (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
      <img src="/auriona-logo.png" alt="Auriona" style={{ width: isMobile ? 210 : 240, height: isMobile ? 48 : 60, objectFit: "contain" }} />
    </div>
  );

  return (
    <main
      style={{
        // ✅ 100dvh mejora con teclado móvil
        height: "100dvh",
        background: C.bg,
        color: C.text,
        overflow: "hidden",
      }}
    >
      <div style={{ height: "100%", display: "flex" }}>
        {/* Sidebar desktop */}
        {!isMobile && (
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
              <img src="/auriona-logo.png" alt="Auriona" style={{ width: "100%", maxWidth: 240, height: 70, objectFit: "contain" }} />
            </div>

            <button onClick={useMyLocation} style={topBtnStyle}>
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

            <button onClick={() => setAutoSpeak((v) => !v)} style={topBtnStyle}>
              🔊 Voz: {autoSpeak ? "ON" : "OFF"}
            </button>

            <div style={{ marginTop: "auto", display: "grid", gap: 10 }}>
              <button onClick={clearConversation} style={topBtnStyle}>
                Borrar historial
              </button>

              <button onClick={signOut} style={topBtnStyle}>
                Cerrar sesión
              </button>
            </div>
          </aside>
        )}

        {/* Main */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* ✅ Header sticky siempre visible */}
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              padding: isMobile ? "10px 12px" : 14,
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(11,15,23,0.92)",
              backdropFilter: "blur(8px)",
            }}
          >
            {isMobile ? (
              <>
                <button onClick={() => setShowMenu((v) => !v)} style={topBtnStyle} aria-label="Menu">
                  ☰
                </button>

                {headerCenterLogo}

                <div style={{ width: 44 }} /> {/* espaciador para centrar logo */}
              </>
            ) : (
              <>
                <div style={{ fontWeight: 900 }}>{title}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>Beta</div>
              </>
            )}
          </header>

          {/* Menú móvil desplegable */}
          {isMobile && showMenu && (
            <div style={{ borderBottom: `1px solid ${C.border}`, background: C.panel, padding: 12, display: "grid", gap: 10 }}>
              <button onClick={useMyLocation} style={topBtnStyle}>
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

              <button onClick={() => setAutoSpeak((v) => !v)} style={topBtnStyle}>
                🔊 Voz: {autoSpeak ? "ON" : "OFF"}
              </button>

              <button onClick={clearConversation} style={topBtnStyle}>
                Borrar historial
              </button>

              <button onClick={signOut} style={topBtnStyle}>
                Cerrar sesión
              </button>
            </div>
          )}

          {/* ✅ Scroller (chat) con padding inferior dinámico para que teclado/footer no tape */}
          <div
            ref={scrollerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? 12 : 18,
              paddingBottom: bottomPad,
              minWidth: 0,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {msgs.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div
                    style={{
                      maxWidth: isMobile ? "92%" : 760,
                      padding: "10px 12px",
                      borderRadius: 16,
                      border: `1px solid ${C.border}`,
                      background: isUser ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* ✅ Footer sticky: siempre visible; no tapa el chat porque el scroller tiene paddingBottom */}
          <div
            ref={footerRef}
            style={{
              position: "sticky",
              bottom: 0,
              zIndex: 60,
              padding: isMobile ? 10 : 16,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: 10,
              background: "rgba(15,22,38,0.98)",
              alignItems: "center",
            }}
          >
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
                flex: "0 0 auto",
              }}
              title="Mantener apretado para hablar"
            >
              {listening ? "🎙️" : "🎤"}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setTimeout(() => scrollToBottom(true), 80)} // ✅ cuando abre teclado
              placeholder={lang === "en" ? "Type or hold the mic…" : lang === "pt" ? "Digite ou segure o microfone…" : "Escribí o mantené apretado el mic…"}
              onKeyDown={(e) => e.key === "Enter" && send()}
              style={{
                flex: 1,
                minWidth: 0,
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
                minWidth: isMobile ? 74 : 92,
                flex: "0 0 auto",
              }}
            >
              {busy ? "..." : lang === "en" ? "Send" : "Enviar"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
