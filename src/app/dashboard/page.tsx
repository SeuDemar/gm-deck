"use client";

import "../globals.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import PdfFichaModal from "../components/PdfFichaModal";
import CriarSessaoModal from "../components/CriarSessaoModal";
import EntrarSessaoModal from "../components/EntrarSessaoModal";
import { useSupabasePdf } from "../../hooks/useSupabasePdf";
import { useSupabaseSessao, Sessao } from "../../hooks/useSupabaseSessao";

type FichaListItem = {
  id: string;
  personagem: string | null;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { getUserFichas } = useSupabasePdf();
  const { criarSessao, entrarSessao, getSessoesMestre, getSessoesJogador } = useSupabaseSessao();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCriarSessaoModalOpen, setIsCriarSessaoModalOpen] = useState(false);
  const [isEntrarSessaoModalOpen, setIsEntrarSessaoModalOpen] = useState(false);
  const [selectedFichaId, setSelectedFichaId] = useState<string | undefined>(undefined);
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
          getSessoesJogador()
        ]);
        
        // Combina as sessões e remove duplicatas (caso o usuário seja mestre e jogador)
        const todasSessoes = [...sessoesMestre, ...sessoesJogador];
        const sessoesUnicas = todasSessoes.filter((sessao, index, self) =>
          index === self.findIndex((s) => s.id === sessao.id)
        );
        
        // Ordena por data de criação (mais recente primeiro)
        sessoesUnicas.sort((a, b) => 
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
          getSessoesJogador()
        ]);
        const todasSessoes = [...sessoesMestre, ...sessoesJogador];
        const sessoesUnicas = todasSessoes.filter((sessao, index, self) =>
          index === self.findIndex((s) => s.id === sessao.id)
        );
        sessoesUnicas.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSessoes(sessoesUnicas);
      } catch (error) {
        console.error("Erro ao recarregar sessões:", error);
      }
      router.push(`/session/${sessao.id}`);
    } catch (error: unknown) {
      console.error("Erro ao criar sessão:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
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
          getSessoesJogador()
        ]);
        const todasSessoes = [...sessoesMestre, ...sessoesJogador];
        const sessoesUnicas = todasSessoes.filter((sessao, index, self) =>
          index === self.findIndex((s) => s.id === sessao.id)
        );
        sessoesUnicas.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSessoes(sessoesUnicas);
      } catch (error) {
        console.error("Erro ao recarregar sessões:", error);
      }
      router.push(`/session/${sessaoId}`);
    } catch (error: unknown) {
      console.error("Erro ao entrar na sessão:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
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
        <span className="text-lg animate-pulse text-secondary">
          Carregando...
        </span>
      </div>
    );
  }

  const getInitialAvatar = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col justify-between bg-brand text-primary">
        <div className="p-4">
          {/* Avatar e nome */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-primary text-brand">
              {user?.user_metadata?.full_name
                ? getInitialAvatar(user.user_metadata.full_name)
                : "?"}
            </div>
            <p className="mt-2 text-center font-semibold text-primary">
              {user?.user_metadata?.full_name || user?.email || "Usuário"}
            </p>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setIsCriarSessaoModalOpen(true)}
              className="px-4 py-2 rounded transition-colors bg-transparent text-primary hover:bg-brand-light"
            >
              Criar Sessão
            </button>
            <button
              onClick={() => setIsEntrarSessaoModalOpen(true)}
              className="px-4 py-2 rounded transition-colors bg-transparent text-primary hover:bg-brand-light"
            >
              Entrar em Sessão
            </button>
            <button className="px-4 py-2 rounded transition-colors bg-transparent text-primary hover:bg-brand-light">
              Minhas Sessões
            </button>
            <button className="px-4 py-2 rounded transition-colors bg-transparent text-primary hover:bg-brand-light">
              Minhas Fichas
            </button>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 rounded transition-colors font-semibold bg-brand-accent text-primary hover:bg-brand-salmon"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pr-6 pt-6 pb-6 pl-0 overflow-y-auto bg-light">
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
        <div className="pl-0">
          {activeTab === "fichas" ? (
            <>
              <h2 className="text-2xl font-bold mb-4 text-black pl-0">
                Minhas Fichas
              </h2>

          {loadingFichas ? (
            <div className="flex items-center justify-center p-8">
              <span className="text-lg animate-pulse text-secondary">
                Carregando fichas...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-0">
              {/* Lista de fichas */}
              {fichas.length === 0 ? (
                <>
                  <div className="col-span-full p-8 text-center">
                    <p className="text-secondary">
                      Nenhuma ficha encontrada. Clique no botão &quot;+&quot; para criar uma nova.
                    </p>
                  </div>
                  {/* Botão de adicionar nova ficha */}
                  <button
                    className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
                    onClick={handleOpenNewFicha}
                  >
                    <div className="text-4xl font-bold text-brand group-hover:text-brand-light transition-colors mb-2">
                      +
                    </div>
                    <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                      Nova Ficha
                    </p>
                  </button>
                </>
              ) : (
                <>
                  {fichas.map((ficha) => (
                    <div
                      key={ficha.id}
                      className="ficha-card"
                      onClick={() => handleOpenEditFicha(ficha.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">
                          {ficha.personagem || "Sem nome"}
                        </h3>
                      </div>
                      <p className="text-sm">
                        Criada em:{" "}
                        {new Date(ficha.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                  {/* Botão de adicionar nova ficha */}
                  <button
                    className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
                    onClick={handleOpenNewFicha}
                  >
                    <div className="text-4xl font-bold text-brand group-hover:text-brand-light transition-colors mb-2">
                      +
                    </div>
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
              <h2 className="text-2xl font-bold mb-4 text-black pl-0">
                Minhas Sessões
              </h2>

              {loadingSessoes ? (
                <div className="flex items-center justify-center p-8">
                  <span className="text-lg animate-pulse text-secondary">
                    Carregando sessões...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-0">
                  {/* Lista de sessões */}
                  {sessoes.length === 0 ? (
                    <>
                      <div className="col-span-full p-8 text-center">
                        <p className="text-secondary">
                          Nenhuma sessão encontrada. Clique no botão &quot;+&quot; para criar uma nova.
                        </p>
                      </div>
                      {/* Botão de criar nova sessão */}
                      <button
                        className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
                        onClick={() => setIsCriarSessaoModalOpen(true)}
                      >
                        <div className="text-4xl font-bold text-brand group-hover:text-brand-light transition-colors mb-2">
                          +
                        </div>
                        <p className="text-sm text-brand group-hover:text-brand-light transition-colors font-medium">
                          Nova Sessão
                        </p>
                      </button>
                    </>
                  ) : (
                    <>
                      {sessoes.map((sessao) => (
                        <div
                          key={sessao.id}
                          className="ficha-card"
                          onClick={() => handleOpenSessao(sessao.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">
                              {sessao.nome}
                            </h3>
                            {/* Badge de status */}
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                sessao.status === "ativa"
                                  ? "bg-green-500/20 text-green-700"
                                  : sessao.status === "pausada"
                                  ? "bg-yellow-500/20 text-yellow-700"
                                  : "bg-gray-500/20 text-gray-700"
                              }`}
                            >
                              {sessao.status === "ativa"
                                ? "Ativa"
                                : sessao.status === "pausada"
                                ? "Pausada"
                                : "Encerrada"}
                            </span>
                          </div>
                          {sessao.descricao && (
                            <p className="text-sm text-secondary mb-2 line-clamp-2">
                              {sessao.descricao}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-secondary">
                              {sessao.ficha_ids?.length || 0} fichas
                            </p>
                            <p className="text-xs text-secondary">
                              {new Date(sessao.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
                      {/* Botão de criar nova sessão */}
                      <button
                        className="ficha-card flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all group"
                        onClick={() => setIsCriarSessaoModalOpen(true)}
                      >
                        <div className="text-4xl font-bold text-brand group-hover:text-brand-light transition-colors mb-2">
                          +
                        </div>
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
      </main>
    </div>
  );
}
