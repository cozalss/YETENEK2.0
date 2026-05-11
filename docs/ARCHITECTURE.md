# Yetenek 2.0 — Architecture

> Hexagonal (Ports & Adapters) + Feature-Sliced + pure-core/impure-shell.
>
> Hedef: domain mantığı framework / IO / SDK bağımsız; her bir parça tek
> sorumluluğa sahip; tip-güvenli sınırlar; LLM ve depolama implementasyonu
> bir adapter dosyası swap'lanarak değiştirilebilir.

## 1. Katman Diagramı

```
┌──────────────────────────────────────────────────────────────────┐
│                          UI (Next.js App)                         │
│  src/app  ·  src/components  ·  src/widgets  ·  src/features      │
│         ─────────  Composition only, no business logic ─────────  │
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Hooks & Use-Cases                           │
│  src/hooks  (TanStack Query, view-state)                          │
│  src/core/use-cases (orchestration: pure)                         │
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Core (pure domain)                          │
│   src/core/types       Result<T,E>, Branded, Primitives          │
│   src/core/schemas     Zod (single source) → inferred types       │
│   src/core/ports       Interfaces (depend in, not out)            │
│   src/core/domain      Entities + value objects                   │
│                                                                   │
│         ─── No React, no fetch, no localStorage, no SDK ───       │
└──────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ implements
┌──────────────────────────────────────────────────────────────────┐
│                Infrastructure (impure adapters)                   │
│  src/infrastructure/storage   localStorage / Supabase             │
│  src/infrastructure/llm       Gemini / Anthropic / Mock           │
│  src/infrastructure/pose      MediaPipe                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Shared (cross-cutting)                        │
│  src/shared/config   Zod-validated env                           │
│  src/shared/logger   Structured + PII-redacting                   │
│  src/shared/a11y     Speech, focus utils                          │
└──────────────────────────────────────────────────────────────────┘
```

**Bağımlılık kuralı:** OK → İçe doğru. UI bilir Use-Case, Use-Case bilir Port, Port bilmez Adapter. Adapter import eder ama core'a bağımlı değildir.

## 2. Klasör Taksonomisi

| Klasör | Sorumluluk | İçerir |
|---|---|---|
| `src/core/types` | Pure tipler — Result, branded, primitives | `result.ts`, `branded.ts` |
| `src/core/schemas` | Zod tek-doğruluk-kaynağı, type inference | `session.schema.ts`, `chat.schema.ts` |
| `src/core/ports` | Adapter sözleşmeleri | `report-generator.ts`, `*-repository.ts`, `coach-chat.ts` |
| `src/core/domain` | Entities + value objects | (genişletilecek) |
| `src/core/use-cases` | Pure orchestration | (genişletilecek) |
| `src/infrastructure/storage` | LocalStorage / Supabase adapter'ları | `local-history-repository.ts` |
| `src/infrastructure/llm` | Gemini / Anthropic / Mock adapter'ları | `gemini-report-adapter.ts` |
| `src/infrastructure/pose` | MediaPipe entegrasyonu | (mevcut `lib/pose/*` kademeli taşınır) |
| `src/shared/config` | Typed env + flags | `env.ts` |
| `src/shared/logger` | Structured + PII-redacting | `logger.ts` |
| `src/shared/a11y` | Speech, focus utilities | `speech.ts` (mevcut) |
| `src/providers` | React Context provider'ları | `QueryProvider.tsx` |
| `src/hooks` | TanStack Query + view-state hookları | `use-report-query.ts` |
| `src/app` | Next.js routes — composition only | (mevcut) |
| `src/components` | UI primitives + composite | (mevcut) |
| `src/features` | Feature slices (ileride taşınacak) | (mevcut `lib/*` + UI) |
| `src/lib` | _Eski klasör — kademeli olarak yeni katmanlara taşınıyor_ | (mevcut) |

## 3. Güçlü İlkeler

### 3.1 Pure core, impure shell

`src/core/` içindeki **hiçbir dosya** React, fetch, localStorage, MediaPipe veya
LLM SDK'sı import etmez. Bu sayede:

- Vitest unit testleri framework yüklemeden domain'i test edebilir.
- Domain mantığı SSR/CSR/Worker farkı bilmez.
- Yeni LLM provider veya storage backend eklemek bir adapter dosyasıdır.

### 3.2 Result\<T, E\>, no-throw discipline

```ts
type Result<T, E = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

- Domain ve port'lar `Result` döner; `throw` yalnızca Adapter sınırında
  yakalanıp tipli error'a çevrilir.
- `AppError` discriminated union — yeni hata = compiler tüm callsite'larda
  eksik branch'leri fark ettirir.
- UI tarafında `r.ok ? <Success/> : <Error error={r.error}/>` pattern.

### 3.3 Branded types (nominal typing)

`SessionId`, `Score`, `AgeYears`, `Cm`, `Ms` — runtime'da string/number ama
TypeScript'te birbirine atanamaz. `getSession(badgeId)` derleme hatası verir.

### 3.4 Zod tek-doğruluk-kaynağı

`src/core/schemas/*.ts` Zod şemaları:

- API route doğrulaması (server)
- localStorage parse (client)
- Type inference (`z.infer<typeof X>`)

Aynı şema iki yerde de kullanılır — drift imkansızdır.

### 3.5 TanStack Query (server state)

`src/hooks/use-report-query.ts` — rapor üretimi cache'lenir, retry stratejisi
config'lenir, abort kapsama dahil. Eski `useReport.ts` referans için kalır,
yeni kod TanStack Query'ye gider.

### 3.6 Structured logger (PII-redacting)

`logger.info('action', { ctx })` — child name, email, phone otomatik
`[redacted]` ile maskelenir. Production'da JSON, development'ta okunabilir.

## 4. Migration Story

Mevcut `src/lib/*` klasörü çalışan kodla dolu. Yeni mimariye **bir oturumda
yıkıp yeniden yazma** yerine:

1. **Yeni katmanlar yan yana ekleniyor** (`src/core`, `src/shared`,
   `src/infrastructure`, `src/providers`).
2. **Adapter'lar mevcut `lib/*` modüllerini sarmalıyor** (clean port arayüzü
   verir, kullanıcı hiç farketmez).
3. **Yeni özellikler** doğrudan yeni katmanda yazılıyor.
4. **Her PR'da** `lib/*`'ten bir parça yeni mimariye taşınabilir.

Bu yaklaşım hackathon hızı + uzun-vade saygısı dengesi sağlar.

### 4.1 `src/lib/*` taşıma planı (kademeli, post-hackathon)

| Mevcut `lib/*` modülü                | Hedef katman                                  | Öncelik | Not |
|---                                    |---                                            |---      |---  |
| `lib/session/store.ts`                | `infrastructure/storage/local-session-repository.ts` (var) → hook'lara `core/ports/session-repository` üzerinden bağlan | Y       | UI hâlâ `sessionStore`'u doğrudan import ediyor; ilk taşıma adımı port'a geçmek. |
| `lib/history/store.ts`                | `infrastructure/storage/local-history-repository.ts` (var) → `useHistory` hook'una bağla                                | Y       | localStorage offline-first fallback olarak kalır; Supabase canonic. |
| `lib/llm/geminiReport.ts`             | `infrastructure/llm/gemini-report-adapter.ts` (var) → `core/ports/report-generator` üzerinden                            | Y       | `claudeReport` adı 0003 ile temizlendi; import yolu yeni adapter'a güncellenecek. |
| `lib/llm/gemini.ts`                   | `infrastructure/llm/gemini-client.ts`         | O       | Düşük seviye HTTP istemcisi. |
| `lib/matching/*`                      | `core/domain/sport-matching.ts` (yeni)        | O       | Pure logic; doğrudan core'a taşınabilir. |
| `lib/gamification/badges.ts`          | `core/domain/badges.ts` (yeni)                | O       | Pure tablo; constants. |
| `lib/gamification/store.ts`           | Kaldırılacak                                  | D       | `child_badges` Supabase tablosu + `supabaseChildProgressRepository` yerini aldı. |
| `lib/tests/*`                         | `core/domain/test-analyses/*` (yeni)          | D       | Pure analiz fonksiyonları; biraz dosya, ileride. |
| `lib/pose/*`                          | `infrastructure/pose/*` (var ama boş)         | D       | MediaPipe browser-only; bundle ayrımı için. |
| `lib/training/programs.ts`            | `core/domain/training-programs.ts`            | D       | Statik içerik. |
| `lib/content/*`, `lib/demo/*`, `lib/a11y/*` | Olduğu yerde kalır (statik içerik / view util) | -       | Domain-bağımsız view yardımcıları; taşımaya değmez. |

Öncelik: **Y**üksek (release-blocker temizlik), **O**rta (refactor PR'ları),
**D**üşük (long-tail clean-up).

### 4.2 Veri kaydı (dual-write) — kanonik akış

```
                                      ┌──────────────────┐
                                      │  /test/full      │
                                      │   (childId var)  │
                                      └────────┬─────────┘
                                               │  sessionStore.finalize()
                                               ▼
              ┌────────────────────────────────────────────────────┐
              │           DUAL WRITE  (kayıp-dayanıklı)            │
              ├────────────────────────────────────────────────────┤
              │ (1) historyStore.add(final)  → localStorage         │
              │     • offline-first fallback                       │
              │     • anon kullanıcı, Supabase down vb. için       │
              │     • /history sayfası okur                         │
              │                                                    │
              │ (2) recordChildSessionAction(...) → Supabase        │
              │     • sessions + child_badges insert (RLS'li)      │
              │     • /children/[id] sayfası kanonik kaynağı       │
              │     • childId yoksa skip                            │
              └────────────────────────────────────────────────────┘
```

Supabase yazımı başarısız olursa konsola `warn` düşer ve localStorage kopyası
kullanıcının elindedir — silent fail yapılmaz.

## 5. Gelecek

- `src/features/test-flow` — sub-domain slicing
- `src/widgets/site-header` — layout composition
- `core/use-cases/finalize-session` — pure orchestration
- Vitest unit tests (`core/` 100% coverage hedefi)
- Playwright e2e (golden path)
- Supabase adapter (`SupabaseHistoryRepository`)
- Effect-TS (eğer kompleksite artarsa)

## 6. ADR İndeksi

| # | Karar | Tarih |
|---|---|---|
| [0001](./adr/0001-result-type.md) | Result\<T, E\> + no-throw domain | 2026-05 |
| [0002](./adr/0002-hexagonal-layers.md) | Hexagonal katman ayrımı | 2026-05 |
| [0003](./adr/0003-tanstack-query.md) | TanStack Query, server-state için | 2026-05 |
| [0004](./adr/0004-zod-single-source.md) | Zod tek-doğruluk-kaynağı | 2026-05 |
