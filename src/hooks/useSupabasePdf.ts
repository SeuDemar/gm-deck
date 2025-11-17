"use client";

import { supabase } from "../../lib/supabaseClient";

// 🪝 Hook principal
export function useSupabasePdf() {
  type FichaRpg = Record<string, string>;

  // --- Salvar ficha no Supabase
  // Salva cada campo como uma coluna separada no banco de dados
  // Os campos de sistema (id UUID, created_at, updated_at) são gerenciados automaticamente pelo Supabase
  // Se fichaId for fornecido, atualiza a ficha existente; caso contrário, cria uma nova
  async function savePdfData(fields: FichaRpg, fichaId?: string) {
    // Obtém o usuário atual logado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Cria um objeto onde cada chave do fields vira uma coluna no banco
    // O nome do campo (chave) será o nome da coluna
    const dataToSave: Record<string, string | null> = {};
    
    // Converte cada campo para sua respectiva coluna
    Object.entries(fields).forEach(([fieldName, fieldValue]) => {
      // Normaliza o nome da coluna para corresponder ao banco de dados
      // Remove espaços em branco e converte para minúsculas
      // Isso garante que nomes como "Desc17" virem "desc17"
      let columnName = fieldName.trim().toLowerCase();
      
      // Trata caracteres especiais que podem causar problemas no SQL
      // Substitui "/" por "_" (ex: "pe/rodada" -> "pe_rodada")
      // Se o banco usar "/" diretamente, remova esta linha
      columnName = columnName.replace(/\//g, '_');
      
      // Converte valores vazios para null
      const value = fieldValue === "" || fieldValue === null || fieldValue === undefined 
        ? null 
        : fieldValue;
      
      dataToSave[columnName] = value;
    });

    // Adiciona o ID do usuário atual (só ao criar nova ficha)
    if (!fichaId) {
      dataToSave.usuarioId = user.id;
    }

    // Se fichaId foi fornecido, atualiza a ficha existente
    // Caso contrário, cria uma nova ficha
    if (fichaId) {
      const { data, error } = await supabase
        .from("ficha")
        .update(dataToSave)
        .eq("id", fichaId)
        .eq("usuarioId", user.id); // Garante que só atualiza fichas do próprio usuário
      
      if (error) {
        throw error;
      }
      
      return data;
    } else {
      // Insere os dados - o Supabase gerencia automaticamente:
      // - id (UUID): gerado automaticamente
      // - created_at: preenchido automaticamente
      // - updated_at: preenchido automaticamente
      const { data, error } = await supabase.from("ficha").insert([dataToSave]);

      if (error) {
        throw error;
      }

      return data;
    }
  }

  // --- Buscar ficha
  async function getPdfData(sheetId: string) {
    // Busca todas as colunas da ficha (exceto id, created_at, etc.)
    // Como não sabemos quais colunas existem, vamos buscar todas e filtrar
    const { data, error } = await supabase
      .from("ficha")
      .select("*")
      .eq("id", sheetId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) return null;

    // Filtra colunas de sistema e retorna apenas os campos da ficha
    // Exclui colunas padrão do Supabase e outras colunas de sistema
    const systemColumns = ['id', 'created_at', 'updated_at', 'player_id', 'usuarioId'];
    const fichaData: FichaRpg = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (!systemColumns.includes(key) && value !== null) {
        fichaData[key] = String(value);
      }
    });

    return fichaData;
  }

  // --- Verificar se a ficha pertence ao usuário atual
  async function isFichaOwner(fichaId: string): Promise<boolean> {
    // Obtém o usuário atual logado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    // Busca o usuarioId da ficha
    const { data, error } = await supabase
      .from("ficha")
      .select("usuarioId")
      .eq("id", fichaId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.usuarioId === user.id;
  }

  // --- Buscar fichas do usuário logado
  // Retorna todas as fichas do usuário atual, ordenadas por "personagem" em ordem ascendente
  async function getUserFichas() {
    // Obtém o usuário atual logado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Busca as fichas do usuário atual, ordenadas por "personagem" (ascendente)
    // Seleciona apenas id, personagem e created_at para a listagem
    const { data, error } = await supabase
      .from("ficha")
      .select("id, personagem, created_at, updated_at")
      .eq("usuarioId", user.id)
      .order("personagem", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  // --- Excluir ficha
  async function deleteFicha(fichaId: string) {
    // Obtém o usuário atual logado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
    }

    // Exclui a ficha apenas se pertencer ao usuário atual
    const { error } = await supabase
      .from("ficha")
      .delete()
      .eq("id", fichaId)
      .eq("usuarioId", user.id);

    if (error) {
      throw error;
    }
  }

  return { savePdfData, getPdfData, getUserFichas, deleteFicha, isFichaOwner };
}
