-- Dump gerado por dump-sqlite.mjs
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS album_state (
  id TEXT PRIMARY KEY,
  album_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO album_state (id, album_json, updated_at) VALUES ('principal', '{"FWC_00":{"obtidas":1}}', '2026-05-18T20:15:47.595Z');

COMMIT;
