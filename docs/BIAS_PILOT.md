# CMJ bias pilotu

Kamera tabanlı uçuş süresi (Bosco) force-plate'e göre **tutarlı bir sapma** üretir.
O sapma ölçülürse tek bir sabit (`BIAS_CORRECTION_CM`) bütün yükseklikleri aynı anda düzeltir — gürültü azaltmadan daha yüksek getiri, çünkü sistematik hatayı hedefler.

Kodda sabit **şimdilik 0**. Ölçmeden uydurmak, mevcut durumdan kötüdür.

## Ne zaman

Faz 1–3 (ham sinyal, rVFC, protokol kapıları, budanmış fit) bittikten sonra.
Daha önce ölçülen sabit, sinyal zinciri değişince eskir.

## Kim, kaç kişi

10–20 çocuk, 8–15 yaş, mümkünse her yaştan en az bir kişi. Aynı gün, aynı oda, aynı telefon yaslama düzeni.

## Referans cihaz

**Force-plate tercih.** Uçuş süresini ve kütle merkezi yükselmesini doğrudan verir.

Vertec veya duvar-uzanma **farklı bir yapıyı** ölçer (parmak erişimi, kütle merkezi değil). Doğrudan bias kaynağı sayılamaz; ancak kaba bir üst sınır için not edilebilir.

## Protokol

1. Kolsuz CMJ (eller belde) — uygulama normuyla aynı.
2. Çocuk başına en az 3 geçerli deneme; aykırıysa 4.
3. Deneme başına **ham** kalça/ayak serisini kaydet (filtreli overlay değil).
4. Her deneme için: cihaz `jumpHeightCmFlight`, referans yükseklik, ulaşılan fps, model tier.
5. Bias = ortalama (cihaz − referans). σ = sapmaların SD'si.

## Karar kuralı

- |bias| < 1 cm ve n ≥ 10 → sabit 0 kalır, rapora "ölçüldü, ihmal edilebilir" yazılır.
- |bias| ≥ 1 cm ve tutarlı (işaret aynı, n ≥ 10) → `BIAS_CORRECTION_CM = −bias` (cihaz yüksekse negatif).
- Tutarsız veya n yetersiz → 0 kalır; uydurma yok.

## Etik

Veli onayı. Video cihazda kalır; paylaşılan yalnız özet metrikler ve (isteğe bağlı) ham zaman serisi — yüz yok.
