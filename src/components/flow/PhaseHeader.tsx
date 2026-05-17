/**
 * Akış sırasında "X / N" gösteren stepper header.
 * Tamamlanmış adımlar yeşil, mevcut amber, sonraki gri.
 *
 * v2 — 7 testli mode için array-tabanlı çalışır. Quick mode 3 step,
 * Full mode 7 step. Caller hangisini gösterirse onu render eder.
 */

interface Step {
  label: string;
  status: 'done' | 'current' | 'upcoming';
}

interface Props {
  /** 1-tabanlı mevcut adım numarası */
  current: number;
  /** Adım etiketleri (sırasıyla). Toplam adım sayısı = labels.length */
  labels: string[];
  childName?: string;
}

export function PhaseHeader({ current, labels, childName }: Props) {
  const total = labels.length;
  const steps: Step[] = labels.map((label, idx) => {
    const stepNumber = idx + 1;
    const status: Step['status'] =
      stepNumber === current
        ? 'current'
        : stepNumber < current
          ? 'done'
          : 'upcoming';
    return { label, status };
  });

  return (
    <header
      className="rounded-2xl border p-4"
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
      aria-label={`Test ${current} bölü ${total}`}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Test {current} / {total}
          </p>
          {childName && (
            <p
              className="mt-0.5 text-sm"
              style={{ color: 'rgba(44, 62, 107, 0.65)' }}
            >
              Şu an:{' '}
              <span className="font-bold" style={{ color: 'var(--form-navy)' }}>
                {childName}
              </span>
            </p>
          )}
        </div>
      </div>

      <ol className="mt-3 flex items-center gap-1.5 overflow-x-auto">
        {steps.map((step, idx) => (
          <li
            key={`${idx}-${step.label}`}
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
              style={{
                background:
                  step.status === 'done'
                    ? 'var(--field-mint)'
                    : step.status === 'current'
                      ? 'var(--track-mustard)'
                      : 'rgba(44, 62, 107, 0.12)',
                color: 'var(--form-navy)',
                boxShadow:
                  step.status === 'current'
                    ? '0 0 0 4px rgba(242, 201, 76, 0.25)'
                    : 'none',
                fontFamily: 'var(--font-display)',
              }}
              aria-hidden="true"
            >
              {step.status === 'done' ? '✓' : idx + 1}
            </div>
            <span
              className="hidden truncate text-xs font-bold tracking-wider md:inline"
              style={{
                color:
                  step.status === 'current'
                    ? 'var(--form-navy)'
                    : step.status === 'done'
                      ? 'var(--form-navy)'
                      : 'rgba(44, 62, 107, 0.5)',
                opacity: step.status === 'upcoming' ? 0.7 : 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <span
                className="h-px flex-1"
                style={{
                  background:
                    step.status === 'done'
                      ? 'var(--field-mint)'
                      : 'rgba(44, 62, 107, 0.18)',
                }}
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </header>
  );
}

/** Default test phase labels — Full mode (7 fiziksel + 1 karakter). */
export const FULL_FLOW_STEP_LABELS = [
  'Sıçrama',
  'Uzun Atlama',
  'Denge',
  'Çeviklik',
  'Reaksiyon',
  'Koordinasyon',
  'Dayanıklılık',
  'Karakter',
];

/** Quick mode (3 çekirdek fiziksel + 1 karakter). */
export const QUICK_FLOW_STEP_LABELS = [
  'Sıçrama',
  'Denge',
  'Reaksiyon',
  'Karakter',
];
