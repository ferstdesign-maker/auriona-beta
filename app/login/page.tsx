"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function signUp() {
    setMsg("Creando usuario...");
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) setMsg(`Error: ${error.message}`);
    else setMsg("Usuario creado. Ahora podés ingresar.");
  }

  async function signIn() {
    setMsg("Ingresando...");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMsg(`Error: ${error.message}`);
    else window.location.href = "/app";
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Inicio de sesión en Auriona</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
        <input
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10 }}
        />

        <input
          type="password"
          placeholder="contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10 }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={signIn} style={{ padding: 10, flex: 1 }}>
            Ingresar
          </button>

          <button onClick={signUp} style={{ padding: 10, flex: 1 }}>
            Registrarme
          </button>
        </div>

        <p>{msg}</p>
      </div>
    </main>
  );
}
