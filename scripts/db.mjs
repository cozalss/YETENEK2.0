#!/usr/bin/env node
/**
 * Supabase DB helper — iki auth katmanı:
 *
 *   1. SUPABASE_ACCESS_TOKEN (sbp_...)  → Management API → DDL + arbitrary SQL
 *      Tüm komutlar (`sql`, `exec`, `migrate`, `tables`).
 *      Setup: https://supabase.com/dashboard/account/tokens
 *
 *   2. SUPABASE_SERVICE_ROLE_KEY (JWT)  → PostgREST → existing tablolarda CRUD
 *      Sadece `rows <table>` ve `delete <table>` komutları.
 *      Setup: https://supabase.com/dashboard/project/<ref>/settings/api-keys
 *
 * Kullanım:
 *   pnpm db:sql supabase/migrations/0005_new.sql        # PAT
 *   pnpm db:exec "select count(*) from sessions"        # PAT
 *   pnpm db:tables                                       # PAT
 *   pnpm db:migrate                                      # PAT
 *   pnpm db:rows lesson_enrollment                       # PAT veya service_role
 *
 * Risk: ikisi de hassas. .env.local git'e gitmiyor. CI'da secret olarak ekle.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const PROJECT_REF = 'wwevvbwmrsjhfslkzucd';

// .env.local'ı parse et (manuel — dotenv dependency'sine gerek yok)
async function loadEnv() {
  try {
    const raw = await readFile(resolve('.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const [, key, valRaw] = m;
      if (process.env[key]) continue; // shell'den geleni geçersiz kılma
      const val = valRaw.replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  } catch {
    // .env.local yoksa shell env yeter
  }
}

async function runSql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ SUPABASE_ACCESS_TOKEN eksik.');
    console.error('   .env.local içine ekle: SUPABASE_ACCESS_TOKEN=sbp_xxx');
    console.error('   Yeni token: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${res.status} ${res.statusText}`);
    console.error(text);
    process.exit(1);
  }
  return text ? JSON.parse(text) : null;
}

/**
 * PostgREST üzerinden bir tablonun satırlarını çeker (service_role gerek).
 * DDL gerektirmez; PAT yokken bile çalışır.
 */
async function rowsViaPostgrest(table, limit = 100) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL veya SERVICE_ROLE_KEY eksik.');
    process.exit(1);
  }
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=${limit}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    console.error(`❌ ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }
  return res.json();
}

function help() {
  console.error('Kullanım:');
  console.error('  node scripts/db.mjs sql <dosya.sql>         # PAT gerek');
  console.error('  node scripts/db.mjs exec "<query>"          # PAT gerek');
  console.error('  node scripts/db.mjs tables                  # PAT gerek');
  console.error('  node scripts/db.mjs migrate                 # PAT gerek');
  console.error('  node scripts/db.mjs rows <table> [limit]    # service_role yeter');
}

async function main() {
  await loadEnv();
  const [, , cmd, arg] = process.argv;

  if (cmd === 'sql') {
    if (!arg) {
      console.error('❌ Dosya yolu eksik');
      return help();
    }
    const sql = await readFile(resolve(arg), 'utf8');
    console.log(`▶ Çalıştırılıyor: ${arg} (${sql.length} byte)`);
    const result = await runSql(sql);
    console.log('✅ Tamamlandı');
    if (Array.isArray(result) && result.length > 0) {
      console.log(JSON.stringify(result, null, 2));
    }
    return;
  }

  if (cmd === 'exec') {
    if (!arg) {
      console.error('❌ Query eksik');
      return help();
    }
    const result = await runSql(arg);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === 'tables') {
    const result = await runSql(`
      select table_name,
             (select count(*)::int
              from information_schema.columns c
              where c.table_schema = t.table_schema
                and c.table_name = t.table_name) as columns
      from information_schema.tables t
      where t.table_schema = 'public'
      order by table_name;
    `);
    console.log('📋 Public tablolar:');
    for (const row of result ?? []) {
      console.log(`  · ${row.table_name}  (${row.columns} kolon)`);
    }
    return;
  }

  if (cmd === 'rows') {
    if (!arg) {
      console.error('❌ Tablo adı eksik');
      return help();
    }
    const limit = parseInt(process.argv[4] ?? '100', 10);
    const rows = await rowsViaPostgrest(arg, limit);
    console.log(`📋 ${arg} — ${rows.length} satır`);
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (cmd === 'migrate') {
    const dir = resolve('supabase/migrations');
    const files = (await readdir(dir))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    console.log(`▶ ${files.length} migration sırayla çalıştırılacak`);
    for (const f of files) {
      console.log(`\n── ${f} ──`);
      const sql = await readFile(join(dir, f), 'utf8');
      await runSql(sql);
      console.log(`✅ ${f}`);
    }
    return;
  }

  help();
  process.exit(1);
}

main().catch((err) => {
  console.error('Hata:', err.message ?? err);
  process.exit(1);
});
