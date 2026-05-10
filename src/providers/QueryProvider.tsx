/**
 * TanStack Query QueryClient provider — Next.js App Router için.
 *
 * Pattern (TanStack docs 2025):
 *   - Server: her request için yeni QueryClient (state leak'i önlemek için).
 *   - Browser: tek singleton (StrictMode double-invoke için).
 *   - useState yerine module-level singleton (Suspense boundary olmadığı
 *     için React tearing'den kaçınma).
 *
 * staleTime 60s default — server'dan gelen verinin client'ta hemen
 * refetch'lenmemesi için.
 */

'use client';

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          // Network/abort hata olmadıkça 1'den fazla deneme.
          if (error instanceof DOMException && error.name === 'AbortError') {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
