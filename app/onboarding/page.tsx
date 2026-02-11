"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Step =
  | "intro"
  | "call_assistant"
  | "call_user"
  | "family"
  | "loved_ones"
  | "likes"
  | "dislikes"
  | "goals"
  | "done";

export default function Onboarding() {
  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
    soft: "rgba(255,255,255,0.06)",
    glow: "rgba(64, 224, 208, 0.18)",
  };

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("intro");
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState("");

  // perfil a guardar
  const [callAssistant, setCallAssistant] = useState("Auri");
  const [callUser, setCallUser] = useState("");
  const [family, setFamily] = useState("");
  const [lovedOnes, setLovedOnes] = useState(""); // nombres
  const [likes, setLikes] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [goals, setGoals] = useState("");

  const prompt = useMemo(() => {
    switch (step) {
      case "intro":
        return "Hola, yo soy Auriona. Estoy acá para ayudarte a pensar mejor. Si querés, podés llamarme Auri.\n\n¿Arrancamos con 6 preguntas cortitas?";
      case "call_assistant":
        return "Primero: ¿Cómo querés llamarme? (ej: Auri, Auriu, Aura)";
      case "call_user":
        return "Ahora decime: ¿Cómo querés que te llame yo?";
      case "family":
        return "¿Cómo está conformada tu familia? (opcional)";
      case "loved_ones":
        return "Nombres importantes para vos (pareja, hij@s, mamá/papá, afectos). Lo que quieras compartir.";
      case "likes":
        return "¿Qué te gusta? (temas, hobbies, intereses, lo que te entusiasma)";
      case "dislikes":
        return "¿Qué no te gusta? (cosas que preferís evitar: temas, tono, hábitos)";
      case "goals":
        return "¿Qué querés que logremos juntas/os primero con Auriona?";
      case "done":
        return "Listo. Ya te conozco un poquito mejor 🙂";
      default:
        return "";
    }
  }, [step]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // siempre te dejo rehacer onboarding (beta)
      const meta: any = user.user_metadata || {};
      if (meta.call_assistant) setCallAssistant(meta.call_assistant);
      if (meta.call_user) setCallUser(meta.call_user);
      if (meta.family) setFamily(meta.family);
      if (meta.loved_ones) setLovedOnes(meta.loved_ones);
      if (meta.likes) setLikes(meta.likes);
      if (meta.dislikes) setDislikes(meta.dislikes);
      if (meta.goals) setGoals(meta.goals);

      setLoading(false);
    })();
  }, []);

  function nextStep() {
    const a = answer.trim();
    setErr("");

    if (step === "intro") {
      setStep("call_assistant");
      setAnswer(callAssistant);
      return;
    }

    if (step === "call_assistant") {
      if (a) setCallAssistant(a.slice(0, 20));
      setStep("call_user");
      setAnswer(callUser);
      return;
    }

    if (step === "call_user") {
      if (!a) {
        setErr("Decime cómo querés que te llame 🙂");
        return;
      }
      setCallUser(a.slice(0, 40));
      setStep("family");
      setAnswer(family);
      return;
    }

    if (step === "family") {
      if (a) setFamily(a.slice(0, 240));
      setStep("loved_ones");
      setAnswer(lovedOnes);
      return;
    }

    if (step === "loved_ones") {
      if (a) setLovedOnes(a.slice(0, 240));
      setStep("likes");
      setAnswer(likes);
      return;
    }

    if (step === "likes") {
      if (a) setLikes(a.slice(0, 240));
      setStep("dislikes");
      setAnswer(dislikes);
      return;
    }

    if (step === "dislikes") {
      if (a) setDislikes(a.slice(0, 240));
      setStep("goals");
      setAnswer(goals);
      return;
    }

    if (step === "goals") {
      if (a) setGoals(a.slice(0, 240));
      setStep("done");
      setAnswer("");
      return;
    }
  }

  async function finish() {
    setErr("");

    const cu = (callUser || "").trim();
    if (!cu) {
      setErr("Falta: cómo querés que te llame.");
      setStep("call_user");
      setAnswer(callUser);
      return;
    }

    const payload = {
      onboarded: true,
      call_assistant: (callAssistant || "Auri").trim().slice(0, 20),
      call_user: cu.slice(0, 40),
      family: family.trim().slice(0, 240),
      loved_ones: lovedOnes.trim().slice(0, 240),
      likes: likes.trim().slice(0, 240),
      dislikes: dislikes.trim().slice(0, 240),
      goals: goals.trim().slice(0, 240),
    };

    const { error } = await supabase.auth.updateUser({ data: payload });
    if (error) {
      setErr("No pude guardar: " + error.message);
      return;
    }

    window.location.href = "/app";
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "grid", placeItems: "center" }}>
        Cargando…
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "grid", placeItems: "center", padding: 18 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          border: `1px solid ${C.border}`,
          borderRadius: 22,
          background: C.panel,
          padding: 18,
          boxShadow: `0 0 0 1px ${C.glow}, 0 20px 60px rgba(0,0,0,0.55)`,
        }}
      >
        <div style={{ display: "grid", placeItems: "center", gap: 10, paddingTop: 6 }}>
          <img src="/auriona-logo.png" alt="Auriona" style={{ width: "100%", maxWidth: 300, height: 90, objectFit: "contain" }} />
          <div style={{ fontSize: 12, color: C.muted }}>Onboarding · perfil mínimo</div>
        </div>

        <div style={{ marginTop: 14, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 14, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
          {prompt}
        </div>

        {step !== "done" && step !== "intro" && (
          <div style={{ marginTop: 12 }}>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={step === "call_assistant" || step === "call_user" ? 2 : 4}
              placeholder="Escribí acá…"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.text,
                outline: "none",
                resize: "none",
                lineHeight: 1.35,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  nextStep();
                }
              }}
            />
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Enter = siguiente · Shift+Enter = salto de línea</div>
          </div>
        )}

        {err && (
          <div style={{ marginTop: 10, fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 16, padding: 10, background: "rgba(255,255,255,0.03)" }}>
            {err}
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          {step === "intro" ? (
            <button
              onClick={nextStep}
              style={{ flex: 1, padding: 12, borderRadius: 16, border: `1px solid ${C.border}`, background: C.soft, color: C.text, cursor: "pointer", fontWeight: 900 }}
            >
              Sí, dale
            </button>
          ) : step === "done" ? (
            <button
              onClick={finish}
              style={{ flex: 1, padding: 12, borderRadius: 16, border: `1px solid ${C.border}`, background: C.soft, color: C.text, cursor: "pointer", fontWeight: 900 }}
            >
              Entrar a Auriona
            </button>
          ) : (
            <button
              onClick={nextStep}
              style={{ flex: 1, padding: 12, borderRadius: 16, border: `1px solid ${C.border}`, background: C.soft, color: C.text, cursor: "pointer", fontWeight: 900 }}
            >
              Siguiente
            </button>
          )}
        </div>

        <div style={{ marginTop: 10, textAlign: "center" }}>
          <a href="/app" style={{ fontSize: 12, color: C.muted, textDecoration: "none", opacity: 0.9 }}>
            Saltear (beta) → ir a la app
          </a>
        </div>
      </div>
    </main>
  );
}
