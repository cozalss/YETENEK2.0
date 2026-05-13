-- Yetenek 2.0 — Migration 0011: lesson_enrollment + lesson_progress per-child
--
-- Önceki tasarım: per-user (parent_user_id) tek slot. Sorun: veli birden
-- çok çocuğu varsa hangi çocuk için "Yüzme" seçildi belli değil. Aslında
-- test sırasında çocuk seçili → enrollment de o çocuğa ait olmalı.
--
-- Yeni tasarım:
--   lesson_enrollment: (user_id, child_id) → PK; her çocuk için tek slot
--   lesson_progress:   (user_id, child_id, lesson_id) → PK; idempotent per-child
--
-- Geriye uyumluluk: mevcut 1 satır (child_id'siz) wipe edilir — demo öncesi
-- önemsiz, kullanıcı yeni testten sonra zaten doğru child_id ile yazacak.

-- ─── LESSON_ENROLLMENT ────────────────────────────────────────────────
-- Önce eski satırları temizle (child_id'siz kaldı)
delete from public.lesson_enrollment;

-- child_id kolonu (NOT NULL — yeni satırlar her zaman child'a ait)
alter table public.lesson_enrollment
  add column if not exists child_id uuid
  references public.children(id) on delete cascade;

-- Eski PK'yı düşür
alter table public.lesson_enrollment drop constraint if exists lesson_enrollment_pkey;

-- child_id NOT NULL yap (artık zorunlu)
alter table public.lesson_enrollment alter column child_id set not null;

-- Yeni PK: (user_id, child_id) — bir veli her çocuk için tek aktif spor seçer
alter table public.lesson_enrollment add primary key (user_id, child_id);

create index if not exists lesson_enrollment_child_idx
  on public.lesson_enrollment(child_id);

-- ─── LESSON_PROGRESS ──────────────────────────────────────────────────
delete from public.lesson_progress;

alter table public.lesson_progress
  add column if not exists child_id uuid
  references public.children(id) on delete cascade;

alter table public.lesson_progress drop constraint if exists lesson_progress_pkey;

alter table public.lesson_progress alter column child_id set not null;

alter table public.lesson_progress add primary key (user_id, child_id, lesson_id);

create index if not exists lesson_progress_child_idx
  on public.lesson_progress(child_id, completed_at desc);

create index if not exists lesson_progress_child_sport_idx
  on public.lesson_progress(child_id, sport_slug);
