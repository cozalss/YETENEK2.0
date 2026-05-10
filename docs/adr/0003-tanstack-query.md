# ADR-0003 — TanStack Query, server-state için

**Tarih:** 2026-05-10  ·  **Durum:** Kabul edildi

## Bağlam

Mevcut `src/hooks/useReport.ts` el-yapımı bir state machine:

```ts
type ReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; ... }
  | { status: 'error'; ... };
```

AbortController, retry, cache, refetch logic'leri elle yazılmış. Her hook
için aynı pattern tekrarlanır (gelecekte coach chat history, share link
oluşturma, vb.).

Yan etki: aynı session için `/api/report` birden fazla kez çağrılıyor
(component re-mount → yeniden fetch). Cache yok.

## Karar

Server state için **TanStack Query v5** kullanılır.

```ts
export const reportQueryKeys = {
  all: ['report'] as const,
  bySession: (s: SessionSummary) =>
    [...reportQueryKeys.all, fingerprint(s)] as const,
};

export function useReportQuery(session: SessionSummary | null) {
  return useQuery({
    queryKey: session
      ? reportQueryKeys.bySession(session)
      : ['report', 'idle'],
    queryFn: ({ signal }) => fetchReport(session!, signal),
    enabled: !!session,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
```

`src/providers/QueryProvider.tsx` Next.js App Router uyumlu singleton
pattern (server: yeni client per request, browser: tek instance).

## Sonuçlar

✅ Tek session için `/api/report` cache'lenir → hızlı navigation, daha
   az LLM maliyeti.
✅ Hata + retry + abort otomatik (custom hook'ta hata yapmıyoruz).
✅ Suspense uyumlu (`useSuspenseQuery` ileride).
✅ DevTools ile cache içeriği görünür → debug kolay.

⚠ Bundle ekler (~13KB gzipped).
⚠ Eski `useReport` hook'u referans için kalır; yeni kod
   `useReportQuery`'ye yazar. Migration kademeli.

## Query key factory pattern

Tip-güvenli, refactor-dayanıklı:

```ts
const keys = {
  all: ['report'] as const,
  bySession: (s) => [...keys.all, fingerprint(s)] as const,
};

queryClient.invalidateQueries({ queryKey: keys.all }); // tüm rapor cache'i temizle
```

## Alternatifler

- **SWR:** daha sade ama mutation/streaming desteği zayıf.
- **Custom hook:** hackathon başında uygundu, şimdi 5+ async kaynak
  öngörülüyor (report, chat, share-token, history, leaderboard);
  TanStack tek paket, ortak pattern.
- **tRPC:** end-to-end type safety katar ama Next.js API route'larını
  yeniden yazmak gerekir; bu büyük bir refactor — şimdilik kademeli
  TanStack ile başlıyoruz.
