/**
 * PDF Rapor bileşeni — @react-pdf/renderer ile veliye indirilebilir rapor.
 *
 * SSR-safe: Sadece client'te render edilir. ResultScreen'de dynamic import
 * ile yüklenir.
 */

'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { SessionSummary } from '@/lib/session/store';
import type { Badge } from '@/lib/gamification/badges';
import { formatJumpHeightCm } from '@/lib/tests/jump';
import { describeMatchConfidence } from '@/lib/matching/matchLabel';
import {
  REFERENCES,
  type ScienceReference,
} from '@/lib/content/bibliography';

/**
 * Veliye gösterilecek bilim referansları — pdf raporunda 1..N numaralı
 * dipnot. Sport recommendation footnote vermez (PDF zaten yer kıt);
 * sadece test methodolojisi için olanlar.
 */
const PDF_CITATION_TAGS: ScienceReference['tags'][number][] = [
  'jump',
  'broadJump',
  'balance',
  'reaction',
  'agility',
  'coordination',
  'endurance',
];

function getPdfCitations(): ScienceReference[] {
  // Ölçüm boyutu başına ilk kaynak — duplicate yok, max ~7 referans.
  const seen = new Set<string>();
  const out: ScienceReference[] = [];
  for (const tag of PDF_CITATION_TAGS) {
    const ref = REFERENCES.find(
      (r) => r.tags.includes(tag) && !seen.has(r.id)
    );
    if (ref) {
      seen.add(ref.id);
      out.push(ref);
    }
  }
  return out;
}

// System font fallback — Helvetica/Helvetica-Bold her OS'te mevcut
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  header: {
    borderBottom: '2px solid #f6c453',
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginTop: 18,
    marginBottom: 8,
    backgroundColor: '#f6c453',
    padding: '4 8',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1px solid #eee',
  },
  rowLabel: {
    color: '#555',
  },
  rowValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  highlightBox: {
    backgroundColor: '#fff8e1',
    border: '1px solid #f6c453',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  highlightTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: '#b8860b',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 11,
    color: '#333',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ff9800',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  warningTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#e65100',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 10,
    color: '#5d4037',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badgePill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: '4 10',
    fontSize: 10,
    color: '#444',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
    borderTop: '1px solid #eee',
    paddingTop: 8,
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 9,
    color: '#888',
    fontStyle: 'italic',
  },
  citationsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#444',
    marginTop: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  citationItem: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
    lineHeight: 1.3,
  },
});

interface Props {
  session: SessionSummary;
  badges: Badge[];
  aiReport?: string | null;
}

export function PdfReportDocument({ session, badges, aiReport }: Props) {
  const top3 = session.recommendations?.slice(0, 3) ?? [];
  const topConfidence = top3[0] ? describeMatchConfidence(top3[0]) : null;
  const completedDate = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString('tr-TR')
    : new Date().toLocaleDateString('tr-TR');

  return (
    <Document title={`${session.child.name} - Yetenek Profili`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Yetenek 2.0 · Spor Yetenek Keşfi</Text>
          <Text style={styles.title}>{session.child.name}</Text>
          <Text style={styles.subtitle}>
            {session.child.ageYears} yaş · {session.child.sex === 'female' ? 'Kız' : 'Erkek'}
            {session.child.heightCm ? ` · ${session.child.heightCm} cm` : ''}
            {' · '}{completedDate}
          </Text>
        </View>

        {/* İlk Sırada */}
        {top3[0] && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>
              İlk Sırada: {top3[0].sport}
              {topConfidence?.percent != null ? ` (%${topConfidence.percent})` : ''}
            </Text>
            <Text style={styles.highlightText}>{top3[0].reason}</Text>
          </View>
        )}

        {/* Spor Önerileri */}
        <Text style={styles.sectionTitle}>Spor Önerileri</Text>
        {top3.map((rec, i) => {
          const confidence = describeMatchConfidence(rec);
          return (
            <View key={i} style={styles.row}>
              <Text style={styles.rowLabel}>
                {i + 1}. {rec.sport}
              </Text>
              <Text style={styles.rowValue}>
                {confidence.percent != null ? `%${confidence.percent}` : '—'}
              </Text>
            </View>
          );
        })}
        <Text style={styles.disclaimer}>
          Yüzdeler &quot;bu spor ilk 3&apos;te kalır mı&quot; olasılığıdır (ölçüm
          belirsizliği altında simülasyon) — kesin uygunluk iddiası değildir.
          &quot;—&quot; o spor için yeterli ölçüm olmadığını gösterir.
        </Text>

        {/* Test Sonuçları */}
        <Text style={styles.sectionTitle}>Fiziksel Test Sonuçları</Text>
        {session.jump && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Dikey Sıçrama (CMJ)</Text>
            <Text style={styles.rowValue}>
              {session.jump.jumpHeightCm != null
                ? formatJumpHeightCm(
                    session.jump.jumpHeightCm,
                    session.jump.jumpHeightSigmaCm ?? null
                  )
                : `${session.jump.score} skor`}
            </Text>
          </View>
        )}
        {session.broadJump && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Uzun Atlama</Text>
            <Text style={styles.rowValue}>
              {session.broadJump.jumpDistanceCm != null
                ? `${session.broadJump.jumpDistanceCm.toFixed(0)} cm`
                : `${session.broadJump.score} skor`}
            </Text>
          </View>
        )}
        {session.balance && (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Denge (Sağ / Sol)</Text>
              <Text style={styles.rowValue}>
                {session.balance.rightScore} / {session.balance.leftScore}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Asimetri</Text>
              <Text style={styles.rowValue}>
                %{session.balance.asymmetryPercent}
                {session.balance.asymmetryWarning ? ' ⚠️' : ''}
              </Text>
            </View>
          </>
        )}
        {session.reaction && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Reaksiyon (Ort / En İyi)</Text>
            <Text style={styles.rowValue}>
              {session.reaction.averageMs.toFixed(0)}ms / {session.reaction.bestMs.toFixed(0)}ms
            </Text>
          </View>
        )}
        {session.lateralHops && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Yanal Sıçrama (15sn)</Text>
            <Text style={styles.rowValue}>
              {session.lateralHops.hopCount} hop · {session.lateralHops.score} skor
            </Text>
          </View>
        )}
        {session.coordination && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Koordinasyon</Text>
            <Text style={styles.rowValue}>
              {session.coordination.score} skor ({session.coordination.trackingEvents} dokunma)
            </Text>
          </View>
        )}
        {session.endurance && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Ritim Sürdürme (30sn)</Text>
            <Text style={styles.rowValue}>
              {session.endurance.totalReps} tekrar · {session.endurance.score} skor
            </Text>
          </View>
        )}

        {/* Sakatlanma Uyarısı */}
        {session.injuryWarnings && session.injuryWarnings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sakatlanma Uyarısı</Text>
            {session.injuryWarnings.map((w, i) => (
              <View key={i} style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Dikkat Edilmesi Gereken Nokta</Text>
                <Text style={styles.warningText}>{w}</Text>
              </View>
            ))}
          </>
        )}

        {/* AI Rapor */}
        {aiReport && (
          <>
            <Text style={styles.sectionTitle}>AI Değerlendirme Raporu</Text>
            <Text style={{ fontSize: 11, color: '#333', lineHeight: 1.6 }}>{aiReport}</Text>
          </>
        )}

        {/* Rozetler */}
        {badges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Kazanılan Rozetler</Text>
            <View style={styles.badgeRow}>
              {badges.map((b) => (
                <Text key={b.id} style={styles.badgePill}>
                  {b.emoji} {b.name}
                </Text>
              ))}
            </View>
          </>
        )}

        {/* Bilimsel Kaynaklar */}
        <Text style={styles.citationsTitle}>Bilimsel Kaynaklar</Text>
        {getPdfCitations().map((ref, i) => (
          <Text key={ref.id} style={styles.citationItem}>
            [{i + 1}] {ref.authors} ({ref.year}). {ref.title}. {ref.journal}.
          </Text>
        ))}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Bu rapor Yetenek 2.0 platformunun AI destekli spor yetenek tarama aracı tarafından
          üretilmiştir. Sonuçlar genel fiziksel profil değerlendirmesi niteliğindedir; tıbbi
          tanı veya profesyonel antrenör değerlendirmesi yerine geçmez. Spor hekimi veya
          antrenör görüşü alınması önerilir.
        </Text>

        <Text style={styles.footer}>
          Yetenek 2.0 · yetenek.app · Çocuk spor yetenek keşfi
        </Text>
      </Page>
    </Document>
  );
}
