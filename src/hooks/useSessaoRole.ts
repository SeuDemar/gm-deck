"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export type PapelSessao = "mestre" | "jogador" | null;

export interface SessaoRole {
  papel: PapelSessao;
  loading: boolean;
  isMestre: boolean;
  isJogador: boolean;
}

// Hook para verificar o papel do usuário em uma sessão
export function useSessaoRole(sessaoId: string | undefined): SessaoRole {
  const [papel, setPapel] = useState<PapelSessao>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verificarPapel() {
      if (!sessaoId) {
        setPapel(null);
        setLoading(false);
        return;
      }

      try {
        // Busca o usuário atual
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setPapel(null);
          setLoading(false);
          return;
        }

        // Verifica se é mestre da sessão
        const { data: sessao, error: sessaoError } = await supabase
          .from("sessao")
          .select("mestre_id")
          .eq("id", sessaoId)
          .single();

        if (!sessaoError && sessao && sessao.mestre_id === user.id) {
          setPapel("mestre");
          setLoading(false);
          return;
        }

        // Verifica se é jogador da sessão (independente do status)
        // O status será atualizado quando o jogador entrar na sessão
        const { data: sessaoJogador, error: jogadorError } = await supabase
          .from("sessao_jogador")
          .select("status")
          .eq("sessao_id", sessaoId)
          .eq("usuario_id", user.id)
          .single();

        if (!jogadorError && sessaoJogador) {
          setPapel("jogador");
          setLoading(false);
          return;
        }

        // Se não é nem mestre nem jogador
        setPapel(null);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao verificar papel na sessão:", error);
        setPapel(null);
        setLoading(false);
      }
    }

    verificarPapel();
  }, [sessaoId]);

  return {
    papel,
    loading,
    isMestre: papel === "mestre",
    isJogador: papel === "jogador",
  };
}

