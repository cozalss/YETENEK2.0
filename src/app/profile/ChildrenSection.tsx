/**
 * Çocuk listesi + ekleme formu — Server Component.
 *
 * Liste server'dan gelir (Supabase). Form action `addChildAction`'a
 * post eder, başarıda revalidate + redirect ile tazelenir.
 *
 * Her çocuk kartında "Tam Akış" ve "Hızlı 3 Test" CTA'ları childId'yi
 * `/test/full?childId=`'a iletir.
 */

import Link from 'next/link';
import { Calendar, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { addChildAction } from '@/app/children/actions';
import type { ChildRecord } from '@/core/schemas/child.schema';
import { getCurriculumBySlug } from '@/lib/lessons/curriculum';

interface Props {
  /** Çocuk listesi — Server'dan geliyor. */
  items: ReadonlyArray<ChildRecord>;
  /** child_id → seçili sport_slug — DB enrollments. */
  enrollmentsByChild?: ReadonlyMap<string, string>;
}

export function ChildrenSection({ items, enrollmentsByChild }: Props) {
  return (
    <section className="mt-12">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h2
            className="text-2xl font-black md:text-3xl"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Çocuklarım
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--form-navy)', opacity: 0.6 }}
          >
            {items.length === 0
              ? 'Henüz çocuk eklemedin.'
              : `${items.length} çocuk kayıtlı`}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyHint />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <ChildCard
              key={c.id}
              item={c}
              enrolledSportSlug={enrollmentsByChild?.get(c.id)}
            />
          ))}
        </div>
      )}

      <AddChildForm />
    </section>
  );
}

function ChildCard({
  item,
  enrolledSportSlug,
}: {
  item: ChildRecord;
  enrolledSportSlug?: string;
}) {
  const lastTest = item.lastTestedAt
    ? new Date(item.lastTestedAt).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      })
    : null;
  const enrolledCurriculum = enrolledSportSlug
    ? getCurriculumBySlug(enrolledSportSlug)
    : null;

  // Tüm kart `/children/[id]` linkidir; CTA'lar `event.stopPropagation`
  // gerektirmeden Next.js Link nesting yerine ayrı paragraflara konuldu.
  return (
    <div className="relative">
      <Link
        href={`/children/${encodeURIComponent(item.id)}`}
        className="block rounded-3xl border-2 p-6 transition-shadow hover:shadow-lg"
        style={{
          background: '#fff',
          borderColor: 'rgba(44, 62, 107, 0.12)',
          boxShadow: '0 8px 24px rgba(44, 62, 107, 0.06)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
              style={{ background: 'var(--whistle-cream)' }}
            >
              {item.avatarEmoji ?? (item.sex === 'female' ? '👧' : '👦')}
            </div>
            <div>
              <h3
                className="text-lg font-bold"
                style={{
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {item.displayName}
              </h3>
              <p
                className="text-xs"
                style={{ color: 'var(--form-navy)', opacity: 0.6 }}
              >
                {item.ageYears} yaş · {item.sex === 'female' ? 'kız' : 'erkek'}
              </p>
            </div>
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0"
            style={{ color: 'var(--form-navy)', opacity: 0.4 }}
          />
        </div>

        <dl
          className="mt-4 grid grid-cols-3 gap-2 text-xs"
          style={{ color: 'var(--form-navy)' }}
        >
          <div>
            <dt className="opacity-60">Test</dt>
            <dd className="font-bold">{item.sessionCount}</dd>
          </div>
          <div>
            <dt className="opacity-60">Boy</dt>
            <dd className="font-bold">
              {item.heightCm ? `${item.heightCm}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="opacity-60 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Son
            </dt>
            <dd className="font-bold">{lastTest ?? '—'}</dd>
          </div>
        </dl>

        {enrolledCurriculum && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{
              background: 'rgba(242, 201, 76, 0.25)',
              color: 'var(--form-navy)',
            }}
          >
            <Sparkles className="h-3 w-3" />
            <span aria-hidden>{enrolledCurriculum.emoji}</span>
            <span>{enrolledCurriculum.sportName} antrenmanı</span>
          </div>
        )}
      </Link>

      {/* CTA'lar kartın altında ayrı bloklar — kart linkinden bağımsız. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/test/full?childId=${encodeURIComponent(item.id)}`}
          className="inline-flex flex-1 items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-transform hover:scale-[1.02]"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Tam Akış
        </Link>
        <Link
          href={`/test/full?childId=${encodeURIComponent(item.id)}&mode=quick`}
          className="inline-flex flex-1 items-center justify-center rounded-full border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-neutral-50"
          style={{
            borderColor: 'var(--form-navy)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Hızlı 3
        </Link>
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div
      className="rounded-3xl border-2 border-dashed p-10 text-center"
      style={{
        borderColor: 'rgba(44, 62, 107, 0.2)',
        background: 'rgba(168, 213, 186, 0.1)',
      }}
    >
      <div className="text-4xl">👨‍👩‍👧‍👦</div>
      <h3
        className="mt-4 text-xl font-bold"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        İlk çocuğunu ekle
      </h3>
      <p
        className="mx-auto mt-2 max-w-md text-sm"
        style={{ color: 'var(--form-navy)', opacity: 0.7 }}
      >
        Aşağıdaki formla başlayalım. Her çocuğun yaşına göre özel test ve
        analiz oluşturulur.
      </p>
    </div>
  );
}

function AddChildForm() {
  return (
    <details
      className="mt-8 rounded-3xl border-2 p-6"
      style={{
        background: '#fff',
        borderColor: 'rgba(44, 62, 107, 0.12)',
      }}
    >
      <summary
        className="flex cursor-pointer items-center gap-2 text-sm font-bold uppercase tracking-widest"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        <Plus className="h-4 w-4" />
        Yeni çocuk ekle
      </summary>

      <form action={addChildAction} className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          label="Görünen ad / rumuz"
          name="displayName"
          type="text"
          required
          placeholder="Elif"
          autoComplete="off"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Yaş"
            name="ageYears"
            type="number"
            min={4}
            max={18}
            required
            placeholder="12"
          />
          <label className="block">
            <span
              className="mb-1.5 block text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--form-navy)' }}
            >
              Cinsiyet
            </span>
            <select
              name="sex"
              required
              defaultValue="female"
              className="w-full rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none"
              style={{
                background: 'var(--whistle-cream)',
                borderColor: 'rgba(44, 62, 107, 0.2)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <option value="female">Kız</option>
              <option value="male">Erkek</option>
            </select>
          </label>
        </div>
        <Field
          label="Boy (cm) — opsiyonel"
          name="heightCm"
          type="number"
          min={80}
          max={220}
          placeholder="142"
        />
        <Field
          label="Kilo (kg) — opsiyonel"
          name="weightKg"
          type="number"
          min={15}
          max={200}
          placeholder="38"
          step="0.1"
        />
        <Field
          label="Avatar (emoji) — opsiyonel"
          name="avatarEmoji"
          type="text"
          maxLength={4}
          placeholder="🦊"
        />
        <div className="flex items-end md:col-start-2">
          <button
            type="submit"
            className="w-full rounded-full px-6 py-3 text-sm font-bold uppercase tracking-widest transition-transform hover:scale-[1.02]"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 6px 16px rgba(242, 201, 76, 0.4)',
            }}
          >
            Çocuğu ekle
          </button>
        </div>
      </form>
    </details>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: string;
  maxLength?: number;
}

function Field({
  label,
  name,
  type,
  required,
  placeholder,
  autoComplete,
  min,
  max,
  step,
  maxLength,
}: FieldProps) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-xs font-bold uppercase tracking-widest"
        style={{ color: 'var(--form-navy)' }}
      >
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        className="w-full rounded-xl border-2 px-4 py-2.5 text-sm focus:outline-none"
        style={{
          background: 'var(--whistle-cream)',
          borderColor: 'rgba(44, 62, 107, 0.2)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-body)',
        }}
      />
    </label>
  );
}
