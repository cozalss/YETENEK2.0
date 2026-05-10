/**
 * Gemini API erişilemezse devreye giren rule-based fallback rapor.
 *
 * - API key yoksa
 * - Anahtar geçersizse
 * - Network hatası varsa
 * - Rate limit'e takılırsa
 *
 * Şablon Türkçe ve veliye samimi tonda; AI tarafından üretilen kadar
 * doğal değil ama demo'yu kurtarır. Pitch'te "AI çalışmazsa fallback'imiz var"
 * cümlesi ürün olgunluğu sinyali.
 */

import type { SessionSummary } from '@/lib/session/store';

export function generateFallbackReport(session: SessionSummary): string {
  const name = session.child.name || 'çocuğunuz';
  const age = session.child.ageYears;

  const sections: string[] = [];

  // Açılış
  sections.push(`Merhaba,`);
  sections.push('');
  sections.push(
    `${name}'in ${age} yaşındaki test sonuçları geldi. Aşağıda öne çıkan noktalar var.`
  );

  // Güçlü yan
  const jumpScore = session.jump?.score ?? 0;
  const balanceAvg = session.balance?.averageScore ?? 0;
  const reactionScore = session.reaction?.ageNormScore ?? 0;
  const strengths: string[] = [];
  if (jumpScore >= 70) strengths.push('patlayıcı gücü');
  if (balanceAvg >= 70) strengths.push('denge ve kontrolü');
  if (reactionScore >= 70) strengths.push('refleksleri');

  if (strengths.length > 0) {
    sections.push('');
    sections.push(
      `Özellikle ${strengths.join(', ')} dikkat çekiyor. Bu profil takım sporları ve raket sporları için iyi bir başlangıç sunuyor.`
    );
  }

  // Asimetri uyarısı
  if (
    session.balance?.asymmetryWarning &&
    session.balance.weakerSide
  ) {
    const weakLabel =
      session.balance.weakerSide === 'right' ? 'sağ' : 'sol';
    sections.push('');
    sections.push(
      `Bir noktayı paylaşmak isteriz: ${weakLabel} bacak dengesi diğerine göre %${session.balance.asymmetryPercent.toFixed(0)} daha zayıf görünüyor. Bu şu an problem değil, ama yoğun spor başlamadan önce tek bacak köprü ve yan plank gibi dengeleyici egzersizler iyi bir hazırlık olur.`
    );
  }

  // Spor önerisi
  const topSport = session.recommendations?.[0];
  if (topSport) {
    sections.push('');
    sections.push(
      `Profilin değerlendirmesinde öne çıkan spor: ${topSport.sport}. ${topSport.reason} İlk adım olarak yakın bir spor okulunda deneme dersi almayı düşünebilirsiniz.`
    );
  }

  // Kapanış
  sections.push('');
  sections.push('Sevgilerimle,');
  sections.push('Yetenek 2.0');

  return sections.join('\n');
}
