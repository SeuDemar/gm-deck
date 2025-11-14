-- Script para criar a tabela de sessões no Supabase
-- 
-- Como executar:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em "SQL Editor"
-- 3. Cole este script e execute

-- Cria a tabela de sessões
CREATE TABLE IF NOT EXISTS sessao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  mestre_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'pausada')),
  ficha_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cria a tabela de relacionamento entre sessões e jogadores/fichas
CREATE TABLE IF NOT EXISTS sessao_jogador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES sessao(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ficha_id UUID REFERENCES ficha(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sessao_id, usuario_id) -- Um jogador só pode estar uma vez em cada sessão
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sessao_mestre_id ON sessao(mestre_id);
CREATE INDEX IF NOT EXISTS idx_sessao_status ON sessao(status);
CREATE INDEX IF NOT EXISTS idx_sessao_ficha_ids ON sessao USING GIN (ficha_ids);
CREATE INDEX IF NOT EXISTS idx_sessao_jogador_sessao_id ON sessao_jogador(sessao_id);
CREATE INDEX IF NOT EXISTS idx_sessao_jogador_usuario_id ON sessao_jogador(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessao_jogador_ficha_id ON sessao_jogador(ficha_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_sessao_updated_at
  BEFORE UPDATE ON sessao
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessao_jogador_updated_at
  BEFORE UPDATE ON sessao_jogador
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários explicativos
COMMENT ON COLUMN sessao.ficha_ids IS 'Array de IDs das fichas que pertencem a esta sessão';
COMMENT ON COLUMN sessao.status IS 'Status da sessão: ativa, encerrada ou pausada';
COMMENT ON COLUMN sessao_jogador.status IS 'Status do convite: pendente, aceito ou recusado';

