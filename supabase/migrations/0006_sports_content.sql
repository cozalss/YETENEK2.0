-- Yetenek 2.0 — Migration 0006: sports content
--
-- src/lib/content/sports.ts içeriği DB'ye taşınıyor.
-- Kod tarafında getSport() artık DB'den (ISR cache ile) çeker;
-- admin panel ileride content_managment için SQL update yazabilir.
-- Static .ts dosyası "seed source" + "type definition" olarak kalır.
--
-- Public READ: RLS açık ama herkes okuyabilir (anonim + auth)
-- Public WRITE: yalnız service_role (admin)

create table if not exists public.sports (
  slug text primary key check (char_length(slug) between 1 and 40),
  name text not null check (char_length(name) between 1 and 60),
  emoji text,
  description text not null,
  start_age text,
  equipment text,
  federation_name text,
  federation_url text,
  highlights jsonb not null default '[]'::jsonb,
  turkey_context text,
  season text,
  monthly_cost text,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sports_display_order_idx on public.sports(display_order, slug);

-- Auto-update updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sports_set_updated_at on public.sports;
create trigger sports_set_updated_at
  before update on public.sports
  for each row execute function public.set_updated_at();

alter table public.sports enable row level security;

drop policy if exists "sports_public_read" on public.sports;
create policy "sports_public_read" on public.sports for select using (true);

-- Write yetkisi yalnız service_role (anon ve authenticated yazamaz).
-- service_role JWT zaten RLS'i baypas eder; politika eklemek anonim/authed'i
-- explicit blocklar.

-- ─── SEED — 12 spor (idempotent upsert) ──────────────────────────────
insert into public.sports
  (slug, name, emoji, description, start_age, equipment,
   federation_name, federation_url, highlights, turkey_context,
   season, monthly_cost, display_order)
values
  ('voleybol', 'Voleybol', '🏐',
   'Takım sporu, dikey patlayıcı güç + reaksiyon ağırlıklı. Türkiye kadın takımı dünya 1''i.',
   '8-10 yaş', 'Spor ayakkabı, file, top — kulüpte sağlanır',
   'TVF', 'https://www.tvf.org.tr',
   '["Boy avantajı pas-orta-smaç pozisyonlarında belirleyici","Sosyal sporun yüksek motivasyonu","Türkiye altyapısı çok güçlü"]'::jsonb,
   '2023 EuroVolley ve 2024 Paris Olimpiyatları — kadın milli takımı dünya zirvesinde. Eczacıbaşı, Vakıfbank, Fenerbahçe gibi kulüplerin altyapısı geniş.',
   'Ekim-Mayıs', '500-1500 TL', 10),

  ('basketbol', 'Basketbol', '🏀',
   'Takım sporu, sıçrama + çeviklik + koordinasyon. Türkiye altyapı ekosistemi çok güçlü.',
   '7-9 yaş', 'Spor ayakkabı, top — kulüpte sağlanır',
   'TBF', 'https://www.tbf.org.tr',
   '["Boy avantajı her pozisyonda","Hem birey hem takım gelişimi","NBA G League / Avrupa kariyer yolu net"]'::jsonb,
   'EuroLeague''de 2-3 takım, NBA''de Türk oyuncular (Şengün, Korkmaz). Anadolu Efes, Fenerbahçe, Galatasaray altyapısı geniş.',
   'Ekim-Mayıs', '500-1800 TL', 20),

  ('tenis', 'Tenis', '🎾',
   'Bireysel raket sporu, reaksiyon + çeviklik + koordinasyon ağırlıklı.',
   '6-8 yaş', 'Raket, top, kort ücreti',
   'TTF', 'https://www.ttf.org.tr',
   '["Bireysel disiplin gelişir","ITF/ATP sıralama sistemi şeffaf","Yaşam boyu sürdürülebilir spor"]'::jsonb,
   'Akademiler İstanbul, Antalya, İzmir''de yoğun. Sinem Sülbiye Yıldız, Çağla Büyükakçay gibi WTA sıralamasında oyuncular var.',
   'Yıl boyunca', '1000-3000 TL', 30),

  ('yuzme', 'Yüzme', '🏊',
   'Bireysel + takım, dayanıklılık + tüm vücut kuvveti. Düşük sakatlanma riski.',
   '6-7 yaş', 'Mayo, gözlük, bone, havlu',
   'TYF', 'https://www.tyf.gov.tr',
   '["Tüm kas grupları çalışır","Bel ve eklem sorunlarına iyi gelir","Kontrast: tek başına sakin, takım yarışması heyecanlı"]'::jsonb,
   'Yaşar Doğu, Galatasaray, Fenerbahçe yüzme okulları. Devlet Su İşleri (DSİ) ve büyükşehir havuzları çok geniş.',
   'Yıl boyunca', '700-2000 TL', 40),

  ('futbol', 'Futbol', '⚽',
   'Takım sporu, dayanıklılık + çeviklik + ayak-göz koordinasyonu. Türkiye''de en yaygın spor.',
   '6-8 yaş', 'Krampon, top — kulüpte sağlanır',
   'TFF', 'https://www.tff.org',
   '["Sosyal entegrasyon çok güçlü","Süper Lig + alt liglere kadar geniş ekosistem","Genel atletizm geliştirir"]'::jsonb,
   'Galatasaray, Fenerbahçe, Beşiktaş, Trabzon altyapıları. TFF U-Yaş takımları her ilde mevcut.',
   'Ağustos-Mayıs', '300-1500 TL', 50),

  ('atletizm', 'Atletizm', '🏃',
   'Bireysel sprint odaklı: yatay patlayıcı güç + reaksiyon + ivmelenme. 60m/100m/200m, atlama branşları.',
   '8-10 yaş', 'Çiviler (ileri seviyede), normal koşu ayakkabısı yeter',
   'TAF', 'https://www.taf.org.tr',
   '["Net ölçülebilir gelişim (santimetre/milisaniye)","Yüksek IAAF/WA standardizasyonu","Bireysel ego + takım bayrak coşkusu"]'::jsonb,
   'Ramil Guliyev (Avrupa şampiyonu sprinter), Dilan Akar gibi sporcular. Atletizm Federasyonu lokal yarışlar düzenliyor.',
   'Mayıs-Eylül outdoor + kapalı kış', '300-800 TL', 60),

  ('cimnastik', 'Cimnastik', '🤸',
   'Bireysel, denge + koordinasyon + patlayıcı güç. Erken yaş başlangıç avantajı büyük.',
   '4-6 yaş', 'Spor kıyafeti, kulüpte aletler',
   'TCF', 'https://www.tcf.org.tr',
   '["Tüm bedenli koordinasyon temeli atılır","Disiplin ve odaklanma alışkanlığı","Olimpik branş, prestij yüksek"]'::jsonb,
   'İbrahim Çolak (paralel barlarda dünya şampiyonu), Asuman Köseoğlu. Manisa ve Ankara cimnastik akademileri ileri seviyede.',
   'Yıl boyunca', '600-2000 TL', 70),

  ('judo', 'Judo', '🥋',
   'Bireysel mücadele, denge + patlayıcı güç + reaksiyon. Olimpik dövüş sporu.',
   '7-9 yaş', 'Judogi (kıyafet)',
   'TJF', 'https://www.tjf.gov.tr',
   '["Kontrollü mücadele + saygı kültürü","Düşmek-kalkmak gibi temel motor beceriler","Disiplin gelişimi"]'::jsonb,
   'Bilgesu Karadeniz, Kayra Sayit gibi olimpik madalye sporcular. Türkiye Olimpiyat İncirlik Spor Eğitim Merkezi judo programı.',
   'Yıl boyunca', '300-900 TL', 80),

  ('taekwondo', 'Taekwondo', '🦵',
   'Bireysel mücadele, reaksiyon + çeviklik + tekme patlayıcılığı.',
   '6-8 yaş', 'Dobok (kıyafet), kuşak, koruyucu',
   'TTKDF', 'https://www.turkiyetaekwondofed.gov.tr',
   '["Hızlı reaksiyon + esneklik","Olimpik branş (2000''den beri)","Türkiye dünyada güçlü ülke"]'::jsonb,
   'Servet Tazegül, Hatice Kübra İlgün, Nafia Kuş gibi olimpik madalye sporcuları. Akademi sayısı çok yüksek.',
   'Yıl boyunca', '300-800 TL', 90),

  ('boks', 'Boks', '🥊',
   'Bireysel mücadele, reaksiyon + dayanıklılık + koordinasyon.',
   '10-12 yaş', 'Eldiven, koruyucu, ip',
   'TBF (Boks)', 'https://www.tbf-boks.org.tr',
   '["Disiplin + öz-güven","Kardiyovasküler kondisyon","Yaşa göre kontak seviyesi ayarlanır"]'::jsonb,
   'Bahram Muzaffer, Buse Naz Çakıroğlu, Busenaz Sürmeneli olimpik altın. Kadın boks Türkiye''de patlama yaşıyor.',
   'Yıl boyunca', '400-1200 TL', 100),

  ('masa-tenisi', 'Masa Tenisi', '🏓',
   'Bireysel raket, reaksiyon + ince motor koordinasyon ağırlıklı.',
   '6-8 yaş', 'Raket, top — kulüpte masa',
   'TMTF', 'https://www.tmtf.org.tr',
   '["En hızlı raket sporu (saliseyle ölçülür)","Düşük fiziksel risk","Yaşam boyu oynanabilir"]'::jsonb,
   'Avrupa Şampiyonası bireysel madalyalar var. Kulüp sayısı sınırlı ama büyüyen branş.',
   'Yıl boyunca', '300-1000 TL', 110),

  ('badminton', 'Badminton', '🏸',
   'Bireysel/çift raket, reaksiyon + çeviklik + koordinasyon kombinasyonu.',
   '7-9 yaş', 'Raket, tüy top',
   'TBF (Bad)', 'https://www.bgf-tr.org',
   '["Hız zirvesi (smaç 350+ km/sa)","Akciğer kapasitesi yüksek","Genç branş, az rekabetli"]'::jsonb,
   'Türkiye Olimpik takım yapılandırması yeni. Avrupa Şampiyonalarında genç sporcular gelişiyor.',
   'Yıl boyunca', '500-1300 TL', 120)

on conflict (slug) do update set
  name = excluded.name,
  emoji = excluded.emoji,
  description = excluded.description,
  start_age = excluded.start_age,
  equipment = excluded.equipment,
  federation_name = excluded.federation_name,
  federation_url = excluded.federation_url,
  highlights = excluded.highlights,
  turkey_context = excluded.turkey_context,
  season = excluded.season,
  monthly_cost = excluded.monthly_cost,
  display_order = excluded.display_order,
  updated_at = now();
