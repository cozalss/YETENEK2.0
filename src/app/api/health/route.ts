/**
 * GET /api/health — uptime + bağımlılık durumu kontrol endpoint'i.
 *
 * Hackathon demo backup'ı: pitch öncesi 1 ping atıp tüm bağlantıların hazır
 * olduğunu görmek + Vercel/Uptime Robot izleme için public endpoint.
 *
 * Hassas bilgi YOK — sadece flag + version bilgisi döner.
 */

import { NextResponse } from 'next/server';
import { isGeminiConfigured } from '@/lib/llm/gemini';

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
    geminiConfigured: boolean;
    fallbackReportAvailable: true;
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
      geminiConfigured: isGeminiConfigured(),
      fallbackReportAvailable: true,
    },
  };
  return NextResponse.json(payload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
