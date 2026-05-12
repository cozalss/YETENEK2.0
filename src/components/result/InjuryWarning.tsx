/**
 * Sakatlanma riski uyarı paneli.
 *
 * Demo'nun en önemli "wow effect" parçası — pitch'te jüriye gösterilirken
 * "AI sadece yetenek bulmuyor, sakatlanma riskini de tespit ediyor" diyeceğiz.
 *
 * Veri yoksa hiç render etmez (uyarı yok = panel yok).
 */

interface Props {
  warnings: string[];
  weakerSide?: 'right' | 'left' | null;
  asymmetryPercent?: number;
}

export function InjuryWarning({
  warnings,
  weakerSide,
  asymmetryPercent,
}: Props) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="space-y-3 rounded-2xl border-2 p-5"
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
            Sakatlanma Riski Erken Uyarısı
          </h3>
          {asymmetryPercent != null && weakerSide && (
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-ink-2)' }}
            >
              {weakerSide === 'right' ? 'Sağ' : 'Sol'} bacak{' '}
              <span
                className="font-bold"
                style={{ color: 'var(--form-navy)' }}
              >
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

      <div
        className="rounded-lg border p-3 text-xs leading-relaxed"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          borderColor: 'rgba(244, 182, 194, 0.6)',
          color: 'var(--color-ink-2)',
        }}
      >
        Bu uyarı tıbbi tanı değildir. Belirgin bir asimetri tespit edildiğinde
        önerilen yaklaşım: spor hekimi/fizyoterapist görüşü + tek bacak
        güçlendirme egzersizleri.
      </div>
    </div>
  );
}
