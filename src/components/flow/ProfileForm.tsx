/**
 * Çocuk profili giriş formu — full test akışının ilk adımı.
 *
 * UX: 8 yaş çocuk + telefon = minimum sürtünme. 3 zorunlu alan (isim, yaş,
 * cinsiyet) tek satırda. Boy opsiyonel — "+ Detay" disclosure altında.
 *
 * Boy verilmezse pose pipeline worldLandmarks ile gerçek-cm kalibrasyonu
 * yapar (MediaPipe Heavy + One-Euro Filter); verilirse daha keskin değer.
 *
 * KVKK: cihazda kalır, hiçbir yere paylaşılmaz.
 */

'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ChildIdentity } from '@/lib/session/store';

interface Props {
  onSubmit: (child: ChildIdentity) => void;
}

export function ProfileForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [ageYears, setAgeYears] = useState<number>(10);
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [heightCm, setHeightCm] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const heightNumber = heightCm ? Number(heightCm) : undefined;
    onSubmit({
      name: trimmedName,
      ageYears,
      sex,
      heightCm:
        heightNumber && heightNumber > 0 && Number.isFinite(heightNumber)
          ? heightNumber
          : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 md:p-7"
    >
      <header>
        <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
          Adım 1
        </p>
        <h2 className="mt-1 text-2xl font-bold md:text-3xl">
          Çocuğun bilgileri
        </h2>
        <p className="mt-1.5 text-xs text-neutral-300">
          Cihazda kalır, hiçbir yere paylaşılmaz.
        </p>
      </header>

      {/* Zorunlu alanlar tek satırda — minimum sürtünme */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_0.6fr_0.9fr]">
        <Field label="İsim" htmlFor="profile-name" required>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            placeholder="Zeynep"
            className="h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
          />
        </Field>

        <Field label="Yaş" htmlFor="profile-age" required>
          <select
            id="profile-age"
            value={ageYears}
            onChange={(e) => setAgeYears(Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
          >
            {Array.from({ length: 8 }, (_, i) => i + 8).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cinsiyet" htmlFor="profile-sex" required>
          <select
            id="profile-sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as 'male' | 'female')}
            className="h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
          >
            <option value="female">Kız</option>
            <option value="male">Erkek</option>
          </select>
        </Field>
      </div>

      {/* Opsiyonel detay — disclosure altında */}
      <div className="overflow-hidden rounded-xl border border-neutral-800/60">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-neutral-300 transition-colors hover:text-neutral-100 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
        >
          <span>+ Detay (opsiyonel) — sıçrama doğruluğunu artırır</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              showDetails ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>
        {showDetails && (
          <div className="border-t border-neutral-800/60 px-4 py-3">
            <Field label="Boy (cm)" htmlFor="profile-height">
              <input
                id="profile-height"
                type="number"
                inputMode="numeric"
                min={100}
                max={200}
                placeholder="örn. 140"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
              />
            </Field>
            <p className="mt-2 text-[11px] text-neutral-300">
              Boy verilmezse pose pipeline gerçek-metre kalibrasyonu yapar
              (worldLandmarks); verilirse daha keskin sıçrama cm değeri.
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={`h-12 w-full rounded-full font-bold transition-colors focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none ${
          canSubmit
            ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
            : 'cursor-not-allowed bg-neutral-800 text-neutral-300'
        }`}
      >
        Testlere Başla →
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, htmlFor, required = false, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-medium tracking-wider text-neutral-300 uppercase"
      >
        {label}
        {required && <span className="ml-1 text-amber-400">*</span>}
      </label>
      {children}
    </div>
  );
}
