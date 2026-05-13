-- Yetenek 2.0 — Migration 0005: sport_recommendations
--
-- Test sonrası AI tarafından önerilen 3-5 spor; şu an `sessions.summary`
-- JSONB içinde gömülü (recommendations alanı). Bu tabloyla:
--   1. Sorgu/filtre: "Voleybol'a en yüksek confidence ile uygun çocuklar"
--   2. UI history: "Çocuğum 3 hafta önce hangi sporları önermişlerdi?"
--   3. Analytics: hangi sporlar kaç kez top-1 oldu
--   4. Bir kullanıcı bir sporu seçtikten sonra hangi önerilerden geldi
--
-- Tasarım: ayrı tablo (denormalize), session_id FK. recommendations JSONB
-- column kalır (geriye uyumluluk), ama yeni kod bu tabloyu yazar/okur.
--
-- Çalıştırma: pnpm db:sql supabase/migrations/0005_sport_recommendations.sql

create table if not exists public.sport_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,

  -- Önerilen spor + skorlar
  sport_slug text not null check (char_length(sport_slug) between 1 and 40),
  sport_name text not null check (char_length(sport_name) between 1 and 60),
  rank int not null check (rank between 1 and 10),
  confidence_percent int not null check (confidence_percent between 0 and 100),
  similarity numeric(5, 4) check (similarity between 0 and 1),
  anthro_bonus numeric(5, 4) check (anthro_bonus between 0 and 1),
  reason text,

  -- Bu öneri seçildi mi? (lesson_enrollment'la bağlanır)
  selected boolean not null default false,
  selected_at timestamptz,

  created_at timestamptz not null default now(),

  unique (session_id, rank)
);

create index if not exists sport_recommendations_child_idx
  on public.sport_recommendations(child_id, created_at desc);

create index if not exists sport_recommendations_session_idx
  on public.sport_recommendations(session_id);

create index if not exists sport_recommendations_sport_idx
  on public.sport_recommendations(sport_slug, confidence_percent desc);

alter table public.sport_recommendations enable row level security;

drop policy if exists "sport_recs_self_read" on public.sport_recommendations;
create policy "sport_recs_self_read" on public.sport_recommendations
  for select using (auth.uid() = parent_user_id);

drop policy if exists "sport_recs_self_insert" on public.sport_recommendations;
create policy "sport_recs_self_insert" on public.sport_recommendations
  for insert with check (auth.uid() = parent_user_id);

drop policy if exists "sport_recs_self_update" on public.sport_recommendations;
create policy "sport_recs_self_update" on public.sport_recommendations
  for update using (auth.uid() = parent_user_id) with check (auth.uid() = parent_user_id);

drop policy if exists "sport_recs_self_delete" on public.sport_recommendations;
create policy "sport_recs_self_delete" on public.sport_recommendations
  for delete using (auth.uid() = parent_user_id);
