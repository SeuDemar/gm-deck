"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // Redireciona se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/home");
      }
    });
  }, [router]);

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMessage(`Erro: ${error.message}`);
    else router.push("/home"); // vai para o painel depois do login
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Login</h1>

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

      <button onClick={handleLogin} className={styles.button}>
        Entrar
      </button>

      {message && <p className={styles.message}>{message}</p>}

      <p className={styles.link}>
        Não tem conta? <a href="/register">Cadastre-se</a>
      </p>
    </main>
  );
}
