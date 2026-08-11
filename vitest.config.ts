import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Vitest config — pure unit tests (analytics fonksiyonları).
 *
 * E2E akışı `e2e/` altında Playwright ile, Vitest sadece saf TS modüllerini
 * test ediyor. Browser API'lere ihtiyaç olan modüller (CameraStream gibi)
 * burada test edilmiyor — onlar Playwright ile ölçülüyor.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    environment: 'node',
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/tests/**', 'src/lib/matching/**', 'src/lib/pose/**'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // `server-only` Next derleme zamanı koruyucusu; node ortamında
      // çözümlenmiyor. Korumayı kaldırmak yerine testte boş modüle
      // yönlendiriyoruz — derlemede gerçek kapı yerinde kalıyor.
      'server-only': resolve(__dirname, 'test/stubs/server-only.ts'),
    },
  },
});
