"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { Button, Input } from "@/components/ui";
import { supabase } from "../../../lib/supabaseClient";
import { getFotoPerfilUrl, getPublicUrl } from "../../../lib/storageUtils";
import type { User } from "@supabase/supabase-js";

interface EditarPerfilModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate?: () => void;
}

export default function EditarPerfilModal({
  isOpen,
  onClose,
  user,
  onUpdate,
}: EditarPerfilModalProps) {
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState<string | null>(null);
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFotoPerfil() {
      if (user && isOpen) {
        setNome(user.user_metadata?.full_name || "");
        setApelido(user.user_metadata?.apelido || "");
        setSenha("");
        setConfirmarSenha("");
        setFotoPerfil(null);
        setFotoPerfilPreview(null);
        
        // Busca a URL da foto de perfil do bucket
        try {
          const fotoUrl = await getFotoPerfilUrl(user.id, user.user_metadata?.foto_perfil_url);
          setFotoPerfilUrl(fotoUrl);
        } catch (error) {
          console.error("Erro ao carregar foto de perfil:", error);
          setFotoPerfilUrl(null);
        }
      }
    }

    loadFotoPerfil();
  }, [user, isOpen]);

  // Função para lidar com seleção de arquivo
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação: apenas imagens
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem!");
      return;
    }

    // Validação: tamanho máximo 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB!");
      return;
    }

    setFotoPerfil(file);
    
    // Cria preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoPerfilPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Função para fazer upload da foto
  async function uploadFotoPerfil(): Promise<string | null> {
    if (!fotoPerfil || !user) return null;

    setUploadingFoto(true);
    try {
      const fileExt = fotoPerfil.name.split(".").pop();
      // IMPORTANTE: Substitua 'fotos-perfil' pelo nome real do seu bucket
      const bucketName = "fotos-perfil";
      const filePath = `${user.id}/foto-perfil-${Date.now()}.${fileExt}`;

      // Remove foto anterior se existir
      if (fotoPerfilUrl) {
        try {
          // Extrai o caminho do arquivo da URL
          const urlParts = fotoPerfilUrl.split("/");
          const oldFilePath = urlParts.slice(urlParts.indexOf(bucketName) + 1).join("/");
          await supabase.storage.from(bucketName).remove([oldFilePath]);
        } catch (removeError) {
          console.warn("Erro ao remover foto anterior (pode não existir):", removeError);
        }
      }

      // Faz upload da nova foto
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fotoPerfil, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtém URL pública da foto
      return getPublicUrl(filePath);
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      throw error;
    } finally {
      setUploadingFoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!user) return;

    // Validação de senha
    if (senha || confirmarSenha) {
      if (senha !== confirmarSenha) {
        alert("As senhas não conferem!");
        return;
      }
      if (senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres!");
        return;
      }
    }

    setLoading(true);
    try {
      // Faz upload da foto se uma nova foi selecionada
      let novaFotoUrl = fotoPerfilUrl;
      if (fotoPerfil) {
        novaFotoUrl = await uploadFotoPerfil();
        if (!novaFotoUrl) {
          throw new Error("Erro ao fazer upload da foto de perfil");
        }
      }

      // Atualiza os metadados do usuário
      const updateData: { data?: Record<string, string | null>; password?: string } = {
        data: {
          full_name: nome.trim() || null,
          apelido: apelido.trim() || null,
          foto_perfil_url: novaFotoUrl,
        },
      };

      // Se a senha foi preenchida, atualiza também
      if (senha) {
        updateData.password = senha;
      }

      const { error } = await supabase.auth.updateUser(updateData);

      if (error) {
        throw error;
      }

      // Atualiza também na tabela perfil se existir
      try {
        const { error: perfilError } = await supabase
          .from("perfil")
          .upsert({
            id: user.id,
            nome: nome.trim() || null,
            apelido: apelido.trim() || null,
            foto_perfil_url: novaFotoUrl,
          });

        if (perfilError) {
          console.warn("Erro ao atualizar perfil na tabela:", perfilError);
        }
      } catch (perfilError) {
        console.warn("Tabela perfil não existe ou erro ao atualizar:", perfilError);
      }

      alert("Perfil atualizado com sucesso!");
      setSenha("");
      setConfirmarSenha("");
      setFotoPerfil(null);
      setFotoPerfilPreview(null);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao atualizar perfil: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Editar Perfil</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <Input
            label="Nome"
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome completo"
            required
            disabled={loading}
          />

          <Input
            label="Apelido"
            id="apelido"
            type="text"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            placeholder="Digite seu apelido (opcional)"
            disabled={loading}
          />

          <div>
            <label htmlFor="fotoPerfil" className="block text-sm font-medium mb-2 text-black">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-4 mb-2">
              {(fotoPerfilPreview || fotoPerfilUrl) && (
                <div className="relative">
                  <img
                    src={fotoPerfilPreview || fotoPerfilUrl || ""}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                  />
                  {fotoPerfil && (
                    <button
                      type="button"
                      onClick={() => {
                        setFotoPerfil(null);
                        setFotoPerfilPreview(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-white text-xs font-bold hover:bg-error-light transition-colors"
                      disabled={loading}
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1">
                <input
                  id="fotoPerfil"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-black text-sm"
                  disabled={loading || uploadingFoto}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
                </p>
              </div>
            </div>
            {uploadingFoto && (
              <p className="text-sm text-gray-600">Enviando foto...</p>
            )}
          </div>

          <Input
            label="Email"
            id="email"
            type="email"
            value={user?.email || ""}
            disabled
            helperText="O email não pode ser alterado."
          />

          <Input
            label="Nova Senha"
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Deixe em branco para manter a senha atual"
            disabled={loading}
            helperText="Deixe em branco se não quiser alterar a senha."
          />

          <Input
            label="Confirmar Senha"
            id="confirmarSenha"
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            placeholder="Confirme sua nova senha"
            disabled={loading}
          />

          <div className="flex gap-3 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading || uploadingFoto}
              disabled={loading || uploadingFoto}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

