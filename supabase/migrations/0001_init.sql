-- Yetenek 2.0 — Initial schema
-- Tek migration: profiles → children → sessions zinciri.
-- RLS politikaları: kullanıcı sadece kendi verisini görür/düzenler.
--
-- Çalıştırma:
--   supabase login
--   supabase link --project-ref <your-project-ref>
--   supabase db push
-- veya:
--   psql -h db.<ref>.supabase.co -U postgres -d postgres -f 0001_init.sql

-- ─── PROFILES ────────────────────────────────────────────────────────
-- auth.users'a 1-1 bağlı profile (görünen ad vs).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- Auth user sign-up'ında otomatik profil oluştur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CHILDREN ────────────────────────────────────────────────────────
-- Her parent_user_id'nin birden çok çocuğu olabilir.
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  age_years int not null check (age_years between 4 and 18),
  sex text not null check (sex in ('male', 'female')),
  height_cm numeric check (height_cm is null or height_cm between 80 and 220),
  weight_kg numeric check (weight_kg is null or weight_kg between 15 and 200),
  avatar_emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists children_parent_idx on public.children(parent_user_id);

alter table public.children enable row level security;

drop policy if exists "children_self_read" on public.children;
create policy "children_self_read" on public.children
  for select using (auth.uid() = parent_user_id);

drop policy if exists "children_self_insert" on public.children;
create policy "children_self_insert" on public.children
  for insert with check (auth.uid() = parent_user_id);

drop policy if exists "children_self_update" on public.children;
create policy "children_self_update" on public.children
  for update using (auth.uid() = parent_user_id);

drop policy if exists "children_self_delete" on public.children;
create policy "children_self_delete" on public.children
  for delete using (auth.uid() = parent_user_id);

-- ─── SESSIONS ────────────────────────────────────────────────────────
-- Bir çocuğun bir test oturumu (CMJ + denge + reaksiyon + ... özet skorları).
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  -- Tüm test özetleri tek bir JSONB sütunda — schema esnek.
  -- Server tarafı sessionSummarySchema ile validate eder.
  summary jsonb not null,
  -- Top 3 önerilen spor (UI'da hızlı liste için, summary'den de türetilebilir).
  recommendations jsonb,
  injury_warnings text[],
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sessions_child_idx on public.sessions(child_id, completed_at desc);
create index if not exists sessions_parent_idx on public.sessions(parent_user_id, completed_at desc);

alter table public.sessions enable row level security;

drop policy if exists "sessions_self_read" on public.sessions;
create policy "sessions_self_read" on public.sessions
  for select using (auth.uid() = parent_user_id);

drop policy if exists "sessions_self_insert" on public.sessions;
create policy "sessions_self_insert" on public.sessions
  for insert with check (auth.uid() = parent_user_id);

drop policy if exists "sessions_self_update" on public.sessions;
create policy "sessions_self_update" on public.sessions
  for update using (auth.uid() = parent_user_id);

drop policy if exists "sessions_self_delete" on public.sessions;
create policy "sessions_self_delete" on public.sessions
  for delete using (auth.uid() = parent_user_id);

-- ─── HELPER VIEW (opsiyonel) ─────────────────────────────────────────
-- Child + son session özet view'ı, /profile sayfası tek query'de okur.
create or replace view public.children_with_stats
with (security_invoker = true) as
select
  c.*,
  (select count(*)::int from public.sessions s
     where s.child_id = c.id and s.completed_at is not null)
   as session_count,
  (select max(s.completed_at) from public.sessions s where s.child_id = c.id)
   as last_tested_at
from public.children c;
