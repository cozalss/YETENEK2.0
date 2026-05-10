# ADR-0004 — Zod tek-doğruluk-kaynağı

**Tarih:** 2026-05-10  ·  **Durum:** Kabul edildi

## Bağlam

Mevcut kod tabanında session yapısı **üç farklı yerde** tanımlanmış:

1. `src/types/index.ts` — `SessionResult` interface (legacy, kullanılmıyor)
2. `src/lib/session/store.ts` — `SessionSummary` interface (UI'da)
3. `src/app/api/report/route.ts` — Zod schema (server doğrulama)

Üçü arasında **drift** zaten başlamıştı:

- `completedTests: TestKey[]` interface'te var, Zod'da `string[]` idi.
- `recommendations.anthroBonus` Zod'da optional, interface'te required.
- `weakerSide: 'right' | 'left' | null` enum vs nullable union.

Drift = production'da silent 400 ya da silent yanlış parse.

## Karar

Tüm domain veri tipleri **`src/core/schemas/*.schema.ts`** Zod
şemalarından doğar:

```ts
// session.schema.ts
export const sessionSummarySchema = z.object({ ... });
export type SessionSummarySchema = z.infer<typeof sessionSummarySchema>;
```

Kullanım:

- **API route:** `sessionSummarySchema.safeParse(body)` (runtime).
- **localStorage parse:** `sessionSummarySchema.safeParse(rawJson)` (runtime).
- **Component prop:** `session: SessionSummarySchema` (compile-time).

Tek değişiklikte üç tarafın da güncellenmesi gerekir (compile error tüm
callsite'ları yakalar).

## Sonuçlar

✅ Drift imkansız — şemayı değiştir, type otomatik güncellenir.
✅ Branded types ile birleşince double safety: hem schema hem nominal tip.
✅ ValidationIssue → AppError mapping standart (`validation.failed`
   AppError variant'ı).

⚠ Bundle ekstra Zod kullanımı (zaten var, marjinal).
⚠ Interface'lerin Zod'dan inferred type yerine elle yazılmış olması
   geçici teknik borç — `lib/session/store.ts`'in `SessionSummary`
   interface'i kademeli olarak `SessionSummarySchema`'ya yönlendiriliyor.

## Şu anki durum

- `src/core/schemas/session.schema.ts` — yeni tek-doğruluk-kaynağı.
- `src/core/schemas/chat.schema.ts` — chat istek/cevap.
- `src/lib/session/store.ts` — runtime davranış aynı, type'ı kademeli
  uyumlu hale getiriliyor.
- `src/app/api/report/route.ts` — şu anda kendi inline Zod'ı var,
  sonraki PR'da `sessionSummarySchema` import edecek.

## Alternatifler

- **Effect Schema:** daha güçlü ama ekosistem küçük, öğrenme dik.
- **Yup, Joi, ArkType:** Zod en yaygın TS-first, ekibimiz biliyor.
- **Manuel TypeScript interface:** çoktan vurduk — drift yaşadık.
