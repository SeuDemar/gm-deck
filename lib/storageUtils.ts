// lib/storageUtils.ts
import { supabase } from "./supabaseClient";

const BUCKET_NAME = "fotos-perfil";

/**
 * Obtém a URL pública de uma foto de perfil do bucket
 * Sempre busca a foto mais recente diretamente do bucket
 * @param userId - ID do usuário
 * @param _fotoUrl - URL antiga (ignorada, mantida para compatibilidade)
 * @returns URL pública da foto ou null se não existir
 */
export async function getFotoPerfilUrl(userId: string | undefined, _fotoUrl?: string | null): Promise<string | null> {
  if (!userId) return null;

  try {
    // Tenta listar arquivos na pasta do usuário
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 100,
      });

    if (error) {
      // Se não houver pasta do usuário, retorna null (sem erro)
      const errorMessage = error.message?.toLowerCase() || "";
      if (errorMessage.includes("not found") || 
          errorMessage.includes("does not exist") ||
          errorMessage.includes("not exist")) {
        console.log(`Pasta do usuário ${userId} não encontrada no bucket`);
        return null;
      }
      console.warn("Erro ao listar fotos do bucket:", error);
      return null;
    }

    if (data && data.length > 0) {
      // Ordena por data de criação (mais recente primeiro)
      const fotos = data
        .filter(file => file.name.startsWith("foto-perfil"))
        .sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA; // Mais recente primeiro
        });

      if (fotos.length > 0) {
        const fotoPerfil = fotos[0]; // Pega a mais recente
        const filePath = `${userId}/${fotoPerfil.name}`;
        
        // Tenta primeiro com signed URL (mais confiável)
        try {
          const { data: signedData, error: signedError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, 3600); // 1 hora
          
          if (!signedError && signedData) {
            console.log(`Foto encontrada (signed URL): ${filePath}`);
            return signedData.signedUrl;
          }
        } catch (signedErr) {
          console.warn("Erro ao gerar signed URL, tentando URL pública:", signedErr);
        }
        
        // Fallback para URL pública
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        
        console.log(`Foto encontrada (public URL): ${filePath} -> ${urlData.publicUrl}`);
        return urlData.publicUrl;
      } else {
        console.log(`Nenhuma foto com prefixo "foto-perfil" encontrada para o usuário ${userId}`);
      }
    } else {
      console.log(`Pasta do usuário ${userId} está vazia`);
    }
  } catch (error) {
    console.error("Erro ao buscar foto do bucket:", error);
  }

  return null;
}

/**
 * Obtém a URL pública diretamente do caminho do arquivo
 * @param filePath - Caminho do arquivo no bucket (ex: "userId/foto-perfil-123.jpg")
 * @returns URL pública da foto
 */
export function getPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Obtém uma URL assinada (signed URL) para acessar a foto
 * Útil quando o bucket não é público ou há problemas com CORS
 * @param userId - ID do usuário
 * @param publicUrl - URL pública da foto (para extrair o caminho)
 * @returns URL assinada ou null se não conseguir gerar
 */
export async function getSignedUrl(userId: string, publicUrl: string): Promise<string | null> {
  try {
    // Extrai o caminho do arquivo da URL pública
    const urlParts = publicUrl.split("/");
    const bucketIndex = urlParts.findIndex(part => part === BUCKET_NAME);
    if (bucketIndex === -1) return null;
    
    const filePath = urlParts.slice(bucketIndex + 1).join("/");
    
    // Gera uma URL assinada válida por 1 hora
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hora
    
    if (error) {
      console.error("Erro ao gerar signed URL:", error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error("Erro ao criar signed URL:", error);
    return null;
  }
}

