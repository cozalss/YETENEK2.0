/**
 * Ders runner — kamera + validator runtime.
 *
 * Akış: idle (talimat oku) → running (validator observing) → success
 *
 * Reuse:
 *   - `TestStage` (2 sütun shell)
 *   - `CameraStream` (kamera + MediaPipe pose loop)
 *   - `InstructionsPanel` (talimat sidebar)
 *   - `StartCTA` (premium başlat butonu)
 *
 * Validator runtime stream'i her frame'de gözler; state UI'a yansır.
 * Tamamlanınca `markLessonCompleted` ile localStorage'a kaydedilir.
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { CameraStream } from '@/components/camera/CameraStream';
import { TestStage } from '@/components/tests/shared/TestStage';
import { InstructionsPanel } from '@/components/tests/shared/InstructionsPanel';
import { StartCTA } from '@/components/tests/shared/StartCTA';
import { GuideVideo } from '@/components/tests/shared/GuideVideo';
import { createValidator } from '@/lib/lessons/validators';
import { markLessonCompleted } from '@/lib/lessons/store';
import { getLessonVideoUrl } from '@/lib/lessons/videos';
import type {
  SportLesson,
  ValidatorState,
  ValidatorRuntime,
} from '@/lib/lessons/types';
import type { PoseFrame } from '@/types';

type Phase = 'idle' | 'running' | 'success';

interface LessonRunnerProps {
  lesson: SportLesson;
  /** Aynı branştaki bir sonraki ders (varsa) — Tamamlandı ekranında link. */
  nextLessonId?: string;
  /** Hangi çocuğun ilerlemesi — yoksa anonim/demo, persistence yok. */
  childId?: string;
}

const DIFFICULTY_LABEL: Record<SportLesson['difficulty'], string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

export function LessonRunner({
  lesson,
  nextLessonId,
  childId,
}: LessonRunnerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [state, setState] = useState<ValidatorState>({
    status: 'pending',
    progress: 0,
    reps: 0,
    targetReps: 1,
    message: 'Hazır olduğunda başla.',
  });

  const validatorRef = useRef<ValidatorRuntime | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const startedAtRef = useRef<number>(0);
  const completionPersistedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleFrame = useCallback(
    (frame: PoseFrame | null) => {
      if (phaseRef.current !== 'running') return;
      if (!frame) return;
      const validator = validatorRef.current;
      if (!validator) return;
      const next = validator.observe(frame);
      setState(next);
      if (next.status === 'completed' && phaseRef.current === 'running') {
        setPhase('success');
        // Persist sadece bir kez (frame loop birkaç frame daha completed dönebilir).
        // childId yoksa anonim/demo modu — sadece UI başarı animasyonu, kayıt yok.
        if (!completionPersistedRef.current && childId) {
          completionPersistedRef.current = true;
          markLessonCompleted(childId, {
            lessonId: lesson.id,
            sportSlug: lesson.sportSlug,
            completedAt: Date.now(),
            durationMs: performance.now() - startedAtRef.current,
            reps: next.reps,
          });
        }
      }
    },
    [lesson.id, lesson.sportSlug, childId]
  );

  const start = () => {
    validatorRef.current = createValidator(lesson.validator);
    startedAtRef.current = performance.now();
    completionPersistedRef.current = false;
    setState(validatorRef.current.state());
    setPhase('running');
  };

  const retry = () => {
    validatorRef.current = null;
    completionPersistedRef.current = false;
    setState({
      status: 'pending',
      progress: 0,
      reps: 0,
      targetReps: 1,
      message: 'Hazır olduğunda başla.',
    });
    setPhase('idle');
  };

  const meta = `${DIFFICULTY_LABEL[lesson.difficulty]} · ${validatorMeta(lesson)}`;
  const videoUrl = getLessonVideoUrl(lesson.id);

  return (
    <TestStage
      cameraSlot={
        <div className="relative">
          {/* showOverlay her zaman true — idle'da da iskelet görünsün ki
              çocuk "pose detection çalışıyor mu?" sorusuna anında cevap
              alsın. Daha önce `phase === 'running'`'a bağlıydı; idle'da
              skeleton yokken kullanıcı detection'ı kopuk sanıyordu. */}
          <CameraStream
            onFrame={handleFrame}
            width={640}
            height={480}
            filterPreset="sport"
            showOverlay
          />
          {phase === 'running' && <RunningOverlay state={state} />}
          {phase === 'success' && <SuccessOverlay name={lesson.name} />}
        </div>
      }
      belowCameraSlot={
        videoUrl ? (
          <GuideVideo
            src={videoUrl}
            label={`${lesson.name} — örnek hareket`}
            caption="Hareket akışını izle, kameraya geçince aynı sırayla uygula. Video sessiz ve sürekli oynar."
          />
        ) : undefined
      }
      sidebar={
        phase === 'success' ? (
          <SuccessPanel
            lesson={lesson}
            nextLessonId={nextLessonId}
            childId={childId}
            onRetry={retry}
            reps={state.reps}
          />
        ) : (
          <InstructionsPanel
            eyebrow={`Ders · ${lesson.sportSlug.toUpperCase()}`}
            title={lesson.name}
            meta={meta}
            steps={[...lesson.instructions]}
            helper={phase === 'running' ? state.message : undefined}
            cta={
              phase === 'running' ? (
                <RunningPanel state={state} onCancel={retry} />
              ) : (
                <StartCTA
                  canStart
                  onStart={start}
                  readyLabel="Dersi Başlat"
                  compact
                />
              )
            }
            footer={
              <Link
                href={
                  childId
                    ? `/lessons/${lesson.sportSlug}?childId=${encodeURIComponent(childId)}`
                    : `/lessons/${lesson.sportSlug}`
                }
                className="inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 hover:underline"
                style={{ color: 'var(--color-ink-3)' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Ders listesine dön
              </Link>
            }
          />
        )
      }
    />
  );
}

function validatorMeta(lesson: SportLesson): string {
  switch (lesson.validator.type) {
    case 'staticPose':
      return `${(lesson.validator.holdMs / 1000).toFixed(0)} sn sabit`;
    case 'reach':
      return `${lesson.validator.reps} tekrar`;
    case 'verticalRep':
      return `${lesson.validator.reps} tekrar`;
    case 'demo':
      return 'Demo';
  }
}

function RunningPanel({
  state,
  onCancel,
}: {
  state: ValidatorState;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <ProgressBar progress={state.progress} />
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{
          background: 'rgba(168, 213, 186, 0.18)',
          borderColor: 'rgba(168, 213, 186, 0.5)',
          color: 'var(--deep-navy)',
        }}
      >
        <span className="text-sm font-bold">{state.message}</span>
        {state.targetReps > 1 && (
          <span
            className="font-mono text-lg font-black"
            style={{ color: 'var(--form-navy)' }}
          >
            {state.reps}/{state.targetReps}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors hover:bg-black/5"
        style={{
          borderColor: 'var(--color-line)',
          color: 'var(--color-ink-2)',
        }}
      >
        <RotateCcw className="h-4 w-4" />
        Baştan başla
      </button>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full"
      style={{ background: 'rgba(44, 62, 107, 0.1)' }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'var(--track-mustard)' }}
        initial={false}
        animate={{ width: `${Math.round(progress * 100)}%` }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
    </div>
  );
}

function RunningOverlay({ state }: { state: ValidatorState }) {
  return (
    <div
      className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur"
      style={{
        background: 'rgba(26, 37, 64, 0.75)',
        color: 'var(--whistle-cream)',
      }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      <span className="font-mono text-xs font-bold tracking-wider uppercase">
        Kayıt · {state.reps}/{state.targetReps}
      </span>
    </div>
  );
}

function SuccessOverlay({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
      style={{ background: 'rgba(168, 213, 186, 0.35)' }}
    >
      <CheckCircle2
        className="h-20 w-20"
        style={{ color: 'var(--field-mint)' }}
      />
      <p
        className="text-2xl font-black"
        style={{
          color: 'var(--whistle-cream)',
          fontFamily: 'var(--font-display)',
          textShadow: '0 2px 12px rgba(26,37,64,0.5)',
        }}
      >
        {name} tamam!
      </p>
    </motion.div>
  );
}

function SuccessPanel({
  lesson,
  nextLessonId,
  childId,
  onRetry,
  reps,
}: {
  lesson: SportLesson;
  nextLessonId?: string;
  childId?: string;
  onRetry: () => void;
  reps: number;
}) {
  const childQuery = childId ? `?childId=${encodeURIComponent(childId)}` : '';
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-col gap-5 rounded-3xl border p-6 backdrop-blur-sm md:p-7"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(168, 213, 186, 0.6)',
      }}
    >
      <header className="flex items-center gap-3">
        <span
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{ background: 'var(--field-mint)' }}
        >
          <CheckCircle2
            className="h-7 w-7"
            style={{ color: 'var(--deep-navy)' }}
          />
        </span>
        <div>
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{ color: 'rgba(44, 62, 107, 0.6)' }}
          >
            Tebrikler
          </p>
          <h2
            className="text-2xl leading-tight font-black"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {lesson.name} tamamlandı
          </h2>
        </div>
      </header>

      {reps > 1 && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'rgba(242, 201, 76, 0.2)',
            color: 'var(--form-navy)',
          }}
        >
          <p className="text-sm font-bold">
            ✨ {reps} doğru tekrar — harika bir başlangıç!
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {nextLessonId ? (
          <Link
            href={`/lessons/${lesson.sportSlug}/${nextLessonId}${childQuery}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full text-base font-black"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--deep-navy)',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 6px 0 rgba(44, 62, 107, 0.18)',
            }}
          >
            Sonraki ders →
          </Link>
        ) : (
          <Link
            href={`/lessons/${lesson.sportSlug}${childQuery}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full text-base font-black"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--deep-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Ders listesine dön
          </Link>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-bold transition-colors hover:bg-black/5"
          style={{
            borderColor: 'var(--color-line)',
            color: 'var(--color-ink-2)',
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Tekrar yap
        </button>
      </div>
    </motion.section>
  );
}
