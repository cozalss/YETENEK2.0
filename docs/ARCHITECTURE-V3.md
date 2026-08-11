# Yetenek 3.0 — Ölçüm-Sınıfı Yetenek Değerlendirme Mimarisi

> **Tek cümlelik tez:** *LLM karar vermez. Ölçen deterministik fizik, yargılayan Vision,
> karar veren istatistik, anlatan LLM — ve her katmanın hata payı ayrı ayrı ölçülür.*

**Durum:** F0–F5 uygulandı · **Tarih:** 2026-08-11 · **Önceki:** [ARCHITECTURE.md](./ARCHITECTURE.md) (v2, hexagonal iskelet)

---

## 0. Neden yeni bir mimari?

Mevcut sistem literatür-doğru protokoller uyguluyor (Bosco CMJ, Tomkinson normları,
12 spor için 15 peer-reviewed kaynak). Sorun protokolde değil. Kodun tamamı okundu ve
her bulgu `grep` ile ayrıca teyit edildi. Merkezi bulgu şu:

> **Hiçbir katman, çocuğun testi gerçekten yapıp yapmadığını denetlemiyor.**

Sistem, ölçemediği şeyi ölçüyormuş gibi davranıyor. Kanıtlar:

| # | Açık | Kanıt | Sonuç |
|---|---|---|---|
| A1 | Denge testi **tek ayak üstünde olunduğunu doğrulayamıyor** | [balance.ts:31-36](../src/lib/tests/balance.ts#L31-L36) — zorunlu landmark yalnız *kalça + omuz*. Diz/bilek bilinçli çıkarılmış (havadaki ayak visibility &lt; 0.5 olduğu için) | İki ayak üstünde durmak, tek ayakla **aynı skoru** alır |
| A2 | Broad jump'ta **zaman denetimi yok** | [broadJump.ts:88-97](../src/lib/tests/broadJump.ts#L88-L97) — yalnız ilk 15 / son 15 karenin X ortalaması farkı | Yana yürümek geçerli bir sıçrama olarak okunur |
| A3 | CMJ'de 3 mantık kapısı **flight bulunursa devre dışı** | [jump.ts:246,253,260](../src/lib/tests/jump.ts#L246) — üçü de `&& !flight` | Topuk kaldırma (0.015 birim, ≥100 ms) geçerli sıçrama sayılır |
| A4 | Lateral hops'ta **genlik şartı yok** | [lateralHops.ts:114-130](../src/lib/tests/lateralHops.ts#L114-L130) — yalnız orta çizgi geçişi + 250 ms debounce | Orta çizgide duran çocuğun titremesi "hop" sayılır |
| A5 | Kalite monitörü **her kare hesaplanıp atılıyor** | `onQuality` prop'unu hiçbir test bileşeni vermiyor (grep: 0 sonuç) | Hiçbir ölçüm poz kalitesine göre reddedilmiyor |
| A6 | Kadraj **yalnız kayıt öncesi** kontrol ediliyor | `JumpTest.tsx:98`, `BalanceTest.tsx:92` vb. — hepsi `phase === 'idle' \|\| 'countdown'` içinde | Çocuk kayıt sırasında kadrajdan çıkarsa ölçüm yine de geçerli |
| A7 | Geçersiz denge/reaksiyon **oturuma yazılıyor** | [record-test.ts:45,66](../src/core/use-cases/record-test.ts#L45) — diğer 5 testte `if (!analysis.valid) return session` var, bu ikisinde **yok** | Sıfır veri "tamamlanmış test" olarak kaydediliyor |

Ve karar katmanında iki matematiksel sorun var:

| # | Açık | Kanıt |
|---|---|---|
| B1 | **Confidence % istatistiksel değil** | [recommend.ts:225](../src/lib/matching/recommend.ts#L225) — `Math.round(finalScore * 100)`. Olasılık modeli, kalibrasyon seti, sonuç verisi yok. Kendi testi de kabul ediyor: *"medyan profil tüm sporlara yakın confidence verir (over-matching uyarısı)"* ([recommend.test.ts:114-126](../src/lib/matching/recommend.test.ts#L114-L126)) |
| B2 | **7 eksen ortak ölçekte değil** — Öklid mesafesi geçersiz | jump/broadJump/lateralHops → z-skor persentil [1,99]. reaction/endurance → doğrusal oran (norm→50). balance → sabit eşik `(1 - sway/0.05)`. coordination → `100 - (err-1.5)*7.4`. Dördü yaş/cinsiyet normsuz. Farklı ölçekli eksenler arasında `√Σw(c−p)²` **anlamsız** |

**Sonuç:** modeli değiştirmek bu sorunların hiçbirini çözmez. Mimariyi değiştirmek çözer.

---

## 1. Mimari — 5 katman + 1 kanıt omurgası

```
                        ┌──────────────────────────────┐
   ÇOCUK · TELEFON      │  L0  CAPTURE                 │   cihazda, offline
                        │  MediaPipe 33 kp · 1€ filtre │
                        └──────────────┬───────────────┘
                                       │  PoseFrame[]
                        ┌──────────────▼───────────────┐
                        │  L1  MEASURE                 │   saf fizik, deterministik
                        │  Bosco h=gt²/8 · kalibrasyon │   → HER DEĞER σ TAŞIR
                        └──────────────┬───────────────┘
                                       │  Measured<Unit>{ value, sigma, method }
                        ┌──────────────▼───────────────┐
                        │  L2  VERIFY   ★ YENİ         │   OpenAI Vision = HAKEM
                        │  "Bu test gerçekten yapıldı  │   sayı DÖNDÜRMEZ
                        │   mı? Tekniği neydi?"        │   strict JSON şema
                        └──────────────┬───────────────┘
                                       │  Verdict{ performed, violations[], technique }
                                       │  ⇩ DETERMİNİSTİK KAPI (LLM değil)
                        ┌──────────────▼───────────────┐
                        │  L3  NORMALIZE               │   tek ortak ölçek
                        │  raw → z(yaş,cinsiyet) → p   │   normsuz eksen = DIŞARIDA
                        └──────────────┬───────────────┘
                                       │  Normed{ z, ci95, normRef }
                        ┌──────────────▼───────────────┐
                        │  L4  DECIDE                  │   saf · LLM YOK
                        │  Monte Carlo → sıra olasılığı│   "%78 ihtimalle ilk 3'te"
                        └──────────────┬───────────────┘
                                       │  Decision{ ranking, counterfactuals }
                        ┌──────────────▼───────────────┐
                        │  L5  NARRATE                 │   LLM yalnız ANLATIR
                        │  Claude · sayı-topraklama    │   sıralamayı DEĞİŞTİREMEZ
                        └──────────────────────────────┘

   ═══════════════════════════════════════════════════════════════
   L6  EVIDENCE — her katmanın hata payını ölçer, CI'da regresyonu bloklar
   ═══════════════════════════════════════════════════════════════
```

**Neden bu bölünme işe alım vitrini:** her katmanın çıktısı ayrı ayrı test edilebilir,
hata payı sayıyla ifade edilir ve bir katmanı değiştirmek diğerlerini bozmaz. "AI kullandık"
demiyoruz — *AI'ı nerede kullanmadığımızı* gerekçelendiriyoruz.

---

## 2. L1 — MEASURE: her sayı hata payıyla gelir

**Değişiklik:** her ölçüm çıplak `number` yerine hata payı taşıyan bir değer döner.

```ts
// src/core/types/measured.ts
export interface Measured<U extends Unit> {
  readonly value: number;
  readonly unit: U;
  readonly sigma: number;              // 1σ standart belirsizlik, aynı birimde
  readonly method: MeasurementMethod;  // 'flight-time' | 'hip-displacement' | 'consensus'
  readonly provenance: Provenance;     // algoritma sürümü + kalibrasyon kaynağı
}
```

### σ nereden gelir? — CMJ örneği (somut)

Bosco: `h = g·t²/8`. Hata yayılımı: `σ_h = (g·t/4)·σ_t`

| Belirsizlik kaynağı | Katkı |
|---|---|
| Kare kuantizasyonu (30 fps, alt-kare interpolasyon yok) | σ_t ≈ 33/√12 ≈ **9.5 ms** → t=0.5 s'de **≈1.2 cm** |
| `performance.now()` rAF örneklemesi (video PTS değil) | jitter, kare düşmesi görünmez |
| Çift yöntem uyuşmazlığı (flight vs hip-displacement) | `\|h_f − h_d\|/2` doğrudan σ'ya eklenir |
| Kalibrasyon (tek kare, dikey oran → yatay uygulanıyor) | broad jump'ta ölçek hatası |

**Alt-kare interpolasyonu** (yeni): toe-off ve landing çevresinde ayak bileği Y serisine
parabol oturt, sıfır geçişini analitik bul. σ_t 9.5 ms → ~2 ms, yani **±1.2 cm → ±0.25 cm**.
Tek bir fonksiyon, ölçüm hatasını 4-5 kat düşürüyor.

**Zaman kaynağı düzeltmesi:** `performance.now()` + `requestAnimationFrame` yerine
`requestVideoFrameCallback` → gerçek video kare zaman damgası + `presentedFrames` sayacı.
Düşen kare artık görünür ve σ'ya yansır.

**Kabul kriteri:** her `Measured` için `sigma > 0` — sıfır belirsizlik iddia eden ölçüm derlenmez.

---

## 3. L2 — VERIFY: OpenAI Vision hakem olarak ★

Bu katman **yeni** ve mimarinin kalbi. §0'daki A1-A7 açıklarının hepsi buraya bakıyor.

### 3.1 Değişmez kural

> **Vision birimli sayı döndürmez.** Ne santimetre, ne milisaniye, ne persentil.
> Yalnızca *oldu / olmadı*, *kural ihlali*, *teknik kalitesi* döndürür.

Bu kural şema seviyesinde zorlanır — verdict şemasında sayısal ölçüm alanı yoktur.
Vision halüsinasyon yapamaz çünkü halüsinasyon yapacağı alan yoktur.

### 3.2 Port

```ts
// src/core/ports/validity-judge.ts   ← core, saf
export interface ValidityJudge {
  judge(req: JudgeRequest): Promise<Result<TestVerdict>>;
}

export interface JudgeRequest {
  readonly test: TestKey;
  readonly frames: readonly JudgeFrame[];   // 4-8 anahtar kare
  readonly measured: MeasuredSummary;       // L1 ne bulduğunu iddia ediyor
  readonly signal?: AbortSignal;
}

export interface JudgeFrame {
  readonly kind: 'skeleton' | 'photo';      // ← rızaya göre belirlenir
  readonly dataUri: string;
  readonly phase: 'setup' | 'takeoff' | 'apex' | 'landing' | 'mid' | 'end';
  readonly tMs: number;
}
```

Adapter: `src/infrastructure/vision/openai-validity-judge.ts`.
Port `core`'da saf kalır → OpenAI'ı Claude'a, yerel modele veya insan etiketleyiciye
**tek dosya değiştirerek** takas edebilirsiniz. (Mevcut `ReportGenerator` / `CoachChat`
port'larının hiçbir implementasyonu yok — bu mimari borç burada kapanıyor.)

### 3.3 Verdict şeması (strict, `additionalProperties: false`)

```ts
{
  performed: boolean,              // bu test yapıldı mı, hiç?
  protocolViolations: Violation[], // enum — teste özgü
  techniqueScore: number,          // 0-100, NİTEL — birimsiz
  compensations: Compensation[],   // knee_valgus | trunk_lean | asymmetric_landing
  stanceConfirmed: boolean | null, // ← A1'i çözen alan
  agreesWithMeasurement: boolean,  // L1'in iddiası görüntüyle tutarlı mı
  judgeConfidence: number          // 0-1
}
```

**Teste özgü ihlal enum'ları — doğrudan §0'daki açıklara karşılık gelir:**

| Test | İhlal enum'u | Kapattığı açık |
|---|---|---|
| Balance | `both_feet_down`, `hand_on_support`, `hopped`, `foot_touched_down`, `wrong_leg` | **A1** |
| Broad jump | `no_flight_phase`, `stepped_not_jumped`, `walked_out_of_frame`, `stepped_back_after_landing` | **A2** |
| CMJ | `heel_raise_only`, `arm_swing`, `knee_tuck_in_flight`, `landed_deeply_bent` | **A3** |
| Lateral hops | `no_airborne_phase`, `insufficient_amplitude`, `shuffled_not_hopped` | **A4** |
| Endurance | `partial_rom_arms`, `partial_rom_legs`, `no_rhythm` | — |
| Coordination | `finger_resting`, `not_tracking` | — |
| Hepsi | `out_of_frame`, `multiple_people`, `wrong_exercise`, `camera_moved` | **A6** |

`knee_tuck_in_flight` özellikle önemli: uçuşta diz çekmek uçuş süresini uzatır ama kütle
merkezi yüksekliğini artırmaz — CMJ'nin klasik yapay yükseltme yöntemi. MediaPipe'ın
mevcut konfigürasyonu bunu göremez; Vision görebilir.

### 3.4 Karar kapısı — deterministik, LLM değil

```ts
// src/core/use-cases/apply-verdict.ts   ← saf, birim-testli
const INVALIDATING: Record<TestKey, readonly Violation[]> = { /* teste özgü */ };

export function applyVerdict<U extends Unit>(
  m: Measured<U>, v: TestVerdict
): Result<Measured<U>, RejectedMeasurement> {
  if (!v.performed) return err({ reason: 'not-performed', retry: true });

  const fatal = v.protocolViolations.filter(x => INVALIDATING[test].includes(x));
  if (fatal.length > 0) return err({ reason: 'protocol-violation', violations: fatal, retry: true });

  // Kusurlu ama geçerli → sayıyı DEĞİŞTİRME, belirsizliği GENİŞLET
  const penalty = 1 + (1 - v.techniqueScore / 100) * TECHNIQUE_SIGMA_FACTOR;
  return ok({ ...m, sigma: m.sigma * penalty });
}
```

Dikkat: kusurlu teknik ölçüm **değerini** değiştirmez, **belirsizliğini** büyütür. Bu
istatistiksel olarak doğru olan davranış — kötü teknik bilgiyi azaltır, veriyi kaydırmaz.

### 3.5 Maliyet ve tetikleme

Judge **test başına bir kez** çağrılır (kare başına değil): tam bataryada ≤ 7 çağrı,
her biri 4-8 kare. Yerel kalite skoru ≥ 80 ve anomali yoksa atlanabilir — ama o zaman
sonuç `provenance: 'unverified'` etiketiyle işaretlenir ve kullanıcıya öyle gösterilir.
Sessiz atlama yok.

### 3.6 OpenAI API sözleşmesi

Responses API + Structured Outputs, `strict: true`:

```ts
{
  model: process.env.OPENAI_VISION_MODEL,   // pin'le, hardcode etme
  input: [{ role: 'user', content: [
    { type: 'input_text',  text: judgePrompt(test, measured) },
    { type: 'input_image', image_url: frames[0].dataUri },
    /* ... 4-8 kare ... */
  ]}],
  text: { format: { type: 'json_schema', name: 'test_verdict', strict: true, schema: VERDICT_SCHEMA } },
  store: false,                              // ← KVKK: OpenAI tarafında saklama yok
}
```

Şema kısıtları (strict modda zorunlu): tüm alanlar `required`, her nesnede
`additionalProperties: false`, iç içe ≤ 10 seviye. Verdict şeması bunlara uyacak
şekilde düz tutulmuştur.

> **Model kimliği uygulama anında doğrulanmalı.** Vision + strict structured outputs
> desteği modelden modele değişiyor; env değişkeniyle pin'leyip bir smoke-test ile
> teyit edin. Kod içine gömmeyin.

---

## 4. Gizlilik — rıza kapılı iki yollu tasarım

Seçiminiz: *veli açık rızasıyla ham klip*. Tasarım bunu karşılar, ama rıza vermeyen
velide sistemin çalışmaya devam etmesi için **iki yollu** kurgulanır:

```
                    ┌── rıza VAR ──►  ham kare (yüz görünür)   ──┐
   anahtar kare ────┤                                            ├──► Vision
                    └── rıza YOK ──►  iskelet render (çubuk adam)┘
```

`JudgeFrame.kind` alanı bunu tip düzeyinde taşır. İskelet render zaten gerekli
(fallback), dolayısıyla "rıza yok" hâli ikinci sınıf bir yol değil — birinci sınıf,
test edilmiş bir yol.

**KVKK yükümlülükleri (ham klip yolu için zorunlu):**

| Gereklilik | Uygulama |
|---|---|
| Açık rıza | Çocuk başına, amaca özgü, sürümlü metin, zaman damgalı, geri alınabilir |
| Veri minimizasyonu | 4-8 kare — video değil. RAM'de ring buffer, diske hiç yazılmaz |
| Saklama | Kare **hiç saklanmaz**; yalnız verdict kalır. `store: false` |
| Silme hakkı | Çocuk silinince verdict'ler cascade siliniyor |
| Şeffaflık | Ekranda "bu kareler doğrulama için gönderiliyor" + gönderilen karelerin önizlemesi |

Rıza geri alınırsa: yol otomatik iskelet render'a düşer, geçmiş verdict'ler silinir.

---

## 5. L3 — NORMALIZE: ölçek birliği (B2'nin çözümü)

**Kural:** mesafe metriğine giren her eksen **aynı ölçekte** olmalı. Seçilen ölçek:
yaşa ve cinsiyete göre **z-skor**.

```
ham değer ──► z = (x − μ(yaş,cinsiyet)) / σ(yaş,cinsiyet) ──► mesafe z-uzayında
                                                          └─► kullanıcıya persentil olarak gösterilir
```

Persentil *gösterim* içindir; persentil uzayında Öklid mesafesi doğrusal değildir,
o yüzden **karar z-uzayında** verilir.

### Normsuz eksenler — dürüst çözüm

| Eksen | Bugünkü durum | V3 |
|---|---|---|
| explosivePower | z-persentil (Tomkinson 2018) ✅ | korunur |
| horizontalPower | z-persentil ✅ | korunur |
| agility | z-persentil ✅ | korunur |
| reaction | doğrusal oran, **cinsiyet normu yok** | z'ye çevrilir, cinsiyet normu eklenir |
| endurance | doğrusal oran (norm tablosunda **SD yok**) | SD olmadan z hesaplanamaz → pilot şart |
| **balance** | sabit eşik `(1−sway/0.05)`, yaş/cinsiyet **yok** | **norm gelene kadar mesafeden ÇIKARILIR** |
| **coordination** | `100−(err−1.5)×7.4`, norm **yok**, testi bile yok | **norm gelene kadar mesafeden ÇIKARILIR** |

> **Kalibre edilmemiş bir ekseni mesafe metriğine sokmayı reddediyoruz.**

Çıkarılan eksen ağırlığı kalanlara yeniden dağıtılır ve kullanıcıya açıkça yazılır:
*"Denge ve koordinasyon ölçüldü ama henüz yaşa göre norm tablomuz olmadığı için spor
sıralamasına katılmadı."* Sahte kesinlik yerine şeffaf eksiklik.

Ayrıca: spor profilleri de z-hedefi olarak yeniden ifade edilmeli (bugün 0-1 "ideal"
değerler). Bu, `sportProfiles.ts` tablosunun tek seferlik dönüşümüdür.

---

## 6. L4 — DECIDE: sahte yüzde yerine sıra olasılığı (B1'in çözümü)

Bugün: `confidencePercent = round(finalScore × 100)` — hiçbir olasılık anlamı yok.

V3: belirsizliği sonuna kadar taşı ve **sıralama olasılığı** üret.

```ts
// src/core/use-cases/decide.ts — saf, deterministik (seed'li RNG)
export function decide(profile: NormedProfile, seed: number): Decision {
  const N = 2000;
  const top3 = new Map<SportSlug, number>();

  for (let i = 0; i < N; i++) {
    const z = sampleFromUncertainty(profile, seed + i);  // z ~ N(ẑ, Σ)
    const ranked = matchSports(z);                       // mevcut ağırlıklı mesafe, z-uzayında
    ranked.slice(0, 3).forEach(s => top3.set(s.slug, (top3.get(s.slug) ?? 0) + 1));
  }
  // → p(ilk 3'te) = sayaç / N, Wilson güven aralığıyla
}
```

Σ (kovaryans) üç kaynaktan beslenir: L1 ölçüm σ'sı · L2 teknik cezası · norm tablosunun
kendi örneklem hatası.

**Kullanıcıya gösterilen:**

> **Voleybol** — %78 ihtimalle ilk 3 sporun arasında *(aralık %64–88)*
> **Basketbol** — %71 *(%57–82)*
> **Badminton** — %64 *(%49–77)*

Bu cümle savunulabilir. `%87 uyum` savunulamaz.

**Karşı-olgusal açıklama** (aynı Monte Carlo'dan bedava):

> *"Denge persentilin +12 artsaydı cimnastik ilk 3'e girerdi."*

Bu hem ebeveyn için anlamlı hem de doğrudan `training/[dimension]` sayfasına bağlanıyor.

---

## 7. L5 — NARRATE: LLM anlatır, karar veremez

LLM'e giden şey yalnızca **karar verilmiş** `Decision` JSON'ı. Şemasında sıralama alanı
yok — yapısal olarak sıralamayı değiştiremez.

**Sayı-topraklama kapısı** (üretilen metni yayınlamadan önce, deterministik):

```ts
// src/core/use-cases/ground-narrative.ts
export function groundNarrative(text: string, d: Decision): Result<string, GroundingFailure> {
  const claimed = extractNumbers(text);          // metindeki tüm sayılar
  const allowed = allowedNumbers(d);             // Decision'daki tüm sayılar (± yuvarlama)
  const invented = claimed.filter(n => !allowed.has(n));
  if (invented.length) return err({ reason: 'ungrounded-number', invented });

  const sports = extractSportNames(text);
  const unknown = sports.filter(s => !d.ranking.some(r => r.sport === s));
  if (unknown.length) return err({ reason: 'ungrounded-sport', unknown });

  return ok(text);
}
```

Başarısız → bir kez yeniden dene → yine başarısız → şablon fallback.
**Halüsinasyonlu sayı yapısal olarak yayına çıkamaz.** Bugün hiçbir çıktı doğrulaması yok
([anthropic.ts:149-162](../src/lib/llm/anthropic.ts#L149-L162) yalnız boşluk kontrolü yapıyor).

---

## 8. L6 — EVIDENCE: "en doğru" iddiasının kanıtı

Ölçmediğiniz doğruluğu iddia edemezsiniz. `pnpm eval` → `docs/ACCURACY.md` + uygulama
içinde herkese açık `/accuracy` sayfası.

### 8.1 Sentetik kinematik — **bugün çalıştırılabilir, çocuk gerekmez**

Bilinen `h` değerinden parametrik CMJ yörüngesi üret → poz kare akışına çevir →
24/30/60 fps'te, gürültü ve kare düşmesi ekleyerek L1'e ver → `|ĥ − h|` ölç.

Çıktı: **MAE, bias, fps'e göre hata eğrisi.** Alt-kare interpolasyonunun kazancı burada
sayıyla kanıtlanır.

### 8.2 Düşmanca fixture'lar — A1-A4'ün regresyon testi

Sistemin **reddetmesi gereken** senaryolar:

| Fixture | Bugün | V3 hedefi |
|---|---|---|
| İki ayak üstünde "denge" | ✅ kabul ediyor (A1) | ❌ `both_feet_down` |
| Yana yürüyüş "broad jump" | ✅ kabul ediyor (A2) | ❌ `stepped_not_jumped` |
| Topuk kaldırma "sıçrama" | ✅ kabul ediyor (A3) | ❌ `heel_raise_only` |
| Orta çizgide titreme "hops" | ✅ kabul ediyor (A4) | ❌ `insufficient_amplitude` |
| Merkeze konmuş parmak "koordinasyon" | ✅ skor veriyor | ❌ `finger_resting` |

Bunlar **bugün yazılıp bugün kırmızı** olan testler. Vision katmanı onları yeşile
çevirdiğinde kazanım kanıtlanmış olur. TDD'nin en temiz hâli.

### 8.3 Hakem uyumu

İnsan etiketli klip seti ↔ Vision verdict → **Cohen's κ**. Hedef κ ≥ 0.75.
κ düşükse prompt/şema düzeltilir — model değil.

### 8.4 Test-tekrar güvenilirliği

Aynı çocuk, aynı gün 2 oturum → **ICC(2,1)**. Hedef ≥ 0.80 (kabul edilebilir),
≥ 0.90 (iyi). Pilot gerektirir.

### 8.5 Kalibrasyon — dürüst boşluk

"%78 ihtimalle ilk 3'te" iddiasının doğru olup olmadığı ancak boylamsal sonuç verisiyle
ölçülebilir (çocuk 2 yıl sonra hangi sporu yapıyor?). Bu veri **yok**.

> Bu satır `docs/ACCURACY.md`'de **"ölçülemedi — Faz 4"** olarak yazılır.
> Ölçülmemiş metriği ölçülmüş gibi göstermek, mimarinin bütün güvenilirliğini yakar.

### 8.6 CI kapısı

`pnpm eval` CI'da koşar; MAE %5'ten fazla kötüleşirse PR bloklanır.

---

## 9. Portlar — hexagonal sözü nihayet tutuluyor

Mevcut durum: `ReportGenerator` ve `CoachChat` port'larının **hiçbir implementasyonu yok**
(`src/infrastructure/` altında yalnız `storage` var). `Result<T,E>`'nin 5 `llm.*` hata
dalı ulaşılamaz durumda. `env.ts` hiçbir yerden import edilmiyor;
[anthropic.ts:33,39](../src/lib/llm/anthropic.ts#L33) `process.env`'i doğrudan okuyor.

V3 bunu kapatır:

| Port | Adapter | Durum |
|---|---|---|
| `MeasurementAnalyzer` | `pose/mediapipe-analyzer` | mevcut kod taşınır |
| **`ValidityJudge`** | **`vision/openai-validity-judge`** | **yeni** |
| `NormProvider` | `norms/static-norm-provider` | tablolar tek yere toplanır |
| `SportMatcher` | saf çekirdek (adapter yok) | z-uzayına taşınır |
| `Narrator` | `llm/claude-narrator` | port nihayet implemente edilir |
| `EvalHarness` | `eval/*` | yeni |

Vision `ValidityJudge` arkasında olduğu için: OpenAI → Claude → yerel model → insan
etiketleyici takası **tek dosya**. Bu, "OpenAI'a kilitlendiniz mi?" sorusuna verilecek
cevaptır.

---

## 10. Önce düzeltilecek hatalar (Vision'dan önce, bedava kazanç)

Bunlar mimari değil, doğrulanmış hatalar. Vision katmanına başlamadan önce kapatılmalı:

| # | Hata | Konum |
|---|---|---|
| 1 | 3 mantık kapısı `&& !flight` ile devre dışı | [jump.ts:246,253,260](../src/lib/tests/jump.ts#L246) |
| 2 | `recordBalance` / `recordReaction`'da `valid` kontrolü yok | [record-test.ts:45,66](../src/core/use-cases/record-test.ts#L45) |
| 3 | Docblock "min 200 kare" diyor, kod 60 kullanıyor | [balance.ts:115-121](../src/lib/tests/balance.ts#L115-L121) |
| 4 | `HEIGHT_AGREEMENT_TOLERANCE = 0.2` ama arayüz dokümanı %30 diyor | [jump.ts:106](../src/lib/tests/jump.ts#L106) vs `:66` |
| 5 | `analyzeCoordination` canvas argümanı almıyor → 500×500 varsayılan, gerçek 600×400 | [CoordinationTest.tsx:222](../src/components/tests/CoordinationTest.tsx#L222) |
| 6 | BMI persentilinde 9/11/13 yaşları **hep küçük yaşa** yuvarlanıyor (strict `<`) | [recommend.ts:325](../src/lib/matching/recommend.ts#L325) |
| 7 | İki farklı `normalCdf` (farklı yaklaşım, biri clamp'siz) | [recommend.ts:338](../src/lib/matching/recommend.ts#L338) + [stats/normalCdf.ts:14](../src/lib/stats/normalCdf.ts#L14) |
| 8 | `hopCount` süreye göre ölçeklenmiyor (endurance ölçekliyor) | [lateralHops.ts:180](../src/lib/tests/lateralHops.ts#L180) |
| 9 | `/api/report` kendi gevşek şemasını tanımlıyor + ham Zod issue sızdırıyor | [api/report/route.ts:152](../src/app/api/report/route.ts#L152) |
| 10 | Prompt cache breakpoint değişken içeriğin **sonrasında** → cache hiç tutmuyor | [api/chat/route.ts:161](../src/app/api/chat/route.ts#L161) |
| 11 | `env.ts` hiç kullanılmıyor, `process.env` doğrudan okunuyor | [anthropic.ts:33,39](../src/lib/llm/anthropic.ts#L33) |
| 12 | Kalite monitörü hesaplanıp atılıyor (`onQuality` tüketicisi yok) | `CameraStream.tsx:243` |
| 13 | Kadraj kayıt sırasında yeniden kontrol edilmiyor | tüm test bileşenleri |
| 14 | `coordination.ts`'in birim testi yok | — |

---

## 11. Yol haritası

| Faz | İçerik | Durum |
|---|---|---|
| **F0** | Doğrulanmış hatalar + parabol kökü + σ + fizik doğrulaması | ✅ **tamam** |
| **F1** | Sentetik kinematik harness + düşmanca fixture'lar | ✅ **tamam** |
| **F2** | `ValidityJudge` + kural hakemi + iskelet render + OpenAI adapter + `applyVerdict` | ✅ **tamam** — 4 ölçüm testine bağlı, `/api/validity` üzerinden görsel hakem devrede |
| **F4** | z-uzayı birleştirme + normsuz eksenlerin çıkarılması | ✅ **tamam** |
| **F5** | Monte Carlo + sıra olasılığı + Wilson CI + karşı-olgusal | ✅ **tamam** |
| **F3** | Rıza akışı + KVKK (açık rıza, `store:false`, veri minimizasyonu) | ✅ **tamam** — iskelet yolu; ham klip yolu yazılmadı |
| **F6** | Sayı-topraklama kapısı + `Narrator` portu | ⏳ sonraki |
| **F7** | Pilot (30+ çocuk) → norm tabloları + ICC | ⏳ **pilot gerekir** — hesap makinesi hazır (`reliability.ts`) |

### F4/F5 uygulanırken tasarımdan sapılan iki nokta

**1. Yalnız 3 eksen tam kalibre çıktı.** Tasarım "5 eksen z'ye çevrilir, 2'si
çıkarılır" varsayıyordu. Kod okunduğunda reaction ve endurance norm
tablolarında **SD olmadığı** görüldü — ortalama var, yayılım yok. Bu ikisi
`partial` kademesine alındı: literatür CV'siyle (0.18 / 0.20) z hesaplanıyor,
ama tahminin kendi hatası (±%30) belirsizliğe `× |z|` ile ekleniyor. Sayı
uydurulmadı, tahmin olduğu kodda ve belgede yazılı.

**2. Benzerlik `1 − d` değil RBF çekirdeği.** z-mesafesi sınırsız olduğu için
`1 − d` negatife düşüp kırpılırken bilgi kaybediyordu. `exp(−d²/2τ²)` monoton,
sınırlı ve standart bir benzerlik ölçüsü.

F1 kritik: **önce ölçüm aracını kur, sonra iyileştir.** Aksi hâlde iyileştirdiğinizi
iddia edersiniz ama kanıtlayamazsınız.

---

## 12. Neden bu mimari işe alım vitrini

1. **AI'ı nerede kullanmadığımızı gerekçelendiriyoruz.** Vision hakem, cetvel değil.
   Bunu bilmek, LLM'i her yere sıkıştırmaktan daha zor ve daha değerli.
2. **Her sayı hata payı taşıyor.** `Measured<U>` σ olmadan derlenmiyor.
3. **Sıra olasılığı, sahte yüzde değil.** Monte Carlo ile kalibre edilmiş çıktı.
4. **Halüsinasyon yapısal olarak imkânsız.** Topraklama kapısı + şema kısıtı.
5. **Düşmanca test seti.** Sistemin *reddetmesi gerekeni* test ediyoruz.
6. **Ölçemediğimizi ölçülmemiş yazıyoruz.** §8.5. Bu, mimarinin en güçlü satırı.
7. **Gizlilik bir tasarım kısıtı, sonradan eklenen bir madde değil.** İskelet yolu
   birinci sınıf, ham klip rıza kapılı.

---

**Doğrulama notu:** Bu belgedeki her kod iddiası (§0 A1-A7, B1-B2, §10'daki 14 kalem)
kaynak dosyalar okunarak bulunmuş ve ayrıca `grep` ile teyit edilmiştir. Teyit edilmemiş
tek alan, OpenAI model kimliğinin vision + strict structured outputs desteğidir — bu
uygulama anında smoke-test ile doğrulanmalıdır (§3.6).
