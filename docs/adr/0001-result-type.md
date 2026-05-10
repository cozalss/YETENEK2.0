# ADR-0001 — `Result<T, E>` + no-throw discipline

**Tarih:** 2026-05-10  ·  **Durum:** Kabul edildi

## Bağlam

Mevcut `claudeReport.ts`, `chat/route.ts`, `gemini.ts` gibi modüller throw
edip catch'lerde fallback üretiyor. Bu pattern bazı sorunlar yaratıyor:

- TypeScript `throw` türünü `unknown` olarak ele alır → her catch'te
  `instanceof` zinciri tekrar yazılır.
- Hangi fonksiyonun hangi hata tiplerini fırlattığını sözleşme olarak
  ifade etmek mümkün değil.
- Test ederken `expect(() => fn()).toThrow(...)` runtime'a bağımlı.
- `?? fallback` kullanımı hata bilgisini sessizce yutuyor.

## Karar

Domain ve port arayüzlerinde `Result<T, E = AppError>` discriminated union
kullanılır. `throw` yalnızca **Adapter sınırında** (Gemini SDK, fetch, JSON
parse) yakalanır ve tipli error'a çevrilir.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type AppError =
  | { code: 'config.missing'; key: string }
  | { code: 'storage.unavailable' }
  | { code: 'llm.rate-limit'; retryAfterMs?: number }
  | ...;
```

UI:

```tsx
const r = useReportQuery(session);
if (r.error) return <ErrorPanel error={r.error} />;
if (r.data) return <Report text={r.data.text} />;
```

## Sonuçlar

✅ Yeni hata = `AppError` union'a branch ekle → compiler tüm switch/UI'ı
   uyarır (eksik branch).
✅ Test = pure data assertion (`expect(r.ok).toBe(false)`).
✅ Hata bilgisi yutulmuyor — `describeError()` Türkçe mesaj üretir.

⚠ React event handler'larında error boundary gerekir; Result domain'de
   throw'u boundary'ye taşımak çağıranın işi.

## Alternatifler

- **Effect-TS:** çok güçlü ama kompleksite + bundle artışı (10-20KB).
  Hackathon scope'una büyük; pure Result yeterli.
- **neverthrow paketi:** dış dep gerektirir, Result kendi tipi zaten
  sade — ihtiyaç yok.
