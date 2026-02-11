"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState<string>("");

  // Si ya está logueado, directo a /app
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) window.location.href = "/app";
    })();
  }, []);

  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
    soft: "rgba(255,255,255,0.06)",
    glow: "rgba(64, 224, 208, 0.18)",
  };

  async function doLogin() {
    setBusy(true);
    setMsg("");

    const e = email.trim();
    const p = password.trim();

    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.href = "/app";
  }

  async function doSignup() {
    setBusy(true);
    setMsg("");

    const e = email.trim();
    const p = password.trim();

    const { error } = await supabase.auth.signUp({ email: e, password: p });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Listo. Revisá tu mail para confirmar (si Supabase lo pide) y después ingresá.");
    setMode("login");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          border: `1px solid ${C.border}`,
          borderRadius: 22,
          background: C.panel,
          padding: 18,
          boxShadow: `0 0 0 1px ${C.glow}, 0 20px 60px rgba(0,0,0,0.55)`,
        }}
      >
        <div style={{ display: "grid", placeItems: "center", gap: 10, paddingTop: 6 }}>
          <img
            src="/auriona-logo.png"
            alt="Auriona"
            style={{ width: "100%", maxWidth: 260, height: 90, objectFit: "contain", display: "block" }}
          />
          <div style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>
            {mode === "login" ? "Ingresá a tu cuenta" : "Creá tu cuenta"}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <label style={{ fontSize: 12, color: C.muted }}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{
              padding: 12,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              outline: "none",
            }}
          />

          <label style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              padding: 12,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? doLogin() : doSignup())}
          />

          {msg && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: C.muted,
                border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                padding: 10,
                lineHeight: 1.35,
              }}
            >
              {msg}
            </div>
          )}

          <button
            onClick={mode === "login" ? doLogin : doSignup}
            disabled={busy}
            style={{
              marginTop: 12,
              width: "100%",
              padding: 14,
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              background: busy ? "transparent" : C.soft,
              color: C.text,
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 0.3,
            }}
          >
            {busy ? "..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            style={{
              marginTop: 8,
              width: "100%",
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              cursor: "pointer",
              fontWeight: 800,
              opacity: 0.9,
            }}
          >
            {mode === "login" ? "Registrarme" : "Ya tengo cuenta"}
          </button>

          <a
            href="/onboarding"
            style={{
              marginTop: 10,
              textAlign: "center",
              fontSize: 12,
              color: C.muted,
              textDecoration: "none",
              opacity: 0.9,
            }}
          >
            Volver al onboarding
          </a>
        </div>
      </div>
    </main>
  );
}
