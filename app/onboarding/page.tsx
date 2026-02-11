"use client";

export default function Onboarding() {
  const C = {
    bg: "#0b0f17",
    panel: "#0f1626",
    border: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)",
    glow: "rgba(64, 224, 208, 0.18)", // turquesa suave
  };

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
        {/* Header */}
        <div style={{ display: "grid", placeItems: "center", gap: 10, paddingTop: 8 }}>
          <img
            src="/auriona-logo.png"
            alt="Auriona"
            style={{
              width: "100%",
              maxWidth: 260,
              height: 90,
              objectFit: "contain",
              display: "block",
            }}
          />
          <div style={{ fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 1.4 }}>
            Tu asistente personal para pensar, organizar y decidir — con calma.
          </div>
        </div>

        {/* 3 Cards */}
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <Card
            title="🧠 Conversación con memoria"
            text="Recordá lo importante de cada charla y retomá cuando quieras."
            C={C}
          />
          <Card
            title="🗂️ Historial ordenado"
            text="Renombrá, revisá y borrá conversaciones cuando lo necesites."
            C={C}
          />
          <Card
            title="⚡ Respuestas rápidas"
            text="Preguntás, Auriona responde. Simple, directo y útil."
            C={C}
          />
        </div>

        {/* CTA */}
        <button
          onClick={() => (window.location.href = "/login")}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 14,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            background: "rgba(255,255,255,0.06)",
            color: C.text,
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: 0.3,
          }}
        >
          Empezar
        </button>

        <div style={{ marginTop: 10, fontSize: 12, color: C.muted, textAlign: "center" }}>
          Beta mínima · FERST / Auriona
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  text,
  C,
}: {
  title: string;
  text: string;
  C: { border: string; muted: string };
}) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 12,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45 }}>{text}</div>
    </div>
  );
}
