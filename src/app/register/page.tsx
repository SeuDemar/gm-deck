"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import "../globals.css";

export default function RegisterPage() {
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister() {
    if (!nome.trim()) {
      setMessage("Por favor, preencha o nome ❌");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não conferem ❌");
      return;
    }

    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres ❌");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nome.trim(),
          apelido: apelido.trim() || null,
        },
      },
    });

    if (error) setMessage(`Erro: ${error.message}`);
    else setMessage("Cadastro realizado com sucesso ✅ Verifique seu e-mail.");
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
          Cadastro
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
          type="text"
          placeholder="Nome *"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
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
          required
        />
        <input
          type="text"
          placeholder="Apelido (opcional)"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
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
          type="email"
          placeholder="Email *"
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
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          placeholder="Confirmar senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
          onClick={handleRegister}
          className="w-full py-2 rounded hover:opacity-90 transition-colors font-semibold"
          style={{
            backgroundColor: "var(--color-brand)",
            color: "var(--color-text-primary)",
          }}
        >
          Cadastrar
        </button>

        <p className="mt-4 text-center" style={{ color: "var(--color-brand)" }}>
          Já tem conta?{" "}
          <a
            href="/login"
            className="hover:underline"
            style={{ color: "var(--color-brand-salmon)" }}
          >
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
