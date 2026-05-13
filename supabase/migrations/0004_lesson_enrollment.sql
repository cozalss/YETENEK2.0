-- Yetenek 2.0 — Migration 0004: lesson enrollment + progress
--
-- Test sonrası kullanıcı önerilen 3 spordan birini seçer ("kayıt olur").
-- Sonra o branşın dersleri kamera önünde yapılır; her tamamlanan ders
-- DB'ye işlenir. Profil sayfası bu iki tablodan "antrenman programım"
-- kartını üretir.
--
-- Tasarım kararları:
--   - Per-user (auth.users) tek slot enrollment: yeni seçim eskini değiştirir.
--     Daha basit ve hackathon demosunda yeterli; child-bazlı genişleme
--     ileride child_id kolonu eklenerek yapılabilir.
--   - lesson_progress tek-tamamlanma kaydı (idempotent): aynı dersi tekrar
--     yapmak yeni satır AÇMAZ, sadece `completed_at`, `duration_ms`,
--     `reps`'i günceller (upsert).
--   - RLS: kullanıcı yalnız kendi enrollment + progress'ini okur/yazar.
--
-- Çalıştırma: SQL Editor'a yapıştır → Run.

-- ─── LESSON_ENROLLMENT ────────────────────────────────────────────────
create table if not exists public.lesson_enrollment (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sport_slug text not null check (char_length(sport_slug) between 1 and 40),
  enrolled_at timestamptz not null default now()
);

create index if not exists lesson_enrollment_sport_idx
  on public.lesson_enrollment(sport_slug);

alter table public.lesson_enrollment enable row level security;

drop policy if exists "lesson_enrollment_self_read" on public.lesson_enrollment;
create policy "lesson_enrollment_self_read" on public.lesson_enrollment
  for select using (auth.uid() = user_id);

drop policy if exists "lesson_enrollment_self_insert" on public.lesson_enrollment;
create policy "lesson_enrollment_self_insert" on public.lesson_enrollment
  for insert with check (auth.uid() = user_id);

drop policy if exists "lesson_enrollment_self_update" on public.lesson_enrollment;
create policy "lesson_enrollment_self_update" on public.lesson_enrollment
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lesson_enrollment_self_delete" on public.lesson_enrollment;
create policy "lesson_enrollment_self_delete" on public.lesson_enrollment
  for delete using (auth.uid() = user_id);

-- ─── LESSON_PROGRESS ──────────────────────────────────────────────────
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) between 1 and 80),
  sport_slug text not null check (char_length(sport_slug) between 1 and 40),
  completed_at timestamptz not null default now(),
  duration_ms int,
  reps int,
  primary key (user_id, lesson_id)
);

create index if not exists lesson_progress_user_sport_idx
  on public.lesson_progress(user_id, sport_slug);

alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_self_read" on public.lesson_progress;
create policy "lesson_progress_self_read" on public.lesson_progress
  for select using (auth.uid() = user_id);

drop policy if exists "lesson_progress_self_insert" on public.lesson_progress;
create policy "lesson_progress_self_insert" on public.lesson_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_self_update" on public.lesson_progress;
create policy "lesson_progress_self_update" on public.lesson_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lesson_progress_self_delete" on public.lesson_progress;
create policy "lesson_progress_self_delete" on public.lesson_progress
  for delete using (auth.uid() = user_id);
