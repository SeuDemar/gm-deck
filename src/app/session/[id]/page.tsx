"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Copy, Check, Paintbrush } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import { getFotoPerfilUrl } from "../../../../lib/storageUtils";
import { useSessaoRole } from "../../../hooks/useSessaoRole";
import {
  Sessao,
  SessaoStatus,
  useSupabaseSessao,
} from "../../../hooks/useSupabaseSessao";
import { useSupabasePdf } from "../../../hooks/useSupabasePdf";
import PdfFichaModal from "../../components/PdfFichaModal";
import EditarSessaoModal from "../../components/EditarSessaoModal";
import Sidebar from "../../components/Sidebar";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Loading,
  EmptyState,
  Avatar,
} from "@/components/ui";
import "../../globals.css";

// Função para gerar uma cor aleatória consistente baseada no nome
function getPersonagemColor(
  personagem: string | null,
  fichaId?: string,
  customColors?: Record<string, string>
): string {
  // Se houver cor customizada para esta ficha, usa ela
  if (fichaId && customColors && customColors[fichaId]) {
    return customColors[fichaId];
  }

  if (!personagem) return "rgba(107, 114, 128, 0.2)"; // cinza padrão

  // Gera um hash simples do nome
  let hash = 0;
  for (let i = 0; i < personagem.length; i++) {
    hash = personagem.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Gera cores vibrantes mas não muito escuras
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

  return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)`;
}

// Função para gerar a cor do texto (mais escura)
function getPersonagemTextColor(
  personagem: string | null,
  fichaId?: string,
  customColors?: Record<string, string>
): string {
  // Se houver cor customizada, calcula uma cor de texto mais escura baseada nela
  if (fichaId && customColors && customColors[fichaId]) {
    const bgColor = customColors[fichaId];
    // Extrai a cor RGB da string rgba/hsla
    const match = bgColor.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]);
      const g = parseInt(match[1]);
      const b = parseInt(match[2]);
      // Calcula luminosidade e ajusta para texto escuro
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance > 0.5) {
        return `rgb(${Math.max(0, r - 100)}, ${Math.max(0, g - 100)}, ${Math.max(0, b - 100)})`;
      }
      return `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)})`;
    }
  }

  if (!personagem) return "#374151"; // cinza escuro padrão

  let hash = 0;
  for (let i = 0; i < personagem.length; i++) {
    hash = personagem.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 20);
  const lightness = 25 + (Math.abs(hash) % 10); // 25-35% (mais escuro para texto)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

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
    usuario_id: string;
    nome: string | null;
    apelido: string | null;
    status: string | null; // null se não está na sessão
    ficha_id: string | null;
    ficha: {
      id: string;
      personagem: string | null;
    } | null;
    sessao_jogador_id: string | null; // id do registro em sessao_jogador, null se não está na sessão
    created_at: string | null;
    updated_at: string | null;
    // Campos opcionais para compatibilidade
    id?: string;
    sessao_id?: string;
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
  const [fichaColors, setFichaColors] = useState<Record<string, string>>({});

  // Hook para gerenciar sessões
  const {
    getSessao,
    excluirSessao,
    cortarVinculosSessao,
    getAllUsuariosComStatusSessao,
    selecionarFichaSessao,
    atualizarStatusSessao,
    atualizarStatusJogadorSessao,
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

  // Atualiza status do jogador quando entra/sai da sessão
  useEffect(() => {
    async function updateJogadorStatusOnMount() {
      if (!user || !sessaoId || !isJogador || loadingPapel) return;

      try {
        // Quando o jogador entra na sessão, atualiza status para "aceito"
        await atualizarStatusJogadorSessao(sessaoId, "aceito");
        // Recarrega a lista de jogadores para atualizar a badge
        await loadJogadores();
      } catch (error) {
        console.error("Erro ao atualizar status do jogador:", error);
      }
    }

    // Aguarda um pouco para garantir que o papel foi verificado
    if (!loadingPapel && isJogador) {
      updateJogadorStatusOnMount();
    }

    // Cleanup: quando o componente desmonta ou o jogador sai, marca como "pendente" (inativo)
    return () => {
      // Só atualiza se o usuário ainda está logado e é jogador
      if (user && sessaoId && isJogador && !loadingPapel) {
        atualizarStatusJogadorSessao(sessaoId, "pendente").catch((error) => {
          console.error("Erro ao atualizar status do jogador ao sair:", error);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessaoId, isJogador, loadingPapel]);

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

  // Função para carregar jogadores (reutilizável)
  async function loadJogadores() {
    if (!user || !sessaoId || (!isMestre && !isJogador)) {
      setJogadores([]);
      return;
    }

    setLoadingJogadores(true);
    try {
      // Busca todos os usuários com status na sessão
      const todosUsuarios = await getAllUsuariosComStatusSessao(sessaoId);
      setJogadores(todosUsuarios);

      // Carrega fotos de perfil de todos os usuários
      const fotos: Record<string, string | null> = {};
      for (const usuario of todosUsuarios) {
        try {
          const fotoUrl = await getFotoPerfilUrl(usuario.usuario_id, null);
          fotos[usuario.usuario_id] = fotoUrl;
        } catch (error) {
          console.error(
            `Erro ao carregar foto do usuário ${usuario.usuario_id}:`,
            error
          );
          fotos[usuario.usuario_id] = null;
        }
      }
      setFotosPerfil(fotos);
    } catch (error) {
      console.error("Erro ao carregar jogadores:", error);
    } finally {
      setLoadingJogadores(false);
    }
  }

  // Carrega jogadores da sessão (para mestre e jogador)
  useEffect(() => {
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

        // Carrega as cores das fichas
        if (todasFichas.length > 0) {
          const fichaIds = todasFichas.map((f) => f.id);
          const { data, error } = await supabase
            .from("ficha")
            .select("id, badge_color")
            .in("id", fichaIds);

          if (!error && data) {
            const colors: Record<string, string> = {};
            data.forEach((ficha) => {
              if (ficha.badge_color) {
                colors[ficha.id] = ficha.badge_color;
              }
            });
            setFichaColors((prev) => ({ ...prev, ...colors }));
          }
        }
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
          .select("id, personagem, created_at, updated_at, badge_color")
          .in("id", sessao.ficha_ids)
          .order("personagem", { ascending: true });

        if (error) {
          console.error("Erro ao carregar fichas da sessão:", error);
          throw error;
        }

        setFichasMestre(data || []);

        // Carrega as cores das fichas
        if (data) {
          const colors: Record<string, string> = {};
          data.forEach((ficha) => {
            if (ficha.badge_color) {
              colors[ficha.id] = ficha.badge_color;
            }
          });
          setFichaColors((prev) => ({ ...prev, ...colors }));
        }
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

  // Carrega cores das fichas dos jogadores
  useEffect(() => {
    async function loadFichaColors() {
      if (!jogadores.length) return;

      const fichaIds = jogadores
        .map((j) => j.ficha?.id)
        .filter((id): id is string => id !== null && id !== undefined);

      if (fichaIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from("ficha")
          .select("id, badge_color")
          .in("id", fichaIds);

        if (error) {
          console.error("Erro ao carregar cores das fichas:", error);
          return;
        }

        if (data) {
          const colors: Record<string, string> = {};
          data.forEach((ficha) => {
            if (ficha.badge_color) {
              colors[ficha.id] = ficha.badge_color;
            }
          });
          setFichaColors((prev) => ({ ...prev, ...colors }));
        }
      } catch (error) {
        console.error("Erro ao carregar cores das fichas:", error);
      }
    }

    loadFichaColors();
  }, [jogadores]);

  // Listener para atualizar cores em tempo real
  useEffect(() => {
    if (!sessaoId) return;

    // Coleta todos os IDs de fichas da sessão
    const allFichaIds = [
      ...(sessao?.ficha_ids || []),
      ...jogadores
        .map((j) => j.ficha?.id)
        .filter((id): id is string => id !== null && id !== undefined),
    ];
    const uniqueFichaIds = [...new Set(allFichaIds)];

    if (uniqueFichaIds.length === 0) return;

    const channel = supabase
      .channel(`ficha-colors-${sessaoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ficha",
        },
        (payload) => {
          const newData = payload.new as { id: string; badge_color?: string };
          // Verifica se a ficha atualizada está na lista de fichas da sessão
          if (newData.id && uniqueFichaIds.includes(newData.id)) {
            setFichaColors((prev) => {
              const updated = { ...prev };
              if (newData.badge_color) {
                updated[newData.id] = newData.badge_color;
              } else {
                // Se badge_color foi removido, remove do estado também
                delete updated[newData.id];
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId, sessao?.ficha_ids, jogadores]);

  // Listener para atualizar lista de jogadores em tempo real
  useEffect(() => {
    if (!sessaoId || loadingPapel) return;

    const channel = supabase
      .channel(`sessao-jogadores-${sessaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "sessao_jogador",
          filter: `sessao_id=eq.${sessaoId}`,
        },
        () => {
          // Recarrega a lista de jogadores quando há mudanças
          loadJogadores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId, loadingPapel]);

  // Listener para atualizar status da sessão em tempo real
  useEffect(() => {
    if (!sessaoId) return;

    const channel = supabase
      .channel(`sessao-status-${sessaoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessao",
          filter: `id=eq.${sessaoId}`,
        },
        (payload) => {
          const newData = payload.new as {
            id: string;
            status?: SessaoStatus;
            nome?: string;
            descricao?: string;
          };
          // Atualiza os dados da sessão
          if (newData.id === sessaoId) {
            setSessao((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status:
                  newData.status &&
                  ["ativa", "encerrada", "pausada"].includes(newData.status)
                    ? (newData.status as SessaoStatus)
                    : prev.status,
                nome: newData.nome || prev.nome,
                descricao:
                  newData.descricao !== undefined
                    ? newData.descricao
                    : prev.descricao,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId]);

  // Listener para atualizar ficha selecionada em tempo real
  useEffect(() => {
    if (!sessaoId || !user || !isJogador || loadingPapel) return;

    const channel = supabase
      .channel(`ficha-selecionada-${sessaoId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessao_jogador",
          filter: `sessao_id=eq.${sessaoId}&usuario_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as { ficha_id?: string | null };
          // Atualiza a ficha selecionada
          setFichaSelecionadaId(newData.ficha_id || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId, user, isJogador, loadingPapel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-light">
        <Loading message="Carregando..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-screen overflow-hidden w-full">
      <Sidebar
        onVoltarDashboard={() => router.push("/dashboard")}
        customActions={
          !loadingPapel
            ? [
                ...(isMestre
                  ? [
                      {
                        label: "Excluir Sessão",
                        onClick: handleExcluirSessao,
                        className:
                          "w-full px-4 py-3 rounded-lg transition-all bg-red-500/20 text-primary hover:bg-red-500/40 hover:shadow-md text-center font-semibold cursor-pointer border border-red-500/30",
                      },
                    ]
                  : []),
                ...(isJogador
                  ? [
                      {
                        label: "Sair permanentemente",
                        onClick: handleCortarVinculos,
                        className:
                          "w-full px-4 py-3 rounded-lg transition-all bg-red-500/20 text-primary hover:bg-red-500/40 hover:shadow-md text-center font-semibold cursor-pointer border border-red-500/30",
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        customContent={
          <div>
            {/* ID da Sessão com botão de copiar */}
            <div className="mb-4 p-3 rounded bg-brand-light/20 border border-brand-light/30 w-full">
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
                  className="bg-brand-light/30 hover:bg-brand-light/50 flex-shrink-0"
                  title={copied ? "Copiado!" : "Copiar ID"}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-primary opacity-60 mt-1">
                  ID copiado!
                </p>
              )}
            </div>

            {/* Informações do Papel */}
            {loadingPapel ? (
              <div className="mt-4">
                <p className="text-sm text-primary opacity-60">
                  Verificando permissões...
                </p>
              </div>
            ) : isMestre ? (
              <div className="mt-4">
                <div
                  className="mb-4 p-3 rounded bg-brand-light/20 border border-brand-light/30 w-full flex items-center justify-center"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "auto",
                    minHeight: "3rem",
                  }}
                >
                  <span
                    className="text-base font-semibold text-primary"
                    style={{ lineHeight: "1.5rem" }}
                  >
                    Você é um mestre !
                  </span>
                </div>
              </div>
            ) : isJogador ? (
              <div className="mt-4">
                <div
                  className="mb-4 p-3 rounded bg-brand-light/20 border border-brand-light/30 w-full flex items-center justify-center"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "auto",
                    minHeight: "3rem",
                  }}
                >
                  <span
                    className="text-base font-semibold text-primary"
                    style={{ lineHeight: "1.5rem" }}
                  >
                    Você é um jogador !
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="px-3 py-2 rounded bg-red-500/30 mb-4 w-full">
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-light w-full">
        {/* Header com título (mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-light border-b border-gray-200 flex-shrink-0">
          <h1 className="text-lg font-bold text-brand">GM Deck</h1>
          <div className="w-10" /> {/* Spacer para centralizar */}
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 lg:px-6 pt-4 lg:pt-6 pb-6 w-full">
          {/* Cabeçalho com nome da campanha e descrição */}
          <div className="mb-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-2xl lg:text-3xl font-bold text-black break-words">
                        {sessao?.nome || "Sessão"}
                      </CardTitle>
                      {/* Badge de Papel e Status */}
                      {!loadingPapel && (
                        <div className="flex items-center gap-2">
                          {isMestre && (
                            <Badge
                              variant="default"
                              className="bg-brand text-primary"
                            >
                              Mestre
                            </Badge>
                          )}
                          {isJogador && (
                            <Badge
                              variant="default"
                              className="bg-brand-light text-primary"
                            >
                              Jogador
                            </Badge>
                          )}
                          {!isMestre && !isJogador && (
                            <Badge
                              variant="default"
                              className="bg-gray-400 text-primary"
                            >
                              Sem Acesso
                            </Badge>
                          )}
                          {sessao && (
                            <Badge
                              status={
                                sessao.status === "ativa"
                                  ? "active"
                                  : sessao.status === "pausada"
                                    ? "paused"
                                    : "ended"
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {isMestre && sessao && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditarSessaoModalOpen(true)}
                        className="flex-shrink-0 hover:!text-white"
                        title="Editar sessão"
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                  {sessao?.descricao && (
                    <CardDescription className="text-sm lg:text-base text-gray-700 break-words">
                      {sessao.descricao}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              {isMestre && (
                <CardContent>
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total de Jogadores
                      </p>
                      <p className="text-2xl font-bold text-black">
                        {jogadores.filter((j) => j.status === "aceito").length}
                      </p>
                    </div>
                    <div className="h-12 w-px bg-gray-200"></div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total de Fichas
                      </p>
                      <p className="text-2xl font-bold text-black">
                        {sessao?.ficha_ids?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
              {isJogador && (
                <CardContent>
                  <div className="pt-4 border-t border-gray-200">
                    {loadingMestre ? (
                      <div className="flex items-center justify-center p-4">
                        <span className="text-sm animate-pulse text-secondary">
                          Carregando dados do mestre...
                        </span>
                      </div>
                    ) : mestreData ? (
                      <Card className="ficha-card">
                        <CardContent className="p-8">
                          <div className="flex items-start gap-4">
                            {/* Foto de perfil */}
                            <Avatar
                              src={fotoMestre || undefined}
                              name={
                                mestreData.apelido ||
                                mestreData.nome ||
                                "Mestre"
                              }
                              size="lg"
                            />

                            {/* Informações do mestre */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-xl truncate">
                                  {mestreData.apelido ||
                                    mestreData.nome ||
                                    "Mestre"}
                                </CardTitle>
                                <Badge
                                  variant="default"
                                  className="bg-brand text-primary"
                                >
                                  Mestre
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="p-4 rounded-lg bg-gray-100">
                        <p className="text-sm text-secondary">
                          Carregando informações do mestre...
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
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

                          return (
                            <Card
                              key={jogador.usuario_id}
                              className="ficha-card"
                            >
                              <CardContent className="p-8">
                                <div className="flex items-start gap-4">
                                  {/* Foto de perfil */}
                                  <Avatar
                                    src={fotoPerfil}
                                    name={displayName}
                                    size="lg"
                                  />

                                  {/* Informações do jogador */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CardTitle className="text-xl truncate">
                                        {isCurrentUser ? "Você" : displayName}
                                      </CardTitle>
                                      {isCurrentUser && (
                                        <Badge
                                          variant="default"
                                          className="bg-brand-light text-primary"
                                        >
                                          Você
                                        </Badge>
                                      )}
                                      <Badge
                                        status={
                                          jogador.status === "aceito"
                                            ? "active"
                                            : jogador.status === "pendente"
                                              ? "inactive" // "pendente" significa que o jogador saiu (inativo)
                                              : jogador.status === "recusado"
                                                ? "rejected"
                                                : "inactive"
                                        }
                                      />
                                    </div>

                                    {/* Personagem */}
                                    {jogador.ficha ? (
                                      <div className="mb-2 flex items-center gap-2 flex-wrap">
                                        <span className="text-base text-gray-600 font-medium">
                                          Personagem:
                                        </span>
                                        <Badge
                                          style={{
                                            backgroundColor: getPersonagemColor(
                                              jogador.ficha.personagem,
                                              jogador.ficha.id,
                                              fichaColors
                                            ),
                                            color: getPersonagemTextColor(
                                              jogador.ficha.personagem,
                                              jogador.ficha.id,
                                              fichaColors
                                            ),
                                          }}
                                          className="text-base font-semibold"
                                        >
                                          {jogador.ficha.personagem ||
                                            "Sem nome"}
                                        </Badge>
                                        {isCurrentUser && jogador.ficha && (
                                          <span className="relative inline-block">
                                            <input
                                              type="color"
                                              id={`color-picker-${jogador.ficha.id}`}
                                              style={{
                                                position: "absolute",
                                                opacity: 0,
                                                width: "1px",
                                                height: "1px",
                                                pointerEvents: "none",
                                              }}
                                              value={(() => {
                                                const currentColor =
                                                  fichaColors[
                                                    jogador.ficha?.id || ""
                                                  ] ||
                                                  getPersonagemColor(
                                                    jogador.ficha?.personagem ||
                                                      null,
                                                    jogador.ficha?.id,
                                                    fichaColors
                                                  );
                                                if (
                                                  currentColor.startsWith(
                                                    "rgba"
                                                  )
                                                ) {
                                                  const match =
                                                    currentColor.match(/\d+/g);
                                                  if (
                                                    match &&
                                                    match.length >= 3
                                                  ) {
                                                    const r = parseInt(
                                                      match[0]
                                                    );
                                                    const g = parseInt(
                                                      match[1]
                                                    );
                                                    const b = parseInt(
                                                      match[2]
                                                    );
                                                    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                                                  }
                                                } else if (
                                                  currentColor.startsWith(
                                                    "hsla"
                                                  )
                                                ) {
                                                  const match =
                                                    currentColor.match(
                                                      /[\d.]+/g
                                                    );
                                                  if (
                                                    match &&
                                                    match.length >= 3
                                                  ) {
                                                    const h = parseFloat(
                                                      match[0]
                                                    );
                                                    const s =
                                                      parseFloat(match[1]) /
                                                      100;
                                                    const l =
                                                      parseFloat(match[2]) /
                                                      100;
                                                    const c =
                                                      (1 -
                                                        Math.abs(2 * l - 1)) *
                                                      s;
                                                    const x =
                                                      c *
                                                      (1 -
                                                        Math.abs(
                                                          ((h / 60) % 2) - 1
                                                        ));
                                                    const m = l - c / 2;
                                                    let r = 0,
                                                      g = 0,
                                                      b = 0;
                                                    if (h < 60) {
                                                      r = c;
                                                      g = x;
                                                      b = 0;
                                                    } else if (h < 120) {
                                                      r = x;
                                                      g = c;
                                                      b = 0;
                                                    } else if (h < 180) {
                                                      r = 0;
                                                      g = c;
                                                      b = x;
                                                    } else if (h < 240) {
                                                      r = 0;
                                                      g = x;
                                                      b = c;
                                                    } else if (h < 300) {
                                                      r = x;
                                                      g = 0;
                                                      b = c;
                                                    } else {
                                                      r = c;
                                                      g = 0;
                                                      b = x;
                                                    }
                                                    r = Math.round(
                                                      (r + m) * 255
                                                    );
                                                    g = Math.round(
                                                      (g + m) * 255
                                                    );
                                                    b = Math.round(
                                                      (b + m) * 255
                                                    );
                                                    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                                                  }
                                                }
                                                return "#6b7280";
                                              })()}
                                              onInput={async (e) => {
                                                if (!jogador.ficha?.id) return;
                                                const hex = (
                                                  e.target as HTMLInputElement
                                                ).value;
                                                const r = parseInt(
                                                  hex.slice(1, 3),
                                                  16
                                                );
                                                const g = parseInt(
                                                  hex.slice(3, 5),
                                                  16
                                                );
                                                const b = parseInt(
                                                  hex.slice(5, 7),
                                                  16
                                                );
                                                const newColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
                                                setFichaColors({
                                                  ...fichaColors,
                                                  [jogador.ficha.id]: newColor,
                                                });
                                                // Salva no banco de dados
                                                try {
                                                  await supabase
                                                    .from("ficha")
                                                    .update({
                                                      badge_color: newColor,
                                                    })
                                                    .eq("id", jogador.ficha.id);
                                                } catch (error) {
                                                  console.error(
                                                    "Erro ao salvar cor:",
                                                    error
                                                  );
                                                }
                                              }}
                                              onChange={async (e) => {
                                                if (!jogador.ficha?.id) return;
                                                const hex = e.target.value;
                                                const r = parseInt(
                                                  hex.slice(1, 3),
                                                  16
                                                );
                                                const g = parseInt(
                                                  hex.slice(3, 5),
                                                  16
                                                );
                                                const b = parseInt(
                                                  hex.slice(5, 7),
                                                  16
                                                );
                                                const newColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
                                                setFichaColors({
                                                  ...fichaColors,
                                                  [jogador.ficha.id]: newColor,
                                                });
                                                // Salva no banco de dados
                                                try {
                                                  await supabase
                                                    .from("ficha")
                                                    .update({
                                                      badge_color: newColor,
                                                    })
                                                    .eq("id", jogador.ficha.id);
                                                } catch (error) {
                                                  console.error(
                                                    "Erro ao salvar cor:",
                                                    error
                                                  );
                                                }
                                              }}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const colorInput =
                                                  document.getElementById(
                                                    `color-picker-${jogador.ficha?.id}`
                                                  ) as HTMLInputElement;
                                                if (colorInput) {
                                                  colorInput.click();
                                                }
                                              }}
                                              className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer flex items-center"
                                              title="Alterar cor"
                                            >
                                              <Paintbrush className="w-5 h-5 text-gray-600" />
                                            </button>
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic mb-2">
                                        Nenhuma ficha selecionada
                                      </p>
                                    )}

                                    {/* Nome completo (se não tiver apelido) */}
                                    {jogador.nome && !jogador.apelido && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <p className="text-xs text-gray-500 truncate">
                                          {jogador.nome}
                                        </p>
                                      </div>
                                    )}
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
                                <div className="flex items-center gap-2">
                                  <Badge
                                    style={{
                                      backgroundColor: getPersonagemColor(
                                        ficha.personagem,
                                        ficha.id,
                                        fichaColors
                                      ),
                                      color: getPersonagemTextColor(
                                        ficha.personagem,
                                        ficha.id,
                                        fichaColors
                                      ),
                                    }}
                                    className="text-base font-semibold"
                                  >
                                    {ficha.personagem || "Sem nome"}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-600">
                                  Criada em:{" "}
                                  {new Date(
                                    ficha.created_at
                                  ).toLocaleDateString("pt-BR")}
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

                          return (
                            <Card
                              key={jogador.usuario_id}
                              className="ficha-card"
                            >
                              <CardContent className="p-8">
                                <div className="flex items-start gap-4">
                                  {/* Foto de perfil */}
                                  <Avatar
                                    src={fotoPerfil}
                                    name={displayName}
                                    size="lg"
                                  />

                                  {/* Informações do jogador */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CardTitle className="text-xl truncate">
                                        {isCurrentUser ? "Você" : displayName}
                                      </CardTitle>
                                      {isCurrentUser && (
                                        <Badge
                                          variant="default"
                                          className="bg-brand-light text-primary"
                                        >
                                          Você
                                        </Badge>
                                      )}
                                      <Badge
                                        status={
                                          jogador.status === "aceito"
                                            ? "active"
                                            : jogador.status === "pendente"
                                              ? "inactive" // "pendente" significa que o jogador saiu (inativo)
                                              : jogador.status === "recusado"
                                                ? "rejected"
                                                : "inactive"
                                        }
                                      />
                                    </div>

                                    {/* Personagem */}
                                    {jogador.ficha ? (
                                      <div className="mb-2 flex items-center gap-2 flex-wrap">
                                        <span className="text-base text-gray-600 font-medium">
                                          Personagem:
                                        </span>
                                        <Badge
                                          style={{
                                            backgroundColor: getPersonagemColor(
                                              jogador.ficha.personagem,
                                              jogador.ficha.id,
                                              fichaColors
                                            ),
                                            color: getPersonagemTextColor(
                                              jogador.ficha.personagem,
                                              jogador.ficha.id,
                                              fichaColors
                                            ),
                                          }}
                                          className="text-base font-semibold"
                                        >
                                          {jogador.ficha.personagem ||
                                            "Sem nome"}
                                        </Badge>
                                        {isCurrentUser && jogador.ficha && (
                                          <span className="relative inline-block">
                                            <input
                                              type="color"
                                              id={`color-picker-${jogador.ficha.id}`}
                                              style={{
                                                position: "absolute",
                                                opacity: 0,
                                                width: "1px",
                                                height: "1px",
                                                pointerEvents: "none",
                                              }}
                                              value={(() => {
                                                const currentColor =
                                                  fichaColors[
                                                    jogador.ficha?.id || ""
                                                  ] ||
                                                  getPersonagemColor(
                                                    jogador.ficha?.personagem ||
                                                      null,
                                                    jogador.ficha?.id,
                                                    fichaColors
                                                  );
                                                if (
                                                  currentColor.startsWith(
                                                    "rgba"
                                                  )
                                                ) {
                                                  const match =
                                                    currentColor.match(/\d+/g);
                                                  if (
                                                    match &&
                                                    match.length >= 3
                                                  ) {
                                                    const r = parseInt(
                                                      match[0]
                                                    );
                                                    const g = parseInt(
                                                      match[1]
                                                    );
                                                    const b = parseInt(
                                                      match[2]
                                                    );
                                                    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                                                  }
                                                } else if (
                                                  currentColor.startsWith(
                                                    "hsla"
                                                  )
                                                ) {
                                                  const match =
                                                    currentColor.match(
                                                      /[\d.]+/g
                                                    );
                                                  if (
                                                    match &&
                                                    match.length >= 3
                                                  ) {
                                                    const h = parseFloat(
                                                      match[0]
                                                    );
                                                    const s =
                                                      parseFloat(match[1]) /
                                                      100;
                                                    const l =
                                                      parseFloat(match[2]) /
                                                      100;
                                                    const c =
                                                      (1 -
                                                        Math.abs(2 * l - 1)) *
                                                      s;
                                                    const x =
                                                      c *
                                                      (1 -
                                                        Math.abs(
                                                          ((h / 60) % 2) - 1
                                                        ));
                                                    const m = l - c / 2;
                                                    let r = 0,
                                                      g = 0,
                                                      b = 0;
                                                    if (h < 60) {
                                                      r = c;
                                                      g = x;
                                                      b = 0;
                                                    } else if (h < 120) {
                                                      r = x;
                                                      g = c;
                                                      b = 0;
                                                    } else if (h < 180) {
                                                      r = 0;
                                                      g = c;
                                                      b = x;
                                                    } else if (h < 240) {
                                                      r = 0;
                                                      g = x;
                                                      b = c;
                                                    } else if (h < 300) {
                                                      r = x;
                                                      g = 0;
                                                      b = c;
                                                    } else {
                                                      r = c;
                                                      g = 0;
                                                      b = x;
                                                    }
                                                    r = Math.round(
                                                      (r + m) * 255
                                                    );
                                                    g = Math.round(
                                                      (g + m) * 255
                                                    );
                                                    b = Math.round(
                                                      (b + m) * 255
                                                    );
                                                    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                                                  }
                                                }
                                                return "#6b7280";
                                              })()}
                                              onInput={async (e) => {
                                                if (!jogador.ficha?.id) return;
                                                const hex = (
                                                  e.target as HTMLInputElement
                                                ).value;
                                                const r = parseInt(
                                                  hex.slice(1, 3),
                                                  16
                                                );
                                                const g = parseInt(
                                                  hex.slice(3, 5),
                                                  16
                                                );
                                                const b = parseInt(
                                                  hex.slice(5, 7),
                                                  16
                                                );
                                                const newColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
                                                setFichaColors({
                                                  ...fichaColors,
                                                  [jogador.ficha.id]: newColor,
                                                });
                                                // Salva no banco de dados
                                                try {
                                                  await supabase
                                                    .from("ficha")
                                                    .update({
                                                      badge_color: newColor,
                                                    })
                                                    .eq("id", jogador.ficha.id);
                                                } catch (error) {
                                                  console.error(
                                                    "Erro ao salvar cor:",
                                                    error
                                                  );
                                                }
                                              }}
                                              onChange={async (e) => {
                                                if (!jogador.ficha?.id) return;
                                                const hex = e.target.value;
                                                const r = parseInt(
                                                  hex.slice(1, 3),
                                                  16
                                                );
                                                const g = parseInt(
                                                  hex.slice(3, 5),
                                                  16
                                                );
                                                const b = parseInt(
                                                  hex.slice(5, 7),
                                                  16
                                                );
                                                const newColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
                                                setFichaColors({
                                                  ...fichaColors,
                                                  [jogador.ficha.id]: newColor,
                                                });
                                                // Salva no banco de dados
                                                try {
                                                  await supabase
                                                    .from("ficha")
                                                    .update({
                                                      badge_color: newColor,
                                                    })
                                                    .eq("id", jogador.ficha.id);
                                                } catch (error) {
                                                  console.error(
                                                    "Erro ao salvar cor:",
                                                    error
                                                  );
                                                }
                                              }}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const colorInput =
                                                  document.getElementById(
                                                    `color-picker-${jogador.ficha?.id}`
                                                  ) as HTMLInputElement;
                                                if (colorInput) {
                                                  colorInput.click();
                                                }
                                              }}
                                              className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer flex items-center"
                                              title="Alterar cor"
                                            >
                                              <Paintbrush className="w-5 h-5 text-gray-600" />
                                            </button>
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic mb-2">
                                        Nenhuma ficha selecionada
                                      </p>
                                    )}

                                    {/* Nome completo (se não tiver apelido) */}
                                    {jogador.nome && !jogador.apelido && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <p className="text-xs text-gray-500 truncate">
                                          {jogador.nome}
                                        </p>
                                      </div>
                                    )}
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
                              <div className="flex items-center gap-2">
                                <Badge
                                  style={{
                                    backgroundColor: getPersonagemColor(
                                      ficha.personagem,
                                      ficha.id,
                                      fichaColors
                                    ),
                                    color: getPersonagemTextColor(
                                      ficha.personagem,
                                      ficha.id,
                                      fichaColors
                                    ),
                                  }}
                                  className="text-base font-semibold"
                                >
                                  {ficha.personagem || "Sem nome"}
                                </Badge>
                              </div>
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
