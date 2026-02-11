"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Msg = { role: "user" | "auri"; text: string };
type Conv = { id: string; title: string; created_at: string };

export default function AppPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string>("");

  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("legacy");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeTitle = useMemo(() => {
    if (activeConvId === "legacy") return "Legacy (mensajes viejos)";
    const c = convs.find((x) => x.id === activeConvId);
    return c?.title ?? "Conversación";
  }, [activeConvId, convs]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        window.location.href = "/login";
        return;
      }
      setEmail(u.user.email ?? "");
      setUserId(u.user.id);

      await loadConversations();
      await loadMessages("legacy");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert("loadConversations error: " + error.message);
      setConvs([]);
      return;
    }
    setConvs((data ?? []) as any);
  }

  async function loadMessages(convId: string) {
    setActiveConvId(convId);

    let q = supabase
      .from("messages")
      .select("role, content, created_at")
      .order("created_at", { ascending: true })
      .limit(300);

    if (convId === "legacy") q = q.is("conversation_id", null);
    else q = q.eq("conversation_id", convId);

    const { data: rows, error } = await q;

    if (error) {
      setMsgs([{ role: "auri", text: `No pude cargar mensajes: ${error.message}` }]);
      return;
    }

    if (!rows || rows.length === 0) {
      setMsgs([{ role: "auri", text: "Arranquemos esta conversación 🙂" }]);
      return;
    }

    setMsgs(rows.map((r: any) => ({ role: r.role, text: r.content })));
  }

  async function createConversation() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: u.user.id, title: "Nueva conversación" })
      .select("id, title, created_at")
      .single();

    if (error || !data) {
      alert("No pude crear la conversación: " + (error?.message ?? ""));
      return;
    }

    await loadConversations();
    await loadMessages(data.id);
  }

  async function renameConversation() {
    if (activeConvId === "legacy") return;

    const current = convs.find((c) => c.id === activeConvId)?.title ?? "Conversación";
    const next = window.prompt("Nuevo nombre de la conversación:", current);
    if (!next) return;

    const title = next.trim().slice(0, 60);
    if (!title) return;

    const { error } = await supabase.from("conversations").update({ title }).eq("id", activeConvId);
    if (error) {
      alert("No pude renombrar: " + error.message);
      return;
    }

    await loadConversations();
  }

  // ✅ BORRADO REAL + ERRORES VISIBLES
  async function deleteConversation() {
    if (activeConvId === "legacy") return;

    const title = convs.find((c) => c.id === activeConvId)?.title ?? "esta conversación";
    const ok = window.confirm(`¿Seguro que querés borrar "${title}"?\n\nSe borran también todos sus mensajes.`);
    if (!ok) return;

    // 1) borrar mensajes
    const { error: e1 } = await supabase.from("messages").delete().eq("conversation_id", activeConvId);
    if (e1) {
      alert("No pude borrar mensajes (RLS o permisos): " + e1.message);
      return;
    }

    // 2) borrar conversación (con select para saber si realmente borró)
    const { data: deleted, error: e2 } = await supabase
      .from("conversations")
      .delete()
      .eq("id", activeConvId)
      .select("id");

    if (e2) {
      alert("No pude borrar conversación (RLS o permisos): " + e2.message);
      return;
    }

    if (!deleted || deleted.length === 0) {
      alert("Supabase NO borró la conversación. Casi seguro falta la policy de DELETE (RLS).");
      return;
    }

    // 3) volver a legacy
    await loadConversations();
    await loadMessages("legacy");
  }

  async function saveMessage(role: "user" | "auri", content: string, convId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const payload: any = { user_id: u.user.id, role, content };
    if (convId !== "legacy") payload.conversation_id = convId;

    const { error } = await supabase.from("messages").insert(payload);
    if (error) console.log("DB insert error:", error.message);
  }

  async function autoTitleConversationIfNeeded(firstUserMessage: string, convId: string) {
    if (convId === "legacy") return;

    const { data: row } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", convId)
      .single();

    const currentTitle = String((row as any)?.title ?? "");
    if (currentTitle && currentTitle !== "Nueva conversación") return;

    const r = await fetch("/api/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: firstUserMessage }),
    });

    const data = await r.json();
    const title = String(data?.title ?? "").trim() || "Conversación";

    await supabase.from("conversations").update({ title }).eq("id", convId);
    await loadConversations();
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const convId = activeConvId;

    const looksEmpty =
      msgs.length === 0 ||
      (msgs.length === 1 && msgs[0].role === "auri" && msgs[0].text.includes("Arranquemos"));

    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);

    await saveMessage("user", text, convId);

    if (looksEmpty) autoTitleConversationIfNeeded(text, convId);

    try {
      const history = msgs.slice(-12).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();
      const reply = String(data.reply ?? "");

      setMsgs((m) => [...m, { role: "auri", text: reply }]);
      await saveMessage("auri", reply, convId);
    } catch {
      const fallback = "Tuve un problema de conexión.";
      setMsgs((m) => [...m, { role: "auri", text: fallback }]);
      await saveMessage("auri", fallback, convId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ height: "100vh", display: "flex" }}>
      <aside
        style={{
          width: 300,
          borderRight: "1px solid #e5e7eb",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 800 }}>Auriona</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{email}</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>userId: {userId.slice(0, 8)}…</div>
        </div>

        <button onClick={createConversation} style={{ padding: 10 }}>
          + Nueva conversación
        </button>

        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Conversaciones</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
          <button
            onClick={() => loadMessages("legacy")}
            style={{
              textAlign: "left",
              padding: 10,
              border: "1px solid #e5e7eb",
              background: activeConvId === "legacy" ? "#f3f4f6" : "white",
            }}
          >
            Legacy (mensajes viejos)
          </button>

          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => loadMessages(c.id)}
              style={{
                textAlign: "left",
                padding: 10,
                border: "1px solid #e5e7eb",
                background: activeConvId === c.id ? "#f3f4f6" : "white",
              }}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto" }}>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            style={{ padding: 10, width: "100%" }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            padding: 14,
            borderBottom: "1px solid #e5e7eb",
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div>{activeTitle}</div>

            {activeConvId !== "legacy" && (
              <>
                <button
                  onClick={renameConversation}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ✏️ Renombrar
                </button>

                <button
                  onClick={deleteConversation}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                  title="Borrar conversación"
                >
                  🗑 Borrar
                </button>
              </>
            )}
          </div>

          <button
            onClick={createConversation}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              cursor: "pointer",
            }}
          >
            + Nuevo chat
          </button>
        </header>

        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: 680,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: m.role === "user" ? "#f3f4f6" : "white",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <footer style={{ padding: 16, borderTop: "1px solid #e5e7eb", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí..."
            onKeyDown={(e) => e.key === "Enter" && send()}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
          <button onClick={send} disabled={busy} style={{ padding: "12px 14px" }}>
            {busy ? "..." : "Enviar"}
          </button>
        </footer>
      </section>
    </main>
  );
}
