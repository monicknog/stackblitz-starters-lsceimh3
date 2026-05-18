import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';

import type { EstadoFigurinhas } from './album';

const DB_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DB_DIR, 'album.sqlite');
const ALBUM_ID = 'principal';
const TURSO_URL = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN;

type AlbumRow = {
  album_json: string;
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
}

export async function carregarAlbumDoBanco() {
  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    const resultado = await cliente.execute({
      sql: 'SELECT album_json FROM album_state WHERE id = ? LIMIT 1',
      args: [ALBUM_ID],
    });

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
      .prepare('SELECT album_json FROM album_state WHERE id = ? LIMIT 1')
      .get(ALBUM_ID) as { album_json?: string } | undefined;

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

export async function salvarAlbumNoBanco(album: EstadoFigurinhas) {
  const cliente = criarClienteTurso();

  if (cliente) {
    await garantirSchemaTurso();

    await cliente.execute({
      sql: `
        INSERT INTO album_state (id, album_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          album_json = excluded.album_json,
          updated_at = excluded.updated_at
      `,
      args: [ALBUM_ID, JSON.stringify(album), new Date().toISOString()],
    });

    return;
  }

  const database = abrirBanco();

  try {
    database
      .prepare(`
        INSERT INTO album_state (id, album_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          album_json = excluded.album_json,
          updated_at = excluded.updated_at
      `)
      .run(ALBUM_ID, JSON.stringify(album), new Date().toISOString());
  } finally {
    database.close();
  }
}