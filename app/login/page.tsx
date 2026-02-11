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

  const t = {
    es: {
      email: "tu@email.com",
      password: "contraseña",
      login: "Ingresar",
      signup: "Registrarme",
      created: "Registro creado — ahora ingresá.",
      missing: "Completá email y contraseña.",
      errorTitle: "Error",
    },
    pt: {
      email: "seu@email.com",
      password: "senha",
      login: "Entrar",
      signup: "Criar conta",
      created: "Conta criada — agora faça login.",
      missing: "Preencha email e senha.",
      errorTitle: "Erro",
    },
    en: {
      email: "you@email.com",
      password: "password",
      login: "Sign in",
      signup: "Create account",
      created: "Account created — now sign in.",
      missing: "Fill email and password.",
      errorTitle: "Error",
    },
  }[lang];

  useEffect(() => {
    const saved = localStorage.getItem("auri_lang") as Lang | null;
    if (saved === "es" || saved === "pt" || saved === "en") setLang(saved);
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
    if (!email || !password) {
      alert(t.missing);
      return;
    }
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      alert(`${t.errorTitle}: ${error.message}`);
      return;
    }

    // guardamos el idioma en metadata (no bloquea)
    await supabase.auth.updateUser({ data: { lang } });

    window.location.href = "/app";
  }

  async function register() {
    if (!email || !password) {
      alert(t.missing);
      return;
    }
    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { lang } },
    });

    setBusy(false);

    if (error) {
      alert(`${t.errorTitle}: ${error.message}`);
      return;
    }

    alert(t.created);
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
          <img src="/auriona-logo.png" alt="Auriona" style={{ width: 220, objectFit: "contain" }} />
        </div>

        {/* BANDERAS */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 6 }}>
          <button onClick={() => setLangAndSave("es")} style={flagBtn(lang === "es")} title="Español">
            <img src="/flags/ar.png" width={24} height={24} alt="AR" />
          </button>

          <button onClick={() => setLangAndSave("pt")} style={flagBtn(lang === "pt")} title="Português">
            <img src="/flags/br.png" width={24} height={24} alt="BR" />
          </button>

          <button onClick={() => setLangAndSave("en")} style={flagBtn(lang === "en")} title="English">
            <img src="/flags/us.png" width={24} height={24} alt="US" />
          </button>
        </div>

        {/* EMAIL */}
        <input
          placeholder={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.text,
            outline: "none",
          }}
        />

        {/* PASSWORD + OJO */}
        <div style={{ position: "relative" }}>
          <input
            type={showPass ? "text" : "password"}
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              outline: "none",
            }}
          />

          <button
            onClick={() => setShowPass((v) => !v)}
            type="button"
            style={{
              position: "absolute",
              right: 8,
              top: 6,
              height: 36,
              width: 44,
              borderRadius: 12,
              background: "transparent",
              border: `1px solid ${C.border}`,
              cursor: "pointer",
              color: C.text,
            }}
            title={showPass ? "Ocultar" : "Mostrar"}
          >
            {showPass ? "🙈" : "👁"}
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
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "..." : t.login}
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
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {t.signup}
        </button>
      </div>
    </main>
  );
}
