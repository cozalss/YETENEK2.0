# Yetenek 2.0 — Bilimsel Metodoloji

> Bu belge, 7 testlik bataryanın ölçüm temellerini, 12 spor profilinin
> fizyolojik dayanağını ve matching algoritmasının matematiksel
> yapısını peer-reviewed kaynaklarla birlikte belgeler. Pitch ve jüri
> soruları için referans dokümanı.

**Son güncelleme:** 2026-05-14
**Validity audit (paralel 3 agent):** 2026-05-14

---

## 1. Test Bataryası — 7 Bio-Motor Boyut

Her test pure analiz fonksiyonu — pose frame stream'i girer, skor üretir
(`src/lib/tests/*.ts`). MediaPipe Pose 33 keypoint (BlazePose v1.0.11) ile
on-device çalışır; veri sunucuya gitmez (KVKK).

### 1.1 CMJ Sıçrama — Dikey Patlayıcı Güç

| Özellik | Değer |
|---|---|
| Modül | `src/lib/tests/jump.ts` |
| Protokol | **Bosco 1983** Counter-Movement Jump (CMJ) |
| Formula | h(m) = (g × t²) / 8, g = 9.81; flight-time + hip-displacement cross-check |
| Birim | cm |
| Norm | Tomkinson 2018 (Br J Sports Med), Temfemo 2009, Castro-Piñero 2010 |
| Yaş aralığı | 8-15, erkek/kız ayrı |
| Validity skoru | **4/5** (peer-reviewed gold standard) |

**Yöntem:** Çocuk dik durur → hızlı çömelip patlayıcı sıçrar. MediaPipe hip
ve ankle Y keypoint'lerinden:
1. **Flight-time** yöntemi: ayak kalkışı (toe-off) ile iniş arasındaki süre
   (t) → h = gt²/8 (Bosco). Birincil ölçüm.
2. **Hip-displacement** yöntemi: kalça merkezi minimum/baseline Y delta'sı
   → cm. Cross-check.

**Kalibrasyon:**
- World landmarks varsa: `getCmPerUnitFromWorld()` → hip-ankle metrik
  uzaklık. **Robust**, kullanıcı boyu girmesi gerekmez.
- World landmarks yoksa: `estimateScaleCmPerUnit(knownHeightCm)` → fallback.

**Sınırlamalar:**
- İki yöntem >%30 farklıysa "consensus average" alınır; metodolojik
  belirsizlik var (ileri sürüm: stricter cross-check + uyarı).

**Norm referansı:**
> Tomkinson GR et al. (2018). *European normative values for physical
> fitness in children and adolescents aged 9–17 years*. Br J Sports Med
> 52:1445–1456. [Link](https://pubmed.ncbi.nlm.nih.gov/29191931/)

---

### 1.2 Broad Jump — Yatay Patlayıcı Güç

| Özellik | Değer |
|---|---|
| Modül | `src/lib/tests/broadJump.ts` |
| Protokol | Standing Long Jump (SLJ) |
| Formula | mesafe(cm) = |ankle_end_X - ankle_start_X| × cmPerUnit |
| Birim | cm |
| Norm | Thomas 2020 (Eur J Transl Myol), Ramírez-Vélez 2017 (Nutrients), Tomkinson 2018, Castro-Piñero 2010 |
| Validity skoru | **3.5/5** |

**Yöntem:** Çocuk durur → patlayıcı yatay sıçrar. İlk 15 frame ortalama
ankle X (başlangıç) ve son 15 frame ortalama ankle X (iniş) — mesafe ×
cmPerUnit kalibrasyonu.

**Norm:** Yaş 8-15, erkek/kız ayrı. Ortalama erkek 12 yaş = 162 cm ± 24
(`BROAD_JUMP_NORMS_CM`).

**Sınırlamalar:**
- MIN_JUMP_UNITS = 0.06 (normalize) eşiği empirik; pilot doğrulama önerilir.
- Kullanıcının frontal kamerada kaldığı varsayılır (yan kayma → X hatalı).

**Norm referansı:**
> Thomas E et al. (2020). *Percentile values of the standing broad jump
> in children and adolescents aged 6–18 years*. Eur J Transl Myol
> 30(2):9050.

---

### 1.3 Balance — Tek Bacak Postüral Kontrol

| Özellik | Değer |
|---|---|
| Modül | `src/lib/tests/balance.ts` |
| Protokol | Tek-bacak duruş 15s × 2 (L+R) |
| Formula | combinedSway = hipSwayX × 0.6 + shoulderSwayX × 0.4; score = (1 - combinedSway/0.05) × 100 |
| Birim | 0-100 skor |
| Asimetri eşiği | L-R fark > %15 → InjuryWarning (Hewett 2005) |
| Validity skoru | **2.5/5** — asimetri kısmı sağlam, mutlak skor empirik |

**Yöntem:** Hip ve omuz X keypoint varyansı (sway path proxy). Sol ve sağ
bacak için ayrı ölçüm; arasında > %15 fark sakatlanma riski rozetini
tetikler.

**Sınırlamalar:**
- 0.05 normalize unit sway threshold **peer-reviewed kaynaklı değil**, pilot
  data ile kalibre edilmeli. Mevcut: empirik.
- Center-of-Pressure (CoP, force plate) altın standart — MediaPipe yalnızca
  kinematik proxy verir.
- 60 frame minimum (kod) çok düşük; ideal istatistik için 450 frame
  (15s × 30fps) gerek.

**Norm referansı:**
> Hewett TE et al. (2005). *Biomechanical Measures of Neuromuscular
> Control and Valgus Loading Predict ACL Injury Risk*. Am J Sports Med
> 33(4):492–501.

---

### 1.4 Reaction Time — Bilişsel Hız

| Özellik | Değer |
|---|---|
| Modül | `src/lib/tests/reaction.ts` |
| Protokol | Go-stimulus (görsel), false-start filter |
| Formula | averageMs = Σ(valid RT) / n; consistencyScore = (1 - σ/150) × 100 |
| Birim | ms (yaş-norm) |
| Norm | Der & Deary 2006, Dykiert 2012; REACTION_NORMS_MS yaş 8→330ms, 15→250ms |
| Validity skoru | **2/5** — browser latency kontrolsüz |

**Sınırlamalar:**
- JS event timestamp browser bağımlı (~20-40ms jitter Android Chrome).
- Stimulus tipi (görsel) ve latency offset (±30ms) dokümanteli değil.
- En az 6 trial enforce edilmeli (mevcut: open).

**Norm referansı:**
> Der G, Deary IJ (2006). *Age and sex differences in reaction time in
> adulthood: results from the United Kingdom Health and Lifestyle Survey*.
> Psychol Aging 21:62–73.

---

### 1.5 Lateral Hops — Çeviklik (COD)

| Özellik | Değer |
|---|---|
| Modül | `src/lib/tests/lateralHops.ts` |
| Protokol | 15s yan sıçrama, midline geçiş sayımı (300ms debounce) |
| Formula | hopCount; frequencyHz = hopCount / durationS |
| Birim | sayı |
| Norm | LATERAL_HOP_NORMS — Larsen 2022 pediatric, Munro 2011 yetişkin (scaling) |
| Validity skoru | **2.5/5** |

**Sınırlamalar:**
- 8-10 yaş için norm tablosu "pilot doğrulama önerilir" (kodda işaretli).
- Debounce 300ms → >2 Hz sıçrama undercounting.

**Norm referansı:**
> Larsen JB et al. (2022). *Reference data for hop tests used in pediatric
> ACL injury rehabilitation*. Translational Sports Medicine.

---

### 1.6 Coordination — Görsel-Motor

| Özellik | Değer |
|---|---|
| Modül | `src/lib/tests/coordination.ts` |
| Protokol | Pursuit rotor (Lissajous), 27s touch tracking |
| Formula | avgErrorPx = Σ √((dotX-touchX)² + (dotY-touchY)²) / n; score = clamp(0,100, 100 - (err-10)×1.1 - gapPenalty) |
| Birim | 0-100 skor |
| Norm | **YOK** — empirik kalibrasyon |
| Validity skoru | **1.5/5** — KRİTİK: norm tablosu eksik |

**Sınırlamalar:**
- **Yayınlanmış pediatric pursuit-rotor norm tablosu YOK.** Mevcut skor
  threshold'ları (10px error, 800ms gap penalty) empirik.
- Canvas resolution-bağımlı: 1920px monitor vs 400px telefon aynı "10px
  error" farklı anlam taşır → responsive normalize gerekli.

**Pilot çalışma gerekli:** 20-30 çocuk × 8-15 yaş × cinsiyet → mean +
SD tablosu çıkarılmalı (post-hackathon).

**Mevcut referans (skor temeli yok, sadece methodology):**
> Mueller ST, Piper BJ (2014). *The Psychology Experiment Building
> Language (PEBL) and PEBL Test Battery*. J Neurosci Methods 222:250–259.

---

### 1.7 Endurance Jacks — Anaerobik Dayanıklılık

| Özellik | Değer |
|---|---|
| Modül | `src/lib/tests/enduranceJacks.ts` |
| Protokol | 30s jumping jack; kol-bacak senkronizasyon tespiti |
| Formula | reps; decayPercent = (1 - last5s_reps/first5s_reps) × 100 |
| Birim | sayı |
| Norm | JACKS_NORMS_30S — burpee scaling × 3 (Podstawski 2019), FitnessGram 2017 |
| Validity skoru | **2/5** — direkt pediatric jumping-jack norm yok |

**Sınırlamalar:**
- Direkt jumping-jack pediatric norm yayını **bulunamadı**; mevcut norm
  burpee-3-min testinden analog ekstrapolasyon.
- Wrist OOF (out-of-frame) → arm-up false negative.

**Pilot çalışma gerekli:** 30+ çocuk × 8-15 yaş → gerçek 30s
jumping-jack norm tablosu (post-hackathon, başvurulu).

---

## 2. Spor Matching Algoritması

### 2.1 Genel akış

```
çocuk vektörü (7D, 0-1)
   ↓ weighted Euclidean per-sport
similarity (0-1)
   +
heightPercentile × heightAdvantage × 0.1
   +
(1 - bmiPercentile/100) × leanAdvantage × 0.1
   ↓ clamp [0, 0.15]
anthroBonus
   ↓
finalScore = clamp(0, 1, similarity + anthroBonus)
   ↓ filter ≥ minConfidence (default 0.50)
top-N spor (default 5)
```

### 2.2 Weighted Euclidean

```
distance(child, profile) = √( Σ weights[d] × (child[d] - profile[d])² / Σ weights )
similarity = 1 - distance
```

Per-sport weights: basketbol için explosivePower 1.0, masa-tenisi için
reaction 0.95. Bu sayede aynı çocuk profili farklı sporlarda **gerçekten
farklı** skorlar alır.

### 2.3 Antropometrik bonus

`computeAnthroBonus()` kaynak `recommend.ts:87`. Boy avantajı + lean
avantajı toplam max **0.15** ile clamp edilir (yaklaşık ±%15 final
score etkisi).

### 2.4 Confidence threshold

`DEFAULT_MIN_CONFIDENCE = 0.5`. Bu eşiğin altında kalan sporlar
filtrelenir. En az 1 spor garanti edilir (kullanıcı boş ekran görmesin).

### 2.5 Bilinen sınırlamalar (audit bulguları)

- **Cinsiyet farkı:** Voleybol/basketbol kadın profil yok. Mevcut: tek
  profil. Gelecek: `sex` parametresi ile gender-specific.
- **Yaş normalizasyonu:** 8 yaş "%80 jump skoru" ile 15 yaş "%80" farklı
  bağlam taşır; mevcut algoritma yaş normalizasyonu yapmaz (test bazında
  norm'lar zaten yaş düşürse de).

---

## 3. 12 Spor Profilinin Dayanağı

Audit raporu sonucu (paralel agent + Sports Med literatür):

| Spor | Profil doğruluk | Anahtar kaynak |
|---|---|---|
| Voleybol | 4.5/5 | Pion 2015 (J Strength Cond Res) |
| Basketbol | **5/5** | Mancha-Triguero 2023 meta-analiz |
| Tenis | 4.5/5 | Kovacs 2007 (Sports Med 37) — horizontalPower düzeltildi |
| Yüzme | 4.5/5 | Pyne 2019 — explosivePower (block) düzeltildi |
| Futbol | 4.5/5 | Williams & Reilly 2000 |
| Atletizm | **5/5** | Sprint biomekaniği force-time profile |
| Cimnastik | **5/5** | Sands 2003 (Karger) — short stature + leanAdvantage 0.9 |
| Judo | 4.5/5 | Franchini 2011 (Sports Med 41) |
| Taekwondo | 4.5/5 | Bridge 2014 (Sports Med 44) — horizontalPower düzeltildi |
| Boks | **5/5** | Chaabène 2015 (Sports Med 45) |
| Masa Tenisi | 4.5/5 | Kondrič 2013 (J Sports Sci Med) |
| Badminton | 4.5/5 | Phomsoupha 2015 (Sports Med 45) — explosivePower (smash) düzeltildi |

**Genel:** %92 ortalama doğruluk (sport vector × Sports Med literatür
karşılaştırması). 14 Mayıs 2026 audit'inde 4 spor minör vector kalibrasyon
ile güçlendirildi.

---

## 4. Bilim Referansları — Tam Liste

26 peer-reviewed kaynak; tam liste `src/lib/content/bibliography.ts` ve
Supabase `science_references` tablosunda.

Anahtar kaynaklar:
- **CMJ:** Bosco 1983 (Eur J Appl Physiol)
- **Norm tabloları:** Tomkinson 2018, Thomas 2020, Castro-Piñero 2010
- **Asimetri/sakatlanma:** Hewett 2005, Croisier 2008
- **Spor profilleri:** Bompa 2000, Franchini 2011, Bridge 2014,
  Chaabène 2015, Kovacs 2007, Phomsoupha 2015, Pion 2015,
  Mancha-Triguero 2023
- **Antropometri:** Norton & Olds 2001 (Anthropometrica)
- **TC GSB:** Yetenek Seçimi Kılavuzu (2019)

---

## 5. Bilinen Sınırlamalar — Şeffaf Liste (Pitch'te Söylenecek)

1. **Pilot çalışma yapılmadı** (henüz). 20-30 çocuk × 8-15 yaş ile
   coordination + endurance norm tabloları doğrulanmalı.
2. **Cinsiyet farkı** spor profillerinde yok (voleybol kadın/erkek aynı
   profil).
3. **Browser reaction latency** kalibre edilmedi (±30ms uncertainty).
4. **Balance sway threshold** (0.05 unit) literatür-bazlı değil, pilot
   data ile rebalance edilmeli.
5. **Force-plate (CoP)** altın standart — MediaPipe yalnızca kinematik
   proxy verir.

Bu sınırlamalar **mimari tasarım sorunu değil**, ileriki uzman validasyon
fazıyla aşılır. Mevcut sistem peer-reviewed protokolleri implement eder
ve normatif tabloları kullanır.

---

## 6. Calibration Roadmap (Post-Hackathon)

1. **Faz 1 (1 ay):** 30+ çocukla coordination + endurance pilot ölçümleri.
2. **Faz 2 (2 ay):** Cinsiyet-ayrımlı sport profile vektörleri (özellikle
   voleybol kadın, basketbol kadın).
3. **Faz 3 (3 ay):** Force-plate validasyon (Hacettepe / İzmir Yüksek
   İhtisas).
4. **Faz 4:** Akademik publication — "Smartphone pose-based youth talent
   identification: reliability and convergent validity".

---

**Hazırlayan:** Yetenek 2.0 (AI/ML lead Cem Özal) + paralel scientific
audit (2026-05-14)
**İletişim:** darkcozal01@gmail.com
