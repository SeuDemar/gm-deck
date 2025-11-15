-- Script para corrigir políticas RLS da tabela perfil
-- Permite que usuários autenticados vejam perfis de outros usuários
-- (necessário para exibir nome/apelido do mestre e outros jogadores)

-- Primeiro, vamos listar todas as políticas de SELECT existentes para ver o que temos
-- (Isso é apenas informativo, não é necessário executar)

-- Remove TODAS as políticas de SELECT existentes (caso haja múltiplas)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'perfil' 
        AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.perfil', r.policyname);
    END LOOP;
END $$;

-- Cria nova política que permite ver qualquer perfil autenticado
CREATE POLICY "Usuários autenticados podem ver qualquer perfil"
ON public.perfil
FOR SELECT
USING (auth.role() = 'authenticated');

-- Verifica se a política foi criada corretamente
-- (Opcional: você pode executar isso para verificar)
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'perfil';

