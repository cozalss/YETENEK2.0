/**
 * Oturum → z-profil.
 *
 * ## Neden ham metrikten, türetilmiş skordan değil
 *
 * Oturumdaki 0-100 skorlar heterojen: üçü z-persentil, ikisi doğrusal oran,
 * ikisi keyfi eğri. Bunları `probit(score/100)` ile z'ye çevirmek yalnızca
 * persentil olanlar için doğru olurdu; diğerleri için sessizce yanlış bir sayı
 * üretirdi — ve yanlışlığı hiçbir yerde görünmezdi.
 *
 * Bu yüzden z, her boyutun **ham fiziksel ölçümünden** (cm, ms, sayı) norm
 * tablosuyla yeniden hesaplanıyor. Skorlar kullanıcıya gösterim için kalıyor;
 * karar z üzerinden veriliyor.
 */

import { broadJumpPercentile } from '@/lib/tests/broadJump';
import { enduranceZ } from '@/lib/tests/enduranceJacks';
import { jumpPercentile } from '@/lib/tests/jump';
import { lateralHopsPercentile } from '@/lib/tests/lateralHops';
import { reactionZ } from '@/lib/tests/reaction';
import { percentileToZ } from '@/lib/stats/probit';
import type { DimensionKey } from './sportProfiles';
import { buildZProfile, type ZProfile } from './zspace';

/** z hesabı için gereken minimum oturum alanları. */
export interface ZSourceSession {
  readonly child: {
    readonly ageYears: number;
    readonly sex: 'male' | 'female';
  };
  readonly jump?: { readonly jumpHeightCm: number | null } | null;
  readonly broadJump?: { readonly jumpDistanceCm: number | null } | null;
  readonly lateralHops?: {
    readonly hopCount: number;
    readonly durationMs?: number;
  } | null;
  readonly reaction?: { readonly averageMs: number } | null;
  readonly endurance?: {
    readonly totalReps: number;
    readonly durationMs: number;
  } | null;
}

/**
 * Oturumun ham ölçümlerinden z-profil kurar.
 *
 * Kalibresiz boyutlar (balance, coordination) burada hiç hesaplanmaz —
 * `buildZProfile` onları zaten reddederdi, ama hesaplamaya kalkışmamak
 * niyetin kodda görünmesini sağlıyor.
 */
export function sessionToZProfile(session: ZSourceSession): ZProfile {
  const { ageYears, sex } = session.child;
  const measured: Partial<Record<DimensionKey, number | null>> = {};

  const jumpCm = session.jump?.jumpHeightCm;
  if (jumpCm != null && Number.isFinite(jumpCm)) {
    measured.explosivePower = percentileToZ(
      jumpPercentile(jumpCm, ageYears, sex)
    );
  }

  const broadCm = session.broadJump?.jumpDistanceCm;
  if (broadCm != null && Number.isFinite(broadCm)) {
    measured.horizontalPower = percentileToZ(
      broadJumpPercentile(broadCm, ageYears, sex)
    );
  }

  const hops = session.lateralHops;
  // `Number.isFinite(0)` true olduğu için başarısız bir yakalama (hopCount 0)
  // gerçek bir ölçüm gibi içeri giriyordu: z ≈ −5, clamp ile −2.58 ve çocuk
  // "çeviklikte en alt persentil" olarak damgalanıyordu. Sıfır tekrar bir
  // ölçüm değil, ölçüm yokluğudur.
  if (hops != null && Number.isFinite(hops.hopCount) && hops.hopCount > 0) {
    measured.agility = percentileToZ(
      lateralHopsPercentile(hops.hopCount, ageYears, sex, hops.durationMs)
    );
  }

  const reaction = session.reaction;
  if (reaction != null && reaction.averageMs > 0) {
    measured.reaction = reactionZ(reaction.averageMs, ageYears);
  }

  const endurance = session.endurance;
  // Aynı sorun: `analyzeEnduranceJacks` geçersiz sonuçta
  // `{ totalReps: 0, durationMs: 0 }` döndürüyor ve bu, `enduranceZ` içinde
  // −5'e karşılık geliyordu. Süre de pozitif olmalı, yoksa 30 sn'ye
  // ölçeklemenin anlamı yok.
  if (
    endurance != null &&
    Number.isFinite(endurance.totalReps) &&
    endurance.totalReps > 0 &&
    endurance.durationMs > 0
  ) {
    measured.endurance = enduranceZ(
      endurance.totalReps,
      endurance.durationMs,
      ageYears,
      sex
    );
  }

  return buildZProfile(measured);
}
