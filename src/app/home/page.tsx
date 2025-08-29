"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      } else {
        setUser(data.session.user);
      }
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!user) return null; // ou loader simples

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>gm.deck</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </header>

      <main className={styles.main}>
        <h2>Minhas Fichas</h2>
        <div className={styles.cards}>
          {/* Aqui você vai mapear suas fichas */}
          <div className={styles.card}>Ficha 1</div>
          <div className={styles.card}>Ficha 2</div>
          <div className={styles.card}>Ficha 3</div>
        </div>
      </main>
    </div>
  );
}
