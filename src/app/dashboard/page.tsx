"use client";

import "../globals.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

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
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <span className="text-gray-500 text-lg animate-pulse">
          Carregando...
        </span>
      </div>
    );
  }

  const getInitialAvatar = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-700 text-white flex flex-col justify-between">
        <div className="p-4">
          {/* Avatar e nome */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-white text-blue-700 flex items-center justify-center text-xl font-bold">
              {user?.user_metadata?.full_name
                ? getInitialAvatar(user.user_metadata.full_name)
                : "?"}
            </div>
            <p className="mt-2 text-center font-semibold text-white">
              {user?.user_metadata?.full_name || user?.email || "Usuário"}
            </p>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-2">
            <button className="px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              Mesas Ativas
            </button>
            <button className="px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              Minhas Fichas
            </button>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Bem-vindo ao Dashboard
          </h1>
          <p className="text-gray-600">Gerencie suas mesas e fichas aqui.</p>
        </header>

        {/* Área de conteúdo futura */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-700">
            Conteúdo das fichas e mesas aparecerá aqui.
          </p>
        </div>
      </main>
    </div>
  );
}
