"use client";

import { createClient } from "@supabase/supabase-js";

// ⚙️ Instancia o Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🪝 Hook principal
export function useSupabasePdf() {
  type FichaRpg = Record<string, string>;

  // --- Salvar ficha no Supabase
  async function savePdfData(fields: FichaRpg) {
    const { data, error } = await supabase.from("ficha").insert([
      {
        attributes: fields,
      },
    ]);

    if (error) {
      console.error("Erro ao salvar ficha:", error);
      throw error;
    }

    return data;
  }

  // --- Buscar ficha
  async function getPdfData(sheetId: string) {
    const { data, error } = await supabase
      .from("ficha")
      .select("attributes")
      .eq("id", sheetId)
      .single();

    if (error) {
      console.error("Erro ao buscar ficha:", error);
      throw error;
    }

    return data?.attributes as FichaRpg | null;
  }

  return { savePdfData, getPdfData };
}
