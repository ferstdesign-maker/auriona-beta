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
        setGeo(JSON.parse(raw));
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
    localStorage.setItem("auriona_geo", JSON.stringify(g));
  }

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

  const canContinue =
    isAdult &&
    acceptTerms &&
    acceptPrivacy &&
    !!email &&
    !!password &&
    !busy;

  async function login() {
    if (!email || !password) return alert(t.missing);
    if (!isAdult) return alert(t.needAdult);
    if (!acceptTerms || !acceptPrivacy) return alert(t.needLegal);

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);

    if (error) return alert(`${t.errorTitle}: ${error.message}`);

    await supabase.auth.updateUser({
      data: {
        lang,
        is_adult: true,
        accepted_terms: true,
        accepted_privacy: true,
        geo_opt_in: useGeo,
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
          geo_opt_in: useGeo,
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
      <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
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
            <img
              src="/auriona-logo.png"
              alt="Auriona"
              style={{ width: 220, objectFit: "contain" }}
            />

            {/* ✅ BETA 1.0 centrado */}
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: C.muted,
                textAlign: "center",
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              BETA 1.0
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {["es", "pt", "en"].map((l) => (
              <button
                key={l}
                onClick={() => setLangAndSave(l as Lang)}
                style={flagBtn(lang === l)}
              >
                <img
                  src={`/flags/${l === "es" ? "ar" : l === "pt" ? "br" : "us"}.png`}
                  width={24}
                  height={24}
                  alt={l}
                />
              </button>
            ))}
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
              }}
            />
            <button
              onClick={() => setShowPass(!showPass)}
              type="button"
              style={{
                position: "absolute",
                right: 8,
                top: 6,
                height: 36,
                width: 44,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.text,
                cursor: "pointer",
              }}
              title={showPass ? "Ocultar" : "Mostrar"}
            >
              {showPass ? "🙈" : "👁"}
            </button>
          </div>

          {/* CHECKS */}
          <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
              />
              <span style={{ fontWeight: 900, fontSize: 16 }}>+18</span>
              <span style={{ fontSize: 13, color: C.muted }}>
                Confirmo que soy mayor de 18 años
              </span>
            </label>

            {/* ✅ Ubicación SIN negrita (igual que políticas) + icono */}
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={useGeo}
                onChange={(e) => {
                  const v = e.target.checked;
                  setUseGeo(v);
                  if (v) requestGeo();
                  if (!v) localStorage.removeItem("auriona_geo");
                }}
              />
              <span style={{ fontSize: 13, color: C.muted }}>
                📍 Usar mi ubicación {geo ? "✅" : ""}
              </span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span style={{ fontSize: 13, color: C.muted }}>
                Acepto los{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: C.text, textDecoration: "underline" }}
                >
                  {t.termsLink}
                </a>
              </span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
              />
              <span style={{ fontSize: 13, color: C.muted }}>
                Acepto la{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: C.text, textDecoration: "underline" }}
                >
                  {t.privacyLink}
                </a>
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

        {/* ✅ Créditos fuera del recuadro, sobre fondo negro */}
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
          idea + desarrollo y programacion:{" "}
          <a
            href="https://www.ferst.com.ar"
            target="_blank"
            rel="noreferrer"
            style={{ color: C.text, textDecoration: "underline" }}
          >
            www.ferst.com.ar
          </a>
        </div>
      </div>
    </main>
  );
}
