"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Msg = { role: "user" | "auri"; text: string };
type Lang = "es" | "pt" | "en";
type LocationState = { lat: number | null; lon: number | null };
type UiMode = "normal" | "silence" | "danger";

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

  // ✅ modos
  const [uiMode, setUiMode] = useState<UiMode>("normal");
  const [hasHeadphones, setHasHeadphones] = useState(false);

  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const [loc, setLoc] = useState<LocationState>({ lat: null, lon: null });

  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [kbOffset, setKbOffset] = useState(0);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = useState(64);
  const [footerH, setFooterH] = useState(90);

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

  // =========================
  // ✅ AUDIO (ElevenLabs)
  // =========================
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioHint, setAudioHint] = useState<string | null>(null);
  const TTS_MAX_CHARS = 220;

  function cleanupAudio() {
    try {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.src = "";
      }
      audioRef.current = null;

      if (lastUrlRef.current) {
        try {
          URL.revokeObjectURL(lastUrlRef.current);
        } catch {}
        lastUrlRef.current = null;
      }
    } catch {}
  }

  function stopSpeaking() {
    cleanupAudio();
  }

  function uiHintUnlock() {
    return lang === "en"
      ? "Tap/click once to enable audio."
      : lang === "pt"
      ? "Toque/clique uma vez para ativar o áudio."
      : "Tocá / cliqueá una vez para habilitar el audio.";
  }

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
      lastStop > Math.floor(maxChars * 0.55)
        ? slice.slice(0, lastStop + 1)
        : slice;

    return cut.trim() + "…";
  }

  function normalizeForTTS(text: string) {
    let t = String(text || "");
    t = t.replace(/https?:\/\/\S+/gi, " ");
    t = t.replace(/\bwww\.\S+/gi, " ");
    t = t.replace(/\S+@\S+\.\S+/g, " ");
    t = t.replace(/[()[\]{}<>]/g, " ");
    t = t.replace(/\s+/g, " ").trim();

    t = t.replace(/\bKMS\b/gi, "kilómetros");
    t = t.replace(/\bKM\/H\b/gi, "kilómetros por hora");
    t = t.replace(/\bKMH\b/gi, "kilómetros por hora");
    t = t.replace(/\bKM\b/gi, "kilómetro");

    t = t.replace(/(\d)\s*°\s*C/gi, "$1 grados");
    t = t.replace(/(\d)\s*°C/gi, "$1 grados");
    t = t.replace(/(\d+)\s*%/g, "$1 por ciento");
    t = t.replace(/\bUSD\s*(\d+)/gi, "dólares $1");

    return t.replace(/\s+/g, " ").trim();
  }

  // ✅ speak() corregida: ahora lee JSON de error y muestra hint real
  async function speak(text: string) {
    if (!autoSpeak) return;
    if (typeof window === "undefined") return;

    // hard rule: solo habla en normal, o peligro con auriculares
    const speakAllowed =
      uiMode === "normal" ? true : uiMode === "danger" ? hasHeadphones : false;
    if (!speakAllowed) return;

    if (!audioUnlocked) {
      setAudioHint(uiHintUnlock());
      return;
    }

    const cleaned = normalizeForTTS(text);
    const ttsText = clampForTTS(cleaned, TTS_MAX_CHARS);
    if (!ttsText) return;

    stopSpeaking();

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText, lang }),
      });

      const ct = (res.headers.get("content-type") || "").toLowerCase();

      // ✅ si falla, leemos JSON y mostramos el hint real
      if (!res.ok || ct.includes("application/json")) {
        let hint = "Audio no disponible (TTS).";
        try {
          const j = await res.json();
          hint =
            String(j?.hint || j?.error || "Audio no disponible (TTS).") +
            (j?.code ? ` (${j.code})` : "");
        } catch {
          // nada
        }
        setAudioHint(hint);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      lastUrlRef.current = url;

      const a = new Audio(url);
      a.playbackRate = 1.15;
      a.volume = 1.0;

      a.onended = () => {
        try {
          if (lastUrlRef.current) {
            URL.revokeObjectURL(lastUrlRef.current);
            lastUrlRef.current = null;
          }
        } catch {}
      };

      a.onerror = () => setAudioHint("No pude reproducir audio.");

      audioRef.current = a;

      await a.play().catch(() => {
        setAudioUnlocked(false);
        setAudioHint(uiHintUnlock());
      });
    } catch (e: any) {
      setAudioHint("Audio no disponible (error). " + String(e?.message || ""));
    }
  }

  useEffect(() => {
    function unlock() {
      setAudioUnlocked(true);
      setAudioHint(null);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // =========================
  // ✅ Helpers
  // =========================
  function getStoredLang(): Lang {
    const v =
      (typeof window !== "undefined" && localStorage.getItem("auri_lang")) ||
      "es";
    if (v === "pt" || v === "en" || v === "es") return v;
    return "es";
  }

  function getStoredLoc(): LocationState {
    if (typeof window === "undefined") return { lat: null, lon: null };

    const tryRead = (key: string): LocationState | null => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const j = JSON.parse(raw);
        const lat = typeof j.lat === "number" ? j.lat : null;
        const lon = typeof j.lon === "number" ? j.lon : null;
        if (lat === null || lon === null) return { lat: null, lon: null };
        return { lat, lon };
      } catch {
        return null;
      }
    };

    return tryRead("auriona_geo") ?? tryRead("auri_loc") ?? { lat: null, lon: null };
  }

  function scrollToBottom(instant: boolean) {
    bottomRef.current?.scrollIntoView({
      behavior: instant ? "auto" : "smooth",
      block: "end",
    });
  }

  function measureBars() {
    const hh = Math.ceil(headerRef.current?.getBoundingClientRect?.().height ?? 64);
    const fh = Math.ceil(footerRef.current?.getBoundingClientRect?.().height ?? 90);
    setHeaderH(hh);
    setFooterH(fh);
  }

  useEffect(() => {
    setLang(getStoredLang());
    setLoc(getStoredLoc());
  }, []);

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

  useEffect(() => {
    function updateKeyboardOffset() {
      const vv = window.visualViewport;
      if (!vv) {
        setKbOffset(0);
        return;
      }
      const offset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      setKbOffset(offset);
      setTimeout(() => scrollToBottom(true), 30);
      setTimeout(() => measureBars(), 30);
    }

    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener("resize", updateKeyboardOffset);
    vv.addEventListener("scroll", updateKeyboardOffset);
    updateKeyboardOffset();

    return () => {
      vv.removeEventListener("resize", updateKeyboardOffset);
      vv.removeEventListener("scroll", updateKeyboardOffset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    measureBars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, showMenu, isMobile]);

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

  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = lang === "pt" ? "pt-BR" : lang === "en" ? "en-US" : "es-AR";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
      }
      const add = finalText.trim();
      if (add) setInput((prev) => (prev ? prev + " " + add : add));
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, [lang]);

  async function loadMainConversation() {
    const { data: rows, error } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .is("conversation_id", null)
      .order("created_at", { ascending: true })
      .limit(250);

    if (error) {
      setMsgs([{ role: "auri", text: `No pude cargar el historial: ${error.message}` }]);
      return;
    }

    if (!rows || rows.length === 0) {
      const hello =
        lang === "en"
          ? `Hi ${callUser}. I'm ${callAssistant}.`
          : lang === "pt"
          ? `Oi ${callUser}. Eu sou ${callAssistant}.`
          : `Hola ${callUser}. Soy ${callAssistant}.`;
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
    const ok = window.confirm("¿Borrar historial?");
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

    const txt = `Listo ${callUser}. Empezamos de cero.`;
    setMsgs([{ role: "auri", text: txt }]);
    await speak(txt);
    setShowMenu(false);
    setTimeout(() => scrollToBottom(true), 50);
  }

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !recRef.current) {
      alert("Tu navegador no soporta dictado. Probá Chrome (Android) o Edge.");
      return;
    }

    stopSpeaking();

    if (!listening) {
      setListening(true);
      try {
        recRef.current.start();
      } catch {
        setListening(false);
        alert("No pude iniciar el mic. Revisá permisos de micrófono del navegador.");
      }
    } else {
      try {
        recRef.current.stop();
      } catch {}
      setListening(false);
    }
  }

  function handleModeCommandLocally(text: string): UiMode | null {
    const m = text.trim().toLowerCase();
    if (m === "auri silencio" || m === "/silencio" || m === "modo silencio")
      return "silence";
    if (m === "auri peligro" || m === "/peligro" || m === "modo peligro")
      return "danger";
    if (m === "auri normal" || m === "/normal" || m === "modo normal")
      return "normal";
    return null;
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    setInput("");

    // comandos locales
    const cmd = handleModeCommandLocally(text);
    if (cmd) {
      setUiMode(cmd);
      const reply = cmd === "danger" ? "Entendido." : "Ok.";
      setMsgs((m) => [...m, { role: "user", text }, { role: "auri", text: reply }]);
      await saveMessage("user", text);
      await saveMessage("auri", reply);
      await speak(reply);
      setTimeout(() => scrollToBottom(true), 40);
      return;
    }

    // push user + placeholder auri
    setMsgs((m) => [...m, { role: "user", text }, { role: "auri", text: "" }]);
    setBusy(true);
    await saveMessage("user", text);

    // ✅ JSON-only estable (sin SSE)
    try {
      const history = msgs.slice(-16).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const safeLocation =
        typeof loc?.lat === "number" && typeof loc?.lon === "number" ? loc : {};

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          lang,
          location: safeLocation,
          profile: { callUser, callAssistant },
          ui_mode: uiMode,
          has_headphones: hasHeadphones,
          stream: false,
        }),
      });

      const raw = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }

      // ✅ si NO vino JSON, mostramos lo que vino (evita "Tuve un problema" sin info)
      if (!data) {
        const msg = `API /chat no devolvió JSON. status ${res.status}.`;
        const show = msg + "\n" + raw.slice(0, 300);

        setMsgs((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "auri", text: show };
          return next;
        });

        await saveMessage("auri", msg);
        setTimeout(() => scrollToBottom(true), 40);
        return;
      }

      const reply = String(data.reply ?? "");
      const speakAllowed = data.speak !== false;

      const effective = String(data.effective_mode || "") as UiMode;
      if (effective === "normal" || effective === "silence" || effective === "danger") {
        setUiMode(effective);
      }

      setMsgs((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "auri", text: reply };
        return next;
      });

      await saveMessage("auri", reply);
      if (speakAllowed) await speak(reply);

      setTimeout(() => scrollToBottom(true), 40);
      return;
    } catch (e: any) {
      const fallback = "Tuve un problema: " + String(e?.message || e);

      setMsgs((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "auri", text: fallback };
        return next;
      });

      await saveMessage("auri", fallback);
      await speak(fallback);
      setTimeout(() => scrollToBottom(true), 40);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    stopSpeaking();
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
    bottom: kbOffset,
    zIndex: 60,
    padding: isMobile ? 10 : 16,
    borderTop: `1px solid ${C.border}`,
    background: "rgba(15,22,38,0.98)",
    display: "flex",
    gap: 10,
    alignItems: "center",
  };

  const contentTop = headerH;
  const contentBottom = footerH + kbOffset;

  function toggleVoice() {
    setAutoSpeak((v) => {
      const next = !v;
      if (!next) stopSpeaking();
      return next;
    });
  }

  function toggleSilence() {
    setUiMode((m) => (m === "silence" ? "normal" : "silence"));
    stopSpeaking();
  }

  function panicDanger() {
    setUiMode("danger");
    stopSpeaking();
  }

  function badgeMode() {
    if (uiMode === "danger") return "PELIGRO";
    if (uiMode === "silence") return "SILENCIO";
    return "NORMAL";
  }

  return (
    <main style={{ height: "100vh", background: C.bg, color: C.text, overflow: "hidden" }}>
      <div style={{ height: "100%", display: "flex" }}>
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
              <img
                src="/auriona-logo.png"
                alt="Auriona"
                style={{
                  width: "100%",
                  maxWidth: 240,
                  height: 70,
                  objectFit: "contain",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={toggleVoice} style={topBtnStyle}>
                🔊 Voz: {autoSpeak ? "ON" : "OFF"}
              </button>
              <button onClick={toggleSilence} style={topBtnStyle}>
                🔇 Silencio: {uiMode === "silence" ? "ON" : "OFF"}
              </button>
              <button
                onClick={panicDanger}
                style={{ ...topBtnStyle, borderColor: "rgba(255,80,80,0.55)" }}
              >
                🚨 Peligro
              </button>
            </div>

            <button
              onClick={() => setHasHeadphones((v) => !v)}
              style={topBtnStyle}
            >
              🎧 Auriculares: {hasHeadphones ? "SI" : "NO"}
            </button>

            <div style={{ fontSize: 12, color: C.muted }}>
              Modo actual: <b style={{ color: C.text }}>{badgeMode()}</b>
            </div>

            {audioHint && (
              <div
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 12,
                  color: C.muted,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {audioHint}
              </div>
            )}

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

        <section style={{ flex: 1, minWidth: 0 }}>
          <div ref={headerRef} style={fixedHeaderStyle}>
            {isMobile ? (
              <>
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  style={topBtnStyle}
                  aria-label="Menu"
                >
                  ☰
                </button>
                <div style={{ display: "flex", justifyContent: "center", flex: 1 }}>
                  <img
                    src="/auriona-logo.png"
                    alt="Auriona"
                    style={{ width: 210, height: 48, objectFit: "contain" }}
                  />
                </div>
                <div style={{ width: 44 }} />
              </>
            ) : (
              <>
                <div style={{ fontWeight: 900 }}>{title}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
                  Beta • <b style={{ color: C.text }}>{badgeMode()}</b>
                </div>
              </>
            )}
          </div>

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
              <button onClick={toggleVoice} style={topBtnStyle}>
                🔊 Voz: {autoSpeak ? "ON" : "OFF"}
              </button>
              <button onClick={toggleSilence} style={topBtnStyle}>
                🔇 Silencio: {uiMode === "silence" ? "ON" : "OFF"}
              </button>
              <button
                onClick={panicDanger}
                style={{ ...topBtnStyle, borderColor: "rgba(255,80,80,0.55)" }}
              >
                🚨 Peligro
              </button>
              <button
                onClick={() => setHasHeadphones((v) => !v)}
                style={topBtnStyle}
              >
                🎧 Auriculares: {hasHeadphones ? "SI" : "NO"}
              </button>
              <div style={{ fontSize: 12, color: C.muted }}>
                Modo actual: <b style={{ color: C.text }}>{badgeMode()}</b>
              </div>
              {audioHint && (
                <div
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 12,
                    color: C.muted,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  {audioHint}
                </div>
              )}
              <button onClick={clearConversation} style={topBtnStyle}>
                Borrar historial
              </button>
              <button onClick={signOut} style={topBtnStyle}>
                Cerrar sesión
              </button>
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: contentTop + (isMobile && showMenu ? 270 : 0),
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
                      maxWidth: isMobile ? "92%" : 760,
                      padding: "10px 12px",
                      borderRadius: 16,
                      border: `1px solid ${C.border}`,
                      background: isUser
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.03)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text || (busy && !isUser ? "…" : "")}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div ref={footerRef} style={fixedFooterStyle}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setTimeout(() => scrollToBottom(true), 40)}
              placeholder={"Escribí…"}
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
              onClick={toggleMic}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                background: listening ? "rgba(255,255,255,0.10)" : "transparent",
                color: C.text,
                cursor: "pointer",
                fontWeight: 900,
                minWidth: 54,
                flex: "0 0 auto",
              }}
              title={listening ? "Tocar para detener" : "Tocar para dictar"}
            >
              {listening ? "🎙️" : "🎤"}
            </button>

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
              {busy ? "..." : "Enviar"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}