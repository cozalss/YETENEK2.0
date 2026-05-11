# Supabase — Yetenek 2.0

Bu klasor `metu-sports-hackathon` (eu-west-1) projesinin
**versiyonlanmis schema kaynagidir**. GitHub'a push edildiginde Supabase
otomatik olarak migration'lari dashboard'a uygular (Project Settings →
GitHub baglantisi aktif).

## Migration zinciri (tek doğruluk kaynağı)

```
supabase/
├── config.toml
└── migrations/
    ├── 0001_init.sql           # profiles, children, sessions, RLS, handle_new_user
    ├── 0002_child_progress.sql # child_badges, child_progress_summary view
    └── 0003_extras.sql         # app_role, denorm cols, coach_chats, storage buckets
```

**Konvansiyon:** Tüm tablolar `parent_user_id` (auth.users → uuid) +
`display_name` + `age_years` alanlarını kullanır. `parent_id` / `name` /
`birth_date` adları ile yazılmış eski `20260511120000_initial_schema.sql`
**silindi**: kod tabanı (`src/infrastructure/storage/*`) yeni schema ile
uyumsuzdu. Bir daha aynı şemayı iki ayrı isimlendirmeyle yazmayalım.

## Tablolar

| Tablo | Amac |
|-------|------|
| `profiles` | `auth.users` uzantisi — `id`, `full_name`, `role` (parent/coach/admin), `is_anonymous`. |
| `children` | Veliye bagli cocuk profilleri (`parent_user_id`, `display_name`, `age_years`, `sex`, `height_cm`, `weight_kg`, `avatar_emoji`). |
| `sessions` | Tamamlanmis 7 testlik oturum. `summary` JSONB = `SessionSummarySchema`. `0003`'te eklenen denormalize sütunlar analitik için. |
| `child_badges` | Her çocuğun kazandığı rozetler (composite PK: `child_id, badge_id`, idempotent). |
| `coach_chats` | Claude/Gemini koç sohbeti — her session için 0..1. |
| `children_with_stats` | View: child + session_count + last_tested_at. |
| `child_progress_summary` | View: child + badge_count + session_count + last_tested_at + streak_days. |

**KVKK:** Hiçbir tablo video / kare / ham keypoint saklamaz. Yalnızca
özet metrikler (sıçrama yüksekliği cm, denge skoru vb.). Pose işleme
cihazda `@mediapipe/tasks-vision` ile yapılır.

## Anahtarlari Al

1. https://supabase.com/dashboard/project/wwevvbwmrsjhfslkzucd/settings/api
2. Şu 3 değeri kopyala:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (sadece server)
3. `.env.local` içine yapıştır.

## Migration Akisi

### Otomatik (production)
```bash
git add supabase/
git commit -m "feat(db): consolidate schema (0001→0002→0003)"
git push origin main
```
GitHub bağlantısı sayesinde Supabase ~30sn içinde migration'i deploy eder.
Dashboard'da görmek: Database → Migrations.

### Lokal gelistirme (opsiyonel)
```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref wwevvbwmrsjhfslkzucd
pnpm dlx supabase start                            # Docker gerekli
pnpm dlx supabase migration new <kisa_isim>        # yeni migration iskeleti
pnpm dlx supabase db diff -f <kisa_isim>           # Studio'dan diff yakala
```

## TypeScript tipleri

Migration deploy olduktan sonra:
```bash
pnpm dlx supabase gen types typescript \
  --project-id wwevvbwmrsjhfslkzucd \
  --schema public \
  > src/lib/supabase/database.types.ts
```

## Gerekli npm paketleri

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

## Hizli sanity check

Dashboard SQL Editor'ünde:
```sql
-- Tablolar olustu mu?
select tablename from pg_tables where schemaname = 'public';

-- RLS acik mi?
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- Policy'ler var mi?
select tablename, policyname from pg_policies where schemaname = 'public';

-- children şeması doğru mu?
\d public.children
-- parent_user_id (uuid), display_name (text), age_years (int) görmelisin.
```

## Anonymous sign-in

`config.toml` içinde `enable_anonymous_sign_ins = true`. Production
dashboard'da da AÇIK olmalı: Authentication → Providers → Anonymous.

```ts
const supabase = createSupabaseBrowserClient();
await supabase.auth.signInAnonymously();
// → profiles satırı handle_new_user() trigger ile otomatik oluşur
//   (is_anonymous = true).
```

Veli sonradan email/Google'a "upgrade" edebilir; aynı auth.users id'si
korunur, history kaybolmaz.
