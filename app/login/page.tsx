"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // idioma elegido en login (banderitas)
  const [lang, setLang] = useState<"es" | "pt" | "en">(() => {
    const v = (typeof window !== "undefined" && localStorage.getItem("auri_lang")) || "es";
    return (v === "pt" || v === "en" || v === "es") ? (v as any) : "es";
  });

  function setLangAndSave(v: "es" | "pt" | "en") {
    setLang(v);
    localStorage.setItem("auri_lang", v);
  }

  async function signIn() {
    setMsg("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // guardamos idioma en metadata si podemos (no bloqueante)
    await supabase.auth.updateUser({ data: { lang } });

    window.location.href = "/onboarding";
  }

  async function signUp() {
    setMsg("");
    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { lang } },
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Cuenta creada. Iniciá sesión.");
  }

  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
    soft: "rgba(255,255,255,0.06)",
  };

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "grid", placeItems: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 520, border: `1px solid ${C.border}`, borderRadius: 22, background: C.panel, padding: 18 }}>
        <div style={{ display: "grid", placeItems: "center", gap: 10, paddingTop: 6 }}>
          <img src="/auriona-logo.png" alt="Auriona" style={{ width: "100%", maxWidth: 320, height: 100, objectFit: "contain" }} />
          <div style={{ fontSize: 12, color: C.muted }}>Inicio de sesión</div>
        </div>

        {/* banderas */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
          <button onClick={() => setLangAndSave("es")} style={{ padding: "8px 12px", borderRadius: 14, border: `1px solid ${C.border}`, background: lang === "es" ? C.soft : "transparent", color: C.text, cursor: "pointer", fontWeight: 900 }}>
            🇦🇷 ES
          </button>
          <button onClick={() => setLangAndSave("pt")} style={{ padding: "8px 12px", borderRadius: 14, border: `1px solid ${C.border}`, background: lang === "pt" ? C.soft : "transparent", color: C.text, cursor: "pointer", fontWeight: 900 }}>
            🇧🇷 PT
          </button>
          <button onClick={() => setLangAndSave("en")} style={{ padding: "8px 12px", borderRadius: 14, border: `1px solid ${C.border}`, background: lang === "en" ? C.soft : "transparent", color: C.text, cursor: "pointer", fontWeight: 900 }}>
            🇺🇸 EN
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{ width: "100%", padding: 12, borderRadius: 16, border: `1px solid ${C.border}`, background: "transparent", color: C.text, outline: "none" }}
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="contraseña"
            type={showPass ? "text" : "password"}
            style={{ flex: 1, padding: 12, borderRadius: 16, border: `1px solid ${C.border}`, background: "transparent", color: C.text, outline: "none" }}
          />
          <button
            onClick={() => setShowPass((v) => !v)}
            style={{ padding: "12px 14px", borderRadius: 16, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontWeight: 900, minWidth: 56 }}
            title="Mostrar/ocultar"
          >
            {showPass ? "🙈" : "👁"}
          </button>
        </div>

        {msg && (
          <div style={{ marginTop: 10, fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 16, padding: 10, background: "rgba(255,255,255,0.03)" }}>
            {msg}
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button onClick={signIn} disabled={busy} style={{ flex: 1, padding: 12, borderRadius: 16, border: `1px solid ${C.border}`, background: C.soft, color: C.text, cursor: busy ? "not-allowed" : "pointer", fontWeight: 900 }}>
            Ingresar
          </button>
          <button onClick={signUp} disabled={busy} style={{ flex: 1, padding: 12, borderRadius: 16, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: busy ? "not-allowed" : "pointer", fontWeight: 900 }}>
            Registrarme
          </button>
        </div>
      </div>
    </main>
  );
}
