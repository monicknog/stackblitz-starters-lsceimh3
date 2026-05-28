import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';

import type { EstadoFigurinhas } from './album';
import type { InteresseTroca } from './album';

const DB_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DB_DIR, 'album.sqlite');
const ALBUM_ID = 'principal';
const INTERESSE_TABLE = 'trade_interest_v2';
const HISTORICO_TABLE = 'album_history';
const TURSO_URL = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN;

type AlbumRow = {
  album_json: string;
};

type InteresseRow = {
  id: string;
  nome: string;
  figurinha_desejada_id: string;
  figurinha_desejada_nome: string;
  figurinha_ofertada_id: string;
  figurinha_ofertada_nome: string;
  status: 'pendente' | 'rejeitado' | 'aceito';
  created_at: string;
  updated_at: string;
  rejected_at?: string | null;
  accepted_at?: string | null;
};

function criarClienteTurso() {
  if (!TURSO_URL) {
    return null;
  }

  return createClient({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN,
  });
}

function abrirBanco() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  const database = new Database(DB_PATH);

  database.pragma('journal_mode = WAL');
  database.exec(`
    CREATE TABLE IF NOT EXISTS album_state (
      id TEXT PRIMARY KEY,
      album_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
    ;CREATE TABLE IF NOT EXISTS ${HISTORICO_TABLE} (
      id TEXT PRIMARY KEY,
      figurinha_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      source TEXT,
      created_at TEXT NOT NULL
    )
  `);

  return database;
}

async function garantirSchemaTurso() {
  const cliente = criarClienteTurso();

  if (!cliente) {
    return;
  }

  await cliente.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS album_state (
        id TEXT PRIMARY KEY,
        album_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `,
  });

  await cliente.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS ${HISTORICO_TABLE} (
        id TEXT PRIMARY KEY,
        figurinha_id TEXT NOT NULL,
        delta INTEGER NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL
      )
    `,
  });

  await cliente.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS ${INTERESSE_TABLE} (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        figurinha_desejada_id TEXT NOT NULL,
        figurinha_desejada_nome TEXT NOT NULL,
        figurinha_ofertada_id TEXT NOT NULL,
        figurinha_ofertada_nome TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        rejected_at TEXT,
        accepted_at TEXT
      )
    `,
  });
}

function garantirSchemaLocal(database: any) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS album_state (
      id TEXT PRIMARY KEY,
      album_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${HISTORICO_TABLE} (
      id TEXT PRIMARY KEY,
      figurinha_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      source TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${INTERESSE_TABLE} (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      figurinha_desejada_id TEXT NOT NULL,
      figurinha_desejada_nome TEXT NOT NULL,
      figurinha_ofertada_id TEXT NOT NULL,
      figurinha_ofertada_nome TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      rejected_at TEXT,
      accepted_at TEXT
    );
  `);
}

function obterAlbumLocal(database: any) {
  const linha = database
    .prepare('SELECT album_json FROM album_state ORDER BY updated_at DESC, id DESC LIMIT 1')
    .get() as { album_json?: string } | undefined;

  if (typeof linha?.album_json === 'string' && linha.album_json.trim()) {
    const album = JSON.parse(linha.album_json) as EstadoFigurinhas;
    if (album && typeof album === 'object') {
      return album;
    }
  }

  return {} as EstadoFigurinhas;
}

function contarReservasPendentesLocal(database: any, figurinhaDesejadaId: string) {
  const linha = database
    .prepare(`
      SELECT COUNT(*) AS total
      FROM ${INTERESSE_TABLE}
      WHERE figurinha_desejada_id = ? AND status = 'pendente'
    `)
    .get(figurinhaDesejadaId) as { total?: number } | undefined;

  return Number(linha?.total ?? 0);
}

function contarOfertasPendentesLocal(database: any, figurinhaOfertadaId: string) {
  const linha = database
    .prepare(`
      SELECT COUNT(*) AS total
      FROM ${INTERESSE_TABLE}
      WHERE figurinha_ofertada_id = ? AND status = 'pendente'
    `)
    .get(figurinhaOfertadaId) as { total?: number } | undefined;

  return Number(linha?.total ?? 0);
}

async function contarReservasPendentesTurso(transacao: any, figurinhaDesejadaId: string) {
  const resultado = await transacao.execute({
    sql: `
      SELECT COUNT(*) AS total
      FROM ${INTERESSE_TABLE}
      WHERE figurinha_desejada_id = ? AND status = 'pendente'
    `,
    args: [figurinhaDesejadaId],
  } as any);

  const linha = resultado.rows[0] as Record<string, unknown> | undefined;
  return Number(linha?.total ?? 0);
}

function inserirInteresseLocal(database: any, registro: InteresseTroca) {
  database
    .prepare(`
      INSERT INTO ${INTERESSE_TABLE} (
        id,
        nome,
        figurinha_desejada_id,
        figurinha_desejada_nome,
        figurinha_ofertada_id,
        figurinha_ofertada_nome,
        status,
        created_at,
        updated_at,
        rejected_at,
        accepted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      registro.id,
      registro.nome,
      registro.figurinhaDesejadaId,
      registro.figurinhaDesejadaNome,
      registro.figurinhaOfertadaId,
      registro.figurinhaOfertadaNome,
      registro.status,
      registro.createdAt,
      registro.updatedAt,
      registro.rejectedAt,
      registro.acceptedAt,
    );
}

function inserirHistoricoLocal(
  database: any,
  historico: { id: string; figurinhaId: string; delta: number; source: string; createdAt: string },
) {
  database
    .prepare(`
      INSERT INTO ${HISTORICO_TABLE} (id, figurinha_id, delta, source, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(historico.id, historico.figurinhaId, historico.delta, historico.source, historico.createdAt);
}

async function inserirHistoricoTurso(
  transacao: any,
  historico: { id: string; figurinhaId: string; delta: number; source: string; createdAt: string },
) {
  await transacao.execute({
    sql: `
      INSERT INTO ${HISTORICO_TABLE} (id, figurinha_id, delta, source, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [historico.id, historico.figurinhaId, historico.delta, historico.source, historico.createdAt],
  } as any);
}

async function inserirInteresseTurso(transacao: any, registro: InteresseTroca) {
  await transacao.execute({
    sql: `
      INSERT INTO ${INTERESSE_TABLE} (
        id,
        nome,
        figurinha_desejada_id,
        figurinha_desejada_nome,
        figurinha_ofertada_id,
        figurinha_ofertada_nome,
        status,
        created_at,
        updated_at,
        rejected_at,
        accepted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      registro.id,
      registro.nome,
      registro.figurinhaDesejadaId,
      registro.figurinhaDesejadaNome,
      registro.figurinhaOfertadaId,
      registro.figurinhaOfertadaNome,
      registro.status,
      registro.createdAt,
      registro.updatedAt,
      registro.rejectedAt ?? '',
      registro.acceptedAt ?? '',
    ],
  } as any);
}

export async function salvarInteresseDeTroca(
  interesse: Omit<InteresseTroca, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'rejectedAt' | 'acceptedAt'>,
) {
  const registro: InteresseTroca = {
    id: randomUUID(),
    nome: interesse.nome,
    figurinhaDesejadaId: interesse.figurinhaDesejadaId,
    figurinhaDesejadaNome: interesse.figurinhaDesejadaNome,
    figurinhaOfertadaId: interesse.figurinhaOfertadaId,
    figurinhaOfertadaNome: interesse.figurinhaOfertadaNome,
    status: 'pendente',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rejectedAt: null,
    acceptedAt: null,
  };

  // Defensive validation: ensure nome is a non-empty trimmed string before DB ops
  registro.nome = String(registro.nome ?? '').trim();
  if (!registro.nome) {
    throw new Error('NOME_OBRIGATORIO');
  }

  const validarReserva = (album: EstadoFigurinhas, reservasPendentes: number) => {
    const obtidas = album[registro.figurinhaDesejadaId]?.obtidas || 0;
    return obtidas - reservasPendentes > 0;
  };

  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    const transacao = await cliente.transaction('write');

    try {
      const albumResultado = await transacao.execute({
        sql: 'SELECT album_json FROM album_state WHERE id = ? LIMIT 1',
        args: [ALBUM_ID],
      } as any);
      const linhaAlbum = albumResultado.rows[0] as Record<string, unknown> | undefined;
      const albumJson = String(linhaAlbum?.album_json ?? '').trim();
      const album = albumJson ? (JSON.parse(albumJson) as EstadoFigurinhas) : ({} as EstadoFigurinhas);

      const reservasPendentes = await contarReservasPendentesTurso(
        transacao,
        registro.figurinhaDesejadaId,
      );

      const ofertasPendentes = await contarOfertasPendentesTurso(
        transacao,
        registro.figurinhaOfertadaId,
      );

      const obtidasDesejada = album[registro.figurinhaDesejadaId]?.obtidas || 0;
      const obtidasOfertada = album[registro.figurinhaOfertadaId]?.obtidas || 0;

      if (obtidasDesejada - reservasPendentes <= 0) {
        throw new Error('RESERVA_INDISPONIVEL');
      }

      if (obtidasOfertada - ofertasPendentes <= 0) {
        throw new Error('OFERTA_INDISPONIVEL');
      }

      await inserirInteresseTurso(transacao, registro);
      await transacao.commit();

      return registro;
    } catch (erro) {
      await transacao.rollback();
      throw erro;
    } finally {
      transacao.close();
    }
  }

  const database = abrirBanco();

  try {
    garantirSchemaLocal(database);

    const salvarEmTransacao = database.transaction((interesseRegistro: InteresseTroca) => {
      const album = obterAlbumLocal(database);
      const reservasPendentes = contarReservasPendentesLocal(database, interesseRegistro.figurinhaDesejadaId);
      const ofertasPendentes = contarOfertasPendentesLocal(database, interesseRegistro.figurinhaOfertadaId);

      const obtidasDesejada = album[interesseRegistro.figurinhaDesejadaId]?.obtidas || 0;
      const obtidasOfertada = album[interesseRegistro.figurinhaOfertadaId]?.obtidas || 0;

      if (obtidasDesejada - reservasPendentes <= 0) {
        throw new Error('RESERVA_INDISPONIVEL');
      }

      if (obtidasOfertada - ofertasPendentes <= 0) {
        throw new Error('OFERTA_INDISPONIVEL');
      }

      inserirInteresseLocal(database, interesseRegistro);
    });

    salvarEmTransacao(registro);

    return registro;
  } finally {
    database.close();
  }
}

export async function listarInteressesDeTroca() {
  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    const resultado = await cliente.execute({
      sql: `
        SELECT
          id,
          nome,
          figurinha_desejada_id,
          figurinha_desejada_nome,
          figurinha_ofertada_id,
          figurinha_ofertada_nome,
          status,
          created_at,
          updated_at,
          rejected_at,
          accepted_at
        FROM ${INTERESSE_TABLE}
        ORDER BY created_at DESC
        LIMIT 100
      `,
    });

    return resultado.rows.map((linha) => {
      const row = linha as Record<string, unknown>;

      return {
        id: String(row.id ?? ''),
        nome: String(row.nome ?? ''),
        figurinhaDesejadaId: String(row.figurinha_desejada_id ?? ''),
        figurinhaDesejadaNome: String(row.figurinha_desejada_nome ?? ''),
        figurinhaOfertadaId: String(row.figurinha_ofertada_id ?? ''),
        figurinhaOfertadaNome: String(row.figurinha_ofertada_nome ?? ''),
        status: (String(row.status ?? 'pendente') as InteresseTroca['status']),
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? ''),
        rejectedAt: row.rejected_at ? String(row.rejected_at) : null,
        acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
      };
    }) as InteresseTroca[];
  }

  const database = abrirBanco();

  try {
    garantirSchemaLocal(database);

    const rows = database
      .prepare(`
        SELECT
          id,
          nome,
          figurinha_desejada_id,
          figurinha_desejada_nome,
          figurinha_ofertada_id,
          figurinha_ofertada_nome,
          status,
          created_at,
          updated_at,
          rejected_at,
          accepted_at
        FROM ${INTERESSE_TABLE}
        ORDER BY created_at DESC
        LIMIT 100
      `)
      .all() as Array<Record<string, unknown>>;

    return rows.map((linha) => ({
      id: String(linha.id ?? ''),
      nome: String(linha.nome ?? ''),
      figurinhaDesejadaId: String(linha.figurinha_desejada_id ?? ''),
      figurinhaDesejadaNome: String(linha.figurinha_desejada_nome ?? ''),
      figurinhaOfertadaId: String(linha.figurinha_ofertada_id ?? ''),
      figurinhaOfertadaNome: String(linha.figurinha_ofertada_nome ?? ''),
      status: (String(linha.status ?? 'pendente') as InteresseTroca['status']),
      createdAt: String(linha.created_at ?? ''),
      updatedAt: String(linha.updated_at ?? ''),
      rejectedAt: linha.rejected_at ? String(linha.rejected_at) : null,
      acceptedAt: linha.accepted_at ? String(linha.accepted_at) : null,
    })) as InteresseTroca[];
  } finally {
    database.close();
  }
}

export async function atualizarStatusInteresse(interesseId: string, status: InteresseTroca['status']) {
  const agora = new Date().toISOString();

  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    const transacao = await cliente.transaction('write');

    try {
      const interesseRes = await transacao.execute({
        sql: `SELECT figurinha_desejada_id, figurinha_ofertada_id, status FROM ${INTERESSE_TABLE} WHERE id = ? LIMIT 1`,
        args: [interesseId],
      } as any);

      const row = interesseRes.rows[0] as Record<string, unknown> | undefined;
      const atual = String(row?.status ?? 'pendente') as InteresseTroca['status'];

      if (status === 'aceito' && atual === 'pendente') {
        const desejadaId = String(row?.figurinha_desejada_id ?? '');
        const ofertadaId = String(row?.figurinha_ofertada_id ?? '');

        const albumResultado = await transacao.execute({
          sql: 'SELECT album_json FROM album_state WHERE id = ? LIMIT 1',
          args: [ALBUM_ID],
        } as any);

        const linhaAlbum = albumResultado.rows[0] as Record<string, unknown> | undefined;
        const albumJson = String(linhaAlbum?.album_json ?? '').trim();
        const album = albumJson ? (JSON.parse(albumJson) as EstadoFigurinhas) : ({} as EstadoFigurinhas);

        const obtidasDesejada = album[desejadaId]?.obtidas || 0;
        if (obtidasDesejada <= 0) {
          throw new Error('IMPOSSIVEL_CONSUMIR_OBTIDA');
        }

        album[desejadaId] = { obtidas: Math.max(0, obtidasDesejada - 1) };
        album[ofertadaId] = { obtidas: (album[ofertadaId]?.obtidas || 0) + 1 };

        await transacao.execute({
          sql: `
            INSERT INTO album_state (id, album_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              album_json = excluded.album_json,
              updated_at = excluded.updated_at
          `,
          args: [ALBUM_ID, JSON.stringify(album), agora],
        } as any);

        await inserirHistoricoTurso(transacao, {
          id: randomUUID(),
          figurinhaId: desejadaId,
          delta: -1,
          source: 'trade_accept',
          createdAt: agora,
        });

        await inserirHistoricoTurso(transacao, {
          id: randomUUID(),
          figurinhaId: ofertadaId,
          delta: 1,
          source: 'trade_accept',
          createdAt: agora,
        });
      }

      await transacao.execute({
        sql: `
          UPDATE ${INTERESSE_TABLE}
          SET status = ?, updated_at = ?, rejected_at = CASE WHEN ? = 'rejeitado' THEN ? ELSE rejected_at END,
              accepted_at = CASE WHEN ? = 'aceito' THEN ? ELSE accepted_at END
          WHERE id = ?
        `,
        args: [status, agora, status, agora, status, agora, interesseId],
      } as any);

      await transacao.commit();
      return;
    } catch (erro) {
      await transacao.rollback();
      throw erro;
    } finally {
      transacao.close();
    }
  }

  const database = abrirBanco();

  try {
    garantirSchemaLocal(database);
    // Local DB: make the interest status update and album mutation atomic
    const operacao = database.transaction((id: string, novoStatus: InteresseTroca['status']) => {
      const interesseRow = database
        .prepare(`SELECT figurinha_desejada_id, figurinha_ofertada_id, status FROM ${INTERESSE_TABLE} WHERE id = ? LIMIT 1`)
        .get(id) as Record<string, unknown> | undefined;

      const atual = String(interesseRow?.status ?? 'pendente') as InteresseTroca['status'];

      if (novoStatus === 'aceito' && atual === 'pendente') {
        const desejadaId = String(interesseRow?.figurinha_desejada_id ?? '');
        const ofertadaId = String(interesseRow?.figurinha_ofertada_id ?? '');

        const linhaAlbum = database
          .prepare('SELECT album_json FROM album_state WHERE id = ? LIMIT 1')
          .get(ALBUM_ID) as { album_json?: string } | undefined;

        const albumJson = String(linhaAlbum?.album_json ?? '').trim();
        const album = albumJson ? (JSON.parse(albumJson) as EstadoFigurinhas) : ({} as EstadoFigurinhas);

        const obtidasDesejada = album[desejadaId]?.obtidas || 0;
        if (obtidasDesejada <= 0) {
          throw new Error('IMPOSSIVEL_CONSUMIR_OBTIDA');
        }

        album[desejadaId] = { obtidas: Math.max(0, obtidasDesejada - 1) };
        album[ofertadaId] = { obtidas: (album[ofertadaId]?.obtidas || 0) + 1 };

        database
          .prepare(`
            INSERT INTO album_state (id, album_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              album_json = excluded.album_json,
              updated_at = excluded.updated_at
          `)
          .run(ALBUM_ID, JSON.stringify(album), agora);

        inserirHistoricoLocal(database, {
          id: randomUUID(),
          figurinhaId: desejadaId,
          delta: -1,
          source: 'trade_accept',
          createdAt: agora,
        });

        inserirHistoricoLocal(database, {
          id: randomUUID(),
          figurinhaId: ofertadaId,
          delta: 1,
          source: 'trade_accept',
          createdAt: agora,
        });
      }

      database
        .prepare(`
        UPDATE ${INTERESSE_TABLE}
        SET status = ?, updated_at = ?, rejected_at = CASE WHEN ? = 'rejeitado' THEN ? ELSE rejected_at END,
            accepted_at = CASE WHEN ? = 'aceito' THEN ? ELSE accepted_at END
        WHERE id = ?
      `)
        .run(novoStatus, agora, novoStatus, agora, novoStatus, agora, id);
    });

    operacao(interesseId, status);
  } finally {
    database.close();
  }
}

export async function carregarAlbumDoBanco() {
  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    const resultado = await cliente.execute({
      sql: 'SELECT album_json FROM album_state ORDER BY updated_at DESC, id DESC LIMIT 1',
    } as any);

    const linha = resultado.rows[0] as unknown as AlbumRow | undefined;

    if (typeof linha?.album_json === 'string' && linha.album_json.trim()) {
      const album = JSON.parse(linha.album_json) as EstadoFigurinhas;

      if (album && typeof album === 'object') {
        return album;
      }
    }

    return {} as EstadoFigurinhas;
  }

  const database = abrirBanco();

  try {
    const linha = database
      .prepare('SELECT album_json FROM album_state ORDER BY updated_at DESC, id DESC LIMIT 1')
      .get() as { album_json?: string } | undefined;

    if (typeof linha?.album_json === 'string' && linha.album_json.trim()) {
      const album = JSON.parse(linha.album_json) as EstadoFigurinhas;
      if (album && typeof album === 'object') {
        return album;
      }
    }

    return {} as EstadoFigurinhas;
  } finally {
    database.close();
  }
}
export async function carregarAlbumComMeta() {
  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    const resultado = await cliente.execute({
      sql: 'SELECT album_json, updated_at FROM album_state ORDER BY updated_at DESC, id DESC LIMIT 1',
    } as any);

    const linha = resultado.rows[0] as unknown as { album_json?: string; updated_at?: string } | undefined;

    if (typeof linha?.album_json === 'string' && linha.album_json.trim()) {
      const album = JSON.parse(linha.album_json) as EstadoFigurinhas;

      if (album && typeof album === 'object') {
        return { album, updatedAt: String(linha.updated_at ?? '') };
      }
    }

    return { album: {} as EstadoFigurinhas, updatedAt: String(linha?.updated_at ?? '') };
  }

  const database = abrirBanco();

  try {
    const linha = database
      .prepare('SELECT album_json, updated_at FROM album_state ORDER BY updated_at DESC, id DESC LIMIT 1')
      .get() as { album_json?: string; updated_at?: string } | undefined;

    if (typeof linha?.album_json === 'string' && linha.album_json.trim()) {
      const album = JSON.parse(linha.album_json) as EstadoFigurinhas;
      if (album && typeof album === 'object') {
        return { album, updatedAt: String(linha.updated_at ?? '') };
      }
    }

    return { album: {} as EstadoFigurinhas, updatedAt: String(linha?.updated_at ?? '') };
  } finally {
    database.close();
  }
}

export async function salvarAlbumNoBanco(album: EstadoFigurinhas) {
  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    const now = new Date().toISOString();

    // read existing album to compute diffs
    const resultado = await cliente.execute({
      sql: 'SELECT album_json FROM album_state WHERE id = ? LIMIT 1',
      args: [ALBUM_ID],
    });

    const linha = resultado.rows[0] as unknown as AlbumRow | undefined;
    const antigoJson = String(linha?.album_json ?? '').trim();
    const antigo = antigoJson ? (JSON.parse(antigoJson) as EstadoFigurinhas) : ({} as EstadoFigurinhas);

    // persist new album
    await cliente.execute({
      sql: `
        INSERT INTO album_state (id, album_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          album_json = excluded.album_json,
          updated_at = excluded.updated_at
      `,
      args: [ALBUM_ID, JSON.stringify(album), now],
    });

    // record any changes so additions and removals appear in the history
    const changes = [] as Array<{ id: string; delta: number }>;
    for (const key of Object.keys(album)) {
      const novo = Number((album as any)[key]?.obtidas || album[key] || 0) || 0;
      const velho = Number((antigo as any)[key]?.obtidas || antigo[key] || 0) || 0;
      if (novo !== velho) {
        changes.push({ id: key, delta: novo - velho });
      }
    }

    for (const c of changes) {
      const historico = {
        id: randomUUID(),
        figurinhaId: c.id,
        delta: c.delta,
        source: 'manual',
        createdAt: now,
      };

      await cliente.execute({
        sql: `
          INSERT INTO ${HISTORICO_TABLE} (id, figurinha_id, delta, source, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [historico.id, historico.figurinhaId, historico.delta, historico.source, historico.createdAt],
      });
    }

    return now;
  }

  const database = abrirBanco();

  try {
    const now = new Date().toISOString();

    // read existing album to compute diffs
    const linha = database
      .prepare('SELECT album_json FROM album_state WHERE id = ? LIMIT 1')
      .get(ALBUM_ID) as { album_json?: string } | undefined;

    const antigoJson = String(linha?.album_json ?? '').trim();
    const antigo = antigoJson ? (JSON.parse(antigoJson) as EstadoFigurinhas) : ({} as EstadoFigurinhas);

    database
      .prepare(`
        INSERT INTO album_state (id, album_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          album_json = excluded.album_json,
          updated_at = excluded.updated_at
      `)
      .run(ALBUM_ID, JSON.stringify(album), now);

    const changes: Array<{ id: string; delta: number }> = [];
    for (const key of Object.keys(album)) {
      const novo = Number((album as any)[key]?.obtidas || album[key] || 0) || 0;
      const velho = Number((antigo as any)[key]?.obtidas || antigo[key] || 0) || 0;
      if (novo !== velho) {
        changes.push({ id: key, delta: novo - velho });
      }
    }

    const insert = database.prepare(`
      INSERT INTO ${HISTORICO_TABLE} (id, figurinha_id, delta, source, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const c of changes) {
      const historico = {
        id: randomUUID(),
        figurinhaId: c.id,
        delta: c.delta,
        source: 'manual',
        createdAt: now,
      };

      insert.run(historico.id, historico.figurinhaId, historico.delta, historico.source, historico.createdAt);
    }

    return now;
  } finally {
    database.close();
  }
}

async function contarOfertasPendentesTurso(transacao: any, figurinhaOfertadaId: string) {
  const resultado = await transacao.execute({
    sql: `
      SELECT COUNT(*) AS total
      FROM ${INTERESSE_TABLE}
      WHERE figurinha_ofertada_id = ? AND status = 'pendente'
    `,
    args: [figurinhaOfertadaId],
  } as any);

  const linha = resultado.rows[0] as Record<string, unknown> | undefined;
  return Number(linha?.total ?? 0);
}

export async function listarHistoricoAlteracoes(limit = 20) {
  const cliente = criarClienteTurso();

  if (cliente) {
    const contagem = await cliente.execute({
      sql: `SELECT COUNT(*) AS total FROM ${HISTORICO_TABLE}`,
    } as any);

    const total = Number((contagem.rows[0] as Record<string, unknown> | undefined)?.total ?? 0);
    if (total === 0) {
      await gerarHistoricoAPartirDoAlbum();
    }

    const resultado = await cliente.execute({
      sql: `
        SELECT id, figurinha_id, delta, source, created_at
        FROM ${HISTORICO_TABLE}
        ORDER BY created_at DESC
        LIMIT ?
      `,
      args: [limit],
    } as any);

    return resultado.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        figurinhaId: String(row.figurinha_id ?? ''),
        delta: Number(row.delta ?? 0),
        source: String(row.source ?? ''),
        createdAt: String(row.created_at ?? ''),
      };
    });
  }

  const database = abrirBanco();

  try {
    const linhaContagem = database
      .prepare(`SELECT COUNT(*) AS total FROM ${HISTORICO_TABLE}`)
      .get() as { total?: number } | undefined;

    if (Number(linhaContagem?.total ?? 0) === 0) {
      await gerarHistoricoAPartirDoAlbum();
    }

    const rows = database
      .prepare(`
        SELECT id, figurinha_id, delta, source, created_at
        FROM ${HISTORICO_TABLE}
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id ?? ''),
      figurinhaId: String(row.figurinha_id ?? ''),
      delta: Number(row.delta ?? 0),
      source: String(row.source ?? ''),
      createdAt: String(row.created_at ?? ''),
    }));
  } finally {
    database.close();
  }
}

export async function gerarHistoricoAPartirDoAlbum() {
  const agora = new Date().toISOString();
  const cliente = criarClienteTurso();

  // Read current album state
  const album = await carregarAlbumDoBanco();

  const entries = Object.keys(album)
    .map((k) => {
      const qtd = Number((album as any)[k]?.obtidas || album[k] || 0) || 0;
      if (qtd > 0) return { figurinhaId: k, delta: qtd };
      return null;
    })
    .filter(Boolean) as Array<{ figurinhaId: string; delta: number }>;

  if (cliente) {
    await garantirSchemaTurso();
    const transacao = await cliente.transaction('write');
    try {
      for (const e of entries) {
        const historico = {
          id: randomUUID(),
          figurinhaId: e.figurinhaId,
          delta: e.delta,
          source: 'import',
          createdAt: agora,
        };

        await transacao.execute({
          sql: `
            INSERT INTO ${HISTORICO_TABLE} (id, figurinha_id, delta, source, created_at)
            VALUES (?, ?, ?, ?, ?)
          `,
          args: [historico.id, historico.figurinhaId, historico.delta, historico.source, historico.createdAt],
        } as any);
      }

      await transacao.commit();
      return entries.length;
    } catch (err) {
      await transacao.rollback();
      throw err;
    } finally {
      transacao.close();
    }
  }

  const database = abrirBanco();
  try {
    garantirSchemaLocal(database);

    const insert = database.prepare(`
      INSERT INTO ${HISTORICO_TABLE} (id, figurinha_id, delta, source, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const operacao = database.transaction((items: Array<{ figurinhaId: string; delta: number }>) => {
      for (const it of items) {
        const historico = {
          id: randomUUID(),
          figurinhaId: it.figurinhaId,
          delta: it.delta,
          source: 'import',
          createdAt: agora,
        };

        insert.run(historico.id, historico.figurinhaId, historico.delta, historico.source, historico.createdAt);
      }
    });

    operacao(entries);
    return entries.length;
  } finally {
    database.close();
  }
}
