/**
 * Telefon eğimi — DeviceOrientationEvent su terazisi.
 *
 * İzin yoksa, sensör yoksa veya olay hiç gelmezse kapı sessizce atlanır
 * (masaüstü CI patlamasın). iOS `requestPermission` kullanıcı hareketi
 * ister; mount'ta çağrılmaz, olay gelmezse skip.
 */

'use client';

import { useEffect, useState } from 'react';

export interface TiltState {
  /** true: düz veya atlandı. false: eğik, başlatma kilitli. */
  readonly ok: boolean;
  readonly skipped: boolean;
}

const GAMMA_MAX = 12;
const BETA_MIN = 55;
const BETA_MAX = 105;
const SKIP_AFTER_MS = 1600;

export function useDeviceTilt(enabled: boolean): TiltState {
  const [state, setState] = useState<TiltState>({ ok: true, skipped: true });

  useEffect(() => {
    if (!enabled) {
      setState({ ok: true, skipped: true });
      return;
    }
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      setState({ ok: true, skipped: true });
      return;
    }

    let gotEvent = false;
    const onOrient = (e: DeviceOrientationEvent) => {
      gotEvent = true;
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta == null || gamma == null) {
        setState({ ok: true, skipped: true });
        return;
      }
      const upright = beta >= BETA_MIN && beta <= BETA_MAX && Math.abs(gamma) <= GAMMA_MAX;
      setState({ ok: upright, skipped: false });
    };

    window.addEventListener('deviceorientation', onOrient);
    const skipTimer = window.setTimeout(() => {
      if (!gotEvent) setState({ ok: true, skipped: true });
    }, SKIP_AFTER_MS);

    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.clearTimeout(skipTimer);
    };
  }, [enabled]);

  return state;
}
