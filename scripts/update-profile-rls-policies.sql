-- Script para atualizar políticas RLS da tabela perfil
-- Permite que usuários autenticados vejam perfis de outros usuários
-- (necessário para exibir nome/apelido do mestre e outros jogadores)

-- Remove políticas antigas de SELECT (se existirem)
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.perfil;
DROP POLICY IF EXISTS "Usuários autenticados podem ver qualquer perfil" ON public.perfil;

-- Cria nova política que permite ver qualquer perfil autenticado
CREATE POLICY "Usuários autenticados podem ver qualquer perfil"
ON public.perfil
FOR SELECT
USING (auth.role() = 'authenticated');

-- Mantém as outras políticas (UPDATE e INSERT) restritas ao próprio usuário
-- (já existentes no create-profile-table.sql)

