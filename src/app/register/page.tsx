"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import styles from "./page.module.css";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister() {
    if (password !== confirmPassword) {
      setMessage("As senhas não conferem ❌");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) setMessage(`Erro: ${error.message}`);
    else setMessage("Cadastro realizado com sucesso ✅ Verifique seu e-mail.");
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Cadastro</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={styles.input}
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={styles.input}
      />
      <input
        type="password"
        placeholder="Confirmar senha"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className={styles.input}
      />

      <button onClick={handleRegister} className={styles.button}>
        Cadastrar
      </button>

      {message && <p className={styles.message}>{message}</p>}

      <p className={styles.link}>
        Já tem conta? <a href="/login">Entrar</a>
      </p>
    </main>
  );
}
