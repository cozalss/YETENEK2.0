-- Yetenek 2.0 — Migration 0011: lesson_instructions refresh (5 spor)
--
-- src/lib/lessons/curriculum.ts'de Yüzme, Futbol, Basketbol, Tenis ve
-- Cimnastik dersleri biyomekanik olarak yenilendi. DB tarafındaki
-- metin içeriği (name + description + instructions) curriculum ile
-- uyumlu olacak şekilde UPDATE edilir. Validator config kod tarafında
-- — bkz. 0010 migration başındaki açıklama.

-- Yüzme ──────────────────────────────────────────────────────────────
update public.lesson_instructions set
  name = 'Streamline',
  description = 'Yüzme öncesi gergin hidrodinamik duruş — kollar yukarı birleşik, üst vücut 2 sn sabit.',
  instructions = '["Dik dur, ayaklar bitişik.","Kolları başının üstüne uzat, ellerini birleştir.","Kulaklarını kollarına yapıştır, sırtın düz.","Üst vücudunu sallanmadan 2 saniye sabit tut."]'::jsonb
where id = 'yuzme-1';

update public.lesson_instructions set
  name = 'Kuru Kulaç',
  description = 'Sağ bilek yukarı uzansın — serbest stil kulaç simülasyonu, 3 tekrar.',
  instructions = '["Dik dur, kollar yanda.","Sağ bileği yukarı/ileri uzat (çekiş fazı).","Yana indir (itme fazı).","Toplam 3 kulaç."]'::jsonb
where id = 'yuzme-2';

-- Futbol ─────────────────────────────────────────────────────────────
update public.lesson_instructions set
  name = 'Pas',
  description = 'Sağ ayağın iç yanı ile yana pas — 3 tekrarlı temel pas hareketi.',
  difficulty = 'beginner',
  instructions = '["Hazır duruşta başla, ağırlık sol ayakta.","Sağ ayağın iç yanını sağa doğru uzat (pas vermek gibi).","Ayağı geri çek, başlangıca dön.","Toplam 3 pas."]'::jsonb
where id = 'futbol-1';

update public.lesson_instructions set
  name = 'Diz Çek',
  description = 'Sağ dizi bel hizasına kaldır — şut/sprint biyomekaniğinin başlangıç fazı, 3 tekrar.',
  instructions = '["Sol ayak yere basılı, sağ ayak hazır.","Sağ dizini bel hizasına yukarı çek.","İndir, başlangıca dön.","Toplam 3 diz çekme."]'::jsonb
where id = 'futbol-2';

-- Basketbol ──────────────────────────────────────────────────────────
update public.lesson_instructions set
  name = 'Triple Threat',
  description = 'Hücum öncesi üçlü tehdit pozisyonu — alt vücut sabit 3 sn, dengeli ve hazır.',
  instructions = '["Ayaklar omuz genişliğinde.","Dizler hafif bükülü, vücut hafif öne eğik.","Eller göğüs hizasında — top elinde gibi.","Alt vücudu sallanmadan 3 saniye sabit tut."]'::jsonb
where id = 'basketbol-1';

update public.lesson_instructions set
  name = 'Şut Sıçraması',
  description = 'Pas sonrası şut için patlayıcı dikey sıçrama — 3 tekrar.',
  instructions = '["Triple threat pozisyonunda başla.","Çömel ve hızla yukarı sıçra (şut yükselişi).","Havada düz dur, yumuşak in.","Toplam 3 sıçrama."]'::jsonb
where id = 'basketbol-2';

-- Tenis ──────────────────────────────────────────────────────────────
update public.lesson_instructions set
  name = 'Split Step',
  description = 'Topa tepki anı mini sıçraması — ayaklar yerden ~5 cm, 3 tekrar.',
  difficulty = 'beginner',
  instructions = '["Ready pozisyonunda başla; ayaklar omuz genişliğinde.","Topa tepki verir gibi her iki ayağı birlikte küçük bir sıçramayla yerden kaldır.","Yumuşak iniş, dengeyi bul.","Toplam 3 split step."]'::jsonb
where id = 'tenis-1';

update public.lesson_instructions set
  name = 'Forehand',
  description = 'Sağ bilek sağa uzansın — top karşılama vuruşu, 3 tekrar.',
  instructions = '["Ready pozisyonunda başla.","Sağ kolu sağa doğru hızla uzat (vuruş).","Bileği geri çek, ready pozisyonuna dön.","Toplam 3 forehand."]'::jsonb
where id = 'tenis-2';

-- Cimnastik ──────────────────────────────────────────────────────────
update public.lesson_instructions set
  name = 'Squat',
  description = 'Kontrollü çömel-kalk — cimnastik bacak gücünün temeli, 3 tekrar.',
  instructions = '["Dik dur, ayaklar omuz genişliğinde.","Kalçayı geri ittirerek dizleri 90°''ye kadar bük.","Patlayıcı şekilde başlangıca kalk.","Toplam 3 squat."]'::jsonb
where id = 'cimnastik-1';

update public.lesson_instructions set
  name = 'Tuck Jump',
  description = 'Patlayıcı sıçrama, havada dizleri göğüse çek — 3 tekrar.',
  difficulty = 'intermediate',
  instructions = '["Dik dur, ayaklar omuz genişliğinde.","Hızla çömel ve patlayıcı sıçra.","Havada dizleri göğse doğru çek (tuck).","Yumuşak iniş — toplam 3 tuck jump."]'::jsonb
where id = 'cimnastik-2';
