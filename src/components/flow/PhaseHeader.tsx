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
      className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4"
      aria-label={`Test ${current} bölü ${total}`}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
            Test {current} / {total}
          </p>
          {childName && (
            <p className="mt-0.5 text-sm text-neutral-400">
              Şu an: <span className="text-white">{childName}</span>
            </p>
          )}
        </div>
      </div>

      <ol className="mt-3 flex items-center gap-1.5 overflow-x-auto">
        {steps.map((step, idx) => (
          <li
            key={`${idx}-${step.label}`}
            className="flex flex-1 items-center gap-1.5 min-w-0"
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.status === 'done'
                  ? 'bg-emerald-500 text-neutral-950'
                  : step.status === 'current'
                    ? 'bg-amber-400 text-neutral-950 ring-4 ring-amber-400/20'
                    : 'bg-neutral-800 text-neutral-300'
              }`}
              aria-hidden="true"
            >
              {step.status === 'done' ? '✓' : idx + 1}
            </div>
            <span
              className={`hidden truncate text-xs font-medium md:inline ${
                step.status === 'current'
                  ? 'text-amber-400'
                  : step.status === 'done'
                    ? 'text-emerald-300'
                    : 'text-neutral-300'
              }`}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <span
                className={`h-px flex-1 ${
                  step.status === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-neutral-800'
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </header>
  );
}

/** Default test phase labels — Full mode (7 step). */
export const FULL_FLOW_STEP_LABELS = [
  'Sıçrama',
  'Uzun Atlama',
  'Denge',
  'Çeviklik',
  'Reaksiyon',
  'Koordinasyon',
  'Dayanıklılık',
];

/** Quick mode (3 core test). */
export const QUICK_FLOW_STEP_LABELS = ['Sıçrama', 'Denge', 'Reaksiyon'];
