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

  // ✅ nuevos checks
  const [isAdult, setIsAdult] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

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
      termsTitle: "Apto +18",
      termsLine1: "Confirmo que soy mayor de 18 años.",
      termsLine2a: "Acepto los",
      termsLine2b: "Términos y Condiciones",
      termsLine2c: "y la Política de Privacidad.",
      needChecks: "Para continuar, confirmá +18 y aceptá términos.",
      errorTitle: "Error",
    },
    pt: {
      email: "seu@email.com",
      password: "senha",
      login: "Entrar",
      signup: "Criar conta",
      created: "Conta criada — agora faça login.",
      missing: "Preencha email e senha.",
      termsTitle: "Apto 18+",
      termsLine1: "Confirmo que tenho mais de 18 anos.",
      termsLine2a: "Aceito os",
      termsLine2b: "Termos e Condições",
      termsLine2c: "e a Política de Privacidade.",
      needChecks: "Para continuar, confirme 18+ e aceite os termos.",
      errorTitle: "Erro",
    },
    en: {
      email: "you@email.com",
      password: "password",
      login: "Sign in",
      signup: "Create account",
      created: "Account created — now sign in.",
      missing: "Fill email and password.",
      termsTitle: "18+ only",
      termsLine1: "I confirm I’m over 18 years old.",
      termsLine2a: "I accept the",
      termsLine2b: "Terms & Conditions",
      termsLine2c: "and Privacy Policy.",
      needChecks: "To continue, confirm 18+ and accept terms.",
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

  const canContinue = isAdult && acceptTerms && !!email && !!password && !busy;

  async function login() {
    if (!email || !password) return alert(t.missing);
    if (!isAdult || !acceptTerms) return alert(t.needChecks);

    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) return alert(`${t.errorTitle}: ${error.message}`);

    // guardamos consentimiento “rápido” en metadata (ledger lo hacemos en Supabase luego)
    await supabase.auth.updateUser({ data: { lang, is_adult: true, accepted_terms: true } });

    window.location.href = "/app";
  }

  async function register() {
    if (!email || !password) return alert(t.missing);
    if (!isAdult || !acceptTerms) return alert(t.needChecks);

    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { lang, is_adult: true, accepted_terms: true } },
    });

    setBusy(false);

    if (error) return alert(`${t.errorTitle}: ${error.message}`);

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
          width: 390,
          maxWidth: "92vw",
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          background: C.panel,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
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

        {/* ✅ +18 + TyC */}
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 12,
            background: "rgba(255,255,255,0.03)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 13, color: C.text }}>{t.termsTitle}</div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.muted }}>
            <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} />
            <span>{t.termsLine1}</span>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.muted }}>
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            <span>
              {t.termsLine2a}{" "}
              <a href="/terms" target="_blank" style={{ color: C.text, textDecoration: "underline" }}>
                {t.termsLine2b}
              </a>{" "}
              {t.termsLine2c}
            </span>
          </label>
        </div>

        <button
          onClick={login}
          disabled={!canContinue}
          style={{
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: canContinue ? C.soft : "transparent",
            color: C.text,
            fontWeight: 900,
            cursor: canContinue ? "pointer" : "not-allowed",
            opacity: canContinue ? 1 : 0.55,
          }}
        >
          {busy ? "..." : t.login}
        </button>

        <button
          onClick={register}
          disabled={!canContinue}
          style={{
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.muted,
            cursor: canContinue ? "pointer" : "not-allowed",
            fontWeight: 800,
            opacity: canContinue ? 1 : 0.55,
          }}
        >
          {t.signup}
        </button>
      </div>
    </main>
  );
}
