"use client";

import "../globals.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Modal from "../components/Modal";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Verifica a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    // Escuta mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      } else if (session) {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      // O redirecionamento será feito automaticamente pelo onAuthStateChange
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Força o redirecionamento mesmo se houver erro
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "var(--color-background-light)" }}
      >
        <span
          style={{ color: "var(--color-text-secondary)" }}
          className="text-lg animate-pulse"
        >
          Carregando...
        </span>
      </div>
    );
  }

  const getInitialAvatar = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen min-h-screen">
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col justify-between"
        style={{
          backgroundColor: "var(--color-brand)",
          color: "var(--color-text-primary)",
        }}
      >
        <div className="p-4">
          {/* Avatar e nome */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: "var(--color-text-primary)",
                color: "var(--color-brand)",
              }}
            >
              {user?.user_metadata?.full_name
                ? getInitialAvatar(user.user_metadata.full_name)
                : "?"}
            </div>
            <p
              className="mt-2 text-center font-semibold"
              style={{ color: "var(--color-text-primary)" }} // texto branco
            >
              {user?.user_metadata?.full_name || user?.email || "Usuário"}
            </p>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-2">
            <button
              className="px-4 py-2 rounded transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-text-primary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--color-brand-light)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Mesas Ativas
            </button>
            <button
              className="px-4 py-2 rounded transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-text-primary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--color-brand-light)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Minhas Fichas
            </button>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 rounded transition-colors font-semibold"
            style={{
              backgroundColor: "var(--color-brand-accent)",
              color: "var(--color-text-primary)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--color-brand-salmon)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--color-brand-accent)")
            }
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 p-6 overflow-y-auto relative"
        style={{ backgroundColor: "var(--color-background-light)" }}
      >
        {/* Botão de adicionar ficha */}
        <button
          className="absolute left-15 top-12 w-40 h-40 flex items-center justify-center rounded-2xl shadow-md text-6xl font-extrabold hover:opacity-90 transition-all"
          style={{
            backgroundColor: "var(--color-brand)",
            color: "var(--color-text-primary)",
          }}
          onClick={() => setIsModalOpen(true)}
        >
          +
        </button>

        {/* Modal com PDF */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <iframe
            src="/fichas/FichaOrdem.pdf#zoom=150"
            className="w-full h-full rounded-xl"
          />
        </Modal>
      </main>
    </div>
  );
}
