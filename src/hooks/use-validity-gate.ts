'use client';

/**
 * Geçerlilik kapısı hook'u — poz karesi toplar, hakeme sorar, kararı uygular.
 *
 * ## Neden hook
 *
 * Aynı akış yedi test bileşeninde tekrarlanıyor: kare biriktir, analiz
 * öncesinde hakeme sor, reddedilirse çocuğa ihlale özgü ipucu göster. Yedi
 * kopya, yedi farklı davranışa dönüşmenin en kısa yolu olurdu — özellikle de
 * biri "reddedildi ama yine de kaydet" gibi bir hataya kayarsa sessizce
 * bozulurdu.
 *
 * ## Bellek
 *
 * Kareler tam kare hızında saklanmıyor: hakem duruş/uçuş oranlarına bakıyor,
 * her kareye ihtiyacı yok. Varsayılan 2'de 1 örnekleme ve üst sınır ile
 * 15 saniyelik bir yakalamada ~225 kare tutuluyor.
 */

import { useCallback, useRef, useState } from 'react';
import {
  applyVerdict,
  type RejectedMeasurement,
} from '@/core/use-cases/apply-verdict';
import { ruleBasedValidityJudge } from '@/infrastructure/validity/rule-based-judge';
import type { PoseFrame, TestType } from '@/types';

/** Üst sınır — patolojik uzun yakalamada bellek şişmesin. */
const MAX_RETAINED_FRAMES = 600;

export interface UseValidityGateOptions {
  readonly test: TestType;
  /** Kaç karede bir saklansın. 2 = yarısı. */
  readonly sampleEvery?: number;
}

export interface ValidityGate {
  /** Yakalama sırasında her karede çağrılır. */
  readonly collect: (frame: PoseFrame | null) => void;
  /**
   * Analizden **önce** çağrılır. `true` dönerse ölçüme devam edilebilir;
   * `false` dönerse deneme reddedilmiştir ve `rejection` doludur.
   */
  readonly evaluate: () => Promise<boolean>;
  /** Reddedilme kararı — kullanıcıya gösterilecek ipucunu taşır. */
  readonly rejection: RejectedMeasurement | null;
  /** Yeni denemeye başlarken çağrılır. */
  readonly reset: () => void;
  /** Kabul edilen ölçümün σ çarpanı (kusurlu teknik belirsizliği büyütür). */
  readonly sigmaMultiplier: number;
}

export function useValidityGate(opts: UseValidityGateOptions): ValidityGate {
  const { test, sampleEvery = 2 } = opts;

  const framesRef = useRef<PoseFrame[]>([]);
  const parityRef = useRef(0);
  const [rejection, setRejection] = useState<RejectedMeasurement | null>(null);
  // σ çarpanı ref değil state: tüketici bunu ölçüm sonucuyla birlikte
  // gösteriyor/aktarıyor, yani render'ı ilgilendiriyor. Ref'te tutulsaydı
  // değişimi yeniden render tetiklemez ve tüketici bayat değer görürdü.
  const [sigmaMultiplier, setSigmaMultiplier] = useState(1);

  const collect = useCallback(
    (frame: PoseFrame | null) => {
      if (!frame) return;
      parityRef.current++;
      if (parityRef.current % sampleEvery !== 0) return;
      if (framesRef.current.length >= MAX_RETAINED_FRAMES) return;
      framesRef.current.push(frame);
    },
    [sampleEvery]
  );

  const reset = useCallback(() => {
    framesRef.current = [];
    parityRef.current = 0;
    setSigmaMultiplier(1);
    setRejection(null);
  }, []);

  const evaluate = useCallback(async () => {
    const judged = await ruleBasedValidityJudge.judge({
      test,
      frames: framesRef.current,
    });

    // Hakem karar veremediyse ölçümü bloklamıyoruz: "değerlendiremedim"
    // ile "geçersiz" farklı şeyler. Yanlış negatif, yanlış pozitiften
    // daha az zararlı değil ama burada veri yokluğu var, ihlal kanıtı yok.
    if (!judged.ok) {
      setRejection(null);
      setSigmaMultiplier(1);
      return true;
    }

    const gated = applyVerdict(test, judged.value);
    if (!gated.ok) {
      setRejection(gated.error);
      return false;
    }

    setRejection(null);
    setSigmaMultiplier(gated.value.sigmaMultiplier);
    return true;
  }, [test]);

  return {
    collect,
    evaluate,
    rejection,
    reset,
    sigmaMultiplier,
  };
}
