/**
 * KVKK Aydınlatma Metni + Gizlilik Politikası.
 *
 * Editorial sade tipografi. Çocuk velilerinin hızlıca anlayabileceği dilde —
 * yasal jargon minimum, somut bilgi maksimum.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, Database, Server } from 'lucide-react';
import { SiteHeaderServer } from '@/components/layout/SiteHeaderServer';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Gizlilik ve KVKK Aydınlatması',
  description:
    'Yetenek 2.0 nasıl veri toplar, hangi verileri saklar ve hangi verileri saklamaz. KVKK Madde 10 aydınlatma yükümlülüğü kapsamında hazırlanmıştır.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeaderServer />

      <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        <header className="mt-8 border-b border-[var(--color-line)] pb-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--color-signal)] uppercase">
            Gizlilik · KVKK
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-bold md:text-6xl">
            Çocuk verisi
            <br />
            <span className="text-[var(--color-signal)]">cihazda kalır.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)]">
            Yetenek 2.0 KVKK Madde 9 (özel nitelikli veri / sağlık verisi) ve
            Madde 10 (aydınlatma yükümlülüğü) kapsamında çocuk velisinin
            açık-rıza vermesi varsayımıyla çalışır. Aşağıda neyin nereye
            gittiği son derece açık.
          </p>
        </header>

        {/* 4 garanti */}
        <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Pledge
            icon={Eye}
            title="Video sunucuya gitmez"
            body="Pose tahmini MediaPipe ile cihazda yapılır. Kamera görüntüsü tarayıcıdan dışarı çıkmaz."
          />
          <Pledge
            icon={Database}
            title="Sadece özet metrikler saklanır"
            body="Sıçrama yüksekliği, denge skoru, reaksiyon ms gibi sayısal özetler. Ham keypoint serisi tutulmaz."
          />
          <Pledge
            icon={Lock}
            title="Aktif oturum 4 saat"
            body="Aktif test session'ı 4 saat sonra otomatik silinir. Tamamlanan geçmiş ve rozetler cihazında kalır, istediğinde silebilirsin."
          />
          <Pledge
            icon={Server}
            title="Claude'a isim gitmez"
            body="AI rapor için sadece test skorları + yaş + cinsiyet gönderilir. Çocuk ismi, boy, kilo gönderilmez."
          />
        </section>

        {/* Detay metin */}
        <article className="prose-yetenek mt-16 space-y-10">
          <Section number="01" title="Hangi verileri topluyoruz?">
            <p>
              Tarayıcı oturumunuzda <strong>geçici olarak</strong> şunları
              tutuyoruz:
            </p>
            <ul>
              <li>
                <strong>Profil:</strong> İsim (sadece ekranda göstermek için),
                yaş, cinsiyet, opsiyonel boy ve kilo. Bunlar yaş normu
                karşılaştırması ve antropometrik bonus hesabı için
                kullanılıyor.
              </li>
              <li>
                <strong>Test sonuçları:</strong> Sayısal skorlar — sıçrama cm,
                denge skoru, reaksiyon ms, vb. Pose keypoint frame'leri
                <strong> kaydedilmez</strong>; sadece anlık olarak işlenir ve
                istatistikler türetilir.
              </li>
              <li>
                <strong>Spor önerisi + AI rapor:</strong> Yetenek profilinizden
                türetilen 3-5 spor önerisi ve Anthropic Claude tarafından
                üretilen kişiselleştirilmiş Türkçe metin.
              </li>
              <li>
                <strong>Rozetler ve süreklilik:</strong> Hangi rozetleri
                kazandığınız ve son 14 günde test günleri.
              </li>
            </ul>
          </Section>

          <Section number="02" title="Veri nereye gidiyor?">
            <p>
              Üç farklı yer söz konusu, ve her biri için ayrı ayrı şeffaf
              olmaya çalışıyoruz.
            </p>
            <h3>Cihazınızın tarayıcısı (localStorage)</h3>
            <p>
              Aktif test session'ı, profil ve rozet cüzdanı tarayıcınızda
              localStorage'da saklanır. Bu veri başka bir sunucuya gönderilmez.
              Aktif session 4 saat sonra otomatik olarak temizlenir. Tamamlanmış
              geçmiş kayıtları ve rozetler siz silene kadar cihazda kalabilir;
              geçmiş listesi en fazla 50 kayıtla sınırlıdır.
            </p>

            <h3>MediaPipe BlazePose (cihazda)</h3>
            <p>
              Pose tahmini Google'ın MediaPipe Tasks Vision kütüphanesi ile
              tarayıcıda WebAssembly üzerinden çalışır. Kamera akışı bu
              kütüphane dışına asla çıkmaz; Google sunucusuna da bir şey
              gönderilmez. Yalnızca model dosyaları (~12 MB) ilk yüklemede
              indirilir.
            </p>

            <h3>Anthropic Claude API (sadece AI rapor + AI koç chat için)</h3>
            <p>
              AI rapor ve AI koç chat isteğinde sunucuya yalnızca:
            </p>
            <ul>
              <li>Test skorları (sayısal)</li>
              <li>Yaş ve cinsiyet</li>
              <li>Spor önerisi listesi</li>
              <li>Asimetri uyarı metni (varsa)</li>
              <li>Veli'nin chat'te yazdığı mesaj (PII filtreli)</li>
            </ul>
            <p>
              gönderilir. <strong>Çocuk ismi, boy, kilo gönderilmez.</strong>{' '}
              Bu, KVKK Madde 9 cross-border data transfer riskini en aza
              indirme amacıyla bilinçli bir tasarım kararıdır. Anthropic'in
              kendi gizlilik politikası için{' '}
              <a
                href="https://www.anthropic.com/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-[var(--color-signal)] underline-offset-4"
              >
                Anthropic privacy policy
              </a>{' '}
              sayfasına bakabilirsiniz.
            </p>
          </Section>

          <Section number="03" title="Çocuk verisi (özel nitelikli)">
            <p>
              KVKK Madde 9 sağlık verisi <em>özel nitelikli</em> sayar.
              Yetenek 2.0'da fiziksel test sonuçları sağlık verisi
              kapsamındadır. Çocuklarda işleme için <strong>velinin açık
              rızası</strong> gerekir. Bu uygulamayı çocuğunuzla
              kullanırken, sonuçların yukarıda tanımlanan şekilde
              işleneceğine rıza gösterdiğinizi varsayıyoruz.
            </p>
            <p>
              Velisi olmadığınız bir çocuğun verisini bu uygulamaya
              girmemenizi rica ederiz.
            </p>
          </Section>

          <Section number="04" title="Hak ve itirazlarınız">
            <p>KVKK Madde 11'e göre veri sahibi olarak hakkınız:</p>
            <ul>
              <li>İşlenen veriniz hakkında bilgi alma</li>
              <li>İşleme amacını ve uygunluğunu sorgulama</li>
              <li>Yurt içi/yurt dışı aktarım yapılan tarafları öğrenme</li>
              <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
              <li>Silinmesini ya da yok edilmesini isteme</li>
              <li>İşleme sonucu aleyhe sonuç ortaya çıkarsa itiraz etme</li>
            </ul>
            <p>
              Talepler için <code>cannozall@gmail.com</code> adresine
              yazabilirsiniz. Pilot sürümde merkezi bir veri tabanı
              olmadığı için "silinmesini isteme" pratikte tarayıcı
              localStorage'ınızı temizlemekle aynı şey — o da kullanıcının
              kontrolündedir.
            </p>
          </Section>

          <Section number="05" title="Çerez ve takip">
            <p>
              Yetenek 2.0 hackathon sürümünde reklam çerezi, analytics çerezi,
              veya 3. taraf takip pikseli kullanmaz. Yalnızca kendi
              tarayıcınızdaki localStorage (oturum tutmak için) kullanılır.
              Bu, tarayıcının "Çerezler" değil "Web Storage" kategorisinde
              yer alır.
            </p>
          </Section>

          <Section number="06" title="Veri cihazlar arasında taşınmaz">
            <p>
              Şu anda pilot sürümde test sonuçlarınız sadece kullandığınız
              tarayıcıda kalıyor — sunucuda saklanmıyor. Aynı tarayıcıda
              geçmişi görebilir ve silebilirsiniz; başka bir cihaza geçtiğinizde
              geçmişe erişemezsiniz. Hesaplı bir sürüm eklenirse bu metin
              güncellenecek ve ayrıca açık rıza istenecektir.
            </p>
          </Section>
        </article>

        <p className="mt-16 text-xs text-[var(--color-ink-3)]">
          Son güncelleme: 2026-05-09. Yetenek 2.0 pilot sürüm.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}

function Pledge({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <Icon className="h-5 w-5 text-[var(--color-signal)]" />
      <h2 className="mt-4 text-base font-bold text-[var(--color-ink-1)]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-2)]">
        {body}
      </p>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--color-line)] pt-8">
      <p className="font-mono text-xs tracking-widest text-[var(--color-signal)] uppercase">
        {number}
      </p>
      <h2 className="mt-2 text-2xl font-bold md:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-[var(--color-ink-2)] [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--color-ink-1)] [&_strong]:text-[var(--color-ink-1)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li]:pl-2 [&_code]:rounded-md [&_code]:bg-[var(--color-surface)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-[var(--color-signal)]">
        {children}
      </div>
    </section>
  );
}
