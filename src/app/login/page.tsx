"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import "../globals.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // Redireciona se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMessage(`Erro: ${error.message}`);
    else router.push("/dashboard");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4 font-sans"
      style={{ backgroundColor: "var(--color-background-light)" }}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-md p-8"
        style={{
          backgroundColor: "var(--color-text-primary)",
          color: "var(--color-text-primary)",
        }}
      >
        <h1
          className="text-3xl font-bold mb-6 text-center"
          style={{ color: "var(--color-brand)" }}
        >
          Login
        </h1>

        {message && (
          <p
            className="text-center mb-4 font-medium"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {message}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded focus:outline-none focus:ring-2 transition"
          style={
            {
              borderColor: "var(--color-brand-light)",
              backgroundColor: "var(--color-text-primary)",
              color: "black",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              "--tw-ring-color": "var(--color-brand-salmon)",
            } as React.CSSProperties
          }
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-2 border rounded focus:outline-none focus:ring-2 transition"
          style={
            {
              borderColor: "var(--color-brand-light)",
              backgroundColor: "var(--color-text-primary)",
              color: "black",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              "--tw-ring-color": "var(--color-brand-salmon)",
            } as React.CSSProperties
          }
        />

        <button
          onClick={handleLogin}
          className="w-full py-2 rounded hover:opacity-90 transition-colors font-semibold"
          style={{
            backgroundColor: "var(--color-brand)",
            color: "var(--color-text-primary)",
          }}
        >
          Entrar
        </button>

        <p className="mt-4 text-center" style={{ color: "var(--color-brand)" }}>
          Não tem conta?{" "}
          <a
            href="/register"
            className="hover:underline"
            style={{ color: "var(--color-brand-salmon)" }}
          >
            Cadastre-se
          </a>
        </p>
      </div>
    </main>
  );
}
