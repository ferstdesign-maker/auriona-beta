"use client";

import { useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      // Esto toma el "code" del link del mail y crea la sesión en el navegador
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      // Si sale bien o mal, redirigimos igual para seguir el flujo
      window.location.href = error ? "/login" : "/app";
    })();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Conectando Auriona…</h1>
      <p>Un segundo.</p>
    </main>
  );
}
