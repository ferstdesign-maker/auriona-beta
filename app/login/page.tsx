"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Lang = "es" | "pt" | "en";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<Lang>("es");

  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
    soft: "rgba(255,255,255,0.06)",
  };

  useEffect(() => {
    const saved = localStorage.getItem("auri_lang") as Lang | null;
    if (saved) setLang(saved);
  }, []);

  function setLangAndSave(l: Lang) {
    setLang(l);
    localStorage.setItem("auri_lang", l);
  }

  function flagBtn(active: boolean) {
    return {
      padding: "10px",
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      background: active ? C.soft : "transparent",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
    } as const;
  }

  async function login() {
    if (!email || !password) return;
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/app";
  }

  async function register() {
    if (!email || !password) return;
    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Registro creado — ahora ingresá.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: C.bg,
        color: C.text,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 380,
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          background: C.panel,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* LOGO */}
        <div style={{ display: "grid", placeItems: "center" }}>
          <img
            src="/auriona-logo.png"
            alt="Auriona"
            style={{ width: 220, objectFit: "contain" }}
          />
        </div>

        {/* BANDERAS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <button onClick={() => setLangAndSave("es")} style={flagBtn(lang === "es")}>
            <img src="/flags/ar.png" width={24} />
          </button>

          <button onClick={() => setLangAndSave("pt")} style={flagBtn(lang === "pt")}>
            <img src="/flags/br.png" width={24} />
          </button>

          <button onClick={() => setLangAndSave("en")} style={flagBtn(lang === "en")}>
            <img src="/flags/us.png" width={24} />
          </button>
        </div>

        {/* EMAIL */}
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.text,
          }}
        />

        {/* PASSWORD + OJO */}
        <div style={{ position: "relative" }}>
          <input
            type={showPass ? "text" : "password"}
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
            }}
          />

          <button
            onClick={() => setShowPass(!showPass)}
            style={{
              position: "absolute",
              right: 8,
              top: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.muted,
            }}
          >
            👁
          </button>
        </div>

        {/* BOTONES */}
        <button
          onClick={login}
          disabled={busy}
          style={{
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.soft,
            color: C.text,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Ingresar
        </button>

        <button
          onClick={register}
          disabled={busy}
          style={{
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.muted,
            cursor: "pointer",
          }}
        >
          Registrarme
        </button>
      </div>
    </main>
  );
}
