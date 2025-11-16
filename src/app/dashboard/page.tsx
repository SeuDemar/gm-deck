"use client";

import "../globals.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { getFotoPerfilUrl } from "../../../lib/storageUtils";
import PdfFichaModal from "../components/PdfFichaModal";
import CriarSessaoModal from "../components/CriarSessaoModal";
import EntrarSessaoModal from "../components/EntrarSessaoModal";
import EditarPerfilModal from "../components/EditarPerfilModal";
import { useSupabasePdf } from "../../hooks/useSupabasePdf";
import { useSupabaseSessao, Sessao } from "../../hooks/useSupabaseSessao";
import { Card, CardHeader, CardTitle, CardContent, Badge, Loading, EmptyState, Avatar } from "@/components/ui";

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
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Carrega a foto de perfil do bucket
  useEffect(() => {
    async function loadFotoPerfil() {
      if (!user?.id) {
        setFotoPerfilUrl(null);
        return;
      }

      console.log("🔍 Carregando foto de perfil para usuário:", user.id);
      try {
        const url = await getFotoPerfilUrl(
          user.id,
          user.user_metadata?.foto_perfil_url
        );
        console.log("✅ URL da foto obtida:", url);
        if (url) {
          setFotoPerfilUrl(url);
        } else {
          console.log("⚠️ Nenhuma foto encontrada no bucket");
          setFotoPerfilUrl(null);
        }
      } catch (error) {
        console.error("❌ Erro ao carregar foto de perfil:", error);
        setFotoPerfilUrl(null);
      }
    }

    if (user?.id) {
      loadFotoPerfil();
    }
  }, [user?.id]); // Re-executa apenas quando o ID do usuário mudar

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

  // Carrega as sessões do usuário quando ele estiver logado
  useEffect(() => {
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

    loadSessoes();
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
      try {
        const [sessoesMestre, sessoesJogador] = await Promise.all([
          getSessoesMestre(),
          getSessoesJogador(),
        ]);
        const todasSessoes = [...sessoesMestre, ...sessoesJogador];
        const sessoesUnicas = todasSessoes.filter(
          (sessao, index, self) =>
            index === self.findIndex((s) => s.id === sessao.id)
        );
        sessoesUnicas.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSessoes(sessoesUnicas);
      } catch (error) {
        console.error("Erro ao recarregar sessões:", error);
      }
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
      try {
        const [sessoesMestre, sessoesJogador] = await Promise.all([
          getSessoesMestre(),
          getSessoesJogador(),
        ]);
        const todasSessoes = [...sessoesMestre, ...sessoesJogador];
        const sessoesUnicas = todasSessoes.filter(
          (sessao, index, self) =>
            index === self.findIndex((s) => s.id === sessao.id)
        );
        sessoesUnicas.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSessoes(sessoesUnicas);
      } catch (error) {
        console.error("Erro ao recarregar sessões:", error);
      }
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
      <div className="flex items-center justify-center h-screen bg-light">
        <Loading message="Carregando..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-screen overflow-hidden">
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static
          top-0 left-0
          w-64 h-full
          flex flex-col justify-between
          bg-brand text-primary
          z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          shadow-lg lg:shadow-none
        `}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header com botão de fechar (mobile) */}
          <div className="flex items-center justify-between p-4 border-b border-brand-light/20 lg:hidden">
            <h2 className="text-lg font-bold text-primary">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded hover:bg-brand-light transition-colors"
              aria-label="Fechar menu"
            >
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col p-4 lg:p-6">
            {/* Avatar e nome */}
            <div className="flex flex-col items-center mb-6 lg:mb-8">
              <Avatar
                src={fotoPerfilUrl}
                name={user?.user_metadata?.full_name || user?.email || "Usuário"}
                size="lg"
                className="mb-3"
              />
              <p className="text-center font-semibold text-primary text-sm lg:text-base break-words max-w-full px-2">
                {user?.user_metadata?.full_name || user?.email || "Usuário"}
              </p>
            </div>

            {/* Navegação */}
            <nav className="flex flex-col gap-2 flex-1">
              <button
                onClick={() => {
                  setIsCriarSessaoModalOpen(true);
                  setSidebarOpen(false);
                }}
                className="w-full px-4 py-3 rounded-lg transition-all bg-transparent text-primary hover:bg-brand-light hover:shadow-md text-left font-medium"
              >
                Criar Sessão
              </button>
              <button
                onClick={() => {
                  setIsEntrarSessaoModalOpen(true);
                  setSidebarOpen(false);
                }}
                className="w-full px-4 py-3 rounded-lg transition-all bg-transparent text-primary hover:bg-brand-light hover:shadow-md text-left font-medium"
              >
                Entrar em Sessão
              </button>
              <button
                onClick={() => {
                  setIsEditarPerfilModalOpen(true);
                  setSidebarOpen(false);
                }}
                className="w-full px-4 py-3 rounded-lg transition-all bg-transparent text-primary hover:bg-brand-light hover:shadow-md text-left font-medium"
              >
                Editar Perfil
              </button>
            </nav>
          </div>

          {/* Logout */}
          <div className="p-4 lg:p-6 border-t border-brand-light/20">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 rounded-lg transition-all font-semibold bg-brand-accent text-primary hover:bg-brand-salmon hover:shadow-md"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-light">
        {/* Header com botão de menu (mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-light border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu"
          >
            <svg
              className="w-6 h-6 text-brand"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-brand">GM Deck</h1>
          <div className="w-10" /> {/* Spacer para centralizar */}
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 pt-4 lg:pt-6 pb-6">
          {/* Tabs para alternar entre Fichas e Sessões */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("fichas")}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === "fichas"
                    ? "text-black border-b-2 border-brand"
                    : "text-secondary hover:text-black"
                }`}
              >
                Minhas Fichas
              </button>
              <button
                onClick={() => setActiveTab("sessoes")}
                className={`px-4 py-2 font-semibold transition-colors ${
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
                        <div className="col-span-full">
                          <EmptyState
                            title="Nenhuma ficha encontrada"
                            description='Clique no botão "+" para criar uma nova ficha.'
                            action={
                              <button
                                className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
                                onClick={handleOpenNewFicha}
                              >
                                <Plus className="w-8 h-8 text-brand group-hover:text-brand-light transition-colors mb-2" />
                                <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                                  Nova Ficha
                                </p>
                              </button>
                            }
                          />
                        </div>
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
                          className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
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
                        <div className="col-span-full">
                          <EmptyState
                            title="Nenhuma sessão encontrada"
                            description='Clique no botão "+" para criar uma nova sessão.'
                            action={
                              <button
                                className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
                                onClick={() => setIsCriarSessaoModalOpen(true)}
                              >
                                <Plus className="w-8 h-8 text-brand group-hover:text-brand-light transition-colors mb-2" />
                                <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                                  Nova Sessão
                                </p>
                              </button>
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {sessoes.map((sessao) => {
                          const isMestre = sessao.mestre_id === user?.id;
                          const statusMap: Record<string, "active" | "paused" | "ended"> = {
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
                                        <Badge variant="default" className="bg-brand text-primary">
                                          Mestre
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    status={
                                      statusMap[sessao.status] || "ended"
                                    }
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
                          className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
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
              // Recarrega a foto de perfil do bucket
              try {
                const url = await getFotoPerfilUrl(
                  updatedUser.id,
                  updatedUser.user_metadata?.foto_perfil_url
                );
                setFotoPerfilUrl(url);
              } catch (error) {
                console.error("Erro ao recarregar foto de perfil:", error);
              }
            }
          }}
        />
      </main>
    </div>
  );
}
