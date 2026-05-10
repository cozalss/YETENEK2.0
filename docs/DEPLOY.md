# Yetenek 2.0 — Deploy + APK Üretim Akışı

Hackathon için tek sayfalık deploy → APK rehberi.

> Süre tahmini: 30-45 dakika (Vercel hesabı + GitHub bağlantısı varsa).

---

## 0. Ön Koşullar

- [ ] GitHub'da repo (yoksa `git init && git remote add origin ...`)
- [ ] Vercel hesabı (ücretsiz, GitHub ile login)
- [ ] `GEMINI_API_KEY` (https://aistudio.google.com/apikey)
- [ ] `pnpm build` lokalde geçiyor (test edildi ✓)

---

## 1. Vercel Deploy (5-10 dk)

### Yol A — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link    # mevcut projeye bağla veya yeni oluştur
vercel deploy --prod
```

### Yol B — Vercel Dashboard (önerilen, daha görsel)

1. https://vercel.com/new → "Import Git Repository"
2. GitHub repo'yu seç
3. **Framework Preset:** Next.js (otomatik algılar)
4. **Build Command:** `pnpm build` (vercel.json'dan gelir)
5. **Install Command:** `pnpm install --frozen-lockfile`
6. **Root Directory:** `./`
7. **Environment Variables** ekle:
   - `GEMINI_API_KEY` = `<senin anahtarın>`
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `NEXT_PUBLIC_SITE_URL` = `https://yetenek-xxx.vercel.app` (deploy sonrası gerçek URL'e güncelle)
   - `NEXT_PUBLIC_APP_VERSION` = `2.0.0`
8. "Deploy" butonu → 2-3 dk bekle

### Doğrulama

Deploy bitince Vercel'in verdiği URL'e git ve şunları kontrol et:

```
https://<your-vercel-url>/                       → 200, hero görünmeli
https://<your-vercel-url>/api/health             → 200 JSON, geminiConfigured: true
https://<your-vercel-url>/manifest.webmanifest   → 200 application/manifest+json
https://<your-vercel-url>/sw.js                  → 200 (Service-Worker-Allowed: /)
https://<your-vercel-url>/icon.svg               → 200 image/svg+xml
https://<your-vercel-url>/demo                   → 200, persona seçim ekranı
```

`/api/health` çıktısında `geminiConfigured: true` görmüyorsan `GEMINI_API_KEY` Vercel'de doğru set edilmemiştir.

---

## 2. PWA Install Test (Chrome Android, 2 dk)

Telefondan deploy edilen URL'e git → Chrome adres barında **⊕ Install** ikonu çıkmalı.

Çıkmıyorsa:
- Chrome DevTools (desktop) → Application → Manifest → "Add to home screen" geçerli mi kontrol et
- Lighthouse → PWA puan ≥ 90 olmalı

---

## 3. PWABuilder ile APK (15-20 dk)

1. https://www.pwabuilder.com → URL'i yapıştır
2. **Score** sayfası: PWA, Manifest, Service Worker hepsi yeşil (puan 80+ olmalı)
3. **Package for Stores** → Android
4. Form:
   - **Package ID:** `com.yetenek.app` (ters DNS, eşsiz olmalı)
   - **App name:** `Yetenek 2.0`
   - **Launcher name:** `Yetenek`
   - **App version:** `1.0.0`
   - **Signing key:** "I'll let PWABuilder generate one" → **kaydet** (Play Store yayınlanırken aynı key gerekir)
5. **Generate** → ZIP iner
   - `app-release-signed.apk` (test cihazına kurulabilir)
   - `app-release-bundle.aab` (Play Store için)
   - `signing.keystore` + `signing-key-info.txt` (**KAYBETME** — Play Store yenileme için lazım)

---

## 4. APK Test (5 dk)

1. APK'yı telefona aktar (USB / Drive / WhatsApp)
2. **Ayarlar → Bilinmeyen kaynaklardan yükleme** aç
3. APK dosyasına dokun → "Yükle"
4. Aç:
   - Splash → ana sayfa
   - Kamera permission iste → kabul et
   - `/test/full` → MediaPipe + kamera çalışmalı
   - `/demo` → kamera olmadan persona seçimi → sonuç ekranı

### Bilinen Sınırlar

- **İlk açılış MediaPipe model indirir** (~10MB). İkinci açılış offline çalışır (SW cache).
- **Wi-Fi yokken ilk açılış başarısız olur** — model dosyaları indirilemez. Demo öncesi en az 1 kez online aç.
- **Kamera permission Chrome'a verilmiş olmalı** — TWA Chrome WebView kullanır, permission Chrome ayarlarından geçer.

---

## 5. Demo Backup (Hackathon Günü)

| Senaryo | Backup |
|---|---|
| Wi-Fi yok | APK önceden açılmış, MediaPipe model cache'lenmiş |
| Kamera çalışmıyor | `/demo` rotası → kamerasız persona demo |
| AI rapor çalışmıyor | Rule-based fallback otomatik devreye girer (`/api/health`'te `fallbackReportAvailable: true`) |
| Telefon ölür | APK QR'unu jüriye dağıt, kendi telefonlarında çalıştır |

---

## 6. Sonraki Adımlar (Hackathon Sonrası)

| Adım | Süre |
|---|---|
| Custom domain bağla (`yetenek.app`) | 30 dk |
| Supabase entegrasyonu (KVKK uyumlu, EU region) | 4-6 saat |
| Vercel Analytics aç (drop-off ölçümü) | 5 dk |
| Sentry / error tracking | 1 saat |
| Play Store internal testing track | 2-7 gün (Google review) |
