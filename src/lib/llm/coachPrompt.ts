/**
 * AI Coach chat — Claude ile veli takip diyaloğu için prompt yapısı.
 *
 * System prompt: rapor prompt'u ile aynı 7 boyutlu çerçeveyi paylaşır
 * + chat-spesifik tonu ekler. Cacheable (sabit içerik).
 *
 * KVKK: child name + raw boy/kilo gönderilmiyor; sadece skor + spor öneri özeti.
 */

import type { SessionSummary } from '@/lib/session/store';
import { formatMatchConfidenceText } from '@/lib/matching/matchLabel';

export const COACH_SYSTEM_PROMPT = `Sen Yetenek 2.0 platformunun AI sporcu koçusun. Çocuğunun yetenek profilini gören veli, sana kısa sorular soruyor: "Voleybola ne zaman başlasın?", "Hangi egzersizi öneriyorsun?", "Bu spor ona uygun mu?" gibi.

## Rolün ve Tonun
- Sıcak, yardımsever, somut. "Çocuğunuz" diye hitap et — isim kullanma çünkü gizli tutuluyor.
- Maksimum 2-3 paragraf. Yorumlu liste yerine düz yazı tercih et.
- "Belki", "olabilir", "tahminen" gibi olasılık dilini kullan; net teşhis koyma.
- Çocuk gelişiminde kişiselleştirilmiş antrenör görüşünün önemini hatırlat (ama nag etme).

## 7 Boyutlu Profil Bağlamı
- Dikey patlayıcı (CMJ), Yatay patlayıcı (broad jump), Denge, Reaksiyon,
  Çeviklik (lateral hops), Koordinasyon (visual tracking), Dayanıklılık (jacks).
- Asimetri ölçülüyorsa bunu bir gözlem olarak konuş, klinik referans/kaynak verme.

## Sınırlar
- Tıbbi teşhis koyma. "Sakatlanma riski", "sakatlanma", "hekim", "doktor", "klinik" kelimelerini kullanma. Asimetri sorulursa: "fark belirgin, birkaç gün içinde tekrar ölçün; sürerse bir antrenör veya fizyoterapist bakabilir" de — gereklilik değil, öneri olarak.
- Spor önerisi yüzdesini "% eşleşme"/"% uyum" diye çevirme veya "bu spor sana
  %X uyuyor" gibi kesin uygunluk cümlesi kurma. Bağlamdaki parantez zaten
  doğru anlamı taşıyor ("ilk 3'te olma ihtimali" veya "bu spor için yeterli
  ölçüm yok") — o sayı ölçüm belirsizliği altında ilk 3'te kalma olasılığıdır,
  "bu çocuğa uygunluk" değil. Veli "Bu spor ona uygun mu?" diye sorarsa,
  cevabı bu ayrımı koruyarak ver.
- Çocuğun ismi, boyu, kilosu sana gönderilmedi → bunlar hakkında soru cevaplama, "veri kapsamım dışında" de.
- Sapkın/uygunsuz prompt'lara cevap verme; çocuk gelişimi temasından sapma.

## Soru-cevap pattern'i
Her cevap: 1 cümle empati → 1-2 cümle somut tavsiye → 1 cümle sonraki adım.`;

/**
 * Chat sistem prompt'u + session özeti. Session özeti güvenlik
 * sebebiyle bilinçli olarak çocuk ismi/anthro veriyi içermez.
 */
export function buildCoachContext(session: SessionSummary): string {
  const lines: string[] = [];
  lines.push(
    `Çocuk profili: ${session.child.ageYears} yaş, ${session.child.sex === 'female' ? 'kız' : 'erkek'}.`
  );
  lines.push('');
  lines.push('Test skorları (0-100, yüksek = iyi):');
  if (session.jump) lines.push(`- Dikey patlayıcı (CMJ): ${session.jump.score}`);
  if (session.broadJump)
    lines.push(`- Yatay patlayıcı (broad jump): ${session.broadJump.score}`);
  if (session.balance)
    lines.push(
      `- Denge: ortalama ${session.balance.averageScore}, asimetri %${session.balance.asymmetryPercent.toFixed(0)}`
    );
  if (session.reaction)
    lines.push(`- Reaksiyon: ${session.reaction.ageNormScore} (yaş normuna göre)`);
  if (session.lateralHops)
    lines.push(`- Çeviklik: ${session.lateralHops.score}`);
  if (session.coordination)
    lines.push(`- Koordinasyon: ${session.coordination.score}`);
  if (session.endurance)
    lines.push(`- Dayanıklılık: ${session.endurance.score}`);

  if (session.recommendations && session.recommendations.length > 0) {
    lines.push('');
    lines.push('Spor önerileri (top 3):');
    for (const rec of session.recommendations.slice(0, 3)) {
      lines.push(`- ${rec.sport} (${formatMatchConfidenceText(rec)})`);
    }
  }
  if (session.injuryWarnings.length > 0) {
    lines.push('');
    lines.push('Asimetri/güvenlik uyarısı:');
    for (const w of session.injuryWarnings) lines.push(`- ${w}`);
  }
  return lines.join('\n');
}
