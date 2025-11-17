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

export function useSupabaseSessao() {
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
      throw error;
    }

    return data;
  }

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
      throw error;
    }

    return data || [];
  }

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
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((item: { sessao: Sessao }) => item.sessao);
  }

  async function getSessao(sessaoId: string): Promise<Sessao | null> {
    const { data, error } = await supabase
      .from("sessao")
      .select("*")
      .eq("id", sessaoId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

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
      throw error;
    }

    const jogadoresComPerfil = await Promise.all(
      (data || []).map(async (jogador) => {
        try {
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

  async function getAllUsuariosComStatusSessao(sessaoId: string) {
    const { data: jogadoresSessao, error: sessaoError } = await supabase
      .from("sessao_jogador")
      .select(`
        *,
        ficha:ficha_id (id, personagem)
      `)
      .eq("sessao_id", sessaoId);

    if (sessaoError) {
      throw sessaoError;
    }

    const usuariosComStatus = await Promise.all(
      (jogadoresSessao || []).map(async (jogador) => {
        try {
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

  async function entrarSessao(sessaoId: string, fichaId?: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    const { data: existing, error: checkError } = await supabase
      .from("sessao_jogador")
      .select("*")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (existing && !checkError) {
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
        throw error;
      }

      if (fichaId) {
        await atualizarFichaIdsSessao(sessaoId);
      }

      return data;
    } else {
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
        throw error;
      }

      if (fichaId) {
        await atualizarFichaIdsSessao(sessaoId);
      }

      return data;
    }
  }
  async function atualizarFichaIdsSessao(sessaoId: string) {
    const { data: sessaoAtual, error: fetchError } = await supabase
      .from("sessao")
      .select("ficha_ids")
      .eq("id", sessaoId)
      .single();

    if (fetchError) {
      // Continua mesmo assim
    }

    const fichaIdsExistentes = sessaoAtual?.ficha_ids || [];

    await new Promise((resolve) => setTimeout(resolve, 300));

    const { data: jogadores, error } = await supabase
      .from("sessao_jogador")
      .select("ficha_id")
      .eq("sessao_id", sessaoId)
      .eq("status", "aceito")
      .not("ficha_id", "is", null);

    if (error) {
      return;
    }

    const fichaIdsDosJogadores = (jogadores || [])
      .map((j: { ficha_id: string | null }) => j.ficha_id)
      .filter((id: string | null) => id !== null) as string[];

    const todasFichas = [...new Set([...fichaIdsExistentes, ...fichaIdsDosJogadores])];

    const fichaIdsUnicos = [...new Set(todasFichas)];

    const { error: updateError } = await supabase
      .from("sessao")
      .update({ ficha_ids: fichaIdsUnicos })
      .eq("id", sessaoId);

    if (updateError) {
      throw updateError;
    }
  }

  async function removerJogador(sessaoJogadorId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }
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
      throw error;
    }

    await atualizarFichaIdsSessao(sessaoId);
  }
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

    const { error } = await supabase
      .from("sessao")
      .delete()
      .eq("id", sessaoId);

    if (error) {
      throw error;
    }
  }

  async function cortarVinculosSessao(sessaoId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }
    const { data: sessaoJogador, error: fetchError } = await supabase
      .from("sessao_jogador")
      .select("id")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (fetchError || !sessaoJogador) {
      throw new Error("Você não está vinculado a esta sessão.");
    }

    const { error } = await supabase
      .from("sessao_jogador")
      .delete()
      .eq("id", sessaoJogador.id);

    if (error) {
      throw error;
    }

    await atualizarFichaIdsSessao(sessaoId);
  }
  async function selecionarFichaSessao(sessaoId: string, fichaId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Verifica se o usuário é um jogador da sessão e busca a ficha anterior
    const { data: sessaoJogador, error: checkError } = await supabase
      .from("sessao_jogador")
      .select("id, status, ficha_id")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (checkError || !sessaoJogador) {
      throw new Error("Você não está nesta sessão como jogador.");
    }

    if (sessaoJogador.status !== "aceito") {
      throw new Error("Você precisa ser aceito na sessão antes de selecionar uma ficha.");
    }

    const { data: ficha, error: fichaError } = await supabase
      .from("ficha")
      .select("id, usuarioId")
      .eq("id", fichaId)
      .single();

    if (fichaError || !ficha || ficha.usuarioId !== user.id) {
      throw new Error("Esta ficha não pertence a você.");
    }

    const { data: sessaoAtual, error: fetchError } = await supabase
      .from("sessao")
      .select("ficha_ids")
      .eq("id", sessaoId)
      .single();

    if (fetchError) {
      throw new Error("Erro ao buscar estado da sessão");
    }

    const fichaIdsExistentesNoArray = (sessaoAtual?.ficha_ids || []) as string[];
    const fichaAnteriorId = sessaoJogador.ficha_id;

    let fichaIdsAtualizados: string[];
    if (fichaAnteriorId && fichaIdsExistentesNoArray.includes(fichaAnteriorId)) {
      fichaIdsAtualizados = fichaIdsExistentesNoArray.map((id: string) => 
        id === fichaAnteriorId ? fichaId : id
      );
    } else {
      fichaIdsAtualizados = [...fichaIdsExistentesNoArray.filter((id: string) => id !== fichaId), fichaId];
    }

    fichaIdsAtualizados = [...new Set(fichaIdsAtualizados)];

    const { error: updateError } = await supabase
      .from("sessao_jogador")
      .update({ ficha_id: fichaId })
      .eq("id", sessaoJogador.id);

    if (updateError) {
      throw updateError;
    }

    const { error: updateSessaoError } = await supabase
      .from("sessao")
      .update({ ficha_ids: fichaIdsAtualizados })
      .eq("id", sessaoId);

    if (updateSessaoError) {
      throw updateSessaoError;
    }
  }

  async function atualizarStatusSessao(sessaoId: string, status: SessaoStatus) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }
    const { data: sessao, error: checkError } = await supabase
      .from("sessao")
      .select("mestre_id")
      .eq("id", sessaoId)
      .single();

    if (checkError || !sessao || sessao.mestre_id !== user.id) {
      throw new Error("Você não tem permissão para atualizar o status desta sessão. Apenas o mestre pode atualizar.");
    }

    const { error: updateError } = await supabase
      .from("sessao")
      .update({ status })
      .eq("id", sessaoId);

    if (updateError) {
      throw updateError;
    }
  }

  async function atualizarStatusJogadorSessao(sessaoId: string, status: JogadorStatus) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }
    const { data: sessaoJogador, error: checkError } = await supabase
      .from("sessao_jogador")
      .select("id")
      .eq("sessao_id", sessaoId)
      .eq("usuario_id", user.id)
      .single();

    if (checkError || !sessaoJogador) {
      return;
    }

    const { error: updateError } = await supabase
      .from("sessao_jogador")
      .update({ status })
      .eq("id", sessaoJogador.id);

    if (updateError) {
      throw updateError;
    }
  }

  async function atualizarSessao(sessaoId: string, nome: string, descricao?: string | null) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }
    const { data: sessao, error: checkError } = await supabase
      .from("sessao")
      .select("mestre_id")
      .eq("id", sessaoId)
      .single();

    if (checkError || !sessao || sessao.mestre_id !== user.id) {
      throw new Error("Você não tem permissão para atualizar esta sessão. Apenas o mestre pode atualizar.");
    }

    if (!nome || !nome.trim()) {
      throw new Error("O nome da sessão é obrigatório.");
    }

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

