"use client";

import { supabase } from "../../lib/supabaseClient";

export type SessaoStatus = "ativa" | "encerrada" | "pausada";
export type JogadorStatus = "pendente" | "aceito" | "recusado";

export interface Sessao {
  id: string;
  nome: string;
  descricao: string | null;
  mestre_id: string;
  status: SessaoStatus;
  ficha_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface SessaoJogador {
  id: string;
  sessao_id: string;
  usuario_id: string;
  ficha_id: string | null;
  status: JogadorStatus;
  created_at: string;
  updated_at: string;
}

// 🪝 Hook principal para gerenciar sessões
export function useSupabaseSessao() {
  // --- Criar sessão
  async function criarSessao(nome: string, descricao?: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    const { data, error } = await supabase
      .from("sessao")
      .insert([{
        nome,
        descricao: descricao || null,
        mestre_id: user.id,
        status: "ativa",
        ficha_ids: []
      }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar sessão:", error);
      throw error;
    }

    return data;
  }

  // --- Buscar sessões do mestre
  async function getSessoesMestre() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    const { data, error } = await supabase
      .from("sessao")
      .select("*")
      .eq("mestre_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar sessões do mestre:", error);
      throw error;
    }

    return data || [];
  }

  // --- Buscar sessões onde o usuário é jogador
  // Retorna todas as sessões onde o usuário está como jogador, independente do status
  async function getSessoesJogador() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    const { data, error } = await supabase
      .from("sessao_jogador")
      .select(`
        *,
        sessao:sessao_id (*)
      `)
      .eq("usuario_id", user.id)
      // Remove o filtro de status para buscar todas as sessões (aceito, pendente, recusado)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar sessões do jogador:", error);
      throw error;
    }

    return (data || []).map((item: { sessao: Sessao }) => item.sessao);
  }

  // --- Buscar sessão específica
  async function getSessao(sessaoId: string): Promise<Sessao | null> {
    const { data, error } = await supabase
      .from("sessao")
      .select("*")
      .eq("id", sessaoId)
      .single();

    if (error) {
      console.error("Erro ao buscar sessão:", error);
      return null;
    }

    return data;
  }

  // --- Buscar jogadores da sessão
  async function getJogadoresSessao(sessaoId: string) {
    const { data, error } = await supabase
      .from("sessao_jogador")
      .select(`
        *,
        ficha:ficha_id (id, personagem)
      `)
      .eq("sessao_id", sessaoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar jogadores da sessão:", error);
      throw error;
    }

    // Busca informações do perfil de cada jogador
    const jogadoresComPerfil = await Promise.all(
      (data || []).map(async (jogador) => {
        try {
          // Busca na tabela perfil
          const { data: perfilData } = await supabase
            .from("perfil")
            .select("nome, apelido")
            .eq("id", jogador.usuario_id)
            .single();

          return {
            ...jogador,
            nome: perfilData?.nome || null,
            apelido: perfilData?.apelido || null,
          };
        } catch (error) {
          console.error(`Erro ao buscar perfil do jogador ${jogador.usuario_id}:`, error);
          return {
            ...jogador,
            nome: null,
            apelido: null,
          };
        }
      })
    );

    return jogadoresComPerfil;
  }

  // --- Buscar todos os usuários com status na sessão
  // Busca apenas os usuários que estão relacionados à sessão (na tabela sessao_jogador)
  async function getAllUsuariosComStatusSessao(sessaoId: string) {
    // Busca jogadores da sessão
    const { data: jogadoresSessao, error: sessaoError } = await supabase
      .from("sessao_jogador")
      .select(`
        *,
        ficha:ficha_id (id, personagem)
      `)
      .eq("sessao_id", sessaoId);

    if (sessaoError) {
      console.error("Erro ao buscar jogadores da sessão:", sessaoError);
      throw sessaoError;
    }

    // Busca informações do perfil de cada jogador
    const usuariosComStatus = await Promise.all(
      (jogadoresSessao || []).map(async (jogador) => {
        try {
          // Busca na tabela perfil
          const { data: perfilData } = await supabase
            .from("perfil")
            .select("nome, apelido")
            .eq("id", jogador.usuario_id)
            .single();

          return {
            usuario_id: jogador.usuario_id,
            nome: perfilData?.nome || null,
            apelido: perfilData?.apelido || null,
            status: jogador.status,
            ficha_id: jogador.ficha_id || null,
            ficha: jogador.ficha || null,
            sessao_jogador_id: jogador.id,
            created_at: jogador.created_at,
            updated_at: jogador.updated_at,
          };
        } catch (error) {
          console.error(`Erro ao buscar perfil do jogador ${jogador.usuario_id}:`, error);
          return {
            usuario_id: jogador.usuario_id,
            nome: null,
            apelido: null,
            status: jogador.status,
            ficha_id: jogador.ficha_id || null,
            ficha: jogador.ficha || null,
            sessao_jogador_id: jogador.id,
            created_at: jogador.created_at,
            updated_at: jogador.updated_at,
          };
        }
      })
    );

    return usuariosComStatus;
  }

  // --- Entrar em sessão (jogador entra usando o ID da sessão)
  async function entrarSessao(sessaoId: string, fichaId?: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Verifica se já existe um registro na sessão_jogador
    const { data: existing, error: checkError } = await supabase
      .from("sessao_jogador")
      .select("*")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (existing && !checkError) {
      // Se já existe, atualiza o status para aceito e ficha_id se fornecida
      const { data, error } = await supabase
        .from("sessao_jogador")
        .update({
          status: "aceito",
          ficha_id: fichaId || existing.ficha_id
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar entrada na sessão:", error);
        throw error;
      }

      // Atualiza o array ficha_ids na sessão se fichaId foi fornecido
      if (fichaId) {
        await atualizarFichaIdsSessao(sessaoId);
      }

      return data;
    } else {
      // Se não existe, cria um novo registro
      const { data, error } = await supabase
        .from("sessao_jogador")
        .insert([{
          sessao_id: sessaoId,
          usuario_id: user.id,
          ficha_id: fichaId || null,
          status: "aceito"
        }])
        .select()
        .single();

      if (error) {
        console.error("Erro ao entrar na sessão:", error);
        throw error;
      }

      // Atualiza o array ficha_ids na sessão se fichaId foi fornecido
      if (fichaId) {
        await atualizarFichaIdsSessao(sessaoId);
      }

      return data;
    }
  }

  // --- Atualizar array ficha_ids na sessão
  async function atualizarFichaIdsSessao(sessaoId: string) {
    // Busca todas as fichas dos jogadores aceitos na sessão
    const { data: jogadores, error } = await supabase
      .from("sessao_jogador")
      .select("ficha_id")
      .eq("sessao_id", sessaoId)
      .eq("status", "aceito")
      .not("ficha_id", "is", null);

    if (error) {
      console.error("Erro ao buscar fichas da sessão:", error);
      return;
    }

    // Extrai os IDs das fichas (remove nulls)
    const fichaIds = (jogadores || [])
      .map((j: { ficha_id: string | null }) => j.ficha_id)
      .filter((id: string | null) => id !== null) as string[];

    // Remove duplicatas
    const fichaIdsUnicos = [...new Set(fichaIds)];

    // Atualiza o array na sessão
    const { error: updateError } = await supabase
      .from("sessao")
      .update({ ficha_ids: fichaIdsUnicos })
      .eq("id", sessaoId);

    if (updateError) {
      console.error("Erro ao atualizar ficha_ids da sessão:", updateError);
      throw updateError;
    }
  }

  // --- Remover jogador da sessão
  async function removerJogador(sessaoJogadorId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Verifica se é o mestre ou o próprio jogador
    const { data: sessaoJogador, error: fetchError } = await supabase
      .from("sessao_jogador")
      .select(`
        *,
        sessao:sessao_id (mestre_id)
      `)
      .eq("id", sessaoJogadorId)
      .single();

    if (fetchError || !sessaoJogador) {
      throw new Error("Registro de jogador não encontrado.");
    }

    const sessao = sessaoJogador.sessao as { mestre_id: string };
    const podeRemover = sessao.mestre_id === user.id || sessaoJogador.usuario_id === user.id;

    if (!podeRemover) {
      throw new Error("Você não tem permissão para remover este jogador.");
    }

    const sessaoId = sessaoJogador.sessao_id;

    const { error } = await supabase
      .from("sessao_jogador")
      .delete()
      .eq("id", sessaoJogadorId);

    if (error) {
      console.error("Erro ao remover jogador:", error);
      throw error;
    }

    // Atualiza o array ficha_ids na sessão
    await atualizarFichaIdsSessao(sessaoId);
  }

  // --- Excluir sessão (apenas mestre)
  async function excluirSessao(sessaoId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Verifica se o usuário é o mestre da sessão
    const { data: sessao, error: checkError } = await supabase
      .from("sessao")
      .select("mestre_id")
      .eq("id", sessaoId)
      .single();

    if (checkError || !sessao || sessao.mestre_id !== user.id) {
      throw new Error("Você não tem permissão para excluir esta sessão. Apenas o mestre pode excluir.");
    }

    // Exclui a sessão (as relações em sessao_jogador serão excluídas automaticamente pelo CASCADE)
    const { error } = await supabase
      .from("sessao")
      .delete()
      .eq("id", sessaoId);

    if (error) {
      console.error("Erro ao excluir sessão:", error);
      throw error;
    }
  }

  // --- Cortar vínculos com a sessão (jogador remove a si mesmo)
  async function cortarVinculosSessao(sessaoId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Busca o registro do jogador na sessão
    const { data: sessaoJogador, error: fetchError } = await supabase
      .from("sessao_jogador")
      .select("id")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (fetchError || !sessaoJogador) {
      throw new Error("Você não está vinculado a esta sessão.");
    }

    // Remove o jogador da sessão
    const { error } = await supabase
      .from("sessao_jogador")
      .delete()
      .eq("id", sessaoJogador.id);

    if (error) {
      console.error("Erro ao cortar vínculos com a sessão:", error);
      throw error;
    }

    // Atualiza o array ficha_ids na sessão
    await atualizarFichaIdsSessao(sessaoId);
  }

  // --- Selecionar ficha para o jogador na sessão
  async function selecionarFichaSessao(sessaoId: string, fichaId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Verifica se o usuário é um jogador da sessão
    const { data: sessaoJogador, error: checkError } = await supabase
      .from("sessao_jogador")
      .select("id, status")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (checkError || !sessaoJogador) {
      throw new Error("Você não está nesta sessão como jogador.");
    }

    // Verifica se o status é aceito (jogador precisa estar aceito)
    if (sessaoJogador.status !== "aceito") {
      throw new Error("Você precisa ser aceito na sessão antes de selecionar uma ficha.");
    }

    // Verifica se a ficha pertence ao usuário
    const { data: ficha, error: fichaError } = await supabase
      .from("ficha")
      .select("id, usuarioId")
      .eq("id", fichaId)
      .single();

    if (fichaError || !ficha || ficha.usuarioId !== user.id) {
      throw new Error("Esta ficha não pertence a você.");
    }

    // Atualiza a ficha_id do jogador na sessão
    const { error: updateError } = await supabase
      .from("sessao_jogador")
      .update({ ficha_id: fichaId })
      .eq("id", sessaoJogador.id);

    if (updateError) {
      console.error("Erro ao selecionar ficha na sessão:", updateError);
      throw updateError;
    }

    // Atualiza o array ficha_ids na sessão
    await atualizarFichaIdsSessao(sessaoId);
  }

  // --- Atualizar status da sessão
  async function atualizarStatusSessao(sessaoId: string, status: SessaoStatus) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Verifica se o usuário é o mestre da sessão
    const { data: sessao, error: checkError } = await supabase
      .from("sessao")
      .select("mestre_id")
      .eq("id", sessaoId)
      .single();

    if (checkError || !sessao || sessao.mestre_id !== user.id) {
      throw new Error("Você não tem permissão para atualizar o status desta sessão. Apenas o mestre pode atualizar.");
    }

    // Atualiza o status da sessão
    const { error: updateError } = await supabase
      .from("sessao")
      .update({ status })
      .eq("id", sessaoId);

    if (updateError) {
      console.error("Erro ao atualizar status da sessão:", updateError);
      throw updateError;
    }
  }

  // --- Atualizar status do jogador na sessão (para marcar como inativo quando sair)
  async function atualizarStatusJogadorSessao(sessaoId: string, status: JogadorStatus) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Busca o registro do jogador na sessão
    const { data: sessaoJogador, error: checkError } = await supabase
      .from("sessao_jogador")
      .select("id")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (checkError || !sessaoJogador) {
      // Se não existe registro, não precisa atualizar
      return;
    }

    // Atualiza o status do jogador
    const { error: updateError } = await supabase
      .from("sessao_jogador")
      .update({ status })
      .eq("id", sessaoJogador.id);

    if (updateError) {
      console.error("Erro ao atualizar status do jogador na sessão:", updateError);
      throw updateError;
    }
  }

  // --- Atualizar nome e descrição da sessão
  async function atualizarSessao(sessaoId: string, nome: string, descricao?: string | null) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Verifica se o usuário é o mestre da sessão
    const { data: sessao, error: checkError } = await supabase
      .from("sessao")
      .select("mestre_id")
      .eq("id", sessaoId)
      .single();

    if (checkError || !sessao || sessao.mestre_id !== user.id) {
      throw new Error("Você não tem permissão para atualizar esta sessão. Apenas o mestre pode atualizar.");
    }

    // Validação
    if (!nome || !nome.trim()) {
      throw new Error("O nome da sessão é obrigatório.");
    }

    // Atualiza nome e descrição da sessão
    const { data, error: updateError } = await supabase
      .from("sessao")
      .update({ 
        nome: nome.trim(),
        descricao: descricao?.trim() || null
      })
      .eq("id", sessaoId)
      .select()
      .single();

    if (updateError) {
      console.error("Erro ao atualizar sessão:", updateError);
      throw updateError;
    }

    return data;
  }

  return {
    criarSessao,
    getSessoesMestre,
    getSessoesJogador,
    getSessao,
    getJogadoresSessao,
    getAllUsuariosComStatusSessao,
    entrarSessao,
    removerJogador,
    atualizarFichaIdsSessao,
    excluirSessao,
    cortarVinculosSessao,
    selecionarFichaSessao,
    atualizarStatusSessao,
    atualizarStatusJogadorSessao,
    atualizarSessao,
  };
}

