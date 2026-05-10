/**
 * Spor branşı detayları — /sports/[slug] sayfaları için.
 *
 * Her spor: kısa açıklama, başlama yaşı, donanım, federasyon link,
 * Türkiye'de durum, sezon bilgisi.
 */

export interface SportInfo {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  startAge: string;
  equipment: string;
  /** Türkiye Federasyonu */
  federation: { name: string; url: string };
  /** Önemli özellikler */
  highlights: string[];
  /** Türkiye'de durum (örn. olimpik medalye, popüler şehirler) */
  turkeyContext: string;
  /** Sezon bilgisi */
  season: string;
  /** Yaklaşık aylık kulüp ücreti aralığı */
  monthlyCost: string;
}

export const SPORTS: SportInfo[] = [
  {
    slug: 'voleybol',
    name: 'Voleybol',
    emoji: '🏐',
    description:
      'Takım sporu, dikey patlayıcı güç + reaksiyon ağırlıklı. Türkiye kadın takımı dünya 1\'i.',
    startAge: '8-10 yaş',
    equipment: 'Spor ayakkabı, file, top — kulüpte sağlanır',
    federation: { name: 'TVF', url: 'https://www.tvf.org.tr' },
    highlights: [
      'Boy avantajı pas-orta-smaç pozisyonlarında belirleyici',
      'Sosyal sporun yüksek motivasyonu',
      'Türkiye altyapısı çok güçlü',
    ],
    turkeyContext:
      '2023 EuroVolley ve 2024 Paris Olimpiyatları — kadın milli takımı dünya zirvesinde. Eczacıbaşı, Vakıfbank, Fenerbahçe gibi kulüplerin altyapısı geniş.',
    season: 'Ekim-Mayıs',
    monthlyCost: '500-1500 TL',
  },
  {
    slug: 'basketbol',
    name: 'Basketbol',
    emoji: '🏀',
    description:
      'Takım sporu, sıçrama + çeviklik + koordinasyon. Türkiye altyapı ekosistemi çok güçlü.',
    startAge: '7-9 yaş',
    equipment: 'Spor ayakkabı, top — kulüpte sağlanır',
    federation: { name: 'TBF', url: 'https://www.tbf.org.tr' },
    highlights: [
      'Boy avantajı her pozisyonda',
      'Hem birey hem takım gelişimi',
      'NBA G League / Avrupa kariyer yolu net',
    ],
    turkeyContext:
      'EuroLeague\'de 2-3 takım, NBA\'de Türk oyuncular (Şengün, Korkmaz). Anadolu Efes, Fenerbahçe, Galatasaray altyapısı geniş.',
    season: 'Ekim-Mayıs',
    monthlyCost: '500-1800 TL',
  },
  {
    slug: 'tenis',
    name: 'Tenis',
    emoji: '🎾',
    description:
      'Bireysel raket sporu, reaksiyon + çeviklik + koordinasyon ağırlıklı.',
    startAge: '6-8 yaş',
    equipment: 'Raket, top, kort ücreti',
    federation: { name: 'TTF', url: 'https://www.ttf.org.tr' },
    highlights: [
      'Bireysel disiplin gelişir',
      'ITF/ATP sıralama sistemi şeffaf',
      'Yaşam boyu sürdürülebilir spor',
    ],
    turkeyContext:
      'Akademiler İstanbul, Antalya, İzmir\'de yoğun. Sinem Sülbiye Yıldız, Çağla Büyükakçay gibi WTA sıralamasında oyuncular var.',
    season: 'Yıl boyunca',
    monthlyCost: '1000-3000 TL',
  },
  {
    slug: 'yuzme',
    name: 'Yüzme',
    emoji: '🏊',
    description:
      'Bireysel + takım, dayanıklılık + tüm vücut kuvveti. Düşük sakatlanma riski.',
    startAge: '6-7 yaş',
    equipment: 'Mayo, gözlük, bone, havlu',
    federation: { name: 'TYF', url: 'https://www.tyf.gov.tr' },
    highlights: [
      'Tüm kas grupları çalışır',
      'Bel ve eklem sorunlarına iyi gelir',
      'Kontrast: tek başına sakin, takım yarışması heyecanlı',
    ],
    turkeyContext:
      'Yaşar Doğu, Galatasaray, Fenerbahçe yüzme okulları. Devlet Su İşleri (DSİ) ve büyükşehir havuzları çok geniş.',
    season: 'Yıl boyunca',
    monthlyCost: '700-2000 TL',
  },
  {
    slug: 'futbol',
    name: 'Futbol',
    emoji: '⚽',
    description:
      'Takım sporu, dayanıklılık + çeviklik + ayak-göz koordinasyonu. Türkiye\'de en yaygın spor.',
    startAge: '6-8 yaş',
    equipment: 'Krampon, top — kulüpte sağlanır',
    federation: { name: 'TFF', url: 'https://www.tff.org' },
    highlights: [
      'Sosyal entegrasyon çok güçlü',
      'Süper Lig + alt liglere kadar geniş ekosistem',
      'Genel atletizm geliştirir',
    ],
    turkeyContext:
      'Galatasaray, Fenerbahçe, Beşiktaş, Trabzon altyapıları. TFF U-Yaş takımları her ilde mevcut.',
    season: 'Ağustos-Mayıs',
    monthlyCost: '300-1500 TL',
  },
  {
    slug: 'atletizm',
    name: 'Atletizm',
    emoji: '🏃',
    description:
      'Bireysel sprint odaklı: yatay patlayıcı güç + reaksiyon + ivmelenme. 60m/100m/200m, atlama branşları.',
    startAge: '8-10 yaş',
    equipment: 'Çiviler (ileri seviyede), normal koşu ayakkabısı yeter',
    federation: { name: 'TAF', url: 'https://www.taf.org.tr' },
    highlights: [
      'Net ölçülebilir gelişim (santimetre/milisaniye)',
      'Yüksek IAAF/WA standardizasyonu',
      'Bireysel ego + takım bayrak coşkusu',
    ],
    turkeyContext:
      'Ramil Guliyev (Avrupa şampiyonu sprinter), Dilan Akar gibi sporcular. Atletizm Federasyonu lokal yarışlar düzenliyor.',
    season: 'Mayıs-Eylül outdoor + kapalı kış',
    monthlyCost: '300-800 TL',
  },
  {
    slug: 'cimnastik',
    name: 'Cimnastik',
    emoji: '🤸',
    description:
      'Bireysel, denge + koordinasyon + patlayıcı güç. Erken yaş başlangıç avantajı büyük.',
    startAge: '4-6 yaş',
    equipment: 'Spor kıyafeti, kulüpte aletler',
    federation: { name: 'TCF', url: 'https://www.tcf.org.tr' },
    highlights: [
      'Tüm bedenli koordinasyon temeli atılır',
      'Disiplin ve odaklanma alışkanlığı',
      'Olimpik branş, prestij yüksek',
    ],
    turkeyContext:
      'İbrahim Çolak (paralel barlarda dünya şampiyonu), Asuman Köseoğlu. Manisa ve Ankara cimnastik akademileri ileri seviyede.',
    season: 'Yıl boyunca',
    monthlyCost: '600-2000 TL',
  },
  {
    slug: 'judo',
    name: 'Judo',
    emoji: '🥋',
    description:
      'Bireysel mücadele, denge + patlayıcı güç + reaksiyon. Olimpik dövüş sporu.',
    startAge: '7-9 yaş',
    equipment: 'Judogi (kıyafet)',
    federation: { name: 'TJF', url: 'https://www.tjf.gov.tr' },
    highlights: [
      'Kontrollü mücadele + saygı kültürü',
      'Düşmek-kalkmak gibi temel motor beceriler',
      'Disiplin gelişimi',
    ],
    turkeyContext:
      'Bilgesu Karadeniz, Kayra Sayit gibi olimpik madalye sporcular. Türkiye Olimpiyat İncirlik Spor Eğitim Merkezi judo programı.',
    season: 'Yıl boyunca',
    monthlyCost: '300-900 TL',
  },
  {
    slug: 'taekwondo',
    name: 'Taekwondo',
    emoji: '🦵',
    description:
      'Bireysel mücadele, reaksiyon + çeviklik + tekme patlayıcılığı.',
    startAge: '6-8 yaş',
    equipment: 'Dobok (kıyafet), kuşak, koruyucu',
    federation: { name: 'TTKDF', url: 'https://www.turkiyetaekwondofed.gov.tr' },
    highlights: [
      'Hızlı reaksiyon + esneklik',
      'Olimpik branş (2000\'den beri)',
      'Türkiye dünyada güçlü ülke',
    ],
    turkeyContext:
      'Servet Tazegül, Hatice Kübra İlgün, Nafia Kuş gibi olimpik madalye sporcuları. Akademi sayısı çok yüksek.',
    season: 'Yıl boyunca',
    monthlyCost: '300-800 TL',
  },
  {
    slug: 'boks',
    name: 'Boks',
    emoji: '🥊',
    description:
      'Bireysel mücadele, reaksiyon + dayanıklılık + koordinasyon.',
    startAge: '10-12 yaş',
    equipment: 'Eldiven, koruyucu, ip',
    federation: { name: 'TBF (Boks)', url: 'https://www.tbf-boks.org.tr' },
    highlights: [
      'Disiplin + öz-güven',
      'Kardiyovasküler kondisyon',
      'Yaşa göre kontak seviyesi ayarlanır',
    ],
    turkeyContext:
      'Bahram Muzaffer, Buse Naz Çakıroğlu, Busenaz Sürmeneli olimpik altın. Kadın boks Türkiye\'de patlama yaşıyor.',
    season: 'Yıl boyunca',
    monthlyCost: '400-1200 TL',
  },
  {
    slug: 'masa-tenisi',
    name: 'Masa Tenisi',
    emoji: '🏓',
    description:
      'Bireysel raket, reaksiyon + ince motor koordinasyon ağırlıklı.',
    startAge: '6-8 yaş',
    equipment: 'Raket, top — kulüpte masa',
    federation: { name: 'TMTF', url: 'https://www.tmtf.org.tr' },
    highlights: [
      'En hızlı raket sporu (saliseyle ölçülür)',
      'Düşük fiziksel risk',
      'Yaşam boyu oynanabilir',
    ],
    turkeyContext:
      'Avrupa Şampiyonası bireysel madalyalar var. Kulüp sayısı sınırlı ama büyüyen branş.',
    season: 'Yıl boyunca',
    monthlyCost: '300-1000 TL',
  },
  {
    slug: 'badminton',
    name: 'Badminton',
    emoji: '🏸',
    description:
      'Bireysel/çift raket, reaksiyon + çeviklik + koordinasyon kombinasyonu.',
    startAge: '7-9 yaş',
    equipment: 'Raket, tüy top',
    federation: { name: 'TBF (Bad)', url: 'https://www.bgf-tr.org' },
    highlights: [
      'Hız zirvesi (smaç 350+ km/sa)',
      'Akciğer kapasitesi yüksek',
      'Genç branş, az rekabetli',
    ],
    turkeyContext:
      'Türkiye Olimpik takım yapılandırması yeni. Avrupa Şampiyonalarında genç sporcular gelişiyor.',
    season: 'Yıl boyunca',
    monthlyCost: '500-1300 TL',
  },
];

export function getSport(slug: string): SportInfo | null {
  return SPORTS.find((s) => s.slug === slug) ?? null;
}
