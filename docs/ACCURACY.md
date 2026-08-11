# Yetenek — Ölçüm Doğruluğu Raporu

> Bu belge elle yazılmadı: sayılar `src/lib/eval/` altındaki harness'tan geliyor
> ve CI'da her koşuda yeniden doğrulanıyor. Yeniden üretmek için:
>
> ```bash
> EVAL_REPORT=1 pnpm vitest run src/lib/eval/jump-accuracy.test.ts
> ```

**Son güncelleme:** 2026-08-11 · **Harness:** `src/lib/eval/synthesize.ts` + `jump-accuracy.test.ts`

---

## 1. Ne ölçüldü, ne ölçülmedi

Bu ayrımı en başa koyuyoruz çünkü raporun değeri buna bağlı.

| Katman | Durum |
|---|---|
| **Algoritma hatası** — bilinen bir uçuş yörüngesinden yüksekliği geri kazanma | ✅ **Ölçüldü** (§2) |
| **Geçerlilik denetimi** — yapılmamış testin reddedilmesi | ✅ **Ölçüldü** (§4) |
| MediaPipe poz tahmini hatası | ❌ Ölçülmedi — gerçek video gerekir |
| Uçtan uca doğruluk (mezura ile karşılaştırma) | ❌ Ölçülmedi — pilot gerekir (Faz F7) |
| Test-tekrar güvenilirliği (ICC) | ❌ Ölçülmedi — pilot gerekir |
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

## 6. Test envanteri

| Dosya | Test | Kapsam |
|---|---|---|
| `src/lib/tests/kinematics.test.ts` | 18 | Parabol fit, kök çözümü, fizik doğrulaması, hata yayılımı |
| `src/lib/eval/jump-accuracy.test.ts` | 12 | MAE/bias matrisi, σ dürüstlüğü, öz-kalibrasyon |
| `src/lib/eval/adversarial.test.ts` | 12 | 5 düşmanca senaryo + 2 yanlış-negatif kontrolü |
| `src/core/use-cases/apply-verdict.test.ts` | 10 | Deterministik kapı, σ genişletme, sınır durumları |
| `src/infrastructure/validity/composite-judge.test.ts` | 9 | Hakem birleştirme, görsel hakem düştüğünde dayanıklılık |
| `src/infrastructure/validity/skeleton-render.test.ts` | 12 | Gizlilik sözleşmesi, anahtar kare seçimi |
| *(mevcut testler)* | 78 | Ölçüm modülleri, eşleştirme, ders doğrulayıcıları |
| **Toplam** | **151** | |

---

## 7. Sonraki ölçümler

| Metrik | Gereken | Faz |
|---|---|---|
| Uçtan uca doğruluk (mezura karşılaştırması) | 30+ çocuk, kontrollü ortam | F7 |
| Test-tekrar güvenilirliği ICC(2,1) | Aynı çocuk, 2 oturum | F7 |
| Hakem uyumu (Cohen's κ) | İnsan etiketli klip seti | F2 sonrası |
| Denge/koordinasyon norm tabloları | 30+ çocuk × yaş × cinsiyet | F7 |
| Öneri kalibrasyonu | Boylamsal takip (2+ yıl) | F4 — **veri yok** |

Son satır bilinçli olarak "veri yok" diyor. Ölçülmemiş bir metriği ölçülmüş
gibi göstermek, bu raporun bütün değerini yakar.
