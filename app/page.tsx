export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, width: "100%", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Auriona</h1>
        <p style={{ marginTop: 10, opacity: 0.8 }}>
          Beta mínima online (en construcción).
        </p>
        <div style={{ marginTop: 16, fontSize: 14, opacity: 0.75 }}>
          Próximo: login + chat + historial.
        </div>
      </div>
    </main>
  );
}
