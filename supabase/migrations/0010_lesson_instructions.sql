-- Yetenek 2.0 — Migration 0010: lesson_instructions
--
-- src/lib/lessons/curriculum.ts'deki ders METİN içerikleri DB'ye.
-- Validator config (type, holdMs, threshold, reps) KOD'da kalır çünkü
-- pose pipeline runtime'da bunları çağırır — deploy beklemeden değiştirmek
-- istenmez (validation tutarlılığı bozulur).
--
-- DB'ye giden: id, sport_slug, order, name, description, difficulty, instructions[].

create table if not exists public.lesson_instructions (
  id text primary key check (char_length(id) between 1 and 80),
  sport_slug text not null check (char_length(sport_slug) between 1 and 40),
  display_order int not null check (display_order between 1 and 100),
  name text not null,
  description text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  instructions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_instructions_sport_idx
  on public.lesson_instructions(sport_slug, display_order);

drop trigger if exists lesson_instructions_set_updated_at on public.lesson_instructions;
create trigger lesson_instructions_set_updated_at
  before update on public.lesson_instructions
  for each row execute function public.set_updated_at();

alter table public.lesson_instructions enable row level security;

drop policy if exists "lesson_instructions_public_read" on public.lesson_instructions;
create policy "lesson_instructions_public_read" on public.lesson_instructions for select using (true);

-- ─── SEED — 24 ders (12 spor × 2) ─────────────────────────────────────
insert into public.lesson_instructions (id, sport_slug, display_order, name, description, difficulty, instructions) values
  ('taekwondo-1', 'taekwondo', 1, 'Hazır Duruş (Joonbi)',
    'Taekwondo seansının başlangıç duruşu — odaklan, dengeli dur.', 'beginner',
    '["Ayakların omuz genişliğinde, paralel dur.","Yumrukları kapat, bel hizasına getir.","Sırtın dik, omuzlar gevşek.","3 saniye boyunca sabit dur."]'::jsonb),
  ('taekwondo-2', 'taekwondo', 2, 'Ön Tekme (Ap Chagi)',
    'Diz yukarı, ayak ileri — 3 tekrarlı ön tekme dizisi.', 'intermediate',
    '["Hazır duruşta başla.","Sağ dizini bel hizasına kaldır.","Ayağı düz öne uzat ve indir.","Toplam 3 tekme yap."]'::jsonb),

  ('boks-1', 'boks', 1, 'Guard Duruşu',
    'Klasik boks guard pozisyonu — savunma temeli.', 'beginner',
    '["Sol ayak önde, hafif dizler bükük.","Yumruklar yanak hizasında, dirsekler içeri.","Çene aşağıda, gözler ileride.","3 saniye sabit dur."]'::jsonb),
  ('boks-2', 'boks', 2, 'Direkt Yumruk (Jab)',
    'Sol elden hızlı, düz yumruk — 3 tekrar.', 'intermediate',
    '["Guard pozisyonunda başla.","Sol yumruğu öne hızla uzat.","Yumruğu geri çek, guard''a dön.","Toplam 3 jab at."]'::jsonb),

  ('voleybol-1', 'voleybol', 1, 'Hazır Duruş',
    'Servis karşılama pozisyonu — bacaklar bükülü, eller önde.', 'beginner',
    '["Ayaklar omuz genişliğinde, hafif öne eğil.","Dizler hafif bükülü.","Eller önde, parmak uçları birleşik.","3 saniye sabit dur."]'::jsonb),
  ('voleybol-2', 'voleybol', 2, 'Smaç Sıçraması',
    'Çömel, patla, yukarı sıçra — 3 tekrar.', 'intermediate',
    '["Dik dur.","Hızla çömel (squat pozisyonu).","Patlayıcı bir hareketle yukarı sıçra.","Toplam 3 sıçrama."]'::jsonb),

  ('basketbol-1', 'basketbol', 1, 'Savunma Duruşu',
    'Düşük basket savunma pozisyonu — dengeli ve hızlı reaksiyon.', 'beginner',
    '["Ayaklar omuz genişliğinden geniş açıkta.","Dizler bükülü, vücut hafif öne eğik.","Eller yanlarda, avuçlar dışa dönük.","3 saniye sabit dur."]'::jsonb),
  ('basketbol-2', 'basketbol', 2, 'Şut Sıçraması',
    'Pas sonrası şut için patlayıcı dikey sıçrama — 3 tekrar.', 'intermediate',
    '["Dik dur, eller şut pozisyonunda.","Çömel ve hızla sıçra.","Havada düz dur, in.","Toplam 3 sıçrama."]'::jsonb),

  ('tenis-1', 'tenis', 1, 'Ready Position',
    'Servis karşılama duruşu — denge ve hızlı reaksiyon.', 'beginner',
    '["Ayaklar omuz genişliğinde, hafif çömelmiş.","Raket önde, iki elle tut.","Vücut hafif öne eğik.","3 saniye sabit dur."]'::jsonb),
  ('tenis-2', 'tenis', 2, 'Forehand Vuruşu',
    'Sağ kol sağa uzansın — top karşılama vuruşu, 3 tekrar.', 'intermediate',
    '["Ready pozisyonunda başla.","Sağ kolu sağa doğru uzat (vuruş).","Geri ready pozisyonuna dön.","Toplam 3 forehand."]'::jsonb),

  ('yuzme-1', 'yuzme', 1, 'Vücut Hizalama',
    'Yüzme öncesi gergin, hizalanmış duruş — postür çalışması.', 'beginner',
    '["Dik dur, eller yan tarafta.","Karın kasları gergin, sırtın düz.","Bakışlar ileri.","3 saniye sabit dur."]'::jsonb),
  ('yuzme-2', 'yuzme', 2, 'Kuru Kulaç',
    'Sağ kolun ileri uzanması — serbest stil kulaç simülasyonu, 3 tekrar.', 'intermediate',
    '["Dik dur.","Sağ kolu yukarı/ileri uzat.","Geri çek (su itme hareketi).","Toplam 3 kulaç."]'::jsonb),

  ('futbol-1', 'futbol', 1, 'Hazır Bekleme',
    'Topa hızlı tepki için merkezde dengeli duruş.', 'beginner',
    '["Ayaklar omuz genişliğinde.","Dizler hafif bükülü, ağırlık parmak uçlarında.","Sırt dik, eller yanlarda hareketli.","3 saniye sabit dur."]'::jsonb),
  ('futbol-2', 'futbol', 2, 'Şut Hareketi (Diz Çek)',
    'Sağ dizini bele doğru kaldır, ardından ayağı öne savur — şut simülasyonu, 3 tekrar.', 'intermediate',
    '["Sol ayak yere basılı, sağ ayak hazır.","Sağ dizini bel hizasına yukarı çek (back swing).","Düz öne savur (şut), dizini indir.","Toplam 3 şut."]'::jsonb),

  ('atletizm-1', 'atletizm', 1, 'Start Pozisyonu',
    'Sprint başlangıç duruşu — patlayıcı çıkış için temel.', 'beginner',
    '["Bir ayak önde, bir ayak arkada.","Dizler hafif bükülü, vücut öne eğik.","Kollar hareket pozisyonunda (biri önde, biri arkada).","3 saniye sabit dur."]'::jsonb),
  ('atletizm-2', 'atletizm', 2, 'Diz Çekme',
    'Sprint diz çekme drili — dizini bele kadar yukarı çek, 3 tekrar.', 'intermediate',
    '["Dik dur.","Sağ dizini bel hizasına yukarı çek.","İndir, sol dize geç.","Toplam 3 diz çekme."]'::jsonb),

  ('cimnastik-1', 'cimnastik', 1, 'Sırt Düz Duruş',
    'Mükemmel postür — cimnastiğin temeli, sırt-omuz hizası.', 'beginner',
    '["Dik dur, ayaklar bitişik.","Karın içeri, omuzlar arkada.","Eller yana açık, parmak uçları gergin.","3 saniye sabit dur."]'::jsonb),
  ('cimnastik-2', 'cimnastik', 2, 'Çömelme Drili',
    'Kontrollü çömel-kalk — bacak gücü için, 3 tekrar.', 'intermediate',
    '["Dik dur.","Yavaşça çömel (kalçayı geri it).","Geri kalk.","Toplam 3 squat."]'::jsonb),

  ('judo-1', 'judo', 1, 'Shisei (Doğru Duruş)',
    'Judo temel duruşu — dengeli, esnek, hazır.', 'beginner',
    '["Ayaklar omuz genişliğinde.","Dizler hafif bükülü.","Sırt dik, omuzlar gevşek.","3 saniye sabit dur."]'::jsonb),
  ('judo-2', 'judo', 2, 'Çömelme Hazırlığı',
    'Rakibe atak için alçalma drili — 3 tekrarlı squat.', 'intermediate',
    '["Hazır duruşta başla.","Hızla çömel (rakibin altına gir).","Geri kalk.","Toplam 3 tekrar."]'::jsonb),

  ('masa-tenisi-1', 'masa-tenisi', 1, 'Hazır Duruş',
    'Servis bekleme — düşük, hızlı reaksiyon pozisyonu.', 'beginner',
    '["Ayaklar omuz genişliğinden geniş.","Dizler bükülü, vücut hafif öne eğik.","Raket önde, bel hizasında.","3 saniye sabit dur."]'::jsonb),
  ('masa-tenisi-2', 'masa-tenisi', 2, 'Forehand Vuruş',
    'Sağ kol sağa, hızlı vuruş simülasyonu — 3 tekrar.', 'intermediate',
    '["Hazır duruşta başla.","Sağ kolu sağa hızla uzat (vuruş).","Geri çek.","Toplam 3 vuruş."]'::jsonb),

  ('badminton-1', 'badminton', 1, 'Hazır Duruş',
    'Servis karşılama — dengeli, yüksek bir reaksiyon pozisyonu.', 'beginner',
    '["Ayaklar omuz genişliğinde.","Dizler hafif bükülü.","Raket önde, gözler ileride.","3 saniye sabit dur."]'::jsonb),
  ('badminton-2', 'badminton', 2, 'Smaç Vuruşu',
    'Sağ kol yukarı hızla uzansın — smaç simülasyonu, 3 tekrar.', 'intermediate',
    '["Hazır duruşta başla.","Sağ kolu başının üstüne hızla kaldır.","İndir.","Toplam 3 smaç."]'::jsonb)
on conflict (id) do update set
  sport_slug = excluded.sport_slug,
  display_order = excluded.display_order,
  name = excluded.name,
  description = excluded.description,
  difficulty = excluded.difficulty,
  instructions = excluded.instructions,
  updated_at = now();
