-- Yetenek 2.0 — Migration 0015: badges_metadata expansion
--
-- 11 yeni rozet ekler:
--   5 session-based (champion, bigJumper, fastReflex, teamPlayer, fairPlayer)
--   3 streak (dailyHero, weekWarrior, committed)
--   3 lesson (firstLesson, lessonMaster, polymath)

insert into public.badges_metadata (id, category, emoji, name, description, earned_for, display_order) values
  ('firstLesson', 'general', '📚', 'İlk Ders',
    'Antrenman yolculuğunun ilk dersini bitirdin.',
    'İlk dersini tamamladın', 25),
  ('lessonMaster', 'general', '🎓', 'Branş Ustası',
    'Bir sporun yedi dersini de bitirdin.',
    'Bir spor için tüm 7 dersi tamamla', 65),
  ('polymath', 'general', '🌍', 'Çok Yönlü',
    'Farklı branşlara açıksın.',
    '3 farklı sporda en az birer ders tamamla', 70),
  ('champion', 'general', '👑', 'Şampiyon',
    'Yedi boyutta da yüksek performans — istisnai çocuk.',
    'Tüm 7 testte 80+ skor', 80),
  ('teamPlayer', 'general', '🤝', 'Takım Oyuncusu',
    'İş birliği yapma eğilimin çok yüksek.',
    'Karakter testinde iş birliği skoru 80+', 90),
  ('fairPlayer', 'general', '🕊️', 'Adil Oyuncu',
    'Fair play değerlerin örnek niteliğinde.',
    'Karakter testinde adil oyun skoru 80+', 95),

  ('bigJumper', 'performance', '🦘', 'Süper Sıçrayıcı',
    'Sıçrama mesafen yaş gözetmeksizin elit seviyede.',
    'Tek sıçramada 35+ cm yükseklik', 180),
  ('fastReflex', 'performance', '🌪️', 'Yıldırım Refleks',
    'En iyi reaksiyon süren elit aralıkta.',
    'En iyi reaksiyon süresi 250ms altında', 190),

  ('dailyHero', 'streak', '🔥', 'Üç Gün Üst Üste',
    'Üç gün arka arkaya ders yaptın.',
    '3 gün streak', 310),
  ('weekWarrior', 'streak', '🗓️', 'Haftalık Savaşçı',
    'Bir hafta boyunca her gün ders yaptın.',
    '7 gün streak', 320),
  ('committed', 'streak', '💪', 'Kararlı',
    'İki hafta boyunca her gün ders yaptın — disiplin örneği.',
    '14 gün streak', 330)
on conflict (id) do update set
  category = excluded.category,
  emoji = excluded.emoji,
  name = excluded.name,
  description = excluded.description,
  earned_for = excluded.earned_for,
  display_order = excluded.display_order,
  updated_at = now();
