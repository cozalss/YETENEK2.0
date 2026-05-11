# Yetenek 2.0 — Proje Belleği

## Proje Özeti

**Yetenek 2.0** — AI tabanlı çocuk spor yetenek keşif platformu. 8-15 yaş arası çocuk telefon kamerası önünde 5 dakikalık 7 testlik bataryayı yapıyor; AI çocuğa 12 spor profili içinden en uygun 3-5 sporu öneriyor + sakatlanma riski uyarısı veriyor + gamification katmanıyla rozet/leaderboard/streak sunuyor.

> Yeni başlayan bir geliştirici için hızlı yön: kurulum + ortam değişkenleri → [`README.md`](./README.md). Mimari + bağımlılık kuralları → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). Deploy + APK → [`docs/DEPLOY.md`](./docs/DEPLOY.md). Pitch akışı → [`docs/PITCH.md`](./docs/PITCH.md).

## Bağlam

- **Yarışma:** METU Sports Tech Hackathon, 16-17 Mayıs 2026, ODTÜ Teknopark CoZone
- **Hedef:** Birincilik
- **Süre:** 6 gün hazırlık + 24 saat hackathon
- **Tema:** Spor, Sağlık & Refah

## Kullanıcı / Hedef Kitle

- **Birincil B2C:** 8-15 yaş çocukların velileri (Türkiye'de ~12M çocuk)
- **B2B:** Spor okulları, ilkokul/ortaokul beden eğitimi
- **Devlet:** Gençlik Spor Bakanlığı yetenek tarama programı

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, `proxy.ts` convention)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4
- **Pose Estimation:** `@mediapipe/tasks-vision` (browser, on-device, 33 keypoint)
- **Database / Auth:** Supabase (postgres + cookie-based SSR auth) — env eksikse demo modu otomatik
- **LLM:** Google Gemini (`gemini-2.5-flash`, `@google/generative-ai`) — env eksikse rule-based fallback rapor
- **State (server):** TanStack Query (`useReportQuery`)
- **Charts:** Recharts (radar grafik, ResizeObserver ile sabit-boyut render)
- **PDF:** `@react-pdf/renderer` (rapor üretimi)
- **TTS:** Web Speech API (browser native)
- **PWA:** `public/sw.js` (offline shell + MediaPipe model cache)
- **Test:** Vitest (unit) + Playwright (E2E, Chromium + Mobile Chrome)
- **Deployment:** Vercel
- **Package Manager:** pnpm

## Mimari Prensipleri

- **Mobile-first:** Hedef kitle telefonla test yapıyor
- **On-device pose:** MediaPipe browser'da çalışıyor, gizlilik ve hız için
- **API-first:** Backend sadece veri persistance + Claude proxy
- **Component composition:** shadcn/ui pattern (kütüphaneye bağımlı değil)
- **Type-safe:** Strict TypeScript, no `any`

## Test Bataryası (7 Test)

`src/lib/tests/*` altında her test pure bir analiz fonksiyonu — pose frame stream'i girer, skor çıkar.

| # | Test | Modül | Ölçüm |
|---|------|-------|-------|
| 1 | CMJ Sıçrama (dikey güç) | `jump.ts` | Kalça Y-delta'sı → cm |
| 2 | Broad Jump (yatay güç) | `broadJump.ts` | Ayak başlangıç-iniş mesafesi → cm |
| 3 | Tek Bacak Denge (15sn × 2) | `balance.ts` | Keypoint varyansı + sol-sağ asimetri |
| 4 | Reaksiyon Süresi | `reaction.ts` | JS event timestamp → ms |
| 5 | Lateral Hops (çeviklik) | `lateralHops.ts` | Yana zıplama frekansı |
| 6 | Coordination (görsel takip) | `coordination.ts` | El-göz eşgüdüm doğruluğu |
| 7 | Endurance Jacks (dayanıklılık) | `enduranceJacks.ts` | Sabit ritm sürdürme |

**Asimetri uyarısı:** Tek bacak denge sol-sağ farkı >15% → sakatlanma riski rozeti (`InjuryWarning`).

## Sport Matching Algoritması

**12 spor × 7 boyutlu profil** (weighted Euclidean + anthropometrik bonus):

Voleybol, Basketbol, Tenis, Yüzme, Futbol, Atletizm,
Cimnastik, Judo, Taekwondo, Boks, Masa Tenisi, Badminton.

Daha önce listede yer alan ama motion-battery (CMJ + balance + reaction +
broad jump + lateral hops + endurance) ile dürüstçe ölçülemeyen sporlar
listeye alınmadı: Binicilik, Kayak, Buz Pateni, Okçuluk, Eskrim. Hentbol
ve Atletizm-Mesafe ayrıştırma değeri yetersiz olduğu için kaldırıldı.

Boyutlar: patlayıcı güç, statik denge, reaksiyon süresi, çeviklik, koordinasyon,
dayanıklılık, antropometrik uygunluk.

Canonical liste: [src/lib/matching/sportProfiles.ts](src/lib/matching/sportProfiles.ts)

Çocuk vektörü → similarity → top 3-5 → confidence %

## Bilimsel Kaynaklar (Pitch Slaytlarında Cite)

- Tudor Bompa — "Total Training for Young Champions"
- Joe Brewer — Talent Identification literature
- T.C. Gençlik ve Spor Bakanlığı — Yetenek Seçimi Kılavuzu (2019)

## Mimari (Hexagonal + Pure Core / Impure Shell)

> Tam dökümantasyon: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
> ADR'ler: [docs/adr/](./docs/adr/)

```
src/
├── core/                    # Pure domain — no React/fetch/SDK
│   ├── types/
│   │   ├── result.ts        # Result<T, E> + AppError union
│   │   └── branded.ts       # SessionId, Score, AgeYears, Cm, Ms
│   ├── schemas/             # Zod tek-doğruluk-kaynağı
│   │   ├── session.schema.ts
│   │   └── chat.schema.ts
│   ├── ports/               # Adapter sözleşmeleri
│   │   ├── report-generator.ts
│   │   ├── coach-chat.ts
│   │   ├── session-repository.ts
│   │   └── history-repository.ts
│   ├── domain/              # Entities + value objects (genişletilecek)
│   └── use-cases/           # Pure orchestration (genişletilecek)
│
├── infrastructure/          # Impure adapters
│   ├── storage/             # localStorage / Supabase
│   │   └── local-history-repository.ts
│   └── llm/                 # Gemini / Anthropic / Mock
│       └── gemini-report-adapter.ts
│
├── shared/                  # Cross-cutting
│   ├── config/env.ts        # Zod-validated env
│   └── logger/logger.ts     # Structured + PII-redacting
│
├── providers/
│   └── QueryProvider.tsx    # TanStack Query (server state)
│
├── hooks/
│   ├── use-report-query.ts  # TanStack Query hook
│   └── useReport.ts         # (legacy, kademeli kaldırılır)
│
├── app/                     # Next.js routes — composition only
│   ├── api/{chat,health,og,report,children/[id]}/route.ts
│   ├── auth/{sign-in,sign-up,callback}/page.tsx
│   ├── test/{full,jump,balance,reaction}/page.tsx
│   ├── result/demo/page.tsx
│   ├── demo/page.tsx                  # Kamera olmadan persona demo
│   ├── training/[dimension]/page.tsx
│   ├── sports/[slug]/page.tsx
│   ├── children/[id]/page.tsx
│   ├── {about,privacy,terms,history,profile}/page.tsx
│   └── sitemap.ts, robots.ts
│
├── components/              # UI primitives + composite
│   ├── camera/CameraStream.tsx + PoseOverlay.tsx   # Kamera + MediaPipe loop; izin reddi → /demo fallback
│   ├── tests/{Jump,Broad,Lateral,Endurance,Coordination,Balance,Reaction}.tsx
│   ├── tests/shared/{TestStage,FramingBadge,InstructionsPanel,StartCTA}.tsx
│   ├── result/{ResultScreen,BioMotorRadar,ShareButton,CoachChat,PdfExportButton,...}.tsx
│   ├── gamification/{BadgeReveal,BadgeWallet,StreakIndicator}.tsx
│   ├── flow/{ProfileForm,PhaseHeader}.tsx
│   ├── layout/{SiteHeader,SiteFooter}.tsx
│   ├── pwa/ServiceWorkerRegistration.tsx
│   └── motion/Reveal.tsx
│
├── proxy.ts                 # Next 16 proxy (eski middleware.ts) — Supabase session refresh + auth guard
│
└── lib/                     # Eski — kademeli core/infrastructure'a taşınır
    ├── pose/{detector,extractKeypoints,framing,oneEuroFilter,quality}.ts
    ├── tests/{jump,balance,reaction,broadJump,lateralHops,coordination,enduranceJacks}.ts
    ├── matching/{recommend,sportProfiles}.ts
    ├── llm/{gemini,geminiReport,coachPrompt,reportPrompt,fallbackReport}.ts
    ├── session/store.ts, history/store.ts
    ├── gamification/{badges,store}.ts
    ├── training/programs.ts
    ├── content/{bibliography,sports}.ts
    ├── demo/fixtures.ts
    └── a11y/speech.ts
```

### Mimari kuralları

1. **Bağımlılık kuralı**: UI → Hook → Use-case → Port → (Adapter implements). Tersi yasak.
2. **Pure core**: `src/core/` içinde React, fetch, localStorage, SDK import yok.
3. **Result\<T, E\> + no-throw**: domain `throw` etmez; adapter sınırında yakalanır.
4. **Branded types**: SessionId, Score, AgeYears nominal — yapısal eşleşme yok.
5. **Zod tek-doğruluk-kaynağı**: schema → type inference (`z.infer<typeof X>`).
6. **Yeni kod yeni mimaride**: `src/lib/*` referans için kalır, kademeli taşınır.

## Kod Standartları

### KISS / YAGNI / DRY

- En basit çözümle başla
- Erken soyutlama yapma
- Tekrarı 3. kez gördüğünde extract et

### Dosya Boyutu

- Bileşen < 300 satır
- Modül < 500 satır
- 800'ü geçen dosya = mutlaka böl

### Naming

- Components: PascalCase (`CameraStream`, `JumpTest`)
- Hooks: `use` prefix (`usePoseDetector`)
- Utilities: camelCase (`extractKeypoints`)
- Types: PascalCase (`PoseKeypoint`, `TestResult`)

### Immutability

- Object spread / array spread tercih et, mutasyon etme
- `const` her yerde, sadece gereken yerde `let`

### Error Handling

- API route'lar her zaman try/catch + user-friendly error
- Camera/MediaPipe hatalarını UI'da göster
- Console.log production'da kaldır (sadece dev)

### Comments

- WHY yaz, WHAT yazma (iyi isimlendirme yeter)
- Workaround'ları açıkla, varsayımları açıkla
- TODO yazıyorsan owner ve tarih ekle

## Gizlilik / KVKK

- Çocuk verisi → veli onayı zorunlu
- Test videosu CIHAZDA işlenir, sunucuya gitmez
- Sadece **özet metrikler** Supabase'de tutulur (sıçrama yüksekliği gibi)
- Yüz tanıma yok, isim opsiyonel

## Demo Stratejisi

- **14 Mayıs:** Gerçek çocukla tam akış kayıtta (backup video)
- **Sahnede:** Live demo birincil, video fallback
- **Pitch hikayesi:** Naim Süleymanoğlu hook (1985 Karaman)

## Hackathon Saat 18 Sonrası Kuralı

**Kod freeze.** Sadece kritik bug fix. Pitch ve demo prova öncelikli.

## Mevcut Faz

**Hazırlık dönemi — hackathon (16-17 Mayıs) öncesi son hafta.**

Production polish tamam (2026-05-12 commit `1186833`):

- [x] 7 testlik batarya + sport matching + AI rapor (Gemini) + rule-based fallback
- [x] Supabase auth + çocuk profilleri + sessions tablosu (dual-write: localStorage + DB)
- [x] Kamera akışı: izin reddi → /demo fallback link + ARIA alert
- [x] PWA shell + Service Worker (offline + MediaPipe model cache)
- [x] Next 16 migration (middleware → proxy)
- [x] 0 lint / 0 build warning / 67 unit test / 18 E2E test
- [ ] Lighthouse mobile performance + accessibility ölçümü (manuel)
- [ ] 14 Mayıs gerçek çocukla backup video kaydı
- [ ] Pitch prova + demo koreografi

## Ekip Rolleri

- **Cem (AI/ML Lead):** MediaPipe entegrasyonu, test logic, sport matching, Claude API
- **Frontend Dev:** Next.js sayfa akışı, kamera UI, radar grafik, sonuç ekranı
- **Backend/Full-stack Dev:** Supabase setup, gamification logic, PDF/share
- **Pitch/Tasarım:** Slaytlar, bilimsel referans, demo koreografi, sahne sunumu
