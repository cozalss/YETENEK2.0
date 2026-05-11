-- Yetenek 2.0 — Migration 0003: extras
--
-- Bu migration 0001 + 0002 üzerine şunları ekler:
--   1. `app_role` enum + `profiles.role` + `profiles.is_anonymous`
--      → ileride coach/admin rolleri ve anonymous sign-in için.
--   2. `sessions` üzerinde denormalize snapshot sütunları (analitik /
--      leaderboard sorgularını JSONB'ye girmeden ucuz hale getirir).
--   3. `coach_chats` tablosu → Claude/Gemini koç sohbeti her session için 0..1.
--   4. Storage bucket'ları (avatars, reports) + owner-only RLS politikaları.
--
-- KRİTİK: Bu migration 0001 + 0002 ile **aynı şema konvansiyonunu** kullanır
--   (parent_user_id, display_name, age_years). Daha önce farklı isimlendirmeyle
--   yazılmış olan `20260511120000_initial_schema.sql` SİLİNDİ — tek doğruluk
--   kaynağı 0001 → 0002 → 0003 zinciri.
--
-- Çalıştırma:
--   supabase db push
-- veya SQL Editor'a yapıştır → Run.

-- ─── ENUMS ───────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('parent', 'coach', 'admin');
  end if;
end$$;

-- ─── PROFILES — rol + anonymous ──────────────────────────────────────
alter table public.profiles
  add column if not exists role public.app_role not null default 'parent';

alter table public.profiles
  add column if not exists is_anonymous boolean not null default false;

-- handle_new_user trigger'ı: anonymous sign-in işaretini doldur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, is_anonymous)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_app_meta_data->>'provider') = 'anonymous', false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── SESSIONS — denormalize snapshot sütunları ───────────────────────
-- Tüm değerler nullable: eski satırlar (varsa) bozulmaz, yeni insert'ler
-- adapter tarafından doldurulabilir. summary JSONB hâlâ tek doğruluk kaynağı.
alter table public.sessions
  add column if not exists top_sport text,
  add column if not exists top_sport_confidence_pct smallint
    check (top_sport_confidence_pct is null
           or top_sport_confidence_pct between 0 and 100),
  add column if not exists overall_score smallint
    check (overall_score is null or overall_score between 0 and 100),
  add column if not exists injury_warning_count smallint not null default 0
    check (injury_warning_count >= 0),
  add column if not exists completed_test_count smallint not null default 0
    check (completed_test_count between 0 and 7),
  add column if not exists app_version text,
  add column if not exists device_info jsonb;

create index if not exists sessions_top_sport_idx
  on public.sessions (top_sport)
  where top_sport is not null;

create index if not exists sessions_summary_gin
  on public.sessions using gin (summary jsonb_path_ops);

-- ─── COACH_CHATS ─────────────────────────────────────────────────────
-- Her session için opsiyonel sohbet geçmişi.
create table if not exists public.coach_chats (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  parent_user_id  uuid not null references auth.users(id) on delete cascade,
  messages        jsonb not null default '[]'::jsonb,
  message_count   smallint not null default 0 check (message_count >= 0),
  tokens_used     integer check (tokens_used is null or tokens_used >= 0),
  cost_usd        numeric(10, 6) check (cost_usd is null or cost_usd >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists coach_chats_session_idx
  on public.coach_chats (session_id);

create index if not exists coach_chats_parent_idx
  on public.coach_chats (parent_user_id, created_at desc);

alter table public.coach_chats enable row level security;

drop policy if exists "coach_chats_self_read" on public.coach_chats;
create policy "coach_chats_self_read" on public.coach_chats
  for select using (auth.uid() = parent_user_id);

drop policy if exists "coach_chats_self_insert" on public.coach_chats;
create policy "coach_chats_self_insert" on public.coach_chats
  for insert with check (auth.uid() = parent_user_id);

drop policy if exists "coach_chats_self_update" on public.coach_chats;
create policy "coach_chats_self_update" on public.coach_chats
  for update using (auth.uid() = parent_user_id)
  with check (auth.uid() = parent_user_id);

-- ─── STORAGE BUCKETS ─────────────────────────────────────────────────
-- Avatars (image) + reports (PDF). Owner klasör pattern'i: <uid>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 2097152,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('reports', 'reports', false, 5242880,
   array['application/pdf'])
on conflict (id) do nothing;

-- Avatars policies
drop policy if exists "avatars_owner_select" on storage.objects;
create policy "avatars_owner_select" on storage.objects
  for select using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Reports policies
drop policy if exists "reports_owner_select" on storage.objects;
create policy "reports_owner_select" on storage.objects
  for select using (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "reports_owner_insert" on storage.objects;
create policy "reports_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "reports_owner_delete" on storage.objects;
create policy "reports_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
