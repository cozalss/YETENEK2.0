-- Yetenek 2.0 — Migration 0014: lesson_instructions seven-lesson expansion
--
-- Her sporu 5 dersten 7 derse genişletir (2 yeni ders × 12 spor = 24 satır).
-- src/lib/lessons/curriculum.ts'deki 6-7 numaralı dersler ile birebir uyumlu.

insert into public.lesson_instructions (id, sport_slug, display_order, name, description, difficulty, instructions) values
  ('taekwondo-6', 'taekwondo', 6, 'Arka Tekme (Twit Chagi)',
    'Sağ ayak geriye uzansın — gövdeyi döndürerek arka tekme, 3 tekrar.', 'intermediate',
    '["Hazır duruşta başla, sırt rakibe dönük.","Gövdeni hafif öne eğ.","Sağ ayağı geriye doğru patlayıcı uzat.","Ayağı topla, başlangıca dön. Toplam 3 tekme."]'::jsonb),
  ('taekwondo-7', 'taekwondo', 7, '360° Sıçramalı Tekme',
    'Havada dönerek tekme — maksimum patlayıcı güç kombinasyonu, 4 tekrar.', 'advanced',
    '["Hazır duruşta başla, dizler bükülü.","Hızla derin çömel.","Patlayıcı sıçra, havada vücut döner.","Yumuşak iniş. Toplam 4 sıçrama."]'::jsonb),

  ('boks-6', 'boks', 6, 'Sol Kroşe (Hook)',
    'Sol bilek yana savrulsun — yandan kavisli yumruk, 3 tekrar.', 'intermediate',
    '["Guard pozisyonunda başla.","Sol dirseği omuz hizasında bük.","Sol yumruğu sağa doğru yandan savur (hook).","Yumruğu geri çek, guard''a dön. Toplam 3 hook."]'::jsonb),
  ('boks-7', 'boks', 7, 'Shuffle Çömeli Kombo',
    'Hızlı slip kombosu — savunma ayak hareketi ile kısa çömeller, 4 tekrar.', 'advanced',
    '["Guard pozisyonunda başla.","Hızla çömel (slip).","Patlayıcı geri kalk, kısa duraklama.","Toplam 4 ardışık slip."]'::jsonb),

  ('voleybol-6', 'voleybol', 6, 'Blok Sıçraması',
    'İki kol yukarıda — file üstünden blok için patlayıcı sıçrama, 3 tekrar.', 'intermediate',
    '["File önünde dik dur, ayaklar omuz genişliğinde.","Hızla hafif çömel.","Patlayıcı sıçra, iki kolu yukarı uzat (blok).","Yumuşak iniş. Toplam 3 blok."]'::jsonb),
  ('voleybol-7', 'voleybol', 7, 'Çukur Dalış Hazırlık',
    'Defansif dalış için derin çömelme — savunma yere yakın iniş, 4 tekrar.', 'advanced',
    '["Hafif çömel pozisyonunda başla.","Hızla çok derin çömel (yere doğru uzan).","Patlayıcı geri kalk.","Toplam 4 derin dalış hazırlığı."]'::jsonb),

  ('basketbol-6', 'basketbol', 6, 'Closeout (Hızlı Çıkış)',
    'Sağ ayak öne uzansın — şutöre hızlı kapanma adımı, 3 tekrar.', 'intermediate',
    '["Triple threat pozisyonunda başla.","Sağ ayağı öne doğru hızla uzat (kapanma adımı).","Eller yukarı havaya kalksın.","Geri çek, başlangıca dön. Toplam 3 closeout."]'::jsonb),
  ('basketbol-7', 'basketbol', 7, 'Rebound Sıçraması',
    'İki kol yukarı patlayıcı sıçrama — rebound kapma kombinasyonu, 4 tekrar.', 'advanced',
    '["Triple threat pozisyonunda başla.","Hızla derin çömel.","Patlayıcı yukarı sıçra, iki kol başın üstüne uzansın.","Toplam 4 rebound sıçraması."]'::jsonb),

  ('tenis-6', 'tenis', 6, 'Drop Shot Hazırlık',
    'Hafif çömel, raket önde — file önü yumuşak vuruş duruşu, 2 sn sabit.', 'intermediate',
    '["Hafif çömel pozisyonunda başla.","Sağ kolu öne uzat, dirsek hafif bükülü.","Vücut hafif öne eğik, dizler bükülü.","2 saniye sabit tut."]'::jsonb),
  ('tenis-7', 'tenis', 7, 'Tweener Simülasyon',
    'Bacaklar arası vuruş için derin çömelme — akrobatik vuruş hazırlık, 4 tekrar.', 'advanced',
    '["Dik dur, sırt file rakibine dönük.","Hızla derin çömel (bacaklar arası vuruş hazırlığı).","Patlayıcı kalk.","Toplam 4 tweener."]'::jsonb),

  ('yuzme-6', 'yuzme', 6, 'Kelebek Kol Stroku',
    'İki bilek aynı anda yukarı — kelebek stil çift kol simülasyonu, 3 tekrar.', 'intermediate',
    '["Dik dur, kollar yanda.","İki bileği aynı anda başın üstüne uzat (kelebek kulaç).","Yanlardan indir (itme fazı).","Toplam 3 kelebek kulaç."]'::jsonb),
  ('yuzme-7', 'yuzme', 7, 'Sırtüstü Pozisyonu',
    'Üst vücut geriye yatık — sırtüstü streamline duruşu, 3 sn sabit.', 'advanced',
    '["Dik dur, ayaklar bitişik.","Kolları başının üstüne uzat, ellerini birleştir.","Vücudunu geriye doğru hafif yatık tut (sırtüstü pozisyonu).","3 saniye sabit tut."]'::jsonb),

  ('futbol-6', 'futbol', 6, 'Taç Atışı Hazırlık',
    'İki bilek baş üstüne — taç atışı için gövde arkaya yaylanma, 3 tekrar.', 'intermediate',
    '["Dik dur, ayaklar omuz genişliğinde.","İki bileği başının üstüne kaldır (top tutar gibi).","Hafif geriye yaylan, sonra öne savur (taç atışı).","Toplam 3 taç atışı."]'::jsonb),
  ('futbol-7', 'futbol', 7, 'Kaleci Dive Simülasyon',
    'Yana doğru patlayıcı dalış — kalecilerin uçma hareketi, 4 tekrar.', 'advanced',
    '["Hafif çömel kaleci pozisyonunda başla.","Sol ayağı patlayıcı yana doğru uzat.","Gövde sola yatar (dive simülasyonu).","Toparlan, başlangıca dön. Toplam 4 dive."]'::jsonb),

  ('atletizm-6', 'atletizm', 6, 'Cirit Atma Hazırlık',
    'Sağ kol baş üstüne — cirit fırlatma öncesi back swing duruşu, 3 tekrar.', 'intermediate',
    '["Sol ayak önde, sağ ayak arkada.","Sağ kolu başının arkasına/üstüne kaldır (cirit tutar gibi).","İndir, başlangıca dön.","Toplam 3 cirit hazırlık."]'::jsonb),
  ('atletizm-7', 'atletizm', 7, 'Engel Adımı',
    'Sol diz çok yukarı — yüksek engel aşma simülasyonu, 4 tekrar.', 'advanced',
    '["Dik dur.","Sol dizini göğüs hizasına patlayıcı yukarı çek (engel aşma).","İndir, başlangıca dön.","Toplam 4 engel adımı."]'::jsonb),

  ('cimnastik-6', 'cimnastik', 6, 'Handstand Hazırlık',
    'Sağ ayak yukarı patlayıcı — el üstünde durma için bacak savurma, 3 tekrar.', 'intermediate',
    '["Dik dur, kollar yukarıda.","Sağ ayağı patlayıcı yukarı/öne savur (handstand kickup).","İndir, başlangıca dön.","Toplam 3 bacak savurma."]'::jsonb),
  ('cimnastik-7', 'cimnastik', 7, 'Splits Hazırlık',
    'Sol ayak öne uzansın — uzun yarık (split) öncesi bacak uzatma, 4 tekrar.', 'advanced',
    '["Dik dur.","Sol ayağı öne doğru çok uzağa uzat (split başlangıcı).","Geri çek, başlangıca dön.","Toplam 4 split hazırlık."]'::jsonb),

  ('judo-6', 'judo', 6, 'Sol Tai Sabaki',
    'Sol ayak yana uzansın — rakibin sol tarafına dönme adımı, 3 tekrar.', 'intermediate',
    '["Hazır duruşta başla.","Sol ayağı yana doğru patlayıcı uzat (sol yan adım).","Gövde sola dönsün.","Geri çek. Toplam 3 sol yan adım."]'::jsonb),
  ('judo-7', 'judo', 7, 'Atma Sonrası Kontrol',
    'Geniş ayak, derin çömel — yere indirme sonrası kontrol duruşu, 3 sn sabit.', 'advanced',
    '["Ayakları omuz genişliğinden geniş aç.","Derin çömel pozisyonuna geç.","Eller önde rakibi tutar gibi (yüz hizasında).","3 saniye sabit tut."]'::jsonb),

  ('masa-tenisi-6', 'masa-tenisi', 6, 'Defansif Lob',
    'Sağ bilek yukarı yumuşak uzansın — geriden atılan savunma lobu, 3 tekrar.', 'intermediate',
    '["Geriden hafif çömel pozisyonunda başla.","Sağ kolu yumuşak şekilde başın üstüne uzat (lob).","Geri çek, başlangıca dön.","Toplam 3 lob."]'::jsonb),
  ('masa-tenisi-7', 'masa-tenisi', 7, 'Çoklu Adım Kombo',
    'Hızlı yan-yan adım — masa boyu çevre kapsama, 4 tekrarlı squat.', 'advanced',
    '["Hazır duruşta başla.","Hızla çömel (yana adım hazırlık).","Patlayıcı geri kalk.","Toplam 4 hızlı çömel."]'::jsonb),

  ('badminton-6', 'badminton', 6, 'Jump Smash',
    'Patlayıcı sıçra, sağ kol baş üstüne — havadan smash kombinasyonu, 3 tekrar.', 'intermediate',
    '["Hazır duruşta başla.","Hızla hafif çömel.","Patlayıcı yukarı sıçra, sağ kolu başın üstüne uzat (smash).","Yumuşak iniş. Toplam 3 jump smash."]'::jsonb),
  ('badminton-7', 'badminton', 7, 'Net Kill',
    'Sağ bilek öne ve aşağı patlayıcı — file önü hızlı bitirme vuruşu, 4 tekrar.', 'advanced',
    '["Hafif çömel pozisyonunda başla, raket önde.","Sağ bileği yüz hizasından öne ve aşağı patlat (net kill).","Geri çek, başlangıca dön.","Toplam 4 net kill."]'::jsonb)
on conflict (id) do update set
  sport_slug = excluded.sport_slug,
  display_order = excluded.display_order,
  name = excluded.name,
  description = excluded.description,
  difficulty = excluded.difficulty,
  instructions = excluded.instructions,
  updated_at = now();
