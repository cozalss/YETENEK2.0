-- Yetenek 2.0 — Migration 0002: per-child progress (badges + streak)
--
-- Önceki versiyonda gamification (rozetler, streak) parent-level localStorage'da
-- tutuluyordu — yanlış mental model. Veli birden fazla çocuk ekleyebildiği için
-- her çocuğun KENDİ cüzdanı, KENDİ test geçmişi, KENDİ sürekliliği olmalı.
--
-- Bu migration:
--   1. child_badges tablosu — her çocuğun kazandığı rozetlerin kaydı
--   2. RLS: parent yalnız kendi çocuklarının rozetlerini görür/değiştirir
--   3. child_progress_summary view — UI tek query'de cüzdan boyutu + streak çekebilir
--
-- Çalıştırma: SQL Editor'a yapıştır → Run.

-- ─── CHILD_BADGES ─────────────────────────────────────────────────────
create table if not exists public.child_badges (
  child_id uuid not null references public.children(id) on delete cascade,
  badge_id text not null check (char_length(badge_id) between 1 and 60),
  -- Hangi session'da kazanıldı? Opsiyonel — eski rozet kayıtlarında null olabilir.
  earned_in_session uuid references public.sessions(id) on delete set null,
  -- Parent ID denormalize: RLS filter performansı + child silindiğinde cascade.
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (child_id, badge_id)
);

create index if not exists child_badges_parent_idx
  on public.child_badges(parent_user_id);

alter table public.child_badges enable row level security;

drop policy if exists "child_badges_self_read" on public.child_badges;
create policy "child_badges_self_read" on public.child_badges
  for select using (auth.uid() = parent_user_id);

drop policy if exists "child_badges_self_insert" on public.child_badges;
create policy "child_badges_self_insert" on public.child_badges
  for insert with check (auth.uid() = parent_user_id);

drop policy if exists "child_badges_self_delete" on public.child_badges;
create policy "child_badges_self_delete" on public.child_badges
  for delete using (auth.uid() = parent_user_id);

-- Update'e ihtiyaç yok — rozet "earn"den sonra immutable.

-- ─── CHILD_PROGRESS_SUMMARY VIEW ─────────────────────────────────────
-- UI için tek-query kompozisyon: çocuk + rozet sayısı + son test + 14-günlük
-- benzersiz test günü sayısı (streak).
create or replace view public.child_progress_summary
with (security_invoker = true) as
select
  c.id as child_id,
  c.parent_user_id,
  c.display_name,
  c.age_years,
  c.sex,
  c.avatar_emoji,
  (
    select count(*)::int
    from public.child_badges b
    where b.child_id = c.id
  ) as badge_count,
  (
    select count(*)::int
    from public.sessions s
    where s.child_id = c.id and s.completed_at is not null
  ) as session_count,
  (
    select max(s.completed_at)
    from public.sessions s
    where s.child_id = c.id
  ) as last_tested_at,
  (
    -- Son 14 gündeki benzersiz test günlerinin sayısı = streak.
    select count(distinct (s.completed_at::date))::int
    from public.sessions s
    where s.child_id = c.id
      and s.completed_at is not null
      and s.completed_at >= now() - interval '14 days'
  ) as streak_days
from public.children c;
