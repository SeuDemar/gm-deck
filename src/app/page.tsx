"use client";

import { useAuth } from "../../lib/useAuth";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) return <p className="text-center mt-10">Carregando...</p>;
  if (!user) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-indigo-700">GM.deck</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-700 transition"
        >
          Logout
        </button>
      </header>

      {/* Painel */}
      <main className="flex-1">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Minhas Fichas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition text-center">
            Ficha 1
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition text-center">
            Ficha 2
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition text-center">
            Ficha 3
          </div>
        </div>
      </main>
    </div>
  );
}
