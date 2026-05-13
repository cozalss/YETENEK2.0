-- Yetenek 2.0 — Migration 0007: badges_metadata
--
-- Rozet metadata (id, emoji, isim, açıklama) DB'ye taşınır.
-- Criteria fonksiyonları (`computeBadgesForSession` içindeki if blokları)
-- src/lib/gamification/badges.ts'de KALIR — pose/skor analizi çekirdek logic.
--
-- UI rozet reveal'i metadata'yı DB'den (cached) çeker; isim/emoji düzeltmesi
-- deploy bekletmeden anında canlıya gider.

create table if not exists public.badges_metadata (
  id text primary key check (char_length(id) between 1 and 60),
  category text not null check (category in ('performance', 'profile', 'general', 'streak')),
  emoji text not null,
  name text not null check (char_length(name) between 1 and 60),
  description text not null,
  earned_for text not null,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists badges_metadata_category_idx on public.badges_metadata(category, display_order);

drop trigger if exists badges_metadata_set_updated_at on public.badges_metadata;
create trigger badges_metadata_set_updated_at
  before update on public.badges_metadata
  for each row execute function public.set_updated_at();

alter table public.badges_metadata enable row level security;

drop policy if exists "badges_metadata_public_read" on public.badges_metadata;
create policy "badges_metadata_public_read" on public.badges_metadata for select using (true);

-- ─── SEED — 26 rozet ──────────────────────────────────────────────────
insert into public.badges_metadata (id, category, emoji, name, description, earned_for, display_order) values
  ('firstStep', 'general', '🌱', 'İlk Adım', 'Yetenek 2.0 yolculuğun başladı.', 'İlk testini tamamladın', 10),
  ('quickCheck', 'general', '✅', 'Hızlı Tarama', 'Çekirdek testleri tamamladın.', '3 çekirdek test (sıçrama + denge + reaksiyon) tamamlandı', 20),
  ('fullScreening', 'general', '🏆', 'Tam Tarama', 'Tüm 7 testi tamamladın, profilin eksiksiz çıkarıldı.', '7 testin tamamı yapıldı', 30),
  ('perfectScore', 'general', '💯', 'Mükemmel Skor', 'Bir testte neredeyse mükemmel skor aldın.', 'Bir testte 95+ skor', 40),
  ('symmetric', 'general', '⚖️', 'Dengeli Sporcu', 'Sol-sağ vücut dengen kusursuz.', 'Asimetri %5 altında', 50),
  ('sevenWonders', 'general', '🌟', 'Yedi Yıldız', 'Yedi boyutta da yaş ortalamasının üstündesin.', 'Tüm 7 testte 60+ skor', 60),

  ('rocketBack', 'performance', '🚀', 'Roketsırtı', 'Sıçrama gücün yaş ortalamasının çok üstünde.', 'Sıçrama testinde 80+ skor', 110),
  ('longJumper', 'performance', '💨', 'Yatay Roket', 'Yatay patlayıcı gücün yaş ortalamasının çok üstünde.', 'Uzun atlama testinde 80+ skor', 120),
  ('acrobat', 'performance', '🤸', 'Akrobat', 'Postüral kontrolün ileri düzeyde.', 'Denge testinde 80+ skor (her iki bacak)', 130),
  ('lightning', 'performance', '⚡', 'Şimşek', 'Refleksin yaş grubunun üst diliminde.', 'Reaksiyon yaş norm skoru 80+', 140),
  ('ninja', 'performance', '🥷', 'Ninja', 'Yön değiştirme hızın olağanüstü.', 'Çeviklik testinde 80+ skor', 150),
  ('sharpEye', 'performance', '🎯', 'Keskin Göz', 'Göz-el koordinasyonun ileri seviyede.', 'Koordinasyon testinde 80+ skor', 160),
  ('marathoner', 'performance', '🔥', 'Maraton Yüreği', 'Dayanıklılığın yaşıtlarından üstün.', 'Dayanıklılık testinde 80+ skor', 170),

  ('volleyballStar', 'profile', '🏐', 'Voleybol Yıldızı', 'Profilin voleybol için ideal eşleşiyor.', 'Voleybol önerisi 80%+ eşleşme', 210),
  ('basketballPotential', 'profile', '🏀', 'Basketbol Yeteneği', 'Sıçrama ve koordinasyonun basketbol için ideal.', 'Basketbol önerisi 80%+ eşleşme', 220),
  ('tennisHeart', 'profile', '🎾', 'Tenis Tutkunu', 'Reaksiyon ve dengen tenis için ideal.', 'Tenis önerisi 80%+ eşleşme', 230),
  ('swimmer', 'profile', '🏊', 'Yüzücü', 'Profilin yüzme için uygun.', 'Yüzme önerisi 80%+ eşleşme', 240),
  ('footballPotential', 'profile', '⚽', 'Futbol Yeteneği', 'Dengeli profilin futbol için uygun.', 'Futbol önerisi 80%+ eşleşme', 250),
  ('sprinter', 'profile', '🏃', 'Atletizm Yeteneği', 'Yatay patlayıcı gücün ve reaksiyonun atletizm sprint için ideal.', 'Atletizm önerisi 80%+ eşleşme', 260),
  ('gymnast', 'profile', '🤾', 'Cimnastikçi', 'Denge ve koordinasyon profilin cimnastik için harika.', 'Cimnastik önerisi 80%+ eşleşme', 270),
  ('judoka', 'profile', '🥋', 'Judo Yeteneği', 'Denge ve patlayıcı gücün judo için uygun.', 'Judo önerisi 80%+ eşleşme', 280),
  ('taekwon', 'profile', '🦵', 'Taekwondo Yeteneği', 'Reaksiyon ve çevikliğin taekwondo için ideal.', 'Taekwondo önerisi 80%+ eşleşme', 290),
  ('boxer', 'profile', '🥊', 'Boksör', 'Reaksiyon ve dayanıklılık profilin bokstur.', 'Boks önerisi 80%+ eşleşme', 300),
  ('paddler', 'profile', '🏓', 'Masa Tenisçi', 'Reaksiyon ve koordinasyonun masa tenisi için harika.', 'Masa Tenisi önerisi 80%+ eşleşme', 310),
  ('shuttler', 'profile', '🏸', 'Badmintoncu', 'Reaksiyon, çeviklik, koordinasyon — badminton için ideal.', 'Badminton önerisi 80%+ eşleşme', 320)
on conflict (id) do update set
  category = excluded.category,
  emoji = excluded.emoji,
  name = excluded.name,
  description = excluded.description,
  earned_for = excluded.earned_for,
  display_order = excluded.display_order,
  updated_at = now();
