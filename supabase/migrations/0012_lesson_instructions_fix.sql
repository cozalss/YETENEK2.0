-- Yetenek 2.0 — Migration 0012: lesson_instructions düzeltmeleri (3 ders)
--
-- Audit'te tespit edilen tutarsızlıkların DB tarafındaki name/description/
-- instructions metinleri ile senkronizasyonu. Validator config kod
-- tarafında (curriculum.ts) — bkz. 0010 migration başındaki açıklama.
--
-- Düzeltmeler:
--   taekwondo-2 → validator landmark rightAnkle→rightKnee (yorum güncellendi)
--   boks-2       → talimat "öne ve hafif yukarı"; threshold 0.15→0.10
--   atletizm-2   → talimattan "sol dize geç" çıkarıldı (validator tek-bacak)

update public.lesson_instructions set
  description = 'Diz yukarı çek, ayağı öne savur — 3 tekrarlı ön tekme dizisi.'
where id = 'taekwondo-2';

update public.lesson_instructions set
  description = 'Sol bileği öne ve hafif yukarı uzat — 3 tekrarlı jab.',
  instructions = '["Guard pozisyonunda başla.","Sol yumruğu öne ve hafif yukarı doğru hızla uzat.","Yumruğu geri çek, guard''a dön.","Toplam 3 jab at."]'::jsonb
where id = 'boks-2';

update public.lesson_instructions set
  description = 'Sprint diz çekme drili — sağ dizi bel hizasına 3 kez çek.',
  instructions = '["Dik dur.","Sağ dizini bel hizasına yukarı çek.","İndir, başlangıca dön.","Toplam 3 sağ diz çekme."]'::jsonb
where id = 'atletizm-2';
