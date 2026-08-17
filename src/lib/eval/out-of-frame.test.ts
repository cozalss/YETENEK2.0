/**
 * Kadraj dışı senaryosu — gerçek bir kullanıcı hatasının regresyon kilidi.
 *
 * Yaşanan olay: laptop kamerası yalnız yüzü ve omuzları görüyordu. MediaPipe
 * kadraj dışındaki kalçayı ve ayak bileğini **tahmin etti**, sistem o
 * uydurulmuş koordinatlardan `heel_raise_only` teşhisi üretti ve kullanıcıya
 * "sadece topuklarını kaldırdın" dedi. Kullanıcı gerçekte zıplıyordu.
 *
 * İki ayrı hata vardı:
 *   1. `StartCTA` `aria-disabled` kullanıyordu — tıklamayı engellemiyor.
 *      Kadraj hazır değilken test başlayabiliyordu.
 *   2. Hakem `visible()` ile yetiniyordu; kadraj sınırlarını kontrol
 *      etmiyordu. MediaPipe tahmin ettiği noktalara düşük olmayan visibility
 *      verdiği için kontrol geçiyordu.
 *
 * Yanlış ama kendinden emin bir teşhis, teşhis yokluğundan kötüdür: kullanıcı
 * tekniğini "düzeltmeye" çalışır, sorun kamerada olduğu için hiç düzelmez.
 */

import { describe, expect, it } from 'vitest';
import { applyVerdict } from '@/core/use-cases/apply-verdict';
import { ruleBasedValidityJudge } from '@/infrastructure/validity/rule-based-judge';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';

/**
 * Laptop yakın çekimi: yalnız kafa ve omuzlar kadrajda. MediaPipe alt gövdeyi
 * yine de raporluyor — kadraj dışında, ama makul visibility ile. Gerçek
 * yakalamada gözlenen davranış budur.
 */
function headshotFrame(t: number, jiggle: number): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.4,
    z: 0,
    visibility: 0.9,
  }));
  const set = (i: number, x: number, y: number, v = 0.9) => {
    landmarks[i] = { x, y, z: 0, visibility: v };
  };

  // Kadraj İÇİNDE: yüz ve omuzlar
  set(POSE_LANDMARKS.NOSE, 0.5, 0.25 + jiggle);
  set(POSE_LANDMARKS.LEFT_SHOULDER, 0.32, 0.62 + jiggle);
  set(POSE_LANDMARKS.RIGHT_SHOULDER, 0.68, 0.62 + jiggle);

  // Kadraj DIŞINDA ama MediaPipe yine de tahmin ediyor (y > 1).
  // Visibility düşük DEĞİL — sorunun kaynağı tam olarak bu.
  set(POSE_LANDMARKS.LEFT_HIP, 0.4, 1.35 + jiggle, 0.7);
  set(POSE_LANDMARKS.RIGHT_HIP, 0.6, 1.35 + jiggle, 0.7);
  set(POSE_LANDMARKS.LEFT_KNEE, 0.4, 1.9 + jiggle, 0.6);
  set(POSE_LANDMARKS.RIGHT_KNEE, 0.6, 1.9 + jiggle, 0.6);
  set(POSE_LANDMARKS.LEFT_ANKLE, 0.4, 2.4 + jiggle, 0.55);
  set(POSE_LANDMARKS.RIGHT_ANKLE, 0.6, 2.4 + jiggle, 0.55);

  return { timestamp: t, landmarks };
}

/** Kişi gerçekten zıplıyor ama kamera yalnız üst gövdeyi görüyor. */
const headshotJump = Array.from({ length: 60 }, (_, i) => {
  const jiggle = i >= 20 && i < 32 ? -0.08 * Math.sin(((i - 20) / 12) * Math.PI) : 0;
  return headshotFrame(i * 33, jiggle);
});

async function judge(test: 'jump' | 'balance' | 'broadJump' | 'lateralHops') {
  const r = await ruleBasedValidityJudge.judge({ test, frames: headshotJump });
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('unreachable');
  return r.value;
}

describe('Yalnız yüz kadrajda — doğru teşhis', () => {
  it('sıçramada out_of_frame der, heel_raise_only DEMEZ', async () => {
    const v = await judge('jump');
    expect(v.protocolViolations).toContain('out_of_frame');
    // Asıl regresyon: yanlış ama kendinden emin teşhis geri gelmemeli.
    expect(v.protocolViolations).not.toContain('heel_raise_only');
    expect(v.protocolViolations).not.toContain('non_ballistic');
    expect(v.performed).toBe(false);
  });

  it('dört poz testinde de out_of_frame', async () => {
    for (const t of ['jump', 'balance', 'broadJump', 'lateralHops'] as const) {
      const v = await judge(t);
      expect(v.protocolViolations, `${t} testi`).toContain('out_of_frame');
    }
  });

  it('kullanıcıya kamerayı işaret eden somut yönerge veriliyor', async () => {
    const v = await judge('jump');
    const gated = applyVerdict('jump', v);
    expect(gated.ok).toBe(false);
    if (gated.ok) throw new Error('unreachable');
    // Mesaj tekniği değil MESAFEYİ düzeltmeyi söylemeli.
    expect(gated.error.retryHint).toMatch(/uzaklaş|kadraj/i);
    expect(gated.error.retryHint).not.toMatch(/topuk|çömel/i);
  });

  it('hakem bu karardan emin — görsel çağrı boşa harcanmaz', async () => {
    const v = await judge('jump');
    // Güven yüksekse istemci hook'u görsel hakemi atlıyor (kısa devre).
    expect(v.judgeConfidence).toBeGreaterThanOrEqual(0.88);
  });
});

describe('Tam vücut kadrajda — kapı engel olmuyor', () => {
  /** Aynı hareket, ama tüm vücut kadraj içinde. */
  const fullBody = Array.from({ length: 60 }, (_, i) => {
    const lift = i >= 20 && i < 32 ? 0.12 * Math.sin(((i - 20) / 12) * Math.PI) : 0;
    const crouch = i >= 10 && i < 20 ? 0.1 : 0;
    const landmarks: Keypoint[] = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.9,
    }));
    const set = (idx: number, x: number, y: number) => {
      landmarks[idx] = { x, y, z: 0, visibility: 0.9 };
    };
    set(POSE_LANDMARKS.NOSE, 0.5, 0.18 - lift + crouch * 0.6);
    set(POSE_LANDMARKS.LEFT_SHOULDER, 0.44, 0.3 - lift + crouch * 0.6);
    set(POSE_LANDMARKS.RIGHT_SHOULDER, 0.56, 0.3 - lift + crouch * 0.6);
    set(POSE_LANDMARKS.LEFT_HIP, 0.46, 0.55 - lift + crouch);
    set(POSE_LANDMARKS.RIGHT_HIP, 0.54, 0.55 - lift + crouch);
    set(POSE_LANDMARKS.LEFT_KNEE, 0.46, 0.74 - lift + crouch * 0.5);
    set(POSE_LANDMARKS.RIGHT_KNEE, 0.54, 0.74 - lift + crouch * 0.5);
    set(POSE_LANDMARKS.LEFT_ANKLE, 0.46, 0.92 - lift);
    set(POSE_LANDMARKS.RIGHT_ANKLE, 0.54, 0.92 - lift);
    return { timestamp: i * 33, landmarks };
  });

  it('kadraj tamsa out_of_frame VERİLMEZ', async () => {
    const r = await ruleBasedValidityJudge.judge({ test: 'jump', frames: fullBody });
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.protocolViolations).not.toContain('out_of_frame');
  });

  it('anlık kayıplar testi geçersiz kılmıyor (%60 eşiği)', async () => {
    // Karelerin %25\'inde ayak bileği kayboluyor — gerçek yakalamada olağan.
    const flaky = fullBody.map((f, i) => {
      if (i % 4 !== 0) return f;
      const lms = [...f.landmarks];
      lms[POSE_LANDMARKS.LEFT_ANKLE] = { ...lms[POSE_LANDMARKS.LEFT_ANKLE], visibility: 0.1 };
      return { ...f, landmarks: lms };
    });
    const r = await ruleBasedValidityJudge.judge({ test: 'jump', frames: flaky });
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.protocolViolations).not.toContain('out_of_frame');
  });
});
