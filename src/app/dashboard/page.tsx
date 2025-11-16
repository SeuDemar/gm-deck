"use client";

import "../globals.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import PdfFichaModal from "../components/PdfFichaModal";
import CriarSessaoModal from "../components/CriarSessaoModal";
import EntrarSessaoModal from "../components/EntrarSessaoModal";
import EditarPerfilModal from "../components/EditarPerfilModal";
import Sidebar from "../components/Sidebar";
import { useSupabasePdf } from "../../hooks/useSupabasePdf";
import { useSupabaseSessao, Sessao } from "../../hooks/useSupabaseSessao";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Loading,
} from "@/components/ui";

type FichaListItem = {
  id: string;
  personagem: string | null;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { getUserFichas } = useSupabasePdf();
  const { criarSessao, entrarSessao, getSessoesMestre, getSessoesJogador } =
    useSupabaseSessao();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCriarSessaoModalOpen, setIsCriarSessaoModalOpen] = useState(false);
  const [isEntrarSessaoModalOpen, setIsEntrarSessaoModalOpen] = useState(false);
  const [isEditarPerfilModalOpen, setIsEditarPerfilModalOpen] = useState(false);
  const [selectedFichaId, setSelectedFichaId] = useState<string | undefined>(
    undefined
  );
  const [fichas, setFichas] = useState<FichaListItem[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loadingSessoes, setLoadingSessoes] = useState(false);
  const [activeTab, setActiveTab] = useState<"fichas" | "sessoes">("fichas");

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

  // Re-executa apenas quando o ID do usuário mudar

  // Carrega as fichas do usuário quando ele estiver logado
  useEffect(() => {
    async function loadFichas() {
      if (!user) return;

      try {
        setLoadingFichas(true);
        const fichasData = await getUserFichas();
        setFichas(fichasData);
      } catch (error) {
        console.error("Erro ao carregar fichas:", error);
      } finally {
        setLoadingFichas(false);
      }
    }

    loadFichas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Função para carregar sessões (reutilizável)
  async function loadSessoes() {
    if (!user) return;

    try {
      setLoadingSessoes(true);
      // Busca sessões como mestre e como jogador
      const [sessoesMestre, sessoesJogador] = await Promise.all([
        getSessoesMestre(),
        getSessoesJogador(),
      ]);

      // Combina as sessões e remove duplicatas (caso o usuário seja mestre e jogador)
      const todasSessoes = [...sessoesMestre, ...sessoesJogador];
      const sessoesUnicas = todasSessoes.filter(
        (sessao, index, self) =>
          index === self.findIndex((s) => s.id === sessao.id)
      );

      // Ordena por data de criação (mais recente primeiro)
      sessoesUnicas.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSessoes(sessoesUnicas);
    } catch (error) {
      console.error("Erro ao carregar sessões:", error);
    } finally {
      setLoadingSessoes(false);
    }
  }

  // Carrega as sessões do usuário quando ele estiver logado
  useEffect(() => {
    loadSessoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Recarrega sessões quando a página ganha foco ou quando muda para aba de sessões
  useEffect(() => {
    const handleFocus = () => {
      if (user && activeTab === "sessoes") {
        loadSessoes();
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        user &&
        activeTab === "sessoes"
      ) {
        loadSessoes();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Recarrega quando muda para aba de sessões
    if (activeTab === "sessoes" && user) {
      loadSessoes();
    }

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  // Listener para atualizar lista de sessões em tempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dashboard-sessoes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "sessao",
        },
        () => {
          // Recarrega as sessões quando há mudanças
          // Filtra apenas sessões relevantes (mestre ou jogador)
          loadSessoes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "sessao_jogador",
        },
        () => {
          // Recarrega quando há mudanças em sessao_jogador
          // (jogador entrando/saindo de sessões)
          loadSessoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Listener para atualizar lista de fichas em tempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dashboard-fichas-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "ficha",
        },
        async (payload) => {
          // Verifica se a ficha pertence ao usuário atual
          const fichaData = payload.new || payload.old;
          if (fichaData && fichaData.usuarioId === user.id) {
            // Recarrega as fichas quando há mudanças nas fichas do usuário
            try {
              setLoadingFichas(true);
              const fichasData = await getUserFichas();
              setFichas(fichasData);
            } catch (error) {
              console.error("Erro ao recarregar fichas:", error);
            } finally {
              setLoadingFichas(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Abre o modal para criar uma nova ficha
  function handleOpenNewFicha() {
    setSelectedFichaId(undefined);
    setIsModalOpen(true);
  }

  // Abre o modal para editar uma ficha existente
  function handleOpenEditFicha(fichaId: string) {
    setSelectedFichaId(fichaId);
    setIsModalOpen(true);
  }

  // Recarrega as fichas quando o modal for fechado (após salvar uma nova)
  async function handleModalClose() {
    setIsModalOpen(false);
    setSelectedFichaId(undefined);
    // Recarrega as fichas após fechar o modal
    try {
      setLoadingFichas(true);
      const fichasData = await getUserFichas();
      setFichas(fichasData);
    } catch (error) {
      console.error("Erro ao recarregar fichas:", error);
    } finally {
      setLoadingFichas(false);
    }
  }

  async function handleCriarSessao(nome: string, descricao?: string) {
    try {
      const sessao = await criarSessao(nome, descricao);
      // Recarrega as sessões após criar
      await loadSessoes();
      router.push(`/session/${sessao.id}`);
    } catch (error: unknown) {
      console.error("Erro ao criar sessão:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao criar sessão: " + errorMessage);
    }
  }

  async function handleEntrarSessao(sessaoId: string) {
    try {
      await entrarSessao(sessaoId);
      // Recarrega as sessões após entrar
      await loadSessoes();
      router.push(`/session/${sessaoId}`);
    } catch (error: unknown) {
      console.error("Erro ao entrar na sessão:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao entrar na sessão: " + errorMessage);
    }
  }

  function handleOpenSessao(sessaoId: string) {
    router.push(`/session/${sessaoId}`);
  }

  // Recarrega as fichas após deletar
  async function handleFichaDeleted() {
    try {
      const fichasData = await getUserFichas();
      setFichas(fichasData);
    } catch (error) {
      console.error("Erro ao recarregar fichas:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-light">
        <Loading message="Carregando..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-screen overflow-hidden">
      <Sidebar
        onCriarSessao={() => setIsCriarSessaoModalOpen(true)}
        onEntrarSessao={() => setIsEntrarSessaoModalOpen(true)}
        onEditarPerfil={() => setIsEditarPerfilModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-light">
        {/* Header com botão de menu (mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-light border-b border-gray-200">
          <h1 className="text-lg font-bold text-brand mx-auto">GM Deck</h1>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 pt-4 lg:pt-6 pb-6">
          {/* Tabs para alternar entre Fichas e Sessões */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("fichas")}
                className={`px-4 py-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === "fichas"
                    ? "text-black border-b-2 border-brand"
                    : "text-secondary hover:text-black"
                }`}
              >
                Minhas Fichas
              </button>
              <button
                onClick={() => setActiveTab("sessoes")}
                className={`px-4 py-2 font-semibold transition-colors cursor-pointer ${
                  activeTab === "sessoes"
                    ? "text-black border-b-2 border-brand"
                    : "text-secondary hover:text-black"
                }`}
              >
                Minhas Sessões
              </button>
            </div>
          </div>

          {/* Título e conteúdo */}
          <div>
            {activeTab === "fichas" ? (
              <>
                <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-black">
                  Minhas Fichas
                </h2>

                {loadingFichas ? (
                  <Loading message="Carregando fichas..." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                    {/* Lista de fichas */}
                    {fichas.length === 0 ? (
                      <>
                        <Card className="ficha-card flex flex-col items-center justify-center">
                          <CardHeader className="text-center w-full">
                            <CardTitle className="text-lg mb-2">
                              Nenhuma ficha encontrada
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center justify-center flex-1 w-full">
                            <p className="text-sm text-gray-600 mb-4 text-center">
                              Clique no botão abaixo para criar sua primeira ficha.
                            </p>
                            <button
                              className="flex flex-col items-center justify-center min-h-[120px] w-full border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group cursor-pointer rounded-lg p-4"
                              onClick={handleOpenNewFicha}
                            >
                              <Plus className="w-8 h-8 text-brand group-hover:text-brand-light transition-colors mb-2" />
                              <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                                Nova Ficha
                              </p>
                            </button>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <>
                        {fichas.map((ficha) => (
                          <Card
                            key={ficha.id}
                            className="ficha-card cursor-pointer"
                            onClick={() => handleOpenEditFicha(ficha.id)}
                          >
                            <CardHeader>
                              <CardTitle className="text-lg">
                                {ficha.personagem || "Sem nome"}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600">
                                Criada em:{" "}
                                {new Date(ficha.created_at).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                        {/* Botão de adicionar nova ficha */}
                        <button
                          className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group cursor-pointer"
                          onClick={handleOpenNewFicha}
                        >
                          <Plus className="w-8 h-8 text-brand group-hover:text-brand-light transition-colors mb-2" />
                          <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                            Nova Ficha
                          </p>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-black">
                  Minhas Sessões
                </h2>

                {loadingSessoes ? (
                  <Loading message="Carregando sessões..." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                    {/* Lista de sessões */}
                    {sessoes.length === 0 ? (
                      <>
                        <Card className="ficha-card flex flex-col items-center justify-center">
                          <CardHeader className="text-center w-full">
                            <CardTitle className="text-lg mb-2">
                              Nenhuma sessão encontrada
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center justify-center flex-1 w-full">
                            <p className="text-sm text-gray-600 mb-4 text-center">
                              Clique no botão abaixo para criar sua primeira sessão.
                            </p>
                            <button
                              className="flex flex-col items-center justify-center min-h-[120px] w-full border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group cursor-pointer rounded-lg p-4"
                              onClick={() => setIsCriarSessaoModalOpen(true)}
                            >
                              <Plus className="w-8 h-8 text-brand group-hover:text-brand-light transition-colors mb-2" />
                              <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                                Nova Sessão
                              </p>
                            </button>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <>
                        {sessoes.map((sessao) => {
                          const isMestre = sessao.mestre_id === user?.id;
                          const statusMap: Record<
                            string,
                            "active" | "paused" | "ended"
                          > = {
                            ativa: "active",
                            pausada: "paused",
                            encerrada: "ended",
                          };
                          return (
                            <Card
                              key={sessao.id}
                              className={`ficha-card cursor-pointer relative ${
                                isMestre
                                  ? "ring-2 ring-brand bg-brand/5 border-brand/30"
                                  : ""
                              }`}
                              onClick={() => handleOpenSessao(sessao.id)}
                            >
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CardTitle
                                        className={`text-lg ${isMestre ? "text-brand" : ""}`}
                                      >
                                        {sessao.nome}
                                      </CardTitle>
                                      {isMestre && (
                                        <Badge
                                          variant="default"
                                          className="bg-brand text-primary"
                                        >
                                          Mestre
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    status={statusMap[sessao.status] || "ended"}
                                  />
                                </div>
                              </CardHeader>
                              <CardContent>
                                {sessao.descricao && (
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                    {sessao.descricao}
                                  </p>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-500">
                                    {sessao.ficha_ids?.length || 0} fichas
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(
                                      sessao.created_at
                                    ).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {/* Botão de criar nova sessão */}
                        <button
                          className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group cursor-pointer"
                          onClick={() => setIsCriarSessaoModalOpen(true)}
                        >
                          <Plus className="w-8 h-8 text-brand group-hover:text-brand-light transition-colors mb-2" />
                          <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                            Nova Sessão
                          </p>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal com PDF */}
        <PdfFichaModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          fichaId={selectedFichaId}
          onDelete={handleFichaDeleted}
        />

        {/* Modal de Criar Sessão */}
        <CriarSessaoModal
          isOpen={isCriarSessaoModalOpen}
          onClose={() => setIsCriarSessaoModalOpen(false)}
          onCreateSessao={handleCriarSessao}
        />

        {/* Modal de Entrar em Sessão */}
        <EntrarSessaoModal
          isOpen={isEntrarSessaoModalOpen}
          onClose={() => setIsEntrarSessaoModalOpen(false)}
          onEntrarSessao={handleEntrarSessao}
        />

        {/* Modal de Editar Perfil */}
        <EditarPerfilModal
          isOpen={isEditarPerfilModalOpen}
          onClose={() => setIsEditarPerfilModalOpen(false)}
          user={user}
          onUpdate={async () => {
            // Recarrega o usuário para atualizar os dados exibidos
            const {
              data: { user: updatedUser },
            } = await supabase.auth.getUser();
            if (updatedUser) {
              setUser(updatedUser);
            }
          }}
        />
      </main>
    </div>
  );
}
