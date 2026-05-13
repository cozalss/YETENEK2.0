-- Yetenek 2.0 — Migration 0009: training_programs + training_exercises
--
-- 7 boyut × ~5 egzersiz = 35 egzersiz. Coach veya klinik egzersiz
-- prescription'unu (tempo, set/rep) DB'den günceller, deploy beklemez.

create table if not exists public.training_programs (
  dimension text primary key check (char_length(dimension) between 1 and 40),
  title text not null,
  tagline text,
  description text not null,
  frequency text not null,
  duration text not null,
  benefits_for jsonb not null default '[]'::jsonb,
  safety_note text not null,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_exercises (
  id uuid primary key default gen_random_uuid(),
  dimension text not null references public.training_programs(dimension) on delete cascade,
  name text not null,
  emoji text,
  prescription text not null,
  description text not null,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dimension, name)
);

create index if not exists training_exercises_dim_idx
  on public.training_exercises(dimension, display_order);

drop trigger if exists training_programs_set_updated_at on public.training_programs;
create trigger training_programs_set_updated_at
  before update on public.training_programs
  for each row execute function public.set_updated_at();

drop trigger if exists training_exercises_set_updated_at on public.training_exercises;
create trigger training_exercises_set_updated_at
  before update on public.training_exercises
  for each row execute function public.set_updated_at();

alter table public.training_programs enable row level security;
alter table public.training_exercises enable row level security;

drop policy if exists "training_programs_public_read" on public.training_programs;
create policy "training_programs_public_read" on public.training_programs for select using (true);

drop policy if exists "training_exercises_public_read" on public.training_exercises;
create policy "training_exercises_public_read" on public.training_exercises for select using (true);

-- ─── SEED — 7 boyut ───────────────────────────────────────────────────
insert into public.training_programs (dimension, title, tagline, description, frequency, duration, benefits_for, safety_note, display_order) values
  ('explosivePower', 'Dikey Patlayıcı Güç', 'Sıçrama · Plyometric',
    'Hızlı kas-tendon esnemesi (stretch-shortening cycle) ile alt ekstremite patlayıcı kuvvetini geliştirir. Voleybol, basketbol, atlama branşları için belirleyici.',
    'Haftada 2 gün, en az 48 saat dinlenme', '6-8 hafta',
    '["Voleybol","Basketbol","Atletizm-Atlama","Cimnastik"]'::jsonb,
    'Pliyometrik egzersizler genç sporcularda 8 yaşından itibaren önerilir; haftada en az 1 gün tam dinlenme şart.',
    10),
  ('horizontalPower', 'Yatay Patlayıcı Güç', 'Sprint · Broad jump',
    'Yere yatay kuvvet uygulayarak hızlı ileri-itme kapasitesini geliştirir. Sprint, futbol, judo için kritik.',
    'Haftada 2-3 gün', '4-6 hafta',
    '["Atletizm","Futbol","Judo"]'::jsonb,
    'Sprint öncesi 8-10 dk dinamik ısınma. Hamstring esnetme + bacak savurma rutini eklenmeli.',
    20),
  ('balance', 'Denge & Postüral Kontrol', 'Tek-bacak · Kor stabilite',
    'Postüral salınım kontrolü, tek-bacak duruş süresi ve sol-sağ simetri. Asimetri sakatlanma riskini artırdığı için tüm sporlarda kritik.',
    'Haftada 3-4 gün, kısa seanslar', 'Sürekli (sporun parçası)',
    '["Cimnastik","Tenis","Judo","Yüzme","Tüm sporlar"]'::jsonb,
    'Asimetri %15''i geçen çocuklar için fizyoterapist veya spor hekimi konsültasyonu önerilir. Bu egzersizler tedavi yerine geçmez.',
    30),
  ('reaction', 'Reaksiyon Süresi', 'Bilişsel hız · Refleks',
    'Görsel/işitsel uyaranlara hızlı motor cevap. Raket sporları, masa tenisi, boks, takım sporları için temel yetenek.',
    'Haftada 3-5 gün, kısa seanslar (10-15 dk)', '4-8 hafta belirgin gelişim',
    '["Tenis","Masa Tenisi","Badminton","Boks","Taekwondo"]'::jsonb,
    'Reaksiyon antrenmanı yorucu değildir, ancak günde 15 dk''yı geçmemelidir; üzerinde dikkat dağılır.',
    40),
  ('agility', 'Çeviklik · COD', 'Yön değişimi · Lateral hareket',
    'Hızlı yön değiştirme + ivmelenme/yavaşlama yeteneği. Futbol, basketbol, badminton, tenis için belirleyici.',
    'Haftada 2-3 gün', '4-6 hafta',
    '["Futbol","Basketbol","Badminton","Tenis","Taekwondo"]'::jsonb,
    'Soğuk başlatma sakatlanma riski yaratır. Mutlaka 8-10 dk dinamik ısınma + bacak savurma + ankle mobility.',
    50),
  ('coordination', 'Koordinasyon · Göz-El', 'İnce motor · Tracking',
    'Görsel-motor uyumu, ince motor kontrol, ritmik hareket. Raket sporları, masa tenisi, dövüş sporlarının temeli.',
    'Haftada 4-5 gün, 15 dk', 'Sürekli',
    '["Masa Tenisi","Badminton","Tenis","Cimnastik","Boks"]'::jsonb,
    'Koordinasyon antrenmanı yorucu değildir; günlük rutinin parçası olabilir.',
    60),
  ('endurance', 'Aerobik & Anaerobik Dayanıklılık', 'Kardiyo kapasitesi',
    'Uzun süre yüksek tempo sürdürme + tekrarlı sprint kapasitesi. Yüzme, futbol, basketbol için kritik.',
    'Haftada 3-4 gün', '6-8 hafta',
    '["Yüzme","Futbol","Basketbol"]'::jsonb,
    'Yüksek yoğunluklu seanslar haftada en fazla 2 gün üst üste olmamalı. Yüklenme öncesi 10 dk ısınma şart.',
    70)
on conflict (dimension) do update set
  title = excluded.title,
  tagline = excluded.tagline,
  description = excluded.description,
  frequency = excluded.frequency,
  duration = excluded.duration,
  benefits_for = excluded.benefits_for,
  safety_note = excluded.safety_note,
  display_order = excluded.display_order,
  updated_at = now();

-- ─── SEED — 35 egzersiz ───────────────────────────────────────────────
-- explosivePower (5)
insert into public.training_exercises (dimension, name, emoji, prescription, description, display_order) values
  ('explosivePower', 'Box Jump (kutu sıçrama)', '📦', '3 set × 5-8 tekrar · 90 sn dinlenme', '30-40 cm kutuya sıçra, ininde sessiz/yumuşak. Çömelme amortisörü kullan; sırt düz kalsın.', 10),
  ('explosivePower', 'Depth Jump', '⬇️', '3 set × 4-6 tekrar · 2 dk dinlenme', 'Düşük (20-30 cm) kutudan in, yere değer değmez maksimum sıçra. SSC için altın standart.', 20),
  ('explosivePower', 'Pliyometrik Squat', '🦵', '3 set × 10 tekrar · 60 sn dinlenme', 'Çömel, patlayıcı şekilde dikey sıçra. Kollarını yukarı savur. Yere yumuşak in.', 30),
  ('explosivePower', 'Bulgarian Split Squat', '🚶', '3 set × 8 tekrar (her bacak) · 60 sn dinlenme', 'Arka ayak sandalyede, ön bacakta yarı çömel. Tek-bacak gücü + denge geliştirir.', 40),
  ('explosivePower', 'Skipping Hops', '🏃', '3 set × 15 m · 60 sn dinlenme', 'Yüksek diz kalkışı ile yerden hızlı temas, "yere yapışma" hissi. Aşil tendonu için ısınma kritik.', 50)
on conflict (dimension, name) do update set
  emoji = excluded.emoji, prescription = excluded.prescription, description = excluded.description,
  display_order = excluded.display_order, updated_at = now();

-- horizontalPower (5)
insert into public.training_exercises (dimension, name, emoji, prescription, description, display_order) values
  ('horizontalPower', 'Standing Long Jump', '🏃‍♂️', '3 set × 5 tekrar · 90 sn dinlenme', 'Çift ayak ileri uzun atlama. Her tekrarda mesafe ölç → progresif hedef koyar.', 10),
  ('horizontalPower', '20 m Sprint Start', '⏱️', '5 tekrar · 2 dk dinlenme', 'Crouch start veya falling start ile 20 metre maksimum hız. Kollarını agresif kullan.', 20),
  ('horizontalPower', 'Agility Ladder Forward', '🪜', '3 set × 4 geçiş · 45 sn dinlenme', 'Merdivende ayak frekansı (high-knees, in-out, lateral). Hız + koordinasyon birleşir.', 30),
  ('horizontalPower', 'Sled / Resistance Drag', '🎒', '4 set × 15 m · 90 sn dinlenme', 'Hafif direnç ile koşu. Yük: vücut ağırlığının %5-10''u. İtme kuvveti hissi geliştirir.', 40),
  ('horizontalPower', 'Bound (single-leg hop)', '🦘', '3 set × 6 atlayış (her bacak)', 'Tek bacakta uzun-mesafe sıçrama. Ileri-yan koordinasyon + stabilite.', 50)
on conflict (dimension, name) do update set
  emoji = excluded.emoji, prescription = excluded.prescription, description = excluded.description,
  display_order = excluded.display_order, updated_at = now();

-- balance (5)
insert into public.training_exercises (dimension, name, emoji, prescription, description, display_order) values
  ('balance', 'Tek Bacak Duruş', '🦩', '3 set × 30 sn (her bacak) · 30 sn dinlenme', 'Gözler açık → kapalı → kafayı sağa-sola çevir. Zorluk progresif artar.', 10),
  ('balance', 'Single-Leg Deadlift', '🏋️', '3 set × 8 tekrar (her bacak)', 'Hafif ağırlık veya boş çubuk. Kalçayı geri it, hamstring ger, dengede kal. Posterior chain.', 20),
  ('balance', 'Y-Balance Reach', '⭐', '3 set × 5 yön (her bacak)', 'Tek bacakta dur, diğer ayağı 3 yöne (öne, arka-iç, arka-dış) uzat. Reach + stabilizasyon.', 30),
  ('balance', 'BOSU/Yastık Squat', '🪵', '3 set × 10 tekrar', 'Yumuşak yüzeyde squat. Düz çift ayak başlar; sonra tek ayağa geçilir.', 40),
  ('balance', 'Side Plank (yan plank)', '🌉', '3 set × 30-45 sn (her taraf)', 'Lateral kor stabilite. Asimetri varsa zayıf taraf için 1-2 set ekstra.', 50)
on conflict (dimension, name) do update set
  emoji = excluded.emoji, prescription = excluded.prescription, description = excluded.description,
  display_order = excluded.display_order, updated_at = now();

-- reaction (5)
insert into public.training_exercises (dimension, name, emoji, prescription, description, display_order) values
  ('reaction', 'Tennis Ball Drop', '🎾', '5 set × 8 yakalama', 'Antrenör/aile düşürür, çocuk omuz yüksekliğinden yere değmeden yakalar. Mesafe progresif kısalır.', 10),
  ('reaction', 'Partner Clap Reaction', '👋', '3 set × 30 sn', 'Karşılıklı durulur, biri rastgele alkışlar. Diğeri alkış sesinde squat''a girer veya jumping jack yapar.', 20),
  ('reaction', 'Renk Tepkisi (3 renk)', '🎨', '3 set × 20 tekrar', '3 farklı renk kart. Her renk farklı hareket (kırmızı: çömel, mavi: zıpla, sarı: dön).', 30),
  ('reaction', 'Sallanan Top', '🥎', '3 set × 20 yakalama', 'Tavandan iple sarkıtılan tenis topu, 3-4 m mesafeden çocuğa rastgele yön verilir; çocuk yakalar.', 40),
  ('reaction', 'Yetenek 2.0 Reaksiyon Testi', '📱', '5 deneme × 3 set haftada', 'Uygulamamızdaki reaksiyon testini düzenli yap; ortalaması ms cinsinden takip edilir.', 50)
on conflict (dimension, name) do update set
  emoji = excluded.emoji, prescription = excluded.prescription, description = excluded.description,
  display_order = excluded.display_order, updated_at = now();

-- agility (5)
insert into public.training_exercises (dimension, name, emoji, prescription, description, display_order) values
  ('agility', '5-10-5 Shuttle', '🔁', '4 set · 90 sn dinlenme', 'Orta noktadan 5m sağa, 10m sola, 5m sağa. Klasik COD testi + antrenman.', 10),
  ('agility', 'T-Drill', '🎯', '4 set · 90 sn dinlenme', 'T şeklinde 4 koni. İlerle, sola yana git, dön, sağa yana git, dön, geri.', 20),
  ('agility', 'Lateral Cone Hop', '↔️', '3 set × 30 sn', 'İki koni arasında çift ayak yan sıçrama. Mümkün olduğunca hızlı.', 30),
  ('agility', 'Agility Ladder Lateral', '🪜', '3 set × 4 geçiş', 'Yan in-in-out-out, ali-shuffle, icky-shuffle gibi kalıplar. Ayak frekansı + koordinasyon.', 40),
  ('agility', 'Reactive Mirror Drill', '👁️', '3 set × 30 sn', 'Karşılıklı durur, biri lider rastgele yön değiştirir, diğeri ayna olarak takip eder.', 50)
on conflict (dimension, name) do update set
  emoji = excluded.emoji, prescription = excluded.prescription, description = excluded.description,
  display_order = excluded.display_order, updated_at = now();

-- coordination (5)
insert into public.training_exercises (dimension, name, emoji, prescription, description, display_order) values
  ('coordination', 'Ball Juggling', '🤹', '3 set × 1 dk', '2 top ile başla, 3 topa geç. El-göz koordinasyonu için klasik. Aynı anda saymak ekstra zorluk.', 10),
  ('coordination', 'Wall Toss & Catch', '🎾', '3 set × 30 sn', 'Duvara hızlı top fırlat-yakala. Tek el → çift el geçişleri ekle. Zorluk: 2 top alternatif.', 20),
  ('coordination', 'Cross-Body Pattern', '🎨', '3 set × 30 sn', 'Sağ el sol dize, sol el sağ omuza vb. çapraz kalıplar. Her seferinde hızlanır.', 30),
  ('coordination', 'Mini Paddle Bounce', '🏓', '3 set × 30 saniye', 'Masa tenis raketinde topu zıplatma. 20''yi geçince havada zıplatma egzersizi başlar.', 40),
  ('coordination', 'Pursuit Gaze Drill', '👀', '3 set × 30 sn', 'Hareket eden bir hedefi (sallanan top, drone, lazer noktası) gözle takip et. Boyun sabit kalır.', 50)
on conflict (dimension, name) do update set
  emoji = excluded.emoji, prescription = excluded.prescription, description = excluded.description,
  display_order = excluded.display_order, updated_at = now();

-- endurance (5)
insert into public.training_exercises (dimension, name, emoji, prescription, description, display_order) values
  ('endurance', 'Jumping Jack Intervals', '🤸', '6 set × 30 sn iş / 30 sn dinlenme', 'Klasik jumping jack 30 sn maksimum tempo, 30 sn yürüme. Kalp atışı hızla yükselir.', 10),
  ('endurance', 'Mountain Climbers', '🧗', '4 set × 30 sn · 30 sn dinlenme', 'Yüksek plank duruşunda dizleri sıra ile göğüse çek. Kor + kardiyo birleşir.', 20),
  ('endurance', 'Burpee 30s AMRAP', '💥', '3 set × 30 sn · 60 sn dinlenme', 'Squat + plank + zıpla. 30 sn içinde mümkün olduğunca çok tekrar (As Many Reps As Possible).', 30),
  ('endurance', 'Beep Test / Yo-Yo', '🏃‍♀️', 'Haftada 1 kez · ilerleyici', '20m mekik koşu, sinyal hızı kademeli artar. Aerobik kapasite testi + antrenman.', 40),
  ('endurance', 'Tabata Bisiklet', '🚴', '8 tekrar × 20sn maks / 10sn dinlenme', '4 dakikada anaerobik HIIT. Bisiklet veya koşu bandı. Kalp atışı 90% maksimuma.', 50)
on conflict (dimension, name) do update set
  emoji = excluded.emoji, prescription = excluded.prescription, description = excluded.description,
  display_order = excluded.display_order, updated_at = now();
