import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

// Load .env if present (simple parser, no dependency)
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([^#=][^=]*)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

if (!url || !token) {
  console.error('Missing TURSO_DATABASE_URL and/or TURSO_AUTH_TOKEN in environment.');
  console.error('Set them in .env.local or export them and retry.');
  process.exit(2);
}

const client = createClient({ url, authToken: token });

async function migrate() {
  try {
    console.log('Running migration: create album_state table if not exists...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS album_state (
        id TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err?.message || err);
    if (err?.response) {
      try {
        const text = await err.response.text();
        console.error('Response text:', text.slice(0, 2000));
      } catch (e) {}
    }
    process.exit(3);
  }
}

migrate();
