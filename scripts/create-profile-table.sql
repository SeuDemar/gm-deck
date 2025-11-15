-- Script para criar tabela de perfil do usuário
-- Esta tabela se relaciona com auth.users do Supabase

-- Tabela de perfil do usuário
CREATE TABLE IF NOT EXISTS perfil (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  apelido VARCHAR(255),
  foto_perfil_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Email é gerenciado pela auth.users
  -- Senha é gerenciada pela auth.users
  UNIQUE(id)
);

-- Índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_perfil_nome ON perfil (nome);

-- Índice para busca por apelido
CREATE INDEX IF NOT EXISTS idx_perfil_apelido ON perfil (apelido);

-- Função para criar perfil automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfil (id, nome, apelido)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'apelido'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS set_timestamp_perfil ON perfil;
CREATE TRIGGER set_timestamp_perfil
  BEFORE UPDATE ON perfil
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Política RLS: usuários só podem ver seu próprio perfil
ALTER TABLE perfil ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON perfil
  FOR SELECT
  USING (auth.uid() = id);

-- Política: usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON perfil
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: usuários podem inserir seu próprio perfil (para casos onde o trigger não funcionou)
CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON perfil
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Comentários para documentação
COMMENT ON TABLE perfil IS 'Tabela de perfil do usuário que se relaciona com auth.users';
COMMENT ON COLUMN perfil.id IS 'ID do usuário (referência a auth.users)';
COMMENT ON COLUMN perfil.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN perfil.apelido IS 'Apelido do usuário';
COMMENT ON COLUMN perfil.created_at IS 'Data de criação do perfil';
COMMENT ON COLUMN perfil.updated_at IS 'Data da última atualização do perfil';

