# ADR-0002 — Hexagonal (Ports & Adapters) katman ayrımı

**Tarih:** 2026-05-10  ·  **Durum:** Kabul edildi

## Bağlam

Mevcut `src/lib/` klasörü 12 alt-klasör barındırıyor (pose, llm, matching,
session, history, gamification, training, content, demo, a11y, tests).
Her biri **hem domain mantığı hem dış IO hem React'a bağlı kod** içeriyor:

- `lib/session/store.ts` — domain (Session entity) + IO (localStorage)
- `lib/llm/geminiReport.ts` — orchestration + Gemini SDK
- `lib/history/store.ts` — repository + IO + TTL logic

Bu birlikte sıkışma:

- Test ederken Gemini'yi mock'lamak için geminiReport'u parçalamak gerek.
- Storage backend'i değiştirmek (Supabase'e geçmek) tüm dosyayı yeniden
  yazmak demek.
- Domain mantığını Web Worker'a taşımak imkansız (DOM'a bağımlı).

## Karar

Hexagonal mimari (Ports & Adapters):

- **`src/core/`** — pure types, schemas, ports, use-cases.
  - Hiçbir React, fetch, localStorage, SDK import etmez.
- **`src/infrastructure/`** — adapter'lar (port'ları implement eder).
  - localStorage-, fetch-, SDK-bağlı kod yalnızca burada.
- **`src/shared/`** — cross-cutting (config, logger, a11y).

UI yalnızca port arayüzleri ile konuşur; concrete adapter'ı bilmez.

## Sonuçlar

✅ Test edilebilirlik: domain'i mock adapter'la çalıştır (`InMemoryHistoryRepository`).
✅ Swappability: localStorage → Supabase migration tek dosya değişimi.
✅ Bundle ayrımı: server-only kod (Gemini SDK) UI bundle'ına sızmaz.
✅ Cognitive load: bir dosyayı okurken hangi katmanda olduğun açık.

⚠ Daha çok dosya, daha çok import — DX bir miktar artar.
⚠ Mevcut `lib/*` kademeli taşınır (full rewrite hackathon süresinde
  riskli); bu süreçte iki paralel pattern var. Migration story
  ARCHITECTURE.md'de.

## Alternatifler

- **Tek monolit klasör:** prototip için hızlı ama hackathon sonrası
  canlıya çıkarsa borç birikiyor.
- **Tam Feature-Sliced Design:** çok dik öğrenme eğrisi; teamımız küçük.
- **Clean Architecture (Robert Martin)** — hexagonal'la özünde aynı,
  sadece terminoloji farkı; biz daha kompakt isimlendirme tercih ettik.
