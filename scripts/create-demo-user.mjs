import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raw = await readFile(resolve('.env.local'), 'utf8');
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = 'demo@yetenek.app';
const password = 'Demo123456!';

const res = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { displayName: 'Demo Veli', role: 'demo' },
  }),
});

const body = await res.json();
console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(body, null, 2));
console.log('---');
console.log(`Email:    ${email}`);
console.log(`Password: ${password}`);
