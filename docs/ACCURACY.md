# Yetenek — Ölçüm Doğruluğu Raporu

> Bu belge elle yazılmadı: sayılar `src/lib/eval/` altındaki harness'tan geliyor
> ve CI'da her koşuda yeniden doğrulanıyor. Yeniden üretmek için:
>
> ```bash
> EVAL_REPORT=1 pnpm vitest run src/lib/eval/jump-accuracy.test.ts
> ```

**Son güncelleme:** 2026-08-17 · **Harness:** `src/lib/eval/synthesize.ts` + `jump-accuracy.test.ts`

> **Bu sayılar sentetiktir.** Bilinen bir uçuş yörüngesinden yüksekliği geri
> kazanmayı ölçerler — matematiği doğrularlar, gerçek dünyayı değil. İnsan /
> force-plate doğrulaması yapılmamıştır. Uçtan uca sapma için
> [`docs/BIAS_PILOT.md`](./BIAS_PILOT.md). "Sistem ±0.4 cm ölçüyor" demek
> yanlıştır; doğrusu: "poz verisi doğruysa algoritma bu kadar hata ekliyor".

---

## 1. Ne ölçüldü, ne ölçülmedi

Bu ayrımı en başa koyuyoruz çünkü raporun değeri buna bağlı.

| Katman | Durum |
|---|---|
| **Algoritma hatası** — bilinen bir uçuş yörüngesinden yüksekliği geri kazanma | ✅ **Ölçüldü** (§2) |
| **Geçerlilik denetimi** — yapılmamış testin reddedilmesi | ✅ **Ölçüldü** (§4) |
| **Öneri motorunun ölçek geçerliliği** — eksenler karşılaştırılabilir mi | ✅ **Düzeltildi** (§6) |
| MediaPipe poz tahmini hatası | ❌ Ölçülmedi — gerçek video gerekir |
| Uçtan uca doğruluk (mezura ile karşılaştırma) | ❌ Ölçülmedi — pilot gerekir (F7). *Hesap makinesi hazır:* `reliability.ts` |
| Test-tekrar güvenilirliği (ICC) | ❌ Ölçülmedi — pilot gerekir. *Hesap makinesi hazır:* `icc21()` |
| Öneri kalibrasyonu ("%78 ilk 3'te" doğru mu?) | ❌ Ölçülemez — boylamsal sonuç verisi yok |

> Aşağıdaki sayılar **algoritmanın kendi hatasıdır**. "Sistem sıçramayı ±0.4 cm
> ölçüyor" demek yanlış olur; doğrusu: "poz verisi doğruysa algoritma ±0.4 cm
> hata ekliyor". Aradaki fark pilot çalışmayla kapanır.

---

## 2. CMJ sıçrama yüksekliği — koşul matrisi

Yöntem: bilinen bir `h` değerinden serbest düşüş kinematiği sentezlenir
(uçuşta kalça ve ayak bileği aynı parabolü çizer), ölçüm hattına verilir,
geri çıkan değerle karşılaştırılır. 6 yükseklik (12–42 cm) × 3 tekrar = 18 ölçüm.

| Koşul | MAE (cm) | Sapma/bias (cm) | Max hata (cm) | Seçilen yöntem |
|---|---|---|---|---|
| 24 fps, gürültüsüz | 1.6 × 10⁻¹³ | 1.0 × 10⁻¹³ | 0.000 | parabolik |
| 30 fps, gürültüsüz | 1.9 × 10⁻¹³ | 8.0 × 10⁻¹⁴ | 0.000 | parabolik |
| 60 fps, gürültüsüz | 1.7 × 10⁻¹³ | −1.7 × 10⁻¹³ | 0.000 | parabolik |
| 30 fps, gürültü σ=0.002 | **0.181** | 0.012 | 0.518 | parabolik |
| 30 fps, gürültü σ=0.004 | **0.397** | 0.063 | 1.451 | parabolik |
| 60 fps, gürültü σ=0.004 | **0.380** | −0.013 | 0.922 | parabolik |
| 30 fps, %10 kare düşmesi | 1.8 × 10⁻¹³ | 2.2 × 10⁻¹⁴ | 0.000 | parabolik |
| *(eski) eşik yöntemi* | **3.573** | **+3.573** | 7.186 | eşik |

Gürültü σ=0.004 normalize birim, ~180 cm/birim ölçekte yaklaşık **0.7 cm**
landmark titremesine karşılık geliyor — telefon yakalamasında gerçekçi bir üst
sınır.

### Üç sonuç

**1. Kare hızı bağımsızlığı.** Gürültüsüz veride 24, 30 ve 60 fps aynı sonucu
veriyor (makine hassasiyeti, ~10⁻¹³ cm). Parabolün taban çizgisi kökleri kare
ızgarasına bağlı değil. Eşik yönteminde hata doğrudan kare aralığına bağlıydı.

**2. Eski yöntemin sapması sistematik.** Eşik yönteminde MAE 3.573 cm ve bias
**+3.573 cm** — yani hata rastgele değil, tek yönlü: sistem sıçramayı sürekli
**fazla** ölçüyordu. Kaynağı belli: toe-off, ayak bileği eşiği aştığı karede
işaretleniyor; iniş de eşiğin altına düştüğü karede. Ölçülen aralık gerçek
uçuştan yaklaşık bir kare (33 ms) uzun çıkıyor. t≈0.4 s'de
`dh/dt = g·t/4 ≈ 0.98 m/s` olduğundan 33 ms → ~3.2 cm. Gözlenen 3.57 cm bu
hesapla tutarlı.

**3. Kare düşmesine dayanıklılık.** %10 kare kaybında hata artmıyor. En küçük
kareler fit'i eksik örneklerden etkilenmiyor; eşik yöntemi ise kaybolan kareyi
göremediği için süreyi yanlış ölçüyordu.

---

## 3. Belirsizlik (σ) dürüstlüğü

Her ölçüm `jumpHeightSigmaCm` alanıyla birlikte geliyor. σ uydurulmuş bir sabit
değil, veriden türetiliyor:

```
σ_t = √2 · (fit artığı) / |kökteki eğim|     [ms]
σ_h = (g·t/4) · σ_t                          [cm]   ← hata yayılımı
```

Test edilen özellikler (`jump-accuracy.test.ts`):

- σ her zaman pozitif ve raporlanıyor.
- σ gürültüyle birlikte **büyüyor** — sabit bir sayı değil.
- Gerçek hata ölçümlerin **%90'ından fazlasında 3σ bandının içinde** kalıyor.

Uçuş süresi ölçülemediğinde (hip-displacement fallback) σ `null` bırakılıyor.
O yolda belirsizlik modellenmiş değil ve uydurulmuş bir σ vermek yanıltıcı olur.

---

## 4. Geçerlilik denetimi — düşmanca senaryolar

`src/lib/eval/adversarial.ts` sistemin **reddetmesi gereken** girdileri üretir.
Her senaryo iki kez test edilir: ölçüm katmanının açığı kayda geçirilir, sonra
hakemin onu kapattığı doğrulanır.

| Senaryo | Ölçüm katmanı (hakemsiz) | Hakem kararı |
|---|---|---|
| İki ayak üstünde "tek bacak denge" | ✅ kabul, **skor > 70** | ❌ `both_feet_down` |
| Yana yürüyüş "broad jump" | ✅ kabul, geçerli mesafe | ❌ `no_flight_phase` + `stepped_not_jumped` |
| Topuk kaldırma "sıçrama" | ❌ artık reddediyor¹ | ❌ `heel_raise_only` |
| Orta çizgide titreme "lateral hops" | ✅ kabul, hop sayıyor | ❌ `insufficient_amplitude` |
| Merkeze konmuş parmak "koordinasyon" | ⚠️ `valid: true`, skor 0² | ❌ `finger_resting` |

¹ F0'da eklenen fizik doğrulamasının doğrudan sonucu: hareket balistik olmadığı
için parabol fit'i tutmuyor, kalça mantık kapıları devreye giriyor.

² Skor doğru biçimde 0 çıkıyor, ama `valid: true` olduğu için testi hiç yapmamış
çocuk "geçerli ölçüm, en kötü koordinasyon" olarak kaydediliyor. Eksik veriden
daha zararlı, çünkü **yanlış** veri. Hakem bunu `performed: false`'a çeviriyor.

**Yanlış negatif kontrolü:** Dürüst tek bacak duruşu ve dürüst yanal sıçrama
fixture'ları hakem tarafından **kabul** ediliyor. Hakem her şeyi reddederek
"başarılı" görünmüyor.

---

## 5. Kendi kendine kalibrasyon

Parabolün eğriliği yerçekimini içerdiğinden ölçek doğrudan fizikten çıkıyor:

```
cmPerUnit = ½g / a
```

Test: 140, 180 ve 240 cm/birim ölçeklerde, **çocuğun boyu hiç verilmeden**
gerçek ölçek %5 içinde geri kazanılıyor (saf kinematik testinde %1 içinde).

Pratik sonucu: boy bilgisi olmayan veya world landmark üretmeyen cihazlarda da
santimetre ölçümü mümkün — ve mevcut kalibrasyon için bağımsız bir çapraz
kontrol sağlıyor.

---

## 6. Öneri motoru — ölçek geçerliliği (yeni)

### Sorun neydi

Eşleştirme 7 boyut arasında `√Σw(c−p)²` hesaplıyordu, ama boyutlar aynı ölçekte
değildi: üçü z-persentil, ikisi doğrusal oran, ikisi keyfi eğri. Farklı ölçekli
eksenler arasında Öklid mesafesi **tanımsızdır** — sıralama bu tanımsız sayıya
dayanıyordu.

Ayrıca `confidencePercent = round(finalScore × 100)` idi: olasılık modeli,
kalibrasyon seti veya sonuç verisi olmadan üretilmiş bir yüzde.

### Ne yapıldı

Her eksen yaşa/cinsiyete göre **z-skoruna** çevrildi. Ama bu ancak norm tablosu
hem ortalama hem yayılım veriyorsa mümkün — ve tablolarımızın hepsi vermiyor.
Üç kademeli bir kayıt tutuluyor (`src/lib/matching/zspace.ts`):

| Eksen | Kalibrasyon | Karara katılıyor mu |
|---|---|---|
| explosivePower | ortalama + SD yayınlanmış | ✅ tam ağırlıkla |
| horizontalPower | ortalama + SD yayınlanmış | ✅ tam ağırlıkla |
| agility | ortalama + SD yayınlanmış | ✅ tam ağırlıkla |
| reaction | ortalama yayınlanmış, **SD tahmini** (CV≈0.18) | ⚠️ belirsizliği şişirilmiş |
| endurance | ortalama research-grade, **SD tahmini** (CV≈0.20) | ⚠️ belirsizliği şişirilmiş |
| **balance** | norm **yok** | ❌ **karara katılmıyor** |
| **coordination** | norm **yok** | ❌ **karara katılmıyor** |

> Kalibre edilmemiş bir ekseni mesafe metriğine sokmayı reddediyoruz. Denge ve
> koordinasyon ölçülüyor ve kullanıcıya gösteriliyor, ama spor sıralamasına
> girmiyor ve bu durum çıktıda `excludedByNorm` alanıyla açıkça raporlanıyor.

SD'si tahmin edilen iki eksende tahminin kendi hatası (±%30) z belirsizliğine
`× |z|` ile ekleniyor — yani ortalamaya yakın çocukta küçük, uçlarda büyük.
Tahmin sessizce kesinlik gibi davranmıyor.

### Çıktı artık bir olasılık

`confidencePercent` yerini Monte Carlo'ya bıraktı (`src/core/use-cases/decide.ts`):
her boyutun z değeri kendi σ'sıyla 2000 kez örnekleniyor, sporlar her seferinde
yeniden sıralanıyor, ilk 3'e girme sayılıyor. Wilson %95 aralığıyla birlikte
raporlanıyor.

**Ölçülen iç tutarlılık** (`decide.test.ts`):

| Özellik | Beklenen | Sonuç |
|---|---|---|
| İlk-3 olasılıkları toplamı | ≈ 3 | ✅ |
| Birincilik olasılıkları toplamı | ≈ 1 | ✅ |
| `pTopOne ≤ pTopK` | her spor için | ✅ |
| Güven aralığı nokta tahmini kapsıyor | her spor için | ✅ |
| Aynı ölçüm → aynı sonuç | determinizm | ✅ |
| σ çarpanı ↑ → kesinlik ↓ | kusurlu teknikte | ✅ |

**Ayrıştırma gücü.** Eski metriğin bilinen sorunu, medyan bir çocukta tüm
sporların 55-75 bandına sıkışmasıydı (kendi testi bunu "over-matching" olarak
kaydediyordu). Yeni modelde medyan çocukta bile en yüksek ve en düşük spor
arasındaki ilk-3 olasılığı farkı **0.30'un üzerinde**.

### Adversarial inceleme — düzeltilen dört kritik hata

İlk uygulama bağımsız bir incelemeden geçirildi ve **dört kritik hata**
bulundu. Hepsi ölçülerek doğrulandı ve düzeltildi; her biri için regresyon
testi eklendi.

| Bulgu | Ölçülen kanıt | Düzeltme |
|---|---|---|
| `confidencePercent` kötü eşleşmede **%100** veriyordu | Tek CMJ ölçümüyle Tenis ve Boks **%100**, similarity **0.32** | Olasılık için asgari 3 kalibre boyut + asgari 0.45 benzerlik şartı; yetersizse `pTopK: null` + gerekçe |
| Bonuslar ölçümü **eziyordu** | Benzerlik yayılımı **0.19**, bonus aralığı **0.25** → %131 | Bonuslar yayılımın %35'iyle sınırlandı; sıra kayması 4 basamağa indi |
| Bonuslar Monte Carlo'da **sıfır belirsizlik** taşıyordu | Sabit ofset olarak ekleniyordu — en az güvenilecek terime en yüksek kesinlik | Bonuslar da kendi σ'sıyla örnekleniyor |
| Wilson aralığı **çocuğu değil CPU'yu** ölçüyordu | n=2000'de maks **4.38 puan**; doküman **13 puan** iddia ediyordu | `mcPrecision` olarak yeniden adlandırıldı, kullanıcıya gösterilmiyor |
| `sigmaMultiplier` üretim yolunda **ölüydü** | `finalizeSession` hiç geçirmiyordu; teknik skoru 0 olan çocuk kusursuzla aynı çıktıyı veriyordu | Zincir bağlandı: %100 → %96 |

Ayrıca düzeltilen veri bütünlüğü hataları:

- **Başarısız yakalama gerçek ölçüm sayılıyordu.** `totalReps: 0` /
  `hopCount: 0` `Number.isFinite` kontrolünü geçip z ≈ −5 üretiyordu; çocuk
  "en alt persentil" olarak damgalanıyordu.
- **σ doğrusal toplanıyordu.** Bağımsız belirsizlikler kareler toplamının
  karekökü ile birleşir; doğrusal toplama `reaction` için z=1'de %41 şişirme
  yapıyordu.
- **Karakter modeli ters yönlüydü.** `characterFavor` hem ağırlık hem hedef
  olarak kullanılıyordu: voleybol için sebat=70 diyen çocuk maksimum boost
  alırken sebat=100 diyen daha düşük alıyordu. Artık hedef 1.0, `favor`
  yalnız ağırlık.
- **Karşı-olgusal döngüsü 2.0σ'ya hiç ulaşmıyordu** (float birikimi) ve
  `zDelta: 0.30000000000000004` gibi değerler sızdırıyordu.
- **`samples: 0` NaN üretiyordu** → NaN karşılaştırıcı → Zod reddi → tüm
  oturum kaydının düşmesi.

### Kapsam şeffaflığı

Kalibresiz eksenleri çıkarmak sporları **eşit etkilemiyor**. Her öneri artık
kendi `weightCoverage` oranını taşıyor:

| Spor | Ölçülemeyen ağırlık |
|---|---|
| Cimnastik | **%38.6** (denge 1.0 + koordinasyon 0.95 — onu tanımlayan iki eksen) |
| Masa Tenisi | %34.9 |
| Badminton | %30.1 |
| Atletizm | %19.8 |

Bu oran raporlanmadan sıralamayı göstermek, "güç sporları kimliğini koruyor,
teknik sporlar birbirine benziyor" gerçeğini gizlerdi.

### Hâlâ ölçülmemiş olan

Bu bölüm motorun **iç tutarlılığını** kanıtlıyor, **dış geçerliliğini** değil.
"%78 ihtimalle ilk 3'te" iddiasının doğru olup olmadığı ancak boylamsal sonuç
verisiyle (çocuk 2 yıl sonra hangi sporu yapıyor?) sınanabilir. O veri yok ve
kod yazarak üretilemez.

**Bilinen, düzeltilmemiş sınırlamalar:**

- `zScorePercentile` [1,99] clamp'i kalibre eksenleri **z = 2.33'te**
  tavanlıyor: 45, 50, 60 ve 80 cm sıçrayan çocuklar aynı z'yi alıyor. Elit
  kuyruk ayırt edilemiyor — tam da yetenek taramasının hedeflediği bölge.
- Tek boyut ölçüldüğünde ağırlık normalizasyonu ağırlığı **iptal ediyor**
  (`√(w·d²/w) = |d|`), yani farklı ağırlıklı sporlar aynı mesafeyi alıyor.
  Asgari-3-boyut kapısı en kötü hâli engelliyor ama kök neden duruyor.
- Yaş şeması 4–18 kabul ediyor, norm tabloları 8–15 kapsıyor. Aradaki yaşlar
  en yakın yaş normuyla, uyarısız ölçülüyor.

---

## 7. Test envanteri

| Dosya | Test | Kapsam |
|---|---|---|
| `src/lib/tests/kinematics.test.ts` | 18 | Parabol fit, kök çözümü, fizik doğrulaması, hata yayılımı |
| `src/lib/eval/jump-accuracy.test.ts` | 12 | MAE/bias matrisi, σ dürüstlüğü, öz-kalibrasyon |
| `src/lib/eval/adversarial.test.ts` | 12 | 5 düşmanca senaryo + 2 yanlış-negatif kontrolü |
| `src/core/use-cases/apply-verdict.test.ts` | 10 | Deterministik kapı, σ genişletme, sınır durumları |
| `src/core/use-cases/merge-verdicts.test.ts` | 9 | Hakem birleştirme, yetki alanı, görsel hakem düştüğünde dayanıklılık |
| `src/infrastructure/validity/skeleton-render.test.ts` | 13 | Gizlilik sözleşmesi, anahtar kare seçimi |
| `src/lib/stats/probit.test.ts` | 20 | Φ⁻¹ doğruluğu, gidiş-dönüş, sınır davranışı |
| `src/lib/matching/zspace.test.ts` | 28 | Norm kayıt defteri, z-mesafesi, gerçek spor davranışı |
| `src/core/use-cases/decide.test.ts` | 21 | Monte Carlo tutarlılığı, determinizm, ayrıştırma |
| `src/lib/eval/reliability.test.ts` | 17 | ICC(2,1), Cohen's κ, Bland-Altman |
| *(mevcut testler)* | 78 | Ölçüm modülleri, eşleştirme, ders doğrulayıcıları |
| **Toplam** | **247** | |

---

## 8. Sonraki ölçümler

| Metrik | Gereken | Faz |
|---|---|---|
| Uçtan uca doğruluk (mezura karşılaştırması) | 30+ çocuk, kontrollü ortam | F7 |
| Test-tekrar güvenilirliği ICC(2,1) | Aynı çocuk, 2 oturum | F7 |
| Hakem uyumu (Cohen's κ) | İnsan etiketli klip seti | F2 sonrası |
| Denge/koordinasyon norm tabloları | 30+ çocuk × yaş × cinsiyet | F7 |
| Öneri kalibrasyonu | Boylamsal takip (2+ yıl) | F4 — **veri yok** |

Son satır bilinçli olarak "veri yok" diyor. Ölçülmemiş bir metriği ölçülmüş
gibi göstermek, bu raporun bütün değerini yakar.
