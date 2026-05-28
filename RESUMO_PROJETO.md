# Resumo do Projeto

Este projeto é uma aplicação **Next.js 13 (App Router)** para gerenciamento de um **álbum de figurinhas da Copa 2026**.

Na prática, ele permite:
- registrar quantas unidades de cada figurinha você tem;
- ver estatísticas do álbum (tenho, faltam, repetidas);
- filtrar por seção, status e busca textual;
- compartilhar visualização pública do álbum;
- publicar uma página de trocas com figurinhas disponíveis;
- receber e gerenciar interesses de troca (aceitar/rejeitar);
- acompanhar histórico de alterações do álbum.

## Como funciona

### 1) Página principal (`/`)
- Protegida por senha simples no cliente (`SENHA_PRINCIPAL` em `app/lib/album.ts`).
- Carrega e salva o estado do álbum via API (`/api/album`).
- Faz polling periódico para atualizar dados persistidos.
- Mostra cards de figurinha com ações de adicionar/remover quantidade.
- Exibe estatísticas gerais e filtros.
- Gera links para:
  - visualização pública (`/compartilhar`);
  - trocas (`/trocas`);
  - interessados (`/interessados`).

### 2) Compartilhamento (`/compartilhar`)
- Exibe o álbum em modo de leitura (sem edição).
- Mostra visão pública com filtros e estatísticas ao vivo.

### 3) Trocas (`/trocas`)
- Lista figurinhas disponíveis para troca (considerando repetidas).
- Considera reservas pendentes para evitar “dupla promessa” da mesma figurinha.
- Permite que visitantes registrem interesse de troca.

### 4) Interessados (`/interessados`)
- Também protegida por senha.
- Lista interessados em ordem recente.
- Permite aceitar ou rejeitar solicitações de troca.
- Ao aceitar, atualiza o álbum (consome 1 da desejada e adiciona 1 da ofertada).

### 5) Histórico (`/historico`)
- Mostra as últimas alterações com delta por figurinha.
- Usa tabela de histórico (`album_history`) para trilha de mudanças.

## Persistência e banco

O projeto tem estratégia híbrida:
- **Turso/libSQL** se variáveis de ambiente estiverem configuradas:
  - `TURSO_DATABASE_URL` (ou `LIBSQL_DATABASE_URL`)
  - `TURSO_AUTH_TOKEN` (ou `LIBSQL_AUTH_TOKEN`)
- **SQLite local (`better-sqlite3`)** como fallback em desenvolvimento.

Arquivo central de dados: `app/lib/album-db.ts`.

Tabelas principais:
- `album_state` (estado atual do álbum);
- `trade_interest_v2` (interesses de troca);
- `album_history` (histórico de mudanças).

## APIs principais

- `GET/POST /api/album`: carrega e salva álbum.
- `GET/POST/PATCH /api/interesses`: lista, cria, aceita/rejeita interesses de troca.
- `GET /api/album/history`: retorna histórico.
- `POST /api/album/history/regenerate`: reconstrói histórico a partir do estado atual.
- `POST /api/album/share`: endpoint placeholder para compartilhamento.

## Dados de figurinhas

O catálogo vem de JSON local em `src/figurinhas-album.json` (normalizado em `app/lib/album.ts`), usado para renderização, filtros e validações de troca.

## Stack

- Next.js 13 + React 18 + TypeScript
- Tailwind CSS
- Turso/libSQL (`@libsql/client`)
- SQLite local (`better-sqlite3`)

## Observações rápidas

- O `README.md` ainda está no formato padrão do `create-next-app`.
- Existem scripts utilitários em `scripts/` para gerar/ajustar dados do álbum.
- A autenticação atual é simples (senha fixa em código + `localStorage`), adequada para uso pessoal/familiar, mas não para cenário público de alta segurança.
