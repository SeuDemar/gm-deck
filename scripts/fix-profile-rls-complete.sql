-- Script COMPLETO para corrigir políticas RLS da tabela perfil
-- Execute este script no Supabase SQL Editor

-- PASSO 1: Verifica quais políticas existem atualmente (apenas para diagnóstico)
-- Execute isso primeiro para ver o que temos:
SELECT 
    policyname, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'perfil';

-- PASSO 2: Remove TODAS as políticas de SELECT existentes
-- Isso garante que não há conflitos
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.perfil;
DROP POLICY IF EXISTS "Usuários autenticados podem ver qualquer perfil" ON public.perfil;

-- PASSO 3: Verifica se o RLS está habilitado
-- Deve retornar 'true' para rowsecurity
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'perfil';

-- Se rowsecurity for 'false', execute:
-- ALTER TABLE public.perfil ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Cria a política correta que permite qualquer usuário autenticado ver qualquer perfil
CREATE POLICY "Usuários autenticados podem ver qualquer perfil"
ON public.perfil
FOR SELECT
TO authenticated
USING (true);

-- PASSO 5: Verifica se a política foi criada corretamente
SELECT 
    policyname, 
    cmd, 
    qual,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'perfil' 
AND cmd = 'SELECT';

-- A política criada deve ter:
-- policyname: "Usuários autenticados podem ver qualquer perfil"
-- cmd: "SELECT"
-- qual: "true"
-- roles: "{authenticated}"

