/**
 * MediaPipe Pose Hello World — Gün 0 doğrulama sayfası.
 *
 * Amaç: Kamera + MediaPipe + iskelet overlay'inin uçtan uca çalıştığını doğrulamak.
 * Bu sayfa MVP'de yer almayacak, sadece smoke test için.
 */

'use client';

import { useCallback, useState } from 'react';
import { CameraStream } from '@/components/camera/CameraStream';
import type { PoseFrame } from '@/types';

export default function PoseHelloWorld() {
  const [fps, setFps] = useState(0);
  const [hasPose, setHasPose] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const handleFrame = useCallback((frame: PoseFrame | null) => {
    if (!frame) {
      setHasPose(false);
      return;
    }
    setHasPose(true);
    const visible = frame.landmarks.filter(
      (lm) => (lm.visibility ?? 0) >= 0.5
    ).length;
    setVisibleCount(visible);

    // Simple FPS estimator using rolling timestamps.
    setFps((prev) => {
      const now = frame.timestamp;
      // We approximate via reciprocal of inter-frame delta — averaged with prev.
      const dt = (window as unknown as { __lastTs?: number }).__lastTs
        ? now - (window as unknown as { __lastTs: number }).__lastTs
        : 33;
      (window as unknown as { __lastTs: number }).__lastTs = now;
      const instant = dt > 0 ? 1000 / dt : 30;
      return Math.round(prev * 0.85 + instant * 0.15);
    });
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">
            Yetenek 2.0 · Gün 0 Smoke Test
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">
            MediaPipe Pose · Hello World
          </h1>
          <p className="mt-3 text-neutral-400">
            Kameranın önüne geç, iskeletin görünmesi gerekiyor. 33 keypoint,
            cyan çizgilerle bağlanmış.
          </p>
        </header>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          <CameraStream
            width={640}
            height={480}
            onFrame={handleFrame}
            showOverlay
          />

          <div className="flex-1 space-y-3">
            <Stat label="FPS (yumuşatılmış)" value={`${fps}`} />
            <Stat
              label="Pose tespit edildi"
              value={hasPose ? 'Evet' : 'Hayır'}
              positive={hasPose}
            />
            <Stat
              label="Görünür keypoint"
              value={`${visibleCount} / 33`}
              positive={visibleCount > 25}
            />
            <div className="mt-6 rounded-xl border border-neutral-800 p-4">
              <h2 className="mb-2 text-sm font-semibold text-neutral-300">
                Başarı Kriteri
              </h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-400">
                <li>FPS &gt;= 20</li>
                <li>25+ keypoint görünür</li>
                <li>İskelet hareketinizi takip ediyor</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 p-4">
      <div className="text-xs tracking-wider text-neutral-400 uppercase">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${
          positive === true
            ? 'text-emerald-400'
            : positive === false
              ? 'text-red-400'
              : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
