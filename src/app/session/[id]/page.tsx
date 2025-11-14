"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useSessaoRole } from "../../../hooks/useSessaoRole";
import "../../globals.css";

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessaoId = params?.id as string;

  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessao, setSessao] = useState<any>(null);
  const [loadingSessao, setLoadingSessao] = useState(false);
  
  // Verifica o papel do usuário na sessão
  const { papel, loading: loadingPapel, isMestre, isJogador } = useSessaoRole(sessaoId);

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

  // Carrega dados da sessão quando o usuário estiver logado
  useEffect(() => {
    async function loadSessao() {
      if (!user || !sessaoId) return;

      setLoadingSessao(true);
      try {
        // TODO: Buscar dados da sessão do banco de dados
        console.log("Carregar sessão:", sessaoId);
        // Por enquanto, apenas simula
        setSessao({
          id: sessaoId,
          nome: "Sessão de Exemplo",
          descricao: "Descrição da sessão",
        });
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      } finally {
        setLoadingSessao(false);
      }
    }

    loadSessao();
  }, [user, sessaoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-light">
        <span className="text-lg animate-pulse text-secondary">
          Carregando...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col justify-between bg-brand text-primary">
        <div className="p-4">
          {/* Informações da Sessão */}
          <div className="mb-8">
            <h1 className="text-xl font-bold mb-2 text-primary">
              {sessao?.nome || "Carregando..."}
            </h1>
            {sessao?.descricao && (
              <p className="text-sm text-primary opacity-80">
                {sessao.descricao}
              </p>
            )}
          </div>

          {/* Botão voltar */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-2 rounded transition-colors bg-transparent text-primary hover:bg-brand-light mb-4"
          >
            ← Voltar ao Dashboard
          </button>

          {/* Informações do Papel */}
          {loadingPapel ? (
            <div className="mt-8">
              <p className="text-sm text-primary opacity-60">
                Verificando permissões...
              </p>
            </div>
          ) : isMestre ? (
            <div className="mt-8">
              <div className="px-3 py-2 rounded bg-brand-light/30 mb-4">
                <p className="text-sm font-semibold text-primary">
                  🎲 Você é o Mestre
                </p>
              </div>
              
              {/* Lista de Jogadores - Apenas para Mestre */}
              <div>
                <h2 className="text-lg font-semibold mb-4 text-primary">
                  Jogadores
                </h2>
                {loadingSessao ? (
                  <p className="text-sm text-primary opacity-60">
                    Carregando jogadores...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* TODO: Listar jogadores da sessão */}
                    <p className="text-sm text-primary opacity-60">
                      Lista de jogadores aparecerá aqui
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : isJogador ? (
            <div className="mt-8">
              <div className="px-3 py-2 rounded bg-brand-light/30 mb-4">
                <p className="text-sm font-semibold text-primary">
                  🎮 Você é Jogador
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="px-3 py-2 rounded bg-red-500/30 mb-4">
                <p className="text-sm font-semibold text-primary">
                  ⚠️ Você não tem acesso a esta sessão
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="p-4">
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push("/login");
            }}
            className="w-full px-4 py-2 rounded transition-colors font-semibold bg-brand-accent text-primary hover:bg-brand-salmon"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pr-6 pt-6 pb-6 pl-0 overflow-y-auto bg-light">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black">
              {sessao?.nome || "Sessão"}
            </h2>
            
            {/* Badge de Papel */}
            {!loadingPapel && (
              <div className="px-3 py-1 rounded-full text-sm font-medium">
                {isMestre && (
                  <span className="bg-brand text-primary px-3 py-1 rounded-full">
                    Mestre
                  </span>
                )}
                {isJogador && (
                  <span className="bg-brand-light text-primary px-3 py-1 rounded-full">
                    Jogador
                  </span>
                )}
                {!isMestre && !isJogador && (
                  <span className="bg-gray-400 text-primary px-3 py-1 rounded-full">
                    Sem Acesso
                  </span>
                )}
              </div>
            )}
          </div>

          {loadingSessao || loadingPapel ? (
            <div className="flex items-center justify-center p-8">
              <span className="text-lg animate-pulse text-secondary">
                Carregando sessão...
              </span>
            </div>
          ) : !isMestre && !isJogador ? (
            <div className="p-8 text-center">
              <p className="text-secondary mb-4">
                Você não tem acesso a esta sessão.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2 rounded bg-brand text-primary hover:bg-brand-light transition-colors"
              >
                Voltar ao Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Conteúdo específico para Mestre */}
              {isMestre && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary shadow-md">
                    <h3 className="text-lg font-semibold mb-2 text-black">
                      Área do Mestre
                    </h3>
                    <p className="text-secondary text-sm">
                      Como mestre, você pode gerenciar jogadores, visualizar todas as fichas e controlar a sessão.
                    </p>
                  </div>
                  
                  {/* TODO: Funcionalidades do mestre */}
                  <p className="text-secondary">
                    Funcionalidades do mestre aparecerão aqui.
                  </p>
                </div>
              )}

              {/* Conteúdo específico para Jogador */}
              {isJogador && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary shadow-md">
                    <h3 className="text-lg font-semibold mb-2 text-black">
                      Área do Jogador
                    </h3>
                    <p className="text-secondary text-sm">
                      Você está participando desta sessão como jogador. Suas fichas aparecerão aqui.
                    </p>
                  </div>
                  
                  {/* TODO: Fichas do jogador */}
                  <p className="text-secondary">
                    Suas fichas aparecerão aqui.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

