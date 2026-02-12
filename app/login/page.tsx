"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Lang = "es" | "pt" | "en";
type Geo = { lat: number; lon: number };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<Lang>("es");

  // ✅ checkboxes (nuevo orden)
  const [isAdult, setIsAdult] = useState(false);
  const [useGeo, setUseGeo] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [geo, setGeo] = useState<Geo | null>(null);

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
      created: "Mensaje enviado. Revisá tu correo.",
      missing: "Completá email y contraseña.",
      needAdult: "Confirmá +18 para continuar.",
      needLegal: "Aceptá Términos y Política para continuar.",
      errorTitle: "Error",
      geoFail: "No pude obtener tu ubicación.",
      geoNo: "Ubicación no disponible.",
      marker: "LOGIN v3 (CHECKS OK)",
      termsLink: "Términos y Condiciones",
      privacyLink: "Política de Privacidad",
    },
    pt: {
      email: "seu@email.com",
      password: "senha",
      login: "Entrar",
      signup: "Criar conta",
      created: "Mensagem enviada. Verifique seu e-mail.",
      missing: "Preencha email e senha.",
      needAdult: "Confirme 18+ para continuar.",
      needLegal: "Aceite Termos e Política para continuar.",
      errorTitle: "Erro",
      geoFail: "Não consegui obter sua localização.",
      geoNo: "Localização indisponível.",
      marker: "LOGIN v3 (CHECKS OK)",
      termsLink: "Termos e Condições",
      privacyLink: "Política de Privacidade",
    },
    en: {
      email: "you@email.com",
      password: "password",
      login: "Sign in",
      signup: "Create account",
      created: "Message sent. Check your email.",
      missing: "Fill email and password.",
      needAdult: "Confirm 18+ to continue.",
      needLegal: "Accept Terms and Privacy to continue.",
      errorTitle: "Error",
      geoFail: "I couldn’t get your location.",
      geoNo: "Location not available.",
      marker: "LOGIN v3 (CHECKS OK)",
      termsLink: "Terms & Conditions",
      privacyLink: "Privacy Policy",
    },
  }[lang];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/app";
    });

    const saved = localStorage.getItem("auri_lang") as Lang | null;
    if (saved === "es" || saved === "pt" || saved === "en") setLang(saved);

    try {
      const raw = localStorage.getItem("auriona_geo");
      if (raw) {
        const parsed = JSON.parse(raw);
        setGeo(parsed);
        setUseGeo(true);
      }
    } catch {}
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

  function saveGeo(g: Geo) {
    setGeo(g);
    try {
      localStorage.setItem("auriona_geo", JSON.stringify(g));
    } catch {}
  }

  // ✅ pedir ubicación cuando se tilda "USAR MI UBICACIÓN"
  function requestGeo() {
    if (!navigator.geolocation) {
      alert(t.geoNo);
      setUseGeo(false);
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setBusy(false);
      },
      () => {
        setBusy(false);
        alert(t.geoFail);
        setUseGeo(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const canContinue = isAdult && acceptTerms && acceptPrivacy && !!email && !!password && !busy;

  async function login() {
    if (!email || !password) return alert(t.missing);
    if (!isAdult) return alert(t.needAdult);
    if (!acceptTerms || !acceptPrivacy) return alert(t.needLegal);

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) return alert(`${t.errorTitle}: ${error.message}`);

    await supabase.auth.updateUser({
      data: {
        lang,
        is_adult: true,
        accepted_terms: true,
        accepted_privacy: true,
        geo_opt_in: useGeo ? true : false,
      },
    });

    window.location.href = "/app";
  }

  async function register() {
    if (!email || !password) return alert(t.missing);
    if (!isAdult) return alert(t.needAdult);
    if (!acceptTerms || !acceptPrivacy) return alert(t.needLegal);

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          lang,
          is_adult: true,
          accepted_terms: true,
          accepted_privacy: true,
          geo_opt_in: useGeo ? true : false,
        },
      },
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
          <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>{t.marker}</div>
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

        {/* ✅ CHECKS arriba (orden de importancia) */}
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
          {/* +18 en grande y negrita, misma línea */}
          <label style={{ display: "flex", gap: 10, alignItems: "center", color: C.text }}>
            <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} />
            <span style={{ fontWeight: 900, fontSize: 16 }}>+ 18</span>
            <span style={{ fontWeight: 500, fontSize: 13, color: C.muted }}>
              Confirmo que soy mayor de 18 años.
            </span>
          </label>

          {/* USAR MI UBICACIÓN: checkbox (NO botón) */}
          <label style={{ display: "flex", gap: 10, alignItems: "center", color: C.text }}>
            <input
              type="checkbox"
              checked={useGeo}
              onChange={(e) => {
                const v = e.target.checked;
                setUseGeo(v);
                if (v) requestGeo();
                if (!v) {
                  setGeo(null);
                  localStorage.removeItem("auriona_geo");
                }
              }}
            />
            <span style={{ fontWeight: 900, letterSpacing: 0.6 }}>
              USAR MI UBICACIÓN {geo ? "✅" : ""}
            </span>
          </label>

          {/* TyC */}
          <label style={{ display: "flex", gap: 10, alignItems: "center", color: C.text }}>
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            <span style={{ fontSize: 13, color: C.muted }}>
              Acepto los{" "}
              <a href="/terms" target="_blank" style={{ color: C.text, textDecoration: "underline" }}>
                {t.termsLink}
              </a>
              .
            </span>
          </label>

          {/* Privacidad */}
          <label style={{ display: "flex", gap: 10, alignItems: "center", color: C.text }}>
            <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} />
            <span style={{ fontSize: 13, color: C.muted }}>
              Acepto la{" "}
              <a href="/privacy" target="_blank" style={{ color: C.text, textDecoration: "underline" }}>
                {t.privacyLink}
              </a>
              .
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
