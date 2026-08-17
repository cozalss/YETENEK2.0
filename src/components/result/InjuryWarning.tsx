/**
 * Denge asimetrisi bulgu paneli + asimetri-spesifik drill önerileri.
 *
 * weakerSide + asymmetryPercent doluysa `getAsymmetryPrescription` ile
 * şiddet bandına uygun drill listesi gösterilir (watch/high/critical).
 *
 * DİL KURALI: bu panel bir tıbbi teşhis değil, tek bir telefon kamerasıyla
 * alınmış 2 boyutlu bir salınım ölçümünün gözlemi. "Sakatlanma riski",
 * "hekim/doktor yönlendirmesi" gibi klinik iddia taşıyan dil kullanılmıyor —
 * bunun yerine "fark belirgin, tekrar ölç, gerekirse antrenör/fizyo bakabilir"
 * çerçevesi kullanılıyor. Aynı dil `reportPrompt.ts`, `coachPrompt.ts`,
 * `balance.ts`'in `summary`'si ve demo metninde de tutarlı tutulmalı.
 */

import {
  getAsymmetryPrescription,
  type AsymmetryDrill,
} from '@/lib/health/asymmetryDrills';

interface Props {
  warnings: string[];
  weakerSide?: 'right' | 'left' | null;
  asymmetryPercent?: number;
}

const FOCUS_BADGE_COLOR: Record<AsymmetryDrill['focus'], string> = {
  denge: 'rgba(168, 213, 186, 0.45)',
  kuvvet: 'rgba(242, 201, 76, 0.45)',
  kontrol: 'rgba(173, 197, 244, 0.45)',
  mobilite: 'rgba(244, 182, 194, 0.45)',
};

export function InjuryWarning({
  warnings,
  weakerSide,
  asymmetryPercent,
}: Props) {
  if (warnings.length === 0) return null;

  const showPrescription =
    asymmetryPercent != null && weakerSide != null && asymmetryPercent >= 10;
  const prescription = showPrescription
    ? getAsymmetryPrescription(asymmetryPercent ?? 0, weakerSide ?? null)
    : null;

  return (
    <div
      className="space-y-4 rounded-2xl border-2 p-5"
      style={{
        background: 'rgba(244, 182, 194, 0.22)',
        borderColor: 'var(--mindar-pink)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
          style={{
            background: 'var(--mindar-pink)',
            color: 'var(--form-navy)',
          }}
        >
          ⚠
        </div>
        <div className="flex-1">
          <h3
            className="text-base font-black"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Sağ-Sol Denge Farkı
          </h3>
          {asymmetryPercent != null && weakerSide && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-2)' }}>
              {weakerSide === 'right' ? 'Sağ' : 'Sol'} bacak{' '}
              <span className="font-bold" style={{ color: 'var(--form-navy)' }}>
                %{asymmetryPercent.toFixed(0)} asimetrik
              </span>
            </p>
          )}
        </div>
      </div>

      <ul
        className="space-y-1.5 pl-13 text-sm"
        style={{ color: 'var(--form-navy)' }}
      >
        {warnings.map((w, i) => (
          <li key={i} className="leading-relaxed">
            {w}
          </li>
        ))}
      </ul>

      {prescription && (
        <div
          className="rounded-xl border-2 p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            borderColor:
              prescription.severity === 'critical'
                ? 'var(--mindar-pink)'
                : 'rgba(44, 62, 107, 0.18)',
          }}
        >
          <p
            className="text-[10px] font-bold tracking-[0.25em] uppercase"
            style={{
              color: 'rgba(44, 62, 107, 0.6)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Önerilen Drill Programı
          </p>
          <h4
            className="mt-1 text-base font-black"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {prescription.headline}
          </h4>
          <p
            className="mt-2 text-xs leading-relaxed"
            style={{ color: 'var(--color-ink-2)' }}
          >
            {prescription.rationale}
          </p>

          <ul className="mt-4 space-y-3">
            {prescription.drills.map((d, i) => (
              <li
                key={i}
                className="rounded-lg border bg-white/60 p-3"
                style={{ borderColor: 'rgba(44, 62, 107, 0.12)' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="text-sm font-black"
                    style={{
                      color: 'var(--form-navy)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {d.name}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                    style={{
                      background: FOCUS_BADGE_COLOR[d.focus],
                      color: 'var(--form-navy)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {d.focus}
                  </span>
                </div>
                <p
                  className="mt-1 font-mono text-[11px]"
                  style={{ color: 'rgba(44, 62, 107, 0.7)' }}
                >
                  {d.dosage}
                  {d.side === 'weaker' && weakerSide && (
                    <>
                      {' '}
                      ·{' '}
                      <span style={{ color: 'var(--form-navy)' }}>
                        {weakerSide === 'right' ? 'sağ' : 'sol'} taraf
                      </span>
                    </>
                  )}
                </p>
                <p
                  className="mt-2 text-xs leading-relaxed"
                  style={{ color: 'var(--color-ink-2)' }}
                >
                  {d.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="rounded-lg border p-3 text-xs leading-relaxed"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          borderColor: 'rgba(244, 182, 194, 0.6)',
          color: 'var(--color-ink-2)',
        }}
      >
        Bu, tek bir telefon kamerasıyla alınmış bir denge ölçümü — tıbbi bir
        değerlendirme değil.{' '}
        {prescription?.medicalReferral
          ? 'Fark belirgin: birkaç gün ara ile tekrar ölçmenizi öneririz (tek seferlik ölçüm ışık ve duruştan etkilenebilir); fark sürerse bir antrenör veya fizyoterapist gözden geçirebilir.'
          : "Önerilen drill'ler ev ortamında güvenle yapılabilir, ağrı varsa durdurun."}
      </div>
    </div>
  );
}
