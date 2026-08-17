/**
 * Kamera kalibrasyon kurulumu — batarya öncesi tek seferlik hizalama adımı.
 *
 * ## Ne yapar
 *
 * Çocuğun (velinin) kamerayı doğru kurmasına yardım eder ve o anki geometriyi
 * **baseline** olarak kilitler:
 *
 *   1. **A4 referansı** zeminde algılanıyor mu — canlı overlay + kontrol.
 *   2. **Vücut kadrajda** mı (`checkJumpFraming` yeniden kullanılır).
 *   3. **Işık** yeterli mi (`sampleScene` parlaklığı yeniden kullanılır).
 *   4. Üçü de tamamsa "Kilitle ve başla" → o anki kamera pozu baseline olur;
 *      testler drift'i buna göre ölçer.
 *
 * ## Neden mutlak açı değil, baseline
 *
 * A4 zeminde olduğu için hesaplanan pitch/roll **zemin düzlemine göredir** —
 * "0 = iyi" demek değildir (kamera çocuğa yatay bakarken bile zemine göre açı
 * büyük olur). Bu yüzden hedef, açıyı sıfırlamak değil; A4'ü güvenilir
 * algılayıp geometriyi **kilitlemek**. Ekran/telefon sonradan oynarsa drift o
 * kilide göre yakalanır. Açı okuması yalnız tanı amaçlı, küçük gösterilir.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  CameraStream,
  getCameraVideoEl,
} from '@/components/camera/CameraStream';
import { checkJumpFraming, type FramingStatus } from '@/lib/pose/framing';
import type { SceneSample } from '@/lib/pose/cmjReadiness';
import { a4ReferenceDetector } from '@/infrastructure/calibration/a4-reference-detector';
import { useCameraCalibration } from '@/hooks/use-camera-calibration';
import type { CalibrationBaseline } from '@/core/ports/camera-reference';
import type { PoseFrame } from '@/types';

/** Işık kapısı — bu parlaklığın altı "yetersiz". `cmjReadiness` ile aynı eşik. */
const MIN_BRIGHTNESS = 0.18;

interface Props {
  readonly onComplete: (baseline: CalibrationBaseline) => void;
  /** A4 olmadan devam (boy-tabanlı ölçeğe düşülür). */
  readonly onSkip?: () => void;
  readonly width?: number;
  readonly height?: number;
}

export function CalibrationSetup({
  onComplete,
  onSkip,
  width = 640,
  height = 480,
}: Props) {
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const [brightness, setBrightness] = useState<number | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  const calib = useCameraCalibration({
    getVideo: getCameraVideoEl,
    active: true,
    detector: a4ReferenceDetector,
    trackDrift: false, // kurulumda henüz baseline yok
  });

  const handleFrame = useCallback((frame: PoseFrame | null) => {
    setFraming(checkJumpFraming(frame));
  }, []);

  const handleScene = useCallback((s: SceneSample | null) => {
    if (s) setBrightness(s.brightness);
  }, []);

  // A4 dörtgenini video üzerine çiz (video aynalı → x çevrilir).
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const quad = calib.quad;
    if (!quad) return;

    const sx = width / quad.imageWidth;
    const sy = height / quad.imageHeight;
    ctx.beginPath();
    quad.corners.forEach(([x, y], i) => {
      const px = width - x * sx; // ayna
      const py = y * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.95)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(52, 211, 153, 0.12)';
    ctx.fill();
  }, [calib.quad, width, height]);

  const lightOk = brightness == null ? false : brightness >= MIN_BRIGHTNESS;
  const canLock = calib.detected && framing.ready && lightOk;

  const handleLock = useCallback(() => {
    const baseline = calib.lock();
    if (baseline) onComplete(baseline);
  }, [calib, onComplete]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="relative" style={{ width, height }}>
        <CameraStream
          onFrame={handleFrame}
          onScene={handleScene}
          width={width}
          height={height}
        />
        <canvas
          ref={overlayRef}
          width={width}
          height={height}
          className="pointer-events-none absolute inset-0"
        />
        {calib.pose && (
          <div className="pointer-events-none absolute right-3 bottom-3 rounded-lg bg-black/70 px-2.5 py-1.5 font-mono text-[10px] leading-tight text-emerald-300 backdrop-blur-sm">
            eğim {calib.pose.pitchDeg.toFixed(0)}° · yat{' '}
            {calib.pose.rollDeg.toFixed(0)}°
          </div>
        )}
      </div>

      <div className="flex-1 rounded-3xl border-2 p-6" style={panelStyle}>
        <p
          className="text-xs font-bold tracking-[0.25em] uppercase"
          style={eyebrowStyle}
        >
          Kurulum · Kamera Hizalama
        </p>
        <h2 className="mt-2 text-2xl font-black" style={titleStyle}>
          Kamerayı sabitle, A4'ü yere koy
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={bodyStyle}>
          Bir A4 kağıdı, çocuğun duracağı noktanın yanına — kameranın
          görebileceği şekilde — zemine düz koy. Kamerayı sabit bir yere yasla.
          Üç ışık da yeşile dönünce kilitleyip başlayabilirsin.
        </p>

        <ul className="mt-5 space-y-2.5">
          <ChecklistItem
            ok={calib.detected}
            label="A4 kağıdı görünüyor"
            hint="Kağıdı kameranın gördüğü, gölgesiz bir yere koy. Kenarı belirgin olsun."
          />
          <ChecklistItem
            ok={framing.ready}
            label="Vücut kadrajda"
            hint={framing.hint}
          />
          <ChecklistItem
            ok={lightOk}
            label="Işık yeterli"
            hint="Yüzünü pencere/lamba tarafına dön."
          />
        </ul>

        <button
          type="button"
          onClick={handleLock}
          disabled={!canLock}
          className="mt-6 h-11 w-full rounded-full text-base font-black tracking-wide transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
          style={lockButtonStyle}
        >
          {canLock ? 'Kilitle ve başla' : 'Hizalama bekleniyor…'}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-3 w-full text-center text-xs underline-offset-2 hover:underline"
            style={bodyStyle}
          >
            A4'süz devam et (yükseklik yaklaşık olur)
          </button>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  ok,
  label,
  hint,
}: {
  ok: boolean;
  label: string;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <motion.span
        animate={{ scale: ok ? 1 : 0.9 }}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
          ok
            ? 'bg-emerald-400 text-neutral-950'
            : 'border-2 border-amber-300/70 text-amber-200'
        }`}
        aria-hidden="true"
      >
        {ok ? '✓' : '•'}
      </motion.span>
      <div>
        <p className="text-sm font-semibold" style={titleStyle}>
          {label}
        </p>
        {!ok && (
          <p className="text-xs leading-snug" style={bodyStyle}>
            {hint}
          </p>
        )}
      </div>
    </li>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.7)',
  borderColor: 'rgba(44, 62, 107, 0.18)',
};
const eyebrowStyle: React.CSSProperties = {
  color: 'var(--color-ink-3)',
  fontFamily: 'var(--font-display)',
};
const titleStyle: React.CSSProperties = {
  color: 'var(--form-navy)',
  fontFamily: 'var(--font-display)',
};
const bodyStyle: React.CSSProperties = { color: 'var(--color-ink-2)' };
const lockButtonStyle: React.CSSProperties = {
  background: 'var(--track-mustard)',
  color: 'var(--form-navy)',
  fontFamily: 'var(--font-display)',
  boxShadow: '0 4px 0 rgba(44, 62, 107, 0.18)',
};
