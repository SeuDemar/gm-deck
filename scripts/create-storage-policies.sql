-- Script para criar políticas de storage para o bucket de fotos de perfil
-- IMPORTANTE: Substitua 'fotos-perfil' pelo nome real do seu bucket
--
-- Como executar:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em "SQL Editor"
-- 3. Certifique-se de que o bucket 'fotos-perfil' já foi criado no Storage
-- 4. Substitua 'fotos-perfil' pelo nome real do seu bucket (se diferente)
-- 5. Cole este script e execute

-- Remove políticas existentes (se houver) para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem fazer upload de suas próprias fotos de perfil" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias fotos de perfil" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias fotos de perfil" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver fotos de perfil de outros usuários" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias fotos de perfil" ON storage.objects;

-- Política para permitir que usuários autenticados façam upload de suas próprias fotos
-- O arquivo deve estar em uma pasta com o mesmo nome do user.id
CREATE POLICY "Usuários podem fazer upload de suas próprias fotos de perfil"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'fotos-perfil' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir que usuários autenticados atualizem suas próprias fotos
CREATE POLICY "Usuários podem atualizar suas próprias fotos de perfil"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'fotos-perfil' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'fotos-perfil' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir que usuários autenticados vejam suas próprias fotos
CREATE POLICY "Usuários podem ver suas próprias fotos de perfil"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'fotos-perfil' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir que qualquer usuário autenticado veja fotos de perfil de outros usuários
-- (para exibir fotos em listas, sessões, etc.)
CREATE POLICY "Usuários autenticados podem ver fotos de perfil de outros usuários"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'fotos-perfil' AND
  auth.role() = 'authenticated'
);

-- Política para permitir que usuários autenticados deletem suas próprias fotos
CREATE POLICY "Usuários podem deletar suas próprias fotos de perfil"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'fotos-perfil' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

