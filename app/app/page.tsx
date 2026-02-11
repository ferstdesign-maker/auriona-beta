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

  // ✅ teclado (Android): cuánto “sube” el footer
  const [kbOffset, setKbOffset] = useState(0);

  // ✅ medir alturas reales
  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = useState(64);
  const [footerH, setFooterH] = useState(90);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  function scrollToBottom(instant: boolean) {
    bottomRef.current?.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "end" });
  }

  function measureBars() {
    const hh = Math.ceil(headerRef.current?.getBoundingClientRect?.().height ?? 64);
    const fh = Math.ceil(footerRef.current?.getBoundingClientRect?.().height ?? 90);
    setHeaderH(hh);
    setFooterH(fh);
  }

  // init stored data
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
      measureBars();
      scrollToBottom(true);
    }
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Android keyboard handler (visualViewport)
  useEffect(() => {
    function updateKeyboardOffset() {
      const vv = window.visualViewport;
      if (!vv) {
        setKbOffset(0);
        return;
      }
      // cuánto “recorta” el teclado al viewport visible
      const offset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setKbOffset(offset);
      // al aparecer teclado, mantenemos el final visible
      setTimeout(() => scrollToBottom(true), 30);
      setTimeout(() => measureBars(), 30);
    }

    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener("resize", updateKeyboardOffset);
    vv.addEventListener("scroll", updateKeyboardOffset); // algunos android lo disparan así
    updateKeyboardOffset();

    return () => {
      vv.removeEventListener("resize", updateKeyboardOffset);
      vv.removeEventListener("scroll", updateKeyboardOffset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-medimos barras cuando cambia input (puede crecer)
  useEffect(() => {
    measureBars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, showMenu, isMobile]);

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
      setTimeout(() => scrollToBottom(true), 50);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scroll al final cuando llegan mensajes
  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs]);

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
        voices.find((v) => v.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase()));
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
      .limit(350);

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
    const ok = window.confirm(lang === "en" ? "Delete full history?" : lang === "pt" ? "Apagar histórico?" : "¿Borrar historial?");
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

    const txt = lang === "en" ? `Done ${callUser}.` : lang === "pt" ? `Pronto ${callUser}.` : `Listo ${callUser}.`;
    setMsgs([{ role: "auri", text: txt }]);
    speak(txt);
    setShowMenu(false);
    setTimeout(() => scrollToBottom(true), 50);
  }

  function micStart() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !recRef.current) {
      alert(lang === "en" ? "Dictation not supported." : "Dictado no soportado.");
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
    if (!navigator.geolocation) {
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
      () => alert(lang === "en" ? "Location denied." : "Ubicación denegada."),
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
      setTimeout(() => scrollToBottom(true), 40);
    } catch {
      const fallback = lang === "en" ? "Connection problem." : "Problema de conexión.";
      setMsgs((m) => [...m, { role: "auri", text: fallback }]);
      await saveMessage("auri", fallback);
      speak(fallback);
      setTimeout(() => scrollToBottom(true), 40);
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

  // ✅ fijos: header arriba, footer abajo (y footer sube con kbOffset)
  const fixedHeaderStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: isMobile ? 0 : 320,
    right: 0,
    zIndex: 50,
    padding: isMobile ? "10px 12px" : 14,
    borderBottom: `1px solid ${C.border}`,
    background: "rgba(11,15,23,0.92)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const fixedFooterStyle: React.CSSProperties = {
    position: "fixed",
    left: isMobile ? 0 : 320,
    right: 0,
    bottom: kbOffset, // ✅ se sube cuando aparece teclado
    zIndex: 60,
    padding: isMobile ? 10 : 16,
    borderTop: `1px solid ${C.border}`,
    background: "rgba(15,22,38,0.98)",
    display: "flex",
    gap: 10,
    alignItems: "center",
  };

  // ✅ área scroll: ocupa todo entre header y footer (más teclado)
  const contentTop = headerH;
  const contentBottom = footerH + kbOffset;

  return (
    <main style={{ height: "100vh", background: C.bg, color: C.text, overflow: "hidden" }}>
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

        {/* Main column */}
        <section style={{ flex: 1, minWidth: 0 }}>
          {/* ✅ HEADER FIXED */}
          <div ref={headerRef} style={fixedHeaderStyle}>
            {isMobile ? (
              <>
                <button onClick={() => setShowMenu((v) => !v)} style={topBtnStyle} aria-label="Menu">
                  ☰
                </button>

                {/* logo centrado */}
                <div style={{ display: "flex", justifyContent: "center", flex: 1 }}>
                  <img src="/auriona-logo.png" alt="Auriona" style={{ width: 210, height: 48, objectFit: "contain" }} />
                </div>

                <div style={{ width: 44 }} />
              </>
            ) : (
              <>
                <div style={{ fontWeight: 900 }}>{title}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>Beta</div>
              </>
            )}
          </div>

          {/* ✅ MENU móvil (debajo del header, dentro del flujo scroll para no tapar) */}
          {isMobile && showMenu && (
            <div
              style={{
                position: "fixed",
                top: headerH,
                left: 0,
                right: 0,
                zIndex: 55,
                borderBottom: `1px solid ${C.border}`,
                background: C.panel,
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
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

          {/* ✅ SCROLLER (entre header y footer) */}
          <div
            ref={scrollerRef}
            style={{
              position: "absolute",
              top: contentTop + (isMobile && showMenu ? 230 : 0), // menu ocupa altura aprox; simplificado
              left: isMobile ? 0 : 320,
              right: 0,
              bottom: contentBottom,
              overflowY: "auto",
              padding: isMobile ? 12 : 18,
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

          {/* ✅ FOOTER FIXED (y sube con el teclado) */}
          <div ref={footerRef} style={fixedFooterStyle}>
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
              onFocus={() => setTimeout(() => scrollToBottom(true), 40)}
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
