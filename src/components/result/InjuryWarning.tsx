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
    <div className="space-y-3 rounded-2xl border border-amber-700/60 bg-amber-950/20 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xl">
          ⚠
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-amber-300">
            Sakatlanma Riski Erken Uyarısı
          </h3>
          {asymmetryPercent != null && weakerSide && (
            <p className="mt-1 text-sm text-amber-200/80">
              {weakerSide === 'right' ? 'Sağ' : 'Sol'} bacak{' '}
              <span className="font-semibold">
                %{asymmetryPercent.toFixed(0)} asimetrik
              </span>
            </p>
          )}
        </div>
      </div>

      <ul className="space-y-1.5 pl-13 text-sm text-amber-100/90">
        {warnings.map((w, i) => (
          <li key={i} className="leading-relaxed">
            {w}
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-amber-700/40 bg-amber-950/40 p-3 text-xs text-amber-200/80">
        Bu uyarı tıbbi tanı değildir. Belirgin bir asimetri tespit edildiğinde
        önerilen yaklaşım: spor hekimi/fizyoterapist görüşü + tek bacak
        güçlendirme egzersizleri.
      </div>
    </div>
  );
}
