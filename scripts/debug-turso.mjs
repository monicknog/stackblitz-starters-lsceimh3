import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

// Load .env
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

const url = process.env.TURSO_DATABASE_URL || '<missing>';
const token = process.env.TURSO_AUTH_TOKEN || '';
console.log('Using TURSO_DATABASE_URL =', url);
console.log('Turso token present:', token ? 'yes' : 'no', token ? `(length ${token.length})` : '');

if (!url || !token) {
  console.error('Missing url or token');
  process.exit(2);
}

const client = createClient({ url, authToken: token });

(async function() {
  try {
    const res = await client.execute({ sql: 'SELECT 1 as ok' });
    console.log('Query OK, rows:', res.rows);
  } catch (err) {
    console.error('Client error:', err);
    if (err?.response) {
      try {
        const text = await err.response.text();
        console.error('Response text:', text.slice(0, 1000));
      } catch (e) {}
    }
    process.exit(3);
  }
})();
