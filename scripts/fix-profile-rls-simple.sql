-- Script SIMPLES para corrigir políticas RLS da tabela perfil
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, vamos ver quais políticas existem (opcional, apenas para verificar)
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'perfil';

-- 2. Remove todas as políticas de SELECT conhecidas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.perfil;
DROP POLICY IF EXISTS "Usuários autenticados podem ver qualquer perfil" ON public.perfil;

-- 3. Cria a política correta que permite qualquer usuário autenticado ver qualquer perfil
CREATE POLICY "Usuários autenticados podem ver qualquer perfil"
ON public.perfil
FOR SELECT
USING (auth.role() = 'authenticated');

-- 4. Verifica se funcionou (opcional)
-- SELECT policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'perfil' AND cmd = 'SELECT';

