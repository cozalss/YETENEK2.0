/**
 * Sayı-topraklama kapısı testleri.
 *
 * Bu kapı LLM çıktısındaki tek gerçek güvenlik ağı. Fazla gevşek olursa
 * halüsinasyon geçer, fazla sıkı olursa her rapor reddedilir ve sistem
 * kullanılamaz hâle gelir — iki yön de ayrı ayrı sınanıyor.
 */

import { describe, expect, it } from 'vitest';
import {
  checkGrounding,
  extractNumbers,
  factsFromSession,
  describeGroundingFailure,
} from './ground-narrative';

const facts = {
  numbers: [28.4, 28, 62, 315, 11],
  sports: ['Voleybol', 'Basketbol'],
};

describe('extractNumbers', () => {
  it('tam sayı ve ondalıkları yakalar', () => {
    expect(extractNumbers('28 cm ve 3.5 sn')).toEqual([28, 3.5]);
  });

  it('Türkçe ondalık ayırıcıyı (virgül) tanır', () => {
    expect(extractNumbers('28,4 santimetre')).toEqual([28.4]);
  });

  it('yüzde işaretiyle yazılmış sayıyı yakalar', () => {
    expect(extractNumbers('%62 ihtimalle')).toEqual([62]);
  });

  it('sayı yoksa boş döner', () => {
    expect(extractNumbers('Merhaba, harika iş!')).toEqual([]);
  });
});

describe('checkGrounding — halüsinasyonu yakalar', () => {
  it('veride olmayan ölçüm sayısını reddeder', () => {
    const f = checkGrounding('Sıçraman 42 santimetre.', facts);
    expect(f).not.toBeNull();
    expect(f!.reason).toBe('ungrounded-number');
  });

  it('önerilmemiş sporu reddeder', () => {
    const f = checkGrounding('Sana hentbol öneriyorum.', facts);
    expect(f).not.toBeNull();
    expect(f!.reason).toBe('ungrounded-sport');
    if (f!.reason === 'ungrounded-sport') {
      expect(f!.unknown).toContain('Hentbol');
    }
  });

  it('birden çok uydurma sayıyı tekilleştirerek raporlar', () => {
    const f = checkGrounding('42 cm, sonra yine 42 cm ve 99 puan.', facts);
    if (f?.reason !== 'ungrounded-number') throw new Error('beklenen ihlal yok');
    expect(f.invented).toEqual([42, 99]);
  });
});

describe('checkGrounding — meşru metni geçirir', () => {
  it('veride bulunan sayıları kabul eder', () => {
    expect(
      checkGrounding('Sıçraman 28,4 santimetre, refleksin 315 ms.', facts)
    ).toBeNull();
  });

  it('yuvarlanmış hâli kabul eder', () => {
    expect(checkGrounding('Yaklaşık 28 santimetre sıçradın.', facts)).toBeNull();
  });

  it('anlatı sayılarını (küçük tam sayılar) engellemez', () => {
    expect(
      checkGrounding('Sana 3 spor öneriyorum, haftada 2 kez çalış.', facts)
    ).toBeNull();
  });

  it('önerilmiş sporu kabul eder', () => {
    expect(
      checkGrounding('Voleybol ve Basketbol sana çok uygun.', facts)
    ).toBeNull();
  });

  it('sporun büyük/küçük harf varyantını tanır', () => {
    expect(checkGrounding('voleybol harika bir seçim.', facts)).toBeNull();
  });

  it('sayısız metni geçirir', () => {
    expect(checkGrounding('Harika bir iş çıkardın!', facts)).toBeNull();
  });
});

describe('factsFromSession', () => {
  it('oturumdaki tüm ölçüm değerlerini toplar', () => {
    const f = factsFromSession({
      child: { ageYears: 11, heightCm: 145 },
      jump: { jumpHeightCm: 28.4, score: 62 },
      reaction: { averageMs: 315 },
      recommendations: [{ sport: 'Voleybol', confidencePercent: 78 }],
    });
    expect(f.numbers).toContain(28.4);
    expect(f.numbers).toContain(315);
    expect(f.numbers).toContain(78);
    expect(f.sports).toEqual(['Voleybol']);
  });

  it('yuvarlanmış hâlleri de kabul listesine ekler', () => {
    const f = factsFromSession({ jump: { jumpHeightCm: 28.4 } });
    expect(f.numbers).toContain(28);
  });

  it('null ve eksik alanlarda çökmez', () => {
    const f = factsFromSession({});
    expect(f.numbers).toEqual([]);
    expect(f.sports).toEqual([]);
  });

  it('gerçek bir oturumdan üretilen olgularla meşru metin geçer', () => {
    const f = factsFromSession({
      child: { ageYears: 11 },
      jump: { jumpHeightCm: 31.2, score: 71 },
      recommendations: [{ sport: 'Basketbol', confidencePercent: 64 }],
    });
    expect(
      checkGrounding(
        '31,2 santimetre sıçradın, bu 71 puana denk geliyor. Basketbol %64 ihtimalle ilk 3\'te.',
        f
      )
    ).toBeNull();
  });
});

describe('describeGroundingFailure', () => {
  it('her iki ihlal türü için okunur mesaj üretir', () => {
    expect(
      describeGroundingFailure({ reason: 'ungrounded-number', invented: [42] })
    ).toContain('42');
    expect(
      describeGroundingFailure({ reason: 'ungrounded-sport', unknown: ['Hentbol'] })
    ).toContain('Hentbol');
  });
});
