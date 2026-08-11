/**
 * GET /api/health — uptime + bağımlılık durumu kontrol endpoint'i.
 *
 * Yayın öncesi 1 ping atıp tüm bağlantıların hazır olduğunu görmek +
 * Vercel/Uptime Robot izleme için public endpoint.
 *
 * Hassas bilgi YOK — sadece flag + version bilgisi döner.
 */

import { NextResponse } from 'next/server';
import { isAnthropicConfigured } from '@/lib/llm/anthropic';
import { isVisionJudgeConfigured } from '@/infrastructure/validity/openai-vision-judge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const startedAt = Date.now();

interface HealthPayload {
  status: 'ok';
  service: 'yetenek-2.0';
  timestamp: string;
  uptimeSec: number;
  version: string;
  env: 'development' | 'production' | 'test';
  features: {
    anthropicConfigured: boolean;
    fallbackReportAvailable: true;
    /**
     * Görsel geçerlilik hakemi yapılandırılmış mı (OPENAI_API_KEY).
     * `false` bir arıza değil — kural hakemi tek başına çalışır.
     */
    visionJudgeConfigured: boolean;
    /**
     * Kural tabanlı hakem her zaman açık: cihazda, ücretsiz, çevrimdışı.
     * Anahtar durumundan bağımsız olarak protokol denetimi yapılıyor.
     */
    ruleJudgeAvailable: true;
  };
}

function narrowEnv(raw: string | undefined): HealthPayload['env'] {
  if (raw === 'production' || raw === 'test') return raw;
  return 'development';
}

export function GET(): NextResponse<HealthPayload> {
  const payload: HealthPayload = {
    status: 'ok',
    service: 'yetenek-2.0',
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.0.0',
    env: narrowEnv(process.env.NODE_ENV),
    features: {
      anthropicConfigured: isAnthropicConfigured(),
      fallbackReportAvailable: true,
      visionJudgeConfigured: isVisionJudgeConfigured(),
      ruleJudgeAvailable: true,
    },
  };
  return NextResponse.json(payload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
