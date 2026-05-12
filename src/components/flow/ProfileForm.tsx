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

  const inputClass =
    'h-11 w-full rounded-lg border-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors';
  const inputStyle: React.CSSProperties = {
    background: 'var(--color-canvas)',
    borderColor: 'var(--color-line-strong)',
    color: 'var(--form-navy)',
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-3xl border-2 p-6 md:p-7"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      <header>
        <p
          className="text-xs font-bold tracking-[0.25em] uppercase"
          style={{
            color: 'var(--color-ink-3)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Adım 1
        </p>
        <h2
          className="mt-1 text-2xl font-black md:text-3xl"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Çocuğun bilgileri
        </h2>
        <p
          className="mt-1.5 text-xs"
          style={{ color: 'var(--color-ink-2)' }}
        >
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
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <Field label="Yaş" htmlFor="profile-age" required>
          <select
            id="profile-age"
            value={ageYears}
            onChange={(e) => setAgeYears(Number(e.target.value))}
            className={inputClass}
            style={inputStyle}
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
            className={inputClass}
            style={inputStyle}
          >
            <option value="female">Kız</option>
            <option value="male">Erkek</option>
          </select>
        </Field>
      </div>

      {/* Opsiyonel detay — disclosure altında */}
      <div
        className="overflow-hidden rounded-xl border-2"
        style={{ borderColor: 'var(--color-line)' }}
      >
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold tracking-wide transition-opacity hover:opacity-70 focus-visible:outline-none"
          style={{ color: 'var(--color-ink-2)' }}
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
          <div
            className="border-t-2 px-4 py-3"
            style={{ borderColor: 'var(--color-line)' }}
          >
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
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            <p
              className="mt-2 text-[11px] leading-snug"
              style={{ color: 'var(--color-ink-3)' }}
            >
              Boy verilmezse pose pipeline gerçek-metre kalibrasyonu yapar
              (worldLandmarks); verilirse daha keskin sıçrama cm değeri.
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-12 w-full rounded-full text-base font-black tracking-wide transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={
          canSubmit
            ? {
                background: 'var(--track-mustard)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
                boxShadow:
                  '0 6px 0 rgba(44, 62, 107, 0.18), 0 18px 36px -12px rgba(242, 201, 76, 0.45)',
              }
            : {
                background: 'rgba(44, 62, 107, 0.08)',
                color: 'rgba(44, 62, 107, 0.55)',
                cursor: 'not-allowed',
                fontFamily: 'var(--font-display)',
              }
        }
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
        className="mb-1.5 block text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {label}
        {required && (
          <span
            className="ml-1"
            style={{ color: 'var(--track-mustard)' }}
          >
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
