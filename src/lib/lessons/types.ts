/**
 * Lesson sistemi — branş bazlı Duolingo-tarzı hareket dersleri.
 *
 * Her ders bir `validator` config'i taşır; runtime'da bu config bir
 * `ValidatorRuntime`'a dönüşür ve pose frame stream'ini gözlemleyerek
 * çocuğun hareketi doğru yapıp yapmadığını anlık raporlar.
 *
 * Tasarım kararı: 12 branş × 1-2 hareket için ayrı kod yazmak yerine
 * 4-5 generic validator family yazılır, her ders bunlardan birini config
 * ile parametrize eder. Bu sayede yeni ders eklemek = yeni JSON config.
 */

import type { PoseFrame } from '@/types';

/** Stream izleyen validator'lar buradaki landmark'ları hedefler. */
export type TrackableLandmark =
  | 'leftWrist'
  | 'rightWrist'
  | 'leftAnkle'
  | 'rightAnkle'
  | 'leftKnee'
  | 'rightKnee'
  | 'nose';

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Discriminated union — her ders config bir validator type seçer.
 * Yeni ders eklemek için: yeni variant ekle + validators.ts'de runtime yaz.
 */
export type ValidatorConfig =
  | {
      /** Belirli bir pozda N ms sabit dur (postür stabilitesi). */
      type: 'staticPose';
      /** Ne kadar sabit duracak (ms). */
      holdMs: number;
      /** Hangi vücut bölgesinin varyansına bakılacak. */
      subject: 'fullBody' | 'upperBody' | 'lowerBody';
      /** Maks. izin verilen varyans (0-1 normalize unit²). Default 0.0008. */
      maxVariance?: number;
    }
  | {
      /** Bir landmark'in belirli yönde ve mesafede uzanması (örn. tekme, yumruk). */
      type: 'reach';
      /** Hangi landmark uzanıyor. */
      landmark: TrackableLandmark;
      /** Hangi yönde uzanıyor (kamera koordinatlarında). */
      direction: Direction;
      /** Başlangıç pozisyonundan minimum mesafe (0-1 normalize). */
      threshold: number;
      /** Kaç tekrar (örn. 3 tekme). */
      reps: number;
    }
  | {
      /** Kalça merkezi Y delta ile rep sayımı (squat, jump). */
      type: 'verticalRep';
      /** Aşağı inip yukarı çıkma (squat) veya yukarı çıkıp aşağı inme (jump). */
      pattern: 'squatDown' | 'jumpUp';
      /** Hedef tekrar sayısı. */
      reps: number;
      /** Minimum delta (0-1 normalize) — gerçek hareket eşiği. Default 0.08. */
      minDelta?: number;
    }
  | {
      /** Demo modu — pose detection'ı atla, N ms sonra başarı döndür. */
      type: 'demo';
      /** Ne kadar sonra başarı sayar (ms). */
      durationMs: number;
    };

/**
 * Validator'ın anlık durumu. UI bu state'i okuyup ilerleme barı,
 * tekrar sayacı ve başarı animasyonu gösterir.
 */
export interface ValidatorState {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** 0-1 ilerleme yüzdesi (UI progress bar). */
  progress: number;
  /** Tamamlanan rep sayısı (verticalRep / reach için anlamlı). */
  reps: number;
  /** Toplam hedef rep (validator config'inden). */
  targetReps: number;
  /** Türkçe kullanıcı mesajı — "Sıkı dur!", "Bir tekme daha!", "Harika!". */
  message: string;
}

/**
 * Validator runtime — frame stream'ini gözlemleyip state üretir.
 *
 * Stateful, single-instance per lesson attempt. `reset()` yeni bir
 * attempt başlatır.
 */
export interface ValidatorRuntime {
  observe(frame: PoseFrame): ValidatorState;
  state(): ValidatorState;
  reset(): void;
}

/** Tek bir ders tanımı. */
export interface SportLesson {
  /** Unique slug — `${sportSlug}-${order}` formatı önerilir. */
  id: string;
  /** Hangi branşa ait. */
  sportSlug: string;
  /** Aynı branş içi sıralama (1, 2, 3 …). */
  order: number;
  /** Kullanıcıya görünen ders adı (örn. "Ön Duruş (Joonbi)"). */
  name: string;
  /** Kart üstünde gösterilen 1-2 cümlelik açıklama. */
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** 3-5 adımlı sırayla numaralı talimatlar. */
  instructions: readonly string[];
  /** Hareketin başarısı için validator yapılandırması. */
  validator: ValidatorConfig;
  /** Opsiyonel: tamamlandığında verilecek rozet id'si. */
  badgeId?: string;
}

/** Bir branş için ders koleksiyonu. */
export interface SportCurriculum {
  sportSlug: string;
  sportName: string;
  emoji: string;
  lessons: readonly SportLesson[];
}

/** Ders sonucu — completion event'ten sonra kullanıcıya gösterilir. */
export interface LessonAttempt {
  lessonId: string;
  sportSlug: string;
  completedAt: number; // ms epoch
  durationMs: number;
  reps: number;
}
