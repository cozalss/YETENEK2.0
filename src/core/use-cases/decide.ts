/**
 * Karar katmanı — belirsizliği sonuna kadar taşıyıp **sıra olasılığı** üretir.
 *
 * ## Neyin yerine geçiyor
 *
 * Eski çıktı `confidencePercent = round(finalScore × 100)` idi. Bu sayının
 * hiçbir olasılık anlamı yoktu: ne bir model, ne bir kalibrasyon seti, ne bir
 * sonuç verisi vardı. "%87 voleybol uyumu" cümlesi savunulamazdı.
 *
 * Yeni çıktı savunulabilir bir cümle: *"Voleybol %78 ihtimalle ilk 3 sporun
 * arasında (aralık %71–84)"*. Bu, açıkça tanımlı bir olasılıktır:
 *
 *   > Çocuğun gerçek yeteneği, ölçtüğümüz değerlerin etrafındaki belirsizlik
 *   > dağılımından geliyorsa, bu spor kaç kere ilk 3'e giriyor?
 *
 * ## Yöntem
 *
 * Her boyutun z değeri kendi σ'sıyla normal dağılımdan örneklenir, tüm sporlar
 * yeniden sıralanır, ilk 3'e girme sayılır. Belirsizlik üç kaynaktan besleniyor:
 * ölçüm gürültüsü, norm yayılımının tahmin hatası (partial eksenler) ve
 * geçerlilik hakeminin teknik cezası.
 *
 * Oran için Wilson güven aralığı kullanılıyor — küçük örneklem ve uç
 * oranlarda (p→0 veya p→1) normal yaklaşımın aksine aralık [0,1] dışına
 * taşmıyor.
 *
 * ## Determinizm
 *
 * RNG tohumu çocuğun z profilinden türetiliyor: aynı ölçüm her zaman aynı
 * öneriyi verir. Aynı çocuğa iki kez bakan bir velinin farklı sonuç görmesi
 * güveni yok ederdi; ayrıca sonuç birim-testlenebilir kalıyor.
 */

import {
  SPORT_PROFILES,
  type DimensionKey,
  type SportProfile,
} from '@/lib/matching/sportProfiles';
import {
  SCORED_DIMENSIONS,
  similarityFromZDistance,
  weightCoverage,
  zDistance,
  type ZProfile,
} from '@/lib/matching/zspace';

/** Monte Carlo örnekleme sayısı. */
const DEFAULT_SAMPLES = 2000;

/** Kaç sporun "ilk sırada" sayılacağı. */
const TOP_K = 3;

/**
 * Olasılık raporlamak için gereken asgari ölçülmüş boyut sayısı.
 *
 * Adversarial inceleme sonucu eklendi. Tek boyut ölçülmüşken sıralama
 * fiilen deterministik hale geliyor ve `pTopK` kötü eşleşmelerde bile %100'e
 * doyuyordu: tek CMJ ölçümüyle Tenis ve Boks similarity 0.32 iken "%100" ile
 * raporlanıyordu. P(ilk 3) "bu spor gürültü altında ilk 3'te kalır mı" sorusunu
 * ölçer; "bu spor uygun mu" sorusunu DEĞİL. İkisi ancak yeterli boyut
 * ölçüldüğünde örtüşür.
 */
const MIN_DIMENSIONS_FOR_PROBABILITY = 3;

/**
 * Olasılık raporlamak için gereken asgari nominal benzerlik.
 *
 * Bu eşiğin altındaki bir spor, sıralamada ilk 3'e girse bile "uygun" değildir
 * — yalnızca diğerlerinden daha az uyumsuzdur. Kullanıcıya yüzde göstermek
 * yanıltıcı olur.
 */
const MIN_SIMILARITY_FOR_PROBABILITY = 0.45;

/**
 * Bonusların bio-motor benzerlik yayılımına oranla üst sınırı.
 *
 * Ölçülen sorun: medyan bir çocukta 12 sporun similarity yayılımı ~0.19, ama
 * `anthroBonus` (0–0.15) + `characterBoost` (±0.10) toplamda 0.25 ediyordu —
 * yani ölçümün tamamının %131'i. Veli tarafından ELLE GİRİLEN boy, çocuğun
 * gerçekte ölçülmüş sıçraması ve çevikliğinden daha belirleyici oluyordu.
 *
 * Bonuslar tamamen atılmıyor (antropometri gerçek bir sinyal), ama etkileri
 * ölçümün yayılımının bu oranıyla sınırlanıyor: ölçüm baskın kalır.
 */
const MAX_BONUS_SHARE_OF_SPREAD = 0.35;

/**
 * Bir sporun olasılık iddiası taşıyabilmesi için ölçülmüş olması gereken
 * ağırlık payı.
 *
 * Ölçülen sorun: en çok önerilen spor, hakkında en az ölçümümüz olan spordu.
 * Cimnastik ağırlığının yalnız %61.4'ü karara giriyor (denge 1.0 +
 * koordinasyon 0.95 — onu TANIMLAYAN iki eksen normsuz), ama 2500 sentetik
 * çocukta **%26.1'inin birinci sporu** Cimnastik çıkıyordu (beklenen ~%8.3).
 * Sebebi: tanımlayıcı eksenleri silinince geriye kalan profil popülasyon
 * ortalamasına yakın kalıyor ve "herkese uyan" bir çekim merkezine dönüşüyor.
 *
 * Eşik 0.70: kalibrasyon durumu değişmeden Cimnastik (%61.4) ve Masa Tenisi
 * (%65.1) olasılık iddiası taşıyamaz; ikisi de en çok fazla-önerilen sporlar.
 * Sıralamadan atılmıyorlar — yalnız "bu spor için yeterli ölçümümüz yok"
 * denerek yüzde iddiası geri çekiliyor. Norm pilotu yapıldığında eşik
 * kendiliğinden aşılır ve kural sessizce devre dışı kalır.
 */
const MIN_COVERAGE_FOR_PROBABILITY = 0.7;



export interface SportRanking {
  readonly sport: string;
  readonly description: string;
  /** Nominal (örneklemesiz) z-mesafesi — küçük = iyi. */
  readonly distance: number;
  /** Nominal benzerlik (0-1), RBF çekirdeği. Gösterim için. */
  readonly similarity: number;
  /**
   * İlk 3'e girme olasılığı (0-1), veya kanıt tabanı çok inceyse `null`.
   *
   * `null` = "bu soruya cevap verecek kadar ölçüm yok". Sayı uydurmak yerine
   * yokluğu bildiriyoruz; UI bunu "yeterli veri yok" olarak göstermeli.
   */
  readonly pTopK: number | null;
  /**
   * Monte Carlo örnekleme hatası (Wilson %95). **Bu çocuk hakkındaki
   * belirsizlik DEĞİLDİR** — yalnızca "daha çok örneklem alsaydık bu sayı ne
   * kadar oynardı" sorusunun cevabı. Örneklem arttıkça sıfıra gider ve yeni
   * bilgi taşımaz, o yüzden kullanıcıya gösterilmez; yakınsama kontrolü için
   * tutuluyor.
   */
  readonly mcPrecision: readonly [number, number];
  /** Birinci olma olasılığı (0-1), veya kanıt yetersizse `null`. */
  readonly pTopOne: number | null;
  /**
   * Bu spor için olasılık iddiası geri çekildiyse sebebi. `null` = iddia
   * geçerli.
   */
  readonly probabilityWithheldReason: string | null;
  /**
   * Bu sporun ağırlıklı boyutlarının ne kadarı ölçülebildi (0-1).
   *
   * Kalibresiz eksenlerin çıkarılması sporları eşit etkilemiyor: Cimnastik
   * ağırlığının ~%39'unu (denge + koordinasyon, tam da onu tanımlayan iki
   * eksen) kaybederken Atletizm ~%20'sini kaybediyor. Düşük kapsamlı bir
   * öneriyi yüksek kapsamlıyla aynı güvenle sunmak yanıltıcı olur.
   */
  readonly weightCoverage: number;
}

export interface Counterfactual {
  readonly sport: string;
  readonly dimension: DimensionKey;
  /** Bu boyutta kaç σ artış sporu ilk 3'e sokardı. */
  readonly zDelta: number;
}

export interface Decision {
  readonly ranking: readonly SportRanking[];
  /** Norm tablosu olmadığı için karara katılmayan boyutlar. */
  readonly excludedByNorm: readonly DimensionKey[];
  /** Ölçülmediği için karara katılamayan boyutlar. */
  readonly missingMeasurement: readonly DimensionKey[];
  readonly counterfactuals: readonly Counterfactual[];
  readonly samples: number;
  /**
   * Olasılık raporlanabildi mi. `false` ise tüm `pTopK` alanları `null` ve
   * sıralama yalnızca nominal benzerliğe göre — bir öneri sırası var ama
   * arkasında olasılık iddiası yok.
   */
  readonly probabilityReported: boolean;
  /** Olasılık raporlanamadıysa sebebi (kullanıcıya gösterilebilir). */
  readonly probabilityWithheldReason?: string;
}

export interface DecideOptions {
  readonly topN?: number;
  readonly samples?: number;
  /**
   * Geçerlilik hakeminden gelen σ çarpanı. Kusurlu teknik ölçümü kaydırmaz,
   * belirsizliğini büyütür (bkz. `apply-verdict.ts`).
   */
  readonly sigmaMultiplier?: number;
  /** Antropometrik bonus fonksiyonu — enjekte edilebilir (test kolaylığı). */
  readonly anthroBonus?: (profile: SportProfile) => number;
  /** Karakter boost'u — enjekte edilebilir. */
  readonly characterBoost?: (profile: SportProfile) => number;
}

/** Deterministik sözde-rastgele üreteç (mulberry32). */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller — standart normal. */
function makeGauss(rand: () => number): () => number {
  return () => {
    const u1 = Math.max(1e-12, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

/** z profilinden deterministik tohum türetir. */
function seedFromProfile(profile: ZProfile): number {
  let h = 2166136261;
  for (const dim of SCORED_DIMENSIONS) {
    const z = profile.z[dim];
    // Ölçülmemiş boyut da tohumu etkilesin ki farklı eksik kombinasyonları
    // aynı diziyi paylaşmasın.
    const v = z == null ? 0 : Math.round(z * 1000);
    h ^= v + 0x9e3779b9 + (h << 6) + (h >>> 2);
    h = h >>> 0;
  }
  return h || 1;
}

/**
 * Wilson skor aralığı — bir oranın %95 güven aralığı.
 *
 * Normal yaklaşım (p ± 1.96√(p(1−p)/n)) p uçlara yaklaştığında [0,1] dışına
 * taşar ve p=0'da sıfır genişlik verir; Wilson ikisini de yapmaz.
 */
export function wilsonInterval(
  successes: number,
  n: number,
  z = 1.96
): readonly [number, number] {
  if (n <= 0) return [0, 1];
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [
    Math.max(0, centre - margin),
    Math.min(1, centre + margin),
  ] as const;
}

/** Bir örneklem için tüm sporların skorunu hesaplayıp sıralar. */
function rankOnce(
  sampled: Partial<Record<DimensionKey, number>>,
  bonuses: readonly number[]
): number[] {
  const scored = SPORT_PROFILES.map((profile, i) => {
    const d = zDistance(
      { z: sampled, sigma: {}, excludedByNorm: [], missingMeasurement: [] },
      profile.vector,
      profile.weights
    );
    const sim = d == null ? 0 : similarityFromZDistance(d);
    return { i, score: sim + bonuses[i] };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.i);
}

export function decide(
  profile: ZProfile,
  opts: DecideOptions = {}
): Decision {
  const {
    topN = 5,
    samples: rawSamples = DEFAULT_SAMPLES,
    sigmaMultiplier = 1,
    anthroBonus = () => 0,
    characterBoost = () => 0,
  } = opts;
  // samples=0 pTopK'yı NaN yapıyor, NaN karşılaştırıcı sıralamayı rastgeleye
  // çeviriyor ve Zod NaN'ı reddettiği için tüm oturum kaydı düşüyordu.
  const samples = Math.max(1, Math.floor(rawSamples));

  const measuredDims = SCORED_DIMENSIONS.filter((d) => profile.z[d] != null);

  // Hiç ölçüm yoksa sıralama üretmenin anlamı yok.
  if (measuredDims.length === 0) {
    return {
      ranking: [],
      excludedByNorm: profile.excludedByNorm,
      missingMeasurement: profile.missingMeasurement,
      counterfactuals: [],
      samples: 0,
      probabilityReported: false,
      probabilityWithheldReason:
        'Spor önerisi için kalibre edilmiş hiçbir boyut ölçülmedi.',
    };
  }

  // --- Bonusları ölçümün yayılımına göre ölçekle ------------------------
  //
  // Ham bonuslar (anthro 0–0.15, karakter ±0.10) bio-motor benzerlik
  // yayılımından (tipik ~0.19) büyüktü: veli tarafından elle girilen boy,
  // ölçülmüş yetenekten daha belirleyici oluyordu. Yayılımı bu çocuk için
  // ölçüp bonus etkisini onun bir oranıyla sınırlıyoruz.
  const rawSimilarities = SPORT_PROFILES.map((p) => {
    const d = zDistance(profile, p.vector, p.weights);
    return d == null ? 0 : similarityFromZDistance(d);
  });
  const spread =
    Math.max(...rawSimilarities) - Math.min(...rawSimilarities);

  const rawBonuses = SPORT_PROFILES.map(
    (p) => anthroBonus(p) + characterBoost(p)
  );
  const maxRawBonus = Math.max(...rawBonuses.map(Math.abs), 1e-9);
  const bonusBudget = Math.max(spread, 1e-6) * MAX_BONUS_SHARE_OF_SPREAD;
  const bonusScale = Math.min(1, bonusBudget / maxRawBonus);
  const bonuses = rawBonuses.map((b) => b * bonusScale);

  // Bonusların kendi belirsizliği. Boy velinin elle girdiği bir değer ve
  // medyan tablosu sabit 7 cm SD varsayıyor; karakter ise özbildirim.
  // Sabit ofset olarak eklenirlerse Monte Carlo, en az güvenmesi gereken
  // terime sıfır belirsizlik atfeder. Bonus büyüklüğünün yarısı kadar
  // dalgalanma veriyoruz.
  const bonusSigma = bonuses.map((b) => Math.abs(b) * 0.5);

  const nominal = SPORT_PROFILES.map((p, i) => {
    const d = zDistance(profile, p.vector, p.weights);
    return {
      profile: p,
      index: i,
      distance: d ?? Number.POSITIVE_INFINITY,
      similarity: Math.max(0, Math.min(1, rawSimilarities[i] + bonuses[i])),
    };
  });

  // --- Monte Carlo ------------------------------------------------------
  const rand = makeRng(seedFromProfile(profile));
  const gauss = makeGauss(rand);

  const topKCount = new Array(SPORT_PROFILES.length).fill(0);
  const topOneCount = new Array(SPORT_PROFILES.length).fill(0);

  for (let s = 0; s < samples; s++) {
    const sampled: Partial<Record<DimensionKey, number>> = {};
    for (const dim of measuredDims) {
      const z = profile.z[dim]!;
      const sigma = (profile.sigma[dim] ?? 0.2) * sigmaMultiplier;
      sampled[dim] = z + gauss() * sigma;
    }
    const sampledBonuses = bonuses.map(
      (b, i) => b + gauss() * bonusSigma[i]
    );
    const order = rankOnce(sampled, sampledBonuses);
    topOneCount[order[0]]++;
    for (let k = 0; k < TOP_K && k < order.length; k++) {
      topKCount[order[k]]++;
    }
  }

  // --- Olasılık raporlanabilir mi? -------------------------------------
  //
  // P(ilk 3) "gürültü altında ilk 3'te kalır mı" sorusunu ölçer, "uygun mu"
  // sorusunu değil. Kanıt tabanı inceyken sıralama deterministikleşiyor ve
  // bu iki soru ayrışıyor: kötü eşleşen bir spor da %100 alabiliyor.
  const bestSimilarity = Math.max(...nominal.map((n) => n.similarity));
  let withheldReason: string | undefined;
  if (measuredDims.length < MIN_DIMENSIONS_FOR_PROBABILITY) {
    withheldReason = `Olasılık için en az ${MIN_DIMENSIONS_FOR_PROBABILITY} kalibre boyut gerekiyor; ${measuredDims.length} tanesi ölçüldü.`;
  } else if (bestSimilarity < MIN_SIMILARITY_FOR_PROBABILITY) {
    withheldReason =
      'Hiçbir spor profili ölçümlere yeterince yakın değil; sıralama gösteriliyor ama olasılık iddiası yapılmıyor.';
  }
  const reportProbability = withheldReason == null;

  const ordered = nominal
    .map((n) => {
      const coverage = weightCoverage(profile, n.profile.weights);

      // Spor bazlı kapı: bu sporun ağırlığının çoğu ölçülemiyorsa, onun
      // hakkında yüzde iddia etmek elimizde olmayan bilgiyi iddia etmektir.
      // Sıralamadan atmıyoruz — sebebini söyleyip yüzdeyi geri çekiyoruz.
      const sportReason =
        coverage < MIN_COVERAGE_FOR_PROBABILITY
          ? `Bu spor için gereken ölçümlerin yalnız %${Math.round(coverage * 100)}'i yapılabiliyor; kalanı norm tablosu olmayan boyutlardan (${profile.excludedByNorm.join(', ')}).`
          : null;

      const withheld = withheldReason ?? sportReason;
      const claimable = withheld == null;

      return {
        sport: n.profile.sport,
        description: n.profile.description,
        distance: n.distance,
        similarity: n.similarity,
        pTopK: claimable ? topKCount[n.index] / samples : null,
        mcPrecision: wilsonInterval(topKCount[n.index], samples),
        pTopOne: claimable ? topOneCount[n.index] / samples : null,
        probabilityWithheldReason: withheld,
        weightCoverage: coverage,
      };
    })
    // İKİ KADEMELİ SIRALAMA — bilinçli ve açık.
    //
    // Yüzde iddiası taşıyan sporlar önce gelir; taşımayanlar (ölçüm kapsamı
    // yetersiz) altta, kendi aralarında benzerliğe göre sıralanır.
    //
    // Bu ayrım ÖNCEDEN `(b.pTopK ?? 0)` ifadesinin yan etkisiyle kazara
    // oluyordu: null sıfır sayılıp en alta düşüyordu. Doğru sonucu veriyordu
    // ama niyet kodda görünmüyordu — biri `?? 0` yerine `?? 1` yazsa davranış
    // sessizce tersine dönerdi. Şimdi kademe açık bir anahtar.
    .sort((a, b) => {
      const tierA = a.pTopK == null ? 1 : 0;
      const tierB = b.pTopK == null ? 1 : 0;
      if (tierA !== tierB) return tierA - tierB;
      return (
        (b.pTopK ?? 0) - (a.pTopK ?? 0) ||
        b.similarity - a.similarity ||
        a.distance - b.distance ||
        a.sport.localeCompare(b.sport, 'tr-TR')
      );
    });

  // `topN` kesmesi, ölçemediğimiz sporları listeden tamamen silerdi. Gerçekten
  // o profile yakın bir çocuk (örneğin cimnastikçi tipi) o sporu HİÇ görmezdi
  // — ölçemiyor olmamız, göstermemek için sebep değil; sadece yüzde iddia
  // etmemek için sebep. Bu yüzden kesme sonrası, benzerliği yüksek olan
  // ölçülemeyen sporlardan en fazla ikisi geri ekleniyor.
  const claimable = ordered.filter((r) => r.pTopK != null).slice(0, topN);

  // Hangi ölçülemeyen sporlar gösterilsin? Keyfi bir sayı yerine ilkeli
  // kural: **kapsam sorunu olmasaydı ilk N'e girecek olanlar**. Yani soru
  // "kaç tane gösterelim" değil, "bu çocuk ölçebilseydik bunu görecek miydi".
  const bySimilarity = [...ordered].sort((a, b) => b.similarity - a.similarity);
  const wouldHaveMadeTopN = new Set(
    bySimilarity.slice(0, topN).map((r) => r.sport)
  );
  const withheldTop = ordered.filter(
    (r) => r.pTopK == null && wouldHaveMadeTopN.has(r.sport)
  );

  const ranking: SportRanking[] = [...claimable, ...withheldTop];

  return {
    ranking,
    excludedByNorm: profile.excludedByNorm,
    missingMeasurement: profile.missingMeasurement,
    counterfactuals: computeCounterfactuals(profile, bonuses, ranking),
    samples,
    probabilityReported: reportProbability,
    probabilityWithheldReason: withheldReason,
  };
}

/**
 * Karşı-olgusal: hangi boyutta ne kadar artış sporu ilk 3'e sokardı.
 *
 * Aynı mesafe fonksiyonundan bedava geliyor ve doğrudan eyleme dönüşüyor:
 * `training/[dimension]` sayfasına bağlanacak somut bir hedef.
 */
function computeCounterfactuals(
  profile: ZProfile,
  bonuses: readonly number[],
  ranking: readonly SportRanking[]
): Counterfactual[] {
  const measuredDims = SCORED_DIMENSIONS.filter((d) => profile.z[d] != null);
  const out: Counterfactual[] = [];

  // İlk 3'e girememiş ama yakın olan sporlar için bak.
  for (const candidate of ranking.slice(TOP_K)) {
    const cProfile = SPORT_PROFILES.find((p) => p.sport === candidate.sport);
    if (!cProfile) continue;

    let best: Counterfactual | null = null;
    for (const dim of measuredDims) {
      // 0.1σ adımlarla 2σ'ya kadar artır, ilk 3'e girdiği anı bul.
      // Tam sayı sayaç kullanılıyor: `delta += 0.1` float artığı biriktirip
      // 19. adımda 1.9000000000000006'da duruyordu — belgelenen 2.0σ'ya hiç
      // ulaşmıyordu ve `zDelta` olarak 0.30000000000000004 gibi değerler
      // sızıyordu.
      for (let step = 1; step <= 20; step++) {
        const delta = step / 10;
        const bumped: Partial<Record<DimensionKey, number>> = { ...profile.z };
        bumped[dim] = (bumped[dim] ?? 0) + delta;
        const order = rankOnce(bumped, bonuses);
        const newTop = order
          .slice(0, TOP_K)
          .map((i) => SPORT_PROFILES[i].sport);
        if (newTop.includes(candidate.sport)) {
          if (best == null || delta < best.zDelta) {
            best = {
              sport: candidate.sport,
              dimension: dim,
              // Adım ızgarasına yuvarla — kullanıcıya "0.30000000000000004σ"
              // göstermenin anlamı yok.
              zDelta: Math.round(delta * 10) / 10,
            };
          }
          break;
        }
      }
    }
    if (best) out.push(best);
  }

  // En kolay ulaşılabilir olanlar önce.
  out.sort((a, b) => a.zDelta - b.zDelta);
  return out.slice(0, 3);
}
