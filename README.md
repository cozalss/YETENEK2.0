# Yetenek 2.0

AI tabanlı çocuk spor yetenek keşif platformu. 8-15 yaş çocuk telefon
kamerası önünde 5 dakikalık test bataryası yapar; MediaPipe + Claude
analizi 12 spor profili içinden en uygun 3-5 sporu önerir, sakatlanma
riski uyarısı + gamification katmanı sunar.

**Yarışma:** METU Sports Tech Hackathon · 16-17 Mayıs 2026 · CoZone · ODTÜ Teknopark
**Tema:** Spor, Sağlık & Refah

---

## Kanonik Renk Paleti

Tüm yeni UI bu paletten beslenir — `bg-neutral-*`, `text-white`, `amber-*`
gibi Tailwind default tonları kullanma. Token kaynakları `src/app/globals.css`
`:root` bölümünde tanımlı; bileşenlerden `var(--token-name)` ile okunur.

| Rol | Token | Hex | Kullanım |
|---|---|---|---|
| Ana zemin | `--whistle-cream` | `#fff5e1` | Sayfa background, kart üst yüzeyleri |
| Ana mürekkep | `--form-navy` | `#2c3e6b` | Yazı rengi, ikincil kart bg |
| Derin lacivert | `--deep-navy` | `#1a2540` | Hover, dramatic accent |
| Vurgu sarısı | `--track-mustard` | `#f2c94c` | CTA, badge, focus glow |
| Pembe vurgu | `--mindar-pink` | `#f4b6c2` | Bildirim/uyarı yumuşağı |
| Mint | `--field-mint` | `#a8d5ba` | Başarı/info hint |
| Pembe yumuşak | `--soft-blush` | `#e8a0b0` | Sekonder vurgu |
| Soluk yeşil | `--pale-sage` | `#c4e0d0` | Background atmosfer |

**Tipografi**
- Display: Montserrat (font-black, 800 weight) → başlıklar, button text
- Body: Courier Prime → metin, etiketler, kart içeriği

**Motion**
- `--duration-fast: 200ms`, `--duration-normal: 400ms`, `--duration-slow: 800ms`
- Easing: `--ease-out-expo`, `--ease-in-out-soft`

**Uygulama kuralı:** Yeni component yazılırken `style={{ color: 'var(--form-navy)' }}`
veya `bg-[var(--whistle-cream)]` kullan. Test sayfaları kamera kontrastı için
içeride koyu navy (`--deep-navy` veya `--form-navy`) kullanabilir, dış zemin
**her zaman cream**.

---

## Geliştirme

```bash
pnpm install
pnpm dev    # http://localhost:3000
```

### Çevre Değişkenleri

`.env.local` (dev) veya Vercel Project Settings (prod):

```bash
# Gemini API — rapor üretimi (yoksa rule-based fallback)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

# Site URL — sitemap, OG, canonical
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase — Auth + DB (yoksa landing + offline demo açık)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

### Supabase Kurulumu (Auth + Çocuk Profilleri)

1. **Proje aç:** [supabase.com/dashboard](https://supabase.com/dashboard) → New Project
2. **Anahtarları al:** Project Settings → API:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **SQL migrasyonunu çalıştır:** SQL Editor'da `supabase/migrations/0001_init.sql` içeriğini yapıştır → Run.
   Bu profiles + children + sessions tablolarını ve RLS politikalarını kurar.
4. **Email auth:** Authentication → Providers → Email → "Confirm email"
   demo için kapatılabilir (hız için).
5. **Google OAuth (opsiyonel):** Providers → Google → enable.
   Authorized redirect URL: `<site>/auth/callback`
6. Lokal: `pnpm dev` ile `http://localhost:3000/auth/sign-up` adresinden
   ilk veliyi oluştur, profile sayfasında çocuk ekle.

---

## Kullanıcı Akışı

```
1. Veli kayıt olur → /auth/sign-up
2. Profile sayfasına gelir → çocuk(lar)ını ekler
3. Bir çocuk için "Tam Akış" CTA'sı → /test/full?childId=<id>
4. 7 test ardışık yapılır → sonuç ekranı
5. Sonuç çocuk_id ile DB'ye kaydedilir → her çocuk kendi geçmişine sahip
```

Auth/Supabase yapılandırılmamışsa landing açık, demo modu çalışır
(localStorage tabanlı), ancak `/profile` ve `/children` rotaları kapanır.

---

## Mimari Notlar

Detay: [`yetenek/CLAUDE.md`](./CLAUDE.md) + [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

- **Hexagonal:** `src/core/` (pure domain) → `src/infrastructure/` (adapters)
  → `src/components/` (UI). Tek yönlü bağımlılık.
- **Result<T,E>:** Domain hiç `throw` etmez; her hata tipli union dalı.
- **Zod single-source:** Tipler `src/core/schemas/*.schema.ts`'den infer edilir.
- **Branded types:** `SessionId`, `ChildId`, `UserId` vb. nominal — yapısal eşleşme yok.
- **Auth & DB:** Supabase (postgres + auth) — `@supabase/ssr` ile Next.js 16
  App Router cookie tabanlı session.

---

## Komutlar

```bash
pnpm dev          # Geliştirme sunucusu
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Vitest (unit testler)
pnpm test:watch   # Vitest izleme modu
```

---

## Demo Stratejisi

- Live demo birincil, video fallback ikincil
- Pitch hook: Naim Süleymanoğlu (1985 Karaman, 16 yaş, halter dünya rekoru)
- Bilimsel atıflar: Bompa, Brewer, Gençlik Spor Bakanlığı Yetenek Seçimi Kılavuzu (2019)

**Kod freeze:** Hackathon günü 18:00 sonrası sadece kritik bug fix. Pitch
prova + demo koreografi öncelikli.
