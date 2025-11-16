"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import { getFotoPerfilUrl } from "../../../../lib/storageUtils";
import { useSessaoRole } from "../../../hooks/useSessaoRole";
import { Sessao, useSupabaseSessao } from "../../../hooks/useSupabaseSessao";
import { useSupabasePdf } from "../../../hooks/useSupabasePdf";
import PdfFichaModal from "../../components/PdfFichaModal";
import EditarSessaoModal from "../../components/EditarSessaoModal";
import Sidebar from "../../components/Sidebar";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Loading, EmptyState, Avatar } from "@/components/ui";
import "../../globals.css";

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessaoId = params?.id as string;

  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [loadingSessao, setLoadingSessao] = useState(false);
  const [copied, setCopied] = useState(false);
  interface JogadorSessao {
    id: string;
    sessao_id: string;
    usuario_id: string;
    ficha_id: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    nome: string | null;
    apelido: string | null;
    ficha: {
      id: string;
      personagem: string | null;
    } | null;
  }

  interface FichaSessao {
    id: string;
    personagem: string | null;
    created_at: string;
    updated_at: string;
  }

  const [jogadores, setJogadores] = useState<JogadorSessao[]>([]);
  const [loadingJogadores, setLoadingJogadores] = useState(false);
  const [fotosPerfil, setFotosPerfil] = useState<Record<string, string | null>>(
    {}
  );
  const [mestreData, setMestreData] = useState<{
    id: string;
    nome: string | null;
    apelido: string | null;
  } | null>(null);
  const [fotoMestre, setFotoMestre] = useState<string | null>(null);
  const [loadingMestre, setLoadingMestre] = useState(false);
  const [fichasSessao, setFichasSessao] = useState<FichaSessao[]>([]);
  const [loadingFichasSessao, setLoadingFichasSessao] = useState(false);
  const [fichasMestre, setFichasMestre] = useState<FichaSessao[]>([]);
  const [loadingFichasMestre, setLoadingFichasMestre] = useState(false);
  const [selectedFichaId, setSelectedFichaId] = useState<string | undefined>(
    undefined
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isEditarSessaoModalOpen, setIsEditarSessaoModalOpen] = useState(false);

  // Hook para gerenciar sessões
  const {
    getSessao,
    excluirSessao,
    cortarVinculosSessao,
    getJogadoresSessao,
    selecionarFichaSessao,
    atualizarStatusSessao,
    atualizarSessao,
  } = useSupabaseSessao();
  const getSessaoRef = useRef(getSessao);
  useEffect(() => {
    getSessaoRef.current = getSessao;
  }, [getSessao]);

  // Hook para buscar fichas
  const { getUserFichas, isFichaOwner } = useSupabasePdf();

  // Verifica o papel do usuário na sessão
  const {
    loading: loadingPapel,
    isMestre,
    isJogador,
  } = useSessaoRole(sessaoId);

  // Função para copiar ID da sessão
  function handleCopySessionId() {
    if (!sessaoId) return;

    navigator.clipboard
      .writeText(sessaoId)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch((error) => {
        console.error("Erro ao copiar ID:", error);
        alert(
          "Erro ao copiar ID da sessão. Por favor, copie manualmente: " +
            sessaoId
        );
      });
  }

  // Função para excluir sessão (apenas mestre)
  async function handleExcluirSessao() {
    if (!sessaoId) return;

    if (
      !confirm(
        "Tem certeza que deseja excluir esta sessão? Todos os jogadores serão removidos e esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      await excluirSessao(sessaoId);
      alert("Sessão excluída com sucesso!");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Erro ao excluir sessão:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao excluir sessão: " + errorMessage);
    }
  }

  // Função para cortar vínculos com a sessão (jogador)
  async function handleCortarVinculos() {
    if (!sessaoId) return;

    if (
      !confirm(
        "Tem certeza que deseja sair permanentemente desta sessão? Você não poderá mais acessá-la."
      )
    ) {
      return;
    }

    try {
      await cortarVinculosSessao(sessaoId);
      alert("Você saiu da sessão permanentemente!");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Erro ao cortar vínculos:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
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

  // Atualiza status da sessão quando o mestre entra/sai
  useEffect(() => {
    let isMounted = true;

    async function updateStatusOnMount() {
      if (!user || !sessaoId || !isMestre || loadingPapel) return;

      try {
        // Quando o mestre entra, ativa a sessão
        await atualizarStatusSessao(sessaoId, "ativa");

        // Recarrega os dados da sessão para refletir a mudança
        if (isMounted) {
          const sessaoData = await getSessaoRef.current(sessaoId);
          if (sessaoData) {
            setSessao(sessaoData);
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar status da sessão:", error);
      }
    }

    // Aguarda um pouco para garantir que o papel foi verificado
    if (!loadingPapel && isMestre) {
      updateStatusOnMount();
    }

    // Cleanup: quando o componente desmonta ou o mestre sai, pausa a sessão
    return () => {
      isMounted = false;

      // Só atualiza se o usuário ainda está logado e é mestre
      if (user && sessaoId && isMestre && !loadingPapel) {
        atualizarStatusSessao(sessaoId, "pausada").catch((error) => {
          console.error("Erro ao pausar sessão ao sair:", error);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessaoId, isMestre, loadingPapel]);

  // Carrega dados do mestre (para jogador ver)
  useEffect(() => {
    async function loadMestre() {
      // Se não é jogador ou ainda está carregando o papel, não precisa carregar
      if (!isJogador || loadingPapel) {
        if (isMestre) {
          setMestreData(null);
          setFotoMestre(null);
        }
        return;
      }

      if (!sessaoId || !sessao || !sessao.mestre_id) {
        console.log("Não foi possível carregar mestre - faltando dados:", {
          sessaoId,
          sessao: !!sessao,
          mestre_id: sessao?.mestre_id,
        });
        return;
      }

      // Se o usuário é o mestre, não precisa carregar
      if (isMestre) {
        setMestreData(null);
        setFotoMestre(null);
        return;
      }

      console.log("Carregando dados do mestre:", sessao.mestre_id);

      setLoadingMestre(true);
      try {
        // Busca perfil do mestre - mesma abordagem que getJogadoresSessao
        const { data: perfilData } = await supabase
          .from("perfil")
          .select("id, nome, apelido")
          .eq("id", sessao.mestre_id)
          .single();

        if (perfilData) {
          console.log("Dados do mestre encontrados:", {
            nome: perfilData.nome,
            apelido: perfilData.apelido,
          });
          setMestreData({
            id: perfilData.id,
            nome: perfilData.nome,
            apelido: perfilData.apelido,
          });
        } else {
          console.warn("Perfil do mestre não encontrado na tabela perfil");
          setMestreData({
            id: sessao.mestre_id,
            nome: null,
            apelido: null,
          });
        }

        // Busca foto de perfil do mestre
        try {
          const fotoUrl = await getFotoPerfilUrl(sessao.mestre_id, null);
          setFotoMestre(fotoUrl);
        } catch (error) {
          console.error("Erro ao carregar foto do mestre:", error);
          setFotoMestre(null);
        }
      } catch (error) {
        console.error("Erro ao buscar perfil do mestre:", error);
        setMestreData({
          id: sessao.mestre_id,
          nome: null,
          apelido: null,
        });
        setFotoMestre(null);
      } finally {
        setLoadingMestre(false);
      }
    }

    if (!loadingPapel && sessao) {
      loadMestre();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId, sessao, isMestre, isJogador, loadingPapel]);

  // Carrega jogadores da sessão (para mestre e jogador)
  useEffect(() => {
    async function loadJogadores() {
      if (!user || !sessaoId || (!isMestre && !isJogador)) {
        setJogadores([]);
        return;
      }

      setLoadingJogadores(true);
      try {
        const jogadoresData = await getJogadoresSessao(sessaoId);
        setJogadores(jogadoresData || []);

        // Carrega fotos de perfil de todos os jogadores
        const fotos: Record<string, string | null> = {};
        for (const jogador of jogadoresData || []) {
          try {
            const fotoUrl = await getFotoPerfilUrl(jogador.usuario_id, null);
            fotos[jogador.usuario_id] = fotoUrl;
          } catch (error) {
            console.error(
              `Erro ao carregar foto do jogador ${jogador.usuario_id}:`,
              error
            );
            fotos[jogador.usuario_id] = null;
          }
        }
        setFotosPerfil(fotos);
      } catch (error) {
        console.error("Erro ao carregar jogadores:", error);
      } finally {
        setLoadingJogadores(false);
      }
    }

    if (!loadingPapel) {
      loadJogadores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessaoId, isMestre, isJogador, loadingPapel]);

  const [fichaSelecionadaId, setFichaSelecionadaId] = useState<string | null>(
    null
  );
  const [loadingFichaSelecionada, setLoadingFichaSelecionada] = useState(false);

  // Carrega a ficha selecionada do jogador na sessão
  useEffect(() => {
    async function loadFichaSelecionada() {
      if (!user || !sessaoId || !isJogador) {
        setFichaSelecionadaId(null);
        return;
      }

      setLoadingFichaSelecionada(true);
      try {
        const { data, error } = await supabase
          .from("sessao_jogador")
          .select("ficha_id")
          .eq("sessao_id", sessaoId)
          .eq("usuario_id", user.id)
          .single();

        if (!error && data) {
          setFichaSelecionadaId(data.ficha_id);
        }
      } catch (error) {
        console.error("Erro ao carregar ficha selecionada:", error);
      } finally {
        setLoadingFichaSelecionada(false);
      }
    }

    if (!loadingPapel) {
      loadFichaSelecionada();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessaoId, isJogador, loadingPapel]);

  // Carrega todas as fichas do jogador (para seleção)
  useEffect(() => {
    async function loadFichasJogador() {
      if (!user || !sessaoId || !isJogador) {
        setFichasSessao([]);
        return;
      }

      setLoadingFichasSessao(true);
      try {
        // Busca todas as fichas do usuário atual
        const todasFichas = await getUserFichas();
        setFichasSessao(todasFichas);
      } catch (error) {
        console.error("Erro ao carregar fichas do jogador:", error);
      } finally {
        setLoadingFichasSessao(false);
      }
    }

    if (!loadingPapel) {
      loadFichasJogador();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessaoId, isJogador, loadingPapel]);

  // Carrega todas as fichas da sessão (apenas para mestre)
  useEffect(() => {
    async function loadFichasMestre() {
      if (
        !user ||
        !sessaoId ||
        !isMestre ||
        !sessao ||
        !sessao.ficha_ids ||
        sessao.ficha_ids.length === 0
      ) {
        setFichasMestre([]);
        return;
      }

      setLoadingFichasMestre(true);
      try {
        // Busca as fichas pelos IDs
        const { data, error } = await supabase
          .from("ficha")
          .select("id, personagem, created_at, updated_at")
          .in("id", sessao.ficha_ids)
          .order("personagem", { ascending: true });

        if (error) {
          console.error("Erro ao carregar fichas da sessão:", error);
          throw error;
        }

        setFichasMestre(data || []);
      } catch (error) {
        console.error("Erro ao carregar fichas do mestre:", error);
      } finally {
        setLoadingFichasMestre(false);
      }
    }

    if (!loadingPapel && sessao) {
      loadFichasMestre();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessaoId, isMestre, sessao, loadingPapel]);

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
        onVoltarDashboard={() => router.push("/dashboard")}
        customContent={
          <div className="p-4">
            {/* Informações da Sessão */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h1 className="text-xl font-bold text-primary flex-1">
                  {sessao?.nome || "Carregando..."}
                </h1>
                {isMestre && sessao && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditarSessaoModalOpen(true)}
                    className="flex-shrink-0 bg-brand-light/30 hover:bg-brand-light/50"
                    title="Editar sessão"
                  >
                    Editar
                  </Button>
                )}
              </div>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySessionId}
                    disabled={!sessaoId || copied}
                    className="bg-brand-light/30 hover:bg-brand-light/50"
                    title={copied ? "Copiado!" : "Copiar ID"}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-primary opacity-60 mt-1">
                    ID copiado!
                  </p>
                )}
              </div>
            </div>

            {/* Botões de ação baseados no papel */}
            {!loadingPapel && (isMestre || isJogador) && (
              <div className="mb-4 space-y-2">
                {isMestre && (
                  <Button
                    variant="danger"
                    onClick={handleExcluirSessao}
                    className="w-full"
                  >
                    Excluir Sessão
                  </Button>
                )}
                {isJogador && (
                  <Button
                    variant="outline"
                    onClick={handleCortarVinculos}
                    className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-500/20"
                  >
                    Sair da Sessão Permanentemente
                  </Button>
                )}
              </div>
            )}

            {/* Informações do Papel */}
            {loadingPapel ? (
              <div className="mt-4">
                <p className="text-sm text-primary opacity-60">
                  Verificando permissões...
                </p>
              </div>
            ) : isMestre ? (
              <div className="mt-4">
                <div className="px-4 py-3 rounded bg-brand-light/30 mb-4 text-center">
                  <p className="text-base font-semibold text-primary">
                    Você é o Mestre
                  </p>
                </div>
              </div>
            ) : isJogador ? (
              <div className="mt-4">
                <div className="px-4 py-3 rounded bg-brand-light/30 mb-4 text-center">
                  <p className="text-base font-semibold text-primary">
                    Você é Jogador
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="px-3 py-2 rounded bg-red-500/30 mb-4">
                  <p className="text-sm font-semibold text-primary">
                    ⚠️ Você não tem acesso a esta sessão
                  </p>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-light">
        {/* Header com título (mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-light border-b border-gray-200">
          <h1 className="text-lg font-bold text-brand">GM Deck</h1>
          <div className="w-10" /> {/* Spacer para centralizar */}
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 pt-4 lg:pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl lg:text-2xl font-bold text-black">
              {sessao?.nome || "Sessão"}
            </h2>

            {/* Badge de Papel */}
            {!loadingPapel && (
              <div>
                {isMestre && (
                  <Badge variant="default" className="bg-brand text-primary">
                    Mestre
                  </Badge>
                )}
                {isJogador && (
                  <Badge variant="default" className="bg-brand-light text-primary">
                    Jogador
                  </Badge>
                )}
                {!isMestre && !isJogador && (
                  <Badge variant="default" className="bg-gray-400 text-primary">
                    Sem Acesso
                  </Badge>
                )}
              </div>
            )}
          </div>

          {loadingSessao || loadingPapel ? (
            <Loading message="Carregando sessão..." />
          ) : !isMestre && !isJogador ? (
            <EmptyState
              title="Acesso Negado"
              description="Você não tem acesso a esta sessão."
              action={
                <Button
                  variant="primary"
                  onClick={() => router.push("/dashboard")}
                >
                  Voltar ao Dashboard
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Conteúdo específico para Mestre */}
              {isMestre && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary shadow-md text-center">
                    <h3 className="text-lg font-semibold mb-2 text-black">
                      Área do Mestre
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Como mestre, você pode gerenciar jogadores, visualizar
                      todas as fichas e controlar a sessão.
                    </p>
                  </div>

                  {/* Estatísticas da Sessão */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600 mb-1">
                          Total de Jogadores
                        </p>
                        <p className="text-2xl font-bold text-black">
                          {jogadores.filter((j) => j.status === "aceito").length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600 mb-1">
                          Total de Fichas
                        </p>
                        <p className="text-2xl font-bold text-black">
                          {sessao?.ficha_ids?.length || 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <Badge
                          status={
                            sessao?.status === "ativa"
                              ? "active"
                              : sessao?.status === "pausada"
                                ? "paused"
                                : "ended"
                          }
                          className="text-lg"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lista de Jogadores - Apenas para Mestre */}
                  <div className="p-4 rounded-lg bg-primary shadow-md">
                    <h3 className="text-lg font-semibold mb-4 text-black">
                      Jogadores da Sessão ({jogadores.length})
                    </h3>
                    {loadingJogadores ? (
                      <Loading message="Carregando jogadores..." />
                    ) : jogadores.length === 0 ? (
                      <EmptyState
                        title="Nenhum jogador"
                        description="Ainda não há jogadores nesta sessão."
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jogadores.map((jogador) => {
                          const fotoPerfil = fotosPerfil[jogador.usuario_id];
                          const displayName =
                            jogador.apelido || jogador.nome || "Jogador";
                          const isCurrentUser = jogador.usuario_id === user?.id;

                          // Função para obter inicial do nome
                          const getInitial = (name: string) => {
                            return name.charAt(0).toUpperCase();
                          };

                          const statusMap: Record<string, "active" | "pending" | "rejected"> = {
                            aceito: "active",
                            pendente: "pending",
                            recusado: "rejected",
                          };

                          return (
                            <Card
                              key={jogador.usuario_id}
                              className="ficha-card"
                            >
                              <CardContent>
                                <div className="flex items-start gap-4">
                                  {/* Foto de perfil */}
                                  <Avatar
                                    src={fotoPerfil}
                                    name={displayName}
                                    size="md"
                                  />

                                  {/* Informações do jogador */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CardTitle className="text-lg truncate">
                                        {isCurrentUser ? "Você" : displayName}
                                      </CardTitle>
                                      {isCurrentUser && (
                                        <Badge variant="default" className="bg-brand text-primary">
                                          Você
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Personagem */}
                                    {jogador.ficha ? (
                                      <div className="mb-2">
                                        <p className="text-sm text-gray-600 mb-1">
                                          <span className="font-medium">
                                            Personagem:
                                          </span>
                                        </p>
                                        <p className="text-base font-semibold text-black">
                                          {jogador.ficha.personagem || "Sem nome"}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic mb-2">
                                        Nenhuma ficha selecionada
                                      </p>
                                    )}

                                    {/* Status */}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge
                                        status={statusMap[jogador.status] || "pending"}
                                      />
                                      {jogador.nome && !jogador.apelido && (
                                        <p className="text-xs text-gray-500 truncate">
                                          {jogador.nome}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Lista de Fichas da Sessão - Mestre vê todas */}
                  {sessao?.ficha_ids && sessao.ficha_ids.length > 0 && (
                    <div className="p-4 rounded-lg bg-primary shadow-md">
                      <h3 className="text-lg font-semibold mb-4 text-black">
                        Fichas da Sessão ({sessao.ficha_ids.length})
                      </h3>
                      {loadingFichasMestre ? (
                        <Loading message="Carregando fichas..." />
                      ) : fichasMestre.length === 0 ? (
                        <EmptyState
                          title="Nenhuma ficha"
                          description="Ainda não há fichas nesta sessão."
                        />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {fichasMestre.map((ficha) => (
                            <Card
                              key={ficha.id}
                              className="ficha-card cursor-pointer"
                              onClick={async () => {
                                setSelectedFichaId(ficha.id);
                                // Verifica se a ficha pertence ao usuário (mestre pode ver todas, mas só edita as próprias)
                                if (ficha.id) {
                                  const isOwner = await isFichaOwner(ficha.id);
                                  setIsReadOnly(!isOwner);
                                }
                                setIsModalOpen(true);
                              }}
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Conteúdo específico para Jogador */}
              {isJogador && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary shadow-md">
                    <h3 className="text-lg font-semibold mb-2 text-black">
                      Área do Jogador
                    </h3>
                    <p className="text-black text-sm opacity-80">
                      Selecione uma de suas fichas para usar nesta sessão. Você
                      pode editar suas fichas clicando nelas.
                    </p>
                    {fichaSelecionadaId && (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        ✓ Ficha selecionada para esta sessão
                      </p>
                    )}
                  </div>

                  {/* Card do Mestre - Separado dos jogadores */}
                  {isJogador && (
                    <div className="p-4 rounded-lg bg-primary shadow-md">
                      <h3 className="text-lg font-semibold mb-4 text-black">
                        Mestre da Sessão
                      </h3>
                      {loadingMestre ? (
                        <div className="flex items-center justify-center p-4">
                          <span className="text-sm animate-pulse text-secondary">
                            Carregando dados do mestre...
                          </span>
                        </div>
                      ) : mestreData ? (
                        <div className="ficha-card bg-primary border border-gray-200">
                          <div className="flex items-start gap-4">
                            {/* Foto de perfil */}
                            <div className="flex-shrink-0">
                              {fotoMestre ? (
                                <img
                                  src={fotoMestre}
                                  alt={
                                    mestreData.apelido ||
                                    mestreData.nome ||
                                    "Mestre"
                                  }
                                  className="w-16 h-16 rounded-full object-cover border-2 border-brand"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-brand text-primary border-2 border-brand">
                                  {mestreData.apelido || mestreData.nome
                                    ? (mestreData.apelido ||
                                        mestreData.nome ||
                                        "M")[0].toUpperCase()
                                    : "M"}
                                </div>
                              )}
                            </div>

                            {/* Informações do mestre */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {mestreData.apelido || mestreData.nome ? (
                                  <h3 className="text-lg font-semibold text-black truncate">
                                    {mestreData.apelido || mestreData.nome}
                                  </h3>
                                ) : null}
                                <span className="bg-brand text-primary text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                                  Mestre
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-gray-100">
                          <p className="text-sm text-secondary">
                            Carregando informações do mestre...
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lista de Jogadores - Jogador também vê outros jogadores */}
                  <div className="p-4 rounded-lg bg-primary shadow-md">
                    <h3 className="text-lg font-semibold mb-4 text-black">
                      Jogadores da Sessão ({jogadores.length})
                    </h3>
                    {loadingJogadores ? (
                      <Loading message="Carregando jogadores..." />
                    ) : jogadores.length === 0 ? (
                      <EmptyState
                        title="Nenhum jogador"
                        description="Ainda não há jogadores nesta sessão."
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jogadores.map((jogador) => {
                          const fotoPerfil = fotosPerfil[jogador.usuario_id];
                          const displayName =
                            jogador.apelido || jogador.nome || "Jogador";
                          const isCurrentUser = jogador.usuario_id === user?.id;

                          const statusMap: Record<string, "active" | "pending" | "rejected"> = {
                            aceito: "active",
                            pendente: "pending",
                            recusado: "rejected",
                          };

                          return (
                            <Card
                              key={jogador.usuario_id}
                              className="ficha-card"
                            >
                              <CardContent>
                                <div className="flex items-start gap-4">
                                  {/* Foto de perfil */}
                                  <Avatar
                                    src={fotoPerfil}
                                    name={displayName}
                                    size="md"
                                  />

                                  {/* Informações do jogador */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CardTitle className="text-lg truncate">
                                        {displayName}
                                      </CardTitle>
                                      {isCurrentUser && (
                                        <Badge variant="default" className="bg-brand text-primary">
                                          Você
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Personagem */}
                                    {jogador.ficha ? (
                                      <div className="mb-2">
                                        <p className="text-sm text-gray-600 mb-1">
                                          <span className="font-medium">
                                            Personagem:
                                          </span>
                                        </p>
                                        <p className="text-base font-semibold text-black">
                                          {jogador.ficha.personagem || "Sem nome"}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic mb-2">
                                        Nenhuma ficha selecionada
                                      </p>
                                    )}

                                    {/* Status */}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge
                                        status={statusMap[jogador.status] || "pending"}
                                      />
                                      {jogador.nome && !jogador.apelido && (
                                        <p className="text-xs text-gray-500 truncate">
                                          {jogador.nome}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Lista de Fichas do Jogador */}
                  {loadingFichasSessao ? (
                    <Loading message="Carregando fichas..." />
                  ) : fichasSessao.length === 0 ? (
                    <EmptyState
                      title="Nenhuma ficha criada"
                      description="Você ainda não tem fichas criadas."
                      action={
                        <Button
                          variant="primary"
                          onClick={() => router.push("/dashboard")}
                        >
                          Criar Nova Ficha
                        </Button>
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fichasSessao.map((ficha) => {
                        const isSelecionada = fichaSelecionadaId === ficha.id;
                        return (
                          <Card
                            key={ficha.id}
                            className={`ficha-card cursor-pointer relative ${
                              isSelecionada
                                ? "ring-2 ring-green-500 bg-green-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {isSelecionada && (
                              <Badge
                                variant="success"
                                className="absolute top-2 right-2"
                              >
                                Selecionada
                              </Badge>
                            )}
                            <CardHeader>
                              <CardTitle className="text-lg">
                                {ficha.personagem || "Sem nome"}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 mb-3">
                                Criada em:{" "}
                                {new Date(ficha.created_at).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </p>
                              {!isSelecionada && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="w-full"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await selecionarFichaSessao(
                                        sessaoId,
                                        ficha.id
                                      );
                                      setFichaSelecionadaId(ficha.id);
                                      alert("Ficha selecionada com sucesso!");
                                      // Recarrega a sessão para atualizar ficha_ids
                                      if (sessaoId) {
                                        const sessaoData =
                                          await getSessao(sessaoId);
                                        if (sessaoData) {
                                          setSessao(sessaoData);
                                        }
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Erro ao selecionar ficha:",
                                        error
                                      );
                                      const errorMessage =
                                        error instanceof Error
                                          ? error.message
                                          : "Erro desconhecido";
                                      alert(
                                        "Erro ao selecionar ficha: " +
                                          errorMessage
                                      );
                                    }
                                  }}
                                >
                                  Selecionar Ficha
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Editar Sessão */}
      <EditarSessaoModal
        isOpen={isEditarSessaoModalOpen}
        onClose={() => setIsEditarSessaoModalOpen(false)}
        sessaoId={sessaoId}
        nomeInicial={sessao?.nome || ""}
        descricaoInicial={sessao?.descricao || null}
        onUpdate={async (nome: string, descricao?: string | null) => {
          if (!sessaoId) return;
          try {
            const sessaoAtualizada = await atualizarSessao(
              sessaoId,
              nome,
              descricao
            );
            if (sessaoAtualizada) {
              setSessao(sessaoAtualizada);
              alert("Sessão atualizada com sucesso!");
            }
          } catch (error) {
            console.error("Erro ao atualizar sessão:", error);
            throw error;
          }
        }}
      />

      {/* Modal com PDF para visualizar/editar fichas */}
      <PdfFichaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFichaId(undefined);
          setIsReadOnly(false);
        }}
        fichaId={selectedFichaId}
        readOnly={isReadOnly}
        onDelete={async () => {
          // Recarrega as fichas após deletar
          if (isJogador) {
            try {
              const todasFichas = await getUserFichas();
              setFichasSessao(todasFichas);
              // Se a ficha deletada era a selecionada, limpa a seleção
              if (selectedFichaId === fichaSelecionadaId) {
                setFichaSelecionadaId(null);
              }
              // Recarrega a sessão para atualizar ficha_ids
              if (sessaoId) {
                const sessaoData = await getSessao(sessaoId);
                if (sessaoData) {
                  setSessao(sessaoData);
                }
              }
            } catch (error) {
              console.error("Erro ao recarregar fichas:", error);
            }
          } else if (isMestre) {
            // Recarrega as fichas do mestre
            if (sessao && sessao.ficha_ids && sessao.ficha_ids.length > 0) {
              try {
                const { data, error } = await supabase
                  .from("ficha")
                  .select("id, personagem, created_at, updated_at")
                  .in("id", sessao.ficha_ids)
                  .order("personagem", { ascending: true });

                if (!error && data) {
                  setFichasMestre(data);
                }
                // Recarrega a sessão
                if (sessaoId) {
                  const sessaoData = await getSessao(sessaoId);
                  if (sessaoData) {
                    setSessao(sessaoData);
                  }
                }
              } catch (error) {
                console.error("Erro ao recarregar fichas:", error);
              }
            } else {
              setFichasMestre([]);
            }
          }
        }}
      />
    </div>
  );
}
