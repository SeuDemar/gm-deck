"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient"; // Ajuste o caminho se necessário
import styles from "./page.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Checa sessão e obtém user data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    // Listener para mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  const getInitialAvatar = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              {user?.user_metadata?.full_name
                ? getInitialAvatar(user.user_metadata.full_name)
                : "?"}
            </div>
            <p className={styles.userName}>
              {user?.user_metadata?.full_name || user?.email || "Usuário"}
            </p>
          </div>

          <nav className={styles.nav}>
            <button className={styles.navItem}>Mesas Ativas</button>
            <button className={styles.navItem}>Minhas Fichas</button>
          </nav>
        </div>

        <div className={styles.logoutWrapper}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Bem-vindo ao Dashboard</h1>
          <p>Gerencie suas mesas e fichas aqui.</p>
        </header>
        {/* Área de conteúdo futura */}
      </main>
    </div>
  );
}
