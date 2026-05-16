/**
 * Asimetri → drill öneri sistemi.
 *
 * Balance testinde tespit edilen sağ-sol asimetri yüzdesine göre çocuğa
 * spesifik rehabilitasyon / güçlendirme drill'leri önerir.
 *
 * Bantlar (Hewett 2005 + Bartolomei 2018 sportsmed literatürü):
 *   0-10%   → "normal"   — asimetri marjı içinde
 *   10-15%  → "watch"    — denge + farkındalık drill'leri
 *   15-25%  → "high"     → zayıf tarafa odaklı kuvvet/postür kontrolü
 *   25%+    → "critical" → fizyoterapist yönlendirmesi + güvenli core drill'leri
 */

export type AsymmetrySeverity = 'normal' | 'watch' | 'high' | 'critical';

export interface AsymmetryDrill {
  name: string;
  side: 'weaker' | 'both';
  dosage: string;
  description: string;
  focus: 'denge' | 'kuvvet' | 'kontrol' | 'mobilite';
}

export interface AsymmetryPrescription {
  severity: AsymmetrySeverity;
  headline: string;
  rationale: string;
  drills: readonly AsymmetryDrill[];
  medicalReferral: boolean;
}

// ─── Drill kütüphanesi ───────────────────────────────────────────

const SINGLE_LEG_BALANCE: AsymmetryDrill = {
  name: 'Tek bacak denge — gözler açık',
  side: 'weaker',
  dosage: '3 set × 30 sn (zayıf taraf), günde 1 kez',
  description:
    'Zayıf bacağın üstünde dik dur, kollar yanda. Sırt dik, bakış sabit bir noktada. Sallanma minimum.',
  focus: 'denge',
};

const SINGLE_LEG_EYES_CLOSED: AsymmetryDrill = {
  name: 'Tek bacak — gözler kapalı',
  side: 'weaker',
  dosage: '3 set × 15 sn (zayıf taraf), günaşırı',
  description:
    'Zayıf bacakta dur, gözleri kapat. Vestibüler + proprioseptif kontrolü zorlar. Sallanırsan gözünü aç ve tekrar başla.',
  focus: 'kontrol',
};

const LATERAL_LUNGE: AsymmetryDrill = {
  name: 'Yan adım hamle (lateral lunge)',
  side: 'weaker',
  dosage: '3 set × 10 tekrar (her iki tarafa)',
  description:
    'Geniş bir adım yana at, o tarafa çök (diz 90°). Karşı bacak düz. Yavaş geri dön. Zayıf tarafa odaklan.',
  focus: 'kuvvet',
};

const HIP_BRIDGE: AsymmetryDrill = {
  name: 'Tek bacak köprü',
  side: 'weaker',
  dosage: '3 set × 12 tekrar (her iki tarafa)',
  description:
    'Sırt üstü yat, dizler bükülü. Bir bacağı havaya kaldır, diğeriyle kalçayı yukarı it. 1 sn tut, indir.',
  focus: 'kuvvet',
};

const ANKLE_ALPHABET: AsymmetryDrill = {
  name: 'Bilek alfabesi (zayıf ayak)',
  side: 'weaker',
  dosage: 'Her seans 2 set × A→Z (yavaş)',
  description:
    'Otur, zayıf ayakla havada harfleri çiz (A-Z). Bilek mobilitesi + ince motor kontrol — propriosepsiyon canlandırır.',
  focus: 'mobilite',
};

const DEAD_BUG: AsymmetryDrill = {
  name: 'Dead bug (ölü böcek)',
  side: 'both',
  dosage: '3 set × 8 tekrar (her tarafa dönüşümlü)',
  description:
    'Sırt üstü yat, kollar tavana, dizler 90° havada. Karşı el + bacağı yavaşça uzat, geri çek. Bel yere yapışık kalsın.',
  focus: 'kontrol',
};

const PLANK_HOLD: AsymmetryDrill = {
  name: 'Plank — kontrol odaklı',
  side: 'both',
  dosage: '3 set × 20-30 sn',
  description:
    'Dirsek-parmak ucu plank. Kalça düz, kafa nötr. Süreyi uzatmaktansa formu koru — asimetrik çekirdek aktivasyon var.',
  focus: 'kontrol',
};

export function getAsymmetryPrescription(
  asymmetryPercent: number,
  weakerSide: 'right' | 'left' | null
): AsymmetryPrescription {
  if (weakerSide == null || asymmetryPercent < 10) {
    return {
      severity: 'normal',
      headline: 'Asimetri normal aralıkta',
      rationale:
        'Sağ-sol farkın sportif olarak kabul edilebilir bantta (%10 altı). Koruyucu olarak haftada 2 kez tek bacak denge çalışman gelişimine katkı verir.',
      drills: [SINGLE_LEG_BALANCE],
      medicalReferral: false,
    };
  }

  if (asymmetryPercent < 15) {
    return {
      severity: 'watch',
      headline: 'Hafif asimetri — dikkat',
      rationale: `${weakerSide === 'right' ? 'Sağ' : 'Sol'} bacağın diğerinden ~%${Math.round(asymmetryPercent)} daha zayıf. Bu seviye sakatlanma riski oluşturmaz ama 4-6 hafta düzenli denge çalışmasıyla kapatılır.`,
      drills: [SINGLE_LEG_BALANCE, ANKLE_ALPHABET, HIP_BRIDGE],
      medicalReferral: false,
    };
  }

  if (asymmetryPercent < 25) {
    return {
      severity: 'high',
      headline: 'Belirgin asimetri — odaklı çalışma şart',
      rationale: `${weakerSide === 'right' ? 'Sağ' : 'Sol'} bacak %${Math.round(asymmetryPercent)} daha zayıf. Sportif aktivitelerde ACL/menüsküs yaralanma riski artar (Hewett 2005). 6-8 hafta haftada 3 kez tek bacak kuvvet + denge çalışması önerilir.`,
      drills: [
        SINGLE_LEG_BALANCE,
        SINGLE_LEG_EYES_CLOSED,
        LATERAL_LUNGE,
        HIP_BRIDGE,
      ],
      medicalReferral: true,
    };
  }

  return {
    severity: 'critical',
    headline: 'Yüksek asimetri — uzman görüşü al',
    rationale: `${weakerSide === 'right' ? 'Sağ' : 'Sol'} bacak %${Math.round(asymmetryPercent)} daha zayıf — bu seviye genelde geçirilmiş yaralanma veya kas-iskelet dengesizlik işaretidir. Yüksek-yoğunluklu spora başlamadan önce spor hekimi/fizyoterapist değerlendirmesi ÖNERİLİR.`,
    drills: [SINGLE_LEG_BALANCE, ANKLE_ALPHABET, DEAD_BUG, PLANK_HOLD],
    medicalReferral: true,
  };
}
