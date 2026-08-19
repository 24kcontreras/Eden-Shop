"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Contraseña incorrecta");
        setLoading(false);
        return;
      }
      router.push("/admin");
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EDDEDA",
        color: "#5B2E36",
        fontFamily: "'Quicksand','Helvetica Neue',Helvetica,sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "#FDF7F5",
          border: "1px solid #EBD0CC",
          borderRadius: "22px",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          boxShadow: "0 18px 50px rgba(91,46,54,.12)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "center" }}>
          <span
            style={{
              fontFamily: "'Italiana',Georgia,serif",
              fontSize: "28px",
              lineHeight: 1,
              letterSpacing: ".17em",
            }}
          >
            EDEN SHOP
          </span>
          <span
            style={{
              fontSize: "9px",
              letterSpacing: ".3em",
              textTransform: "uppercase",
              color: "#A87B81",
            }}
          >
            Panel de administración
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: ".26em",
              textTransform: "uppercase",
              color: "#A87B81",
            }}
          >
            Contraseña
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            style={{
              width: "100%",
              height: "50px",
              border: "1px solid #E3C7C4",
              borderRadius: "14px",
              background: "#FFFFFF",
              padding: "0 15px",
              fontSize: "15.5px",
              color: "#5B2E36",
              transition: "border-color .3s ease",
            }}
          />
        </div>

        {error && (
          <span style={{ fontSize: "12.5px", color: "#B25C71", lineHeight: 1.4 }}>{error}</span>
        )}

        <button
          type="submit"
          disabled={loading}
          className="press"
          style={
            {
              width: "100%",
              height: "52px",
              borderRadius: "26px",
              border: 0,
              background: "#5B2E36",
              color: "#FDF7F5",
              fontSize: "15.5px",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "transform .45s cubic-bezier(.32,.72,0,1),background .4s ease,opacity .3s ease",
              ["--press-scale" as string]: "scale(.972)",
            } as CSSProperties
          }
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
