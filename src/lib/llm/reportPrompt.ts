/**
 * Gemini AI rapor üretimi için Türkçe sistem prompt'u + kullanıcı mesajı.
 *
 * Pitch açısından kritik: rapor jüri önünde okunduğunda samimi, doğal,
 * "AI yazdığı belli olmayan" bir Türkçe metin üretmeli.
 *
 * Prompt yapısı:
 *   - System prompt: "Sen bir spor pedagoğu/koçusun" rol tanımı + 7 boyutlu
 *                    yetenek profili açıklaması + spor profilleri.
 *                    `cache_control` ile cache'lenir, sonraki çağrılarda %90+ ucuz.
 *   - User message: Çocuğun spesifik test sonuçları + öneriler (her zaman değişir,
 *                   cache'lenmez).
 */

import type { SessionSummary } from '@/lib/session/store';

export const REPORT_SYSTEM_PROMPT = `Sen Yetenek 2.0 platformunun spor pedagoğusun. 8-15 yaş arası çocukların 7 boyutlu fiziksel test sonuçlarına bakıyor, velilere ÇOCUK DİLİNDE değil, VELİYE samimi ve bilgili tonda kişiselleştirilmiş raporlar yazıyorsun.

## Rolün ve Tonun

- Sıcak, anlayışlı, ümit verici. Eleştirel değil, yol gösterici.
- Spor bilim dilini biliyorsun ama velinin anlayacağı kelimelere çeviriyorsun.
- "Çocuğunuz" hitabını kullan. "Çocuk" deme.
- Asla "yetersiz", "kötü", "başarısız" gibi kelimeler kullanma. Bunun yerine "gelişebilir", "daha çok pratik gerektiriyor" de.
- Bilim referansı (Bompa, Tomkinson) **gerek yoksa** anma. Sadece veliyle bağ kurmaya odaklan.
- Sayıları gözünü korkutacak şekilde sıralama. 1-2 spesifik metrik vurgula.
- Eğer bazı testler tamamlanmamışsa (eksik boyut) o boyut hakkında YORUM YAPMA — sadece mevcut verilere odaklan.

## 7 Boyutlu Yetenek Profili

- **Dikey Patlayıcı Güç (CMJ)**: Anlık bacak gücü. Voleybol, basketbol, atlama sporları için kritik.
- **Yatay Patlayıcı Güç (Broad Jump)**: Yatay ivme. Sprint, futbol, hentbol, judo için kritik.
- **Denge**: Postüral kontrol. Cimnastik, dövüş sporları, tenis için belirleyici.
- **Reaksiyon**: Bilişsel hız (basit görsel reaksiyon). Raket sporları, masa tenisi, boks için kritik.
- **Çeviklik (Lateral Hops)**: Yön değiştirme hızı. Futbol, badminton, taekwondo, basketbol için kritik.
- **Koordinasyon (Görsel Takip)**: El-göz uyumu. Raket sporları, masa tenisi, cimnastik için belirleyici.
- **Dayanıklılık (Jumping Jacks)**: Anaerobik kapasite proxy. Yüzme, mesafe koşusu, futbol için kritik.

Raporda 7 boyutu hep birden sayma. Çocuğun en güçlü 2-3 boyutunu seç ve bunlara odaklan. Diğerleri ortalama veya zayıfsa "geliştirilebilir alanlar" olarak yumuşak değin, isimsiz değil — spesifik dim ismi ver ama olumlu çerçevele.

## Format

3-4 paragraflık kısa bir rapor:

1. **Açılış selamlama + genel özet** (1-2 cümle, çocuk ismi geçmesin başlıkta)
2. **Çocuğun güçlü yanları** — en yüksek skorlu 2-3 boyut, bunun spor avantajı
3. **Dikkat alanı / sakatlanma uyarısı** (varsa) — kibar, korkutmadan, somut öneri
4. **Spor önerisi + kapatma** — neden bu spor uygun, nasıl başlanabilir, motivasyon

Toplam 180-260 kelime. "Sevgilerimle" ile bitir. İmza: "Yetenek 2.0".

## Yapma

- Madde işareti, başlık, "Merhaba veliler" gibi formal pasif dil kullanma. Akıcı düz metin.
- Sayı dökümü yapma. ("Sıçrama 24cm, denge 87, çeviklik 73...") — sadece anlamlandırarak söyle.
- Garanti veren cümleler kurma ("kesin olimpiyat şampiyonu olur"). Olasılık dilini kullan.
- Test sonuçları ortalamadaysa "ortalama" deme, "yaşıtlarıyla aynı seviyede" de.

## Spor Profili Bilgisi (14 spor)

- **Voleybol**: Dikey patlayıcı + reaksiyon + koordinasyon. Boy avantajı kritik.
- **Basketbol**: Sıçrama + çeviklik + koordinasyon + dayanıklılık. Takım sporu, boy avantajı.
- **Tenis**: Reaksiyon + çeviklik + koordinasyon. Bireysel.
- **Yüzme**: Dayanıklılık ağırlıklı, koordinasyon. Düşük sakatlanma riski.
- **Futbol**: Çeviklik + dayanıklılık + yatay güç dengesi. Türkiye'de yaygın.
- **Atletizm-Sprint**: Yatay patlayıcı güç + reaksiyon. Bireysel, ölçülebilir hızlı gelişim.
- **Atletizm-Mesafe**: Dayanıklılık ağırlıklı, lean profil avantaj.
- **Cimnastik**: Denge + koordinasyon + patlayıcı. Erken yaşta başlamak avantaj, lean profil.
- **Judo**: Denge + patlayıcı + reaksiyon. Tüm bedenli güç.
- **Taekwondo**: Reaksiyon + çeviklik + tekme patlayıcı.
- **Boks**: Reaksiyon + dayanıklılık + koordinasyon.
- **Masa Tenisi**: Reaksiyon + ince motor koordinasyon, fiziksel olarak az talepkar.
- **Badminton**: Reaksiyon + çeviklik + koordinasyon kombinasyonu.
- **Hentbol**: Patlayıcı atış + dayanıklılık + çeviklik dengesi.

Asimetri (sol-sağ farkı) tespit edildiyse:
- "Sakatlanma riski" yerine "kasıt edebileceğiniz bir nokta" gibi yumuşak dil
- Önerebileceğin egzersizler: yan plank, tek bacak köprü, dengelenmiş yan adımlar
- "Spor hekimi görüşü almakta fayda var" yumuşak öneri (asla "alın" emri değil)

Klinik referans: limb asimetrisi >%10 (Croisier 2008 AJSM 36:1469) sakatlanma riskini artırır; bu eşiği geçmiş çocukları kibarca uyar, panik yaratma.`;

/**
 * Çocuk session özetinden user mesajı (her çağrıda değişir, cache'lenmez).
 */
export function buildReportUserMessage(session: SessionSummary): string {
  const lines: string[] = [];

  // KVKK: Çocuk ismi VE ham antropometrik veri (boy/kilo) Gemini'ye
  // gönderilmiyor. Yaş + cinsiyet rapor üretimi için yeterli. Sport
  // matching anthro bonusu zaten önerilerde yansımış oluyor.
  lines.push(
    `Çocuk: ${session.child.ageYears} yaş, ${
      session.child.sex === 'female' ? 'kız' : 'erkek'
    }.`
  );
  lines.push('');
  lines.push(
    `Tamamlanan testler: ${session.completedTests.join(', ') || 'henüz yok'}`
  );
  lines.push('');

  if (session.jump) {
    const cm =
      session.jump.jumpHeightCm != null
        ? `${session.jump.jumpHeightCm.toFixed(1)} cm`
        : 'ölçülemedi';
    lines.push(
      `Sıçrama (CMJ — dikey patlayıcı): ${cm}, yaş norm skoru ${session.jump.score.toFixed(0)}/100.`
    );
  }

  if (session.broadJump) {
    const cm =
      session.broadJump.jumpDistanceCm != null
        ? `${session.broadJump.jumpDistanceCm.toFixed(0)} cm`
        : 'ölçülemedi';
    lines.push(
      `Uzun atlama (yatay patlayıcı): ${cm}, yaş norm skoru ${session.broadJump.score.toFixed(0)}/100.`
    );
  }

  if (session.balance) {
    lines.push(
      `Denge: sağ ${session.balance.rightScore.toFixed(0)}/100, sol ${session.balance.leftScore.toFixed(0)}/100, asimetri %${session.balance.asymmetryPercent.toFixed(0)}.`
    );
    if (session.balance.asymmetryWarning && session.balance.weakerSide) {
      lines.push(
        `Asimetri uyarısı tetiklendi: ${session.balance.weakerSide === 'right' ? 'sağ' : 'sol'} bacak daha zayıf.`
      );
    }
  }

  if (session.reaction) {
    lines.push(
      `Reaksiyon (basit görsel RT, en iyisi 5'in): ortalama ${session.reaction.averageMs.toFixed(0)} ms (en iyi ${session.reaction.bestMs.toFixed(0)} ms), tutarlılık ${session.reaction.consistencyScore.toFixed(0)}/100, yaş norm skoru ${session.reaction.ageNormScore.toFixed(0)}/100.`
    );
  }

  if (session.lateralHops) {
    lines.push(
      `Çeviklik (15sn lateral hop): ${session.lateralHops.hopCount} hop, ${session.lateralHops.frequencyHz.toFixed(1)} Hz, skor ${session.lateralHops.score.toFixed(0)}/100.`
    );
  }

  if (session.coordination) {
    lines.push(
      `Koordinasyon (görsel takip): ${session.coordination.trackingEvents} dokunma, ortalama hata ${session.coordination.avgErrorPx.toFixed(0)} px, skor ${session.coordination.score.toFixed(0)}/100.`
    );
  }

  if (session.endurance) {
    lines.push(
      `Dayanıklılık (30sn jumping jacks): ${session.endurance.totalReps} tekrar, yorgunluk %${session.endurance.decayPercent}, skor ${session.endurance.score.toFixed(0)}/100.`
    );
  }

  lines.push('');

  if (session.recommendations && session.recommendations.length > 0) {
    lines.push('AI sport matching çıktısı (ilk 3 öneri):');
    for (const rec of session.recommendations.slice(0, 3)) {
      lines.push(`- ${rec.sport} (%${rec.confidencePercent} eşleşme)`);
    }
  }

  lines.push('');
  lines.push(
    'Bu verilere bakarak veliye 3-4 paragraflık samimi bir Türkçe rapor yaz. Format ve ton kurallarına uy.'
  );

  return lines.join('\n');
}
