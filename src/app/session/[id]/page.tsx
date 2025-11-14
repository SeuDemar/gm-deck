"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useSessaoRole } from "../../../hooks/useSessaoRole";
import { Sessao, useSupabaseSessao } from "../../../hooks/useSupabaseSessao";
import "../../globals.css";

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessaoId = params?.id as string;

  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [loadingSessao, setLoadingSessao] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Hook para gerenciar sessões
  const { getSessao, excluirSessao, cortarVinculosSessao } = useSupabaseSessao();
  const getSessaoRef = useRef(getSessao);
  useEffect(() => {
    getSessaoRef.current = getSessao;
  }, [getSessao]);
  
  // Verifica o papel do usuário na sessão
  const { loading: loadingPapel, isMestre, isJogador } = useSessaoRole(sessaoId);

  // Função para copiar ID da sessão
  function handleCopySessionId() {
    if (!sessaoId) return;
    
    navigator.clipboard.writeText(sessaoId).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }).catch((error) => {
      console.error("Erro ao copiar ID:", error);
      alert("Erro ao copiar ID da sessão. Por favor, copie manualmente: " + sessaoId);
    });
  }

  // Função para excluir sessão (apenas mestre)
  async function handleExcluirSessao() {
    if (!sessaoId) return;
    
    if (!confirm("Tem certeza que deseja excluir esta sessão? Todos os jogadores serão removidos e esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      await excluirSessao(sessaoId);
      alert("Sessão excluída com sucesso!");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Erro ao excluir sessão:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao excluir sessão: " + errorMessage);
    }
  }

  // Função para cortar vínculos com a sessão (jogador)
  async function handleCortarVinculos() {
    if (!sessaoId) return;
    
    if (!confirm("Tem certeza que deseja sair permanentemente desta sessão? Você não poderá mais acessá-la.")) {
      return;
    }

    try {
      await cortarVinculosSessao(sessaoId);
      alert("Você saiu da sessão permanentemente!");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Erro ao cortar vínculos:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao cortar vínculos: " + errorMessage);
    }
  }

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
        const sessaoData = await getSessaoRef.current(sessaoId);
        if (sessaoData) {
          setSessao(sessaoData);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      } finally {
        setLoadingSessao(false);
      }
    }

    loadSessao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <p className="text-sm text-primary opacity-80 mb-4">
                {sessao.descricao}
              </p>
            )}
            
            {/* ID da Sessão com botão de copiar */}
            <div className="mt-4 p-3 rounded bg-brand-light/20 border border-brand-light/30">
              <label className="block text-xs font-semibold text-primary opacity-70 mb-1">
                ID da Sessão
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-primary font-mono break-all bg-brand-light/10 px-2 py-1 rounded">
                  {sessaoId || "Carregando..."}
                </code>
                <button
                  onClick={handleCopySessionId}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-colors bg-brand-light/30 text-primary hover:bg-brand-light/50 active:bg-brand-light/70 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!sessaoId || copied}
                  title={copied ? "Copiado!" : "Copiar ID"}
                >
                  {copied ? "✓" : "📋"}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-primary opacity-60 mt-1">
                  ID copiado!
                </p>
              )}
            </div>
          </div>

          {/* Botão voltar */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-2 rounded transition-colors bg-transparent text-primary hover:bg-brand-light mb-4"
          >
            ← Voltar ao Dashboard
          </button>

          {/* Botões de ação baseados no papel */}
          {!loadingPapel && (isMestre || isJogador) && (
            <div className="mb-4 space-y-2">
              {isMestre && (
                <button
                  onClick={handleExcluirSessao}
                  className="w-full px-4 py-2 rounded transition-colors bg-red-500/20 text-red-600 hover:bg-red-500/30 font-semibold"
                >
                   Excluir Sessão
                </button>
              )}
              {isJogador && (
                <button
                  onClick={handleCortarVinculos}
                  className="w-full px-4 py-2 rounded transition-colors bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30 font-semibold"
                >
                  Sair da Sessão Permanentemente
                </button>
              )}
            </div>
          )}

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

