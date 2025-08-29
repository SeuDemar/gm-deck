"use client";

import { useAuth } from "../../lib/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) return <p>Carregando...</p>;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold">Bem-vindo ao GM.deck</h1>
      <p className="mt-4">Você está logado como {user?.email}</p>
    </main>
  );
}
