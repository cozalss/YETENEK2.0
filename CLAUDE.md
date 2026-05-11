# Yetenek 2.0 — Proje Belleği

## Proje Özeti

**Yetenek 2.0** — AI tabanlı çocuk spor yetenek keşif platformu. 8-15 yaş arası çocuk telefon kamerası önünde 5 dakikalık 7 fiziksel test yapıyor; AI çocuğa 12 spor profili içinden en uygun 3-5 sporu öneriyor + sakatlanma riski uyarısı veriyor + gamification katmanıyla rozet/leaderboard/streak sunuyor.

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

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Pose Estimation:** `@mediapipe/tasks-vision` (browser, on-device, 33 keypoint)
- **Database:** Supabase (auth + postgres + storage)
- **LLM:** Claude API (Anthropic SDK, prompt caching aktif)
- **Charts:** Recharts (radar grafik)
- **PDF:** react-pdf (rapor üretimi)
- **TTS:** Web Speech API (browser native)
- **Deployment:** Vercel
- **Package Manager:** pnpm

## Mimari Prensipleri

- **Mobile-first:** Hedef kitle telefonla test yapıyor
- **On-device pose:** MediaPipe browser'da çalışıyor, gizlilik ve hız için
- **API-first:** Backend sadece veri persistance + Claude proxy
- **Component composition:** shadcn/ui pattern (kütüphaneye bağımlı değil)
- **Type-safe:** Strict TypeScript, no `any`

## Test Bataryası (3 Test)

### 1. CMJ Sıçrama

- Çocuk çömelir, patlayıcı zıplar
- AI: kalça keypoint Y-delta'sı → sıçrama yüksekliği (cm)
- Persentil hesabı yaş/cinsiyet bazlı

### 2. Tek Bacak Denge (15sn × 2)

- Sağ ve sol bacakta ayrı ayrı
- AI: keypoint varyansı → denge skoru
- **Asimetri tespiti:** sol-sağ farkı >15% → sakatlanma uyarısı

### 3. Reaksiyon Süresi

- Ekran rastgele renk değiştirir, çocuk dokunur
- JS event timestamp → ms

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
│   ├── api/{report,chat,og}/route.ts
│   ├── test/full/page.tsx
│   ├── result/demo/page.tsx
│   ├── demo/page.tsx
│   ├── training/[dimension]/page.tsx
│   ├── sports/[slug]/page.tsx
│   ├── about, privacy, history, profile/page.tsx
│   └── sitemap.ts, robots.ts, manifest.webmanifest
│
├── components/              # UI primitives + composite
│   ├── camera/CameraStream.tsx + PoseOverlay.tsx
│   ├── tests/{Jump,Broad,Lateral,Endurance,Coordination,...}.tsx
│   ├── tests/shared/{TestStage,FramingBadge,InstructionsPanel,StartCTA}.tsx
│   ├── result/{ResultScreen,BioMotorRadar,ShareButton,CoachChat,...}.tsx
│   ├── gamification/{BadgeReveal,BadgeWallet,StreakIndicator}.tsx
│   ├── flow/{ProfileForm,PhaseHeader}.tsx
│   ├── layout/{SiteHeader,SiteFooter}.tsx
│   └── motion/Reveal.tsx
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

**Gün 0 — 9 Mayıs Cuma (Setup)**

- [x] Next.js scaffold
- [x] MediaPipe paket eklendi
- [ ] CLAUDE.md (bu dosya)
- [ ] Base directory yapısı
- [ ] MediaPipe hello-world test

## Ekip Rolleri

- **Cem (AI/ML Lead):** MediaPipe entegrasyonu, test logic, sport matching, Claude API
- **Frontend Dev:** Next.js sayfa akışı, kamera UI, radar grafik, sonuç ekranı
- **Backend/Full-stack Dev:** Supabase setup, gamification logic, PDF/share
- **Pitch/Tasarım:** Slaytlar, bilimsel referans, demo koreografi, sahne sunumu
