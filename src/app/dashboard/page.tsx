"use client";

import "../globals.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import PdfFichaModal from "../components/PdfFichaModal";
import CriarSessaoModal from "../components/CriarSessaoModal";
import EntrarSessaoModal from "../components/EntrarSessaoModal";
import { useSupabasePdf } from "../../hooks/useSupabasePdf";
import { useSupabaseSessao } from "../../hooks/useSupabaseSessao";

type FichaListItem = {
  id: string;
  personagem: string | null;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { getUserFichas } = useSupabasePdf();
  const { criarSessao, entrarSessao } = useSupabaseSessao();
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
      alert(`Sessão "${nome}" criada com sucesso! ID: ${sessao.id}`);
      // TODO: Redirecionar para a página da sessão ou recarregar lista de sessões
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
      alert("Você entrou na sessão com sucesso!");
      // TODO: Redirecionar para a página da sessão
      router.push(`/session/${sessaoId}`);
    } catch (error: unknown) {
      console.error("Erro ao entrar na sessão:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao entrar na sessão: " + errorMessage);
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
        {/* Título e conteúdo */}
        <div className="pl-0">
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
        </div>

        {/* Modal com PDF */}
        <PdfFichaModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          fichaId={selectedFichaId}
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
