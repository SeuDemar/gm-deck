# GM.deck

![License](https://img.shields.io/badge/license-MIT-green)

GM.deck é um software online para gerenciamento de fichas de RPG de mesa. Ele permite que jogadores e mestres organizem fichas de personagens, gerenciem sessões e exportem PDFs, mantendo o controle das campanhas de forma centralizada e prática.

---

## 📝 Visão Geral

**Objetivo:**  
Permitir que jogadores e mestres de RPG de mesa organizem suas fichas de forma digital, evitando retrabalho, confusão e excesso de papéis. O sistema oferece edição em tempo real, histórico de alterações, controle de sessões e exportação de PDFs.

**Público-alvo:**

- Jogadores iniciantes que buscam praticidade e autonomia.  
- Mestres veteranos que precisam gerenciar múltiplas campanhas simultâneas.  
- Jogadores intermediários que atuam também como mestres ocasionais.

---

## ⚙ Funcionalidades

- Criação e edição de fichas de RPG em tempo real.  
- Criação de sessões que interligam jogadores e mestres.  
- Controle de acesso diferenciado (jogador x mestre).  
- Pré-visualização e exportação de fichas em PDF.  
- Histórico de alterações das fichas.  
- Suporte a múltiplos personagens por jogador.  
- Convite de jogadores via link de acesso.

---

## 🏗 Arquitetura de Software

- **Front-end:** Next.js (React) com renderização híbrida (SSR e CSR).  
- **Back-end:** Next.js API Routes + Supabase Auth para autenticação via Magic Link.  
- **Banco de Dados:** Supabase PostgreSQL, com tabelas: Users, Player, Master, Sheet, Game_Session. Campos flexíveis em JSON para fichas.  
- **Infraestrutura:** Hospedagem na Vercel, Supabase para banco, autenticação e armazenamento de arquivos (imagens das fichas).  

### Diagrama do Banco de Dados (ER Mermaid)
```mermaid
erDiagram
    USERS ||--o{ PLAYER : "possui"
    USERS ||--o{ MASTER : "possui"
    PLAYER ||--o{ SHEET : "possui"
    SHEET ||--o{ GAME_SESSION : "está em"
    MASTER ||--o{ GAME_SESSION : "gerencia"
    
    USERS {
        UUID id PK
        VARCHAR name
        VARCHAR email
        TIMESTAMP created_at
    }

    PLAYER {
        UUID id PK
        UUID user_id FK
    }

    MASTER {
        UUID id PK
        UUID user_id FK
    }

    SHEET {
        UUID id PK
        UUID player_id FK
        JSON attributes
        TIMESTAMP created_at
    }

    GAME_SESSION {
        UUID id PK
        UUID master_id FK
        VARCHAR name
        TIMESTAMP start_date
        TIMESTAMP end_date
    }
