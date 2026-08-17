/**
 * Kural hakemi — doğru yapılan denemeler KABUL edilmeli.
 *
 * Bu dosya gerçek bir kullanıcı şikâyetinden doğdu: "bütün testlerde bu
 * sıkıntı oluyor doğru yapsam bile, algılamıyor". Hakemin yanlış hareketi
 * yakalaması kadar, doğru hareketi geçirmesi de bir doğruluk gereksinimi —
 * yanlış red, yanlış kabul kadar zararlıdır çünkü çocuk testi tamamlayamaz.
 *
 * İki bağımsız hata için regresyon kilidi:
 *
 * 1. **Ölçek bağımlılığı.** Eşikler kadraj-normalize sabitlerdi (0.02, 0.03,
 *    0.04) ve kodun kendi yorumu "kadraj doluluğu ~%70-80 varsayımıyla"
 *    diyordu. Telefon yerine laptop kamerası kullanıldığında (2.5-3 m) o
 *    doluluk ~%45'e düşüyor; aynı eşik gerçek dünyada neredeyse iki kat
 *    büyük bir mesafeye karşılık geliyor ve doğru hareket algılanmıyor.
 *    Bu yüzden testler `fill` parametresiyle iki mesafede birden koşuyor.
 *
 * 2. **Aynı sinyalden iki kez ceza.** `touchdowns / n` cebirsel olarak
 *    `1 - ratio` idi; `ratio < 0.7` zaten `both_feet_down` veriyorken
 *    `touchdowns/n > 0.1` ikinci bir kapı kuruyordu. Etkin eşik 0.9'a
 *    çıkıyor, `SINGLE_LEG_MIN_RATIO = 0.7`'nin belgelenmiş "anlık denge
 *    kaybı testi geçersiz kılmamalı" toleransı ölü kod oluyordu.
 */

import { describe, expect, it } from 'vitest';
import { RuleBasedValidityJudge } from './rule-based-judge';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';

const judge = new RuleBasedValidityJudge();

/** Kamera mesafesi: vücut boyunun kadraj yüksekliğine oranı. */
const FILL_PHONE = 0.75; // telefon, ~2 m — kodun eski varsayımı
const FILL_LAPTOP = 0.45; // laptop, ~3 m — kullanıcının gerçek kurulumu

const FPS = 30;
const GROUND_Y = 0.92;

interface PoseOptions {
  /** Vücut boyu / kadraj yüksekliği. */
  readonly fill: number;
  /** Sağ ayağın yerden kesilmesi, **vücut boyu oranı** olarak. */
  readonly rightAnkleLift?: number;
  /** Her iki ayağın birlikte yükselmesi (sıçrama), vücut boyu oranı. */
  readonly bothAnklesLift?: number;
  /** Gövdenin yükselmesi, vücut boyu oranı — sıçramada ayakla birlikte. */
  readonly hipLift?: number;
  /** Gövdenin yanal kayması, vücut boyu oranı. */
  readonly lateralShift?: number;
}

/**
 * Antropometrik olarak makul tek bir poz karesi üretir.
 *
 * Oranlar kabaca 8-15 yaş çocuk için: kalça ≈ boyun %52'si, diz ≈ %26'sı.
 * Mutlak sayılar değil ORANLAR önemli — testin amacı zaten hakemin ölçekten
 * bağımsız olduğunu kanıtlamak.
 */
function makeFrame(t: number, o: PoseOptions): PoseFrame {
  const h = o.fill;
  const lift = (o.rightAnkleLift ?? 0) * h;
  const both = (o.bothAnklesLift ?? 0) * h;
  const hipUp = (o.hipLift ?? 0) * h;
  const dx = (o.lateralShift ?? 0) * h;

  const hipY = GROUND_Y - 0.52 * h - hipUp;
  const kneeY = GROUND_Y - 0.26 * h - hipUp;
  const shoulderY = GROUND_Y - 0.82 * h - hipUp;
  const headY = GROUND_Y - h - hipUp;

  const landmarks: Keypoint[] = Array.from({ length: 33 }, () => ({
    x: 0.5 + dx,
    y: headY,
    visibility: 0.95,
  }));

  const put = (i: number, x: number, y: number) => {
    landmarks[i] = { x: 0.5 + dx + x, y, visibility: 0.95 };
  };

  put(POSE_LANDMARKS.LEFT_SHOULDER, -0.09 * h, shoulderY);
  put(POSE_LANDMARKS.RIGHT_SHOULDER, 0.09 * h, shoulderY);
  put(POSE_LANDMARKS.LEFT_HIP, -0.06 * h, hipY);
  put(POSE_LANDMARKS.RIGHT_HIP, 0.06 * h, hipY);
  put(POSE_LANDMARKS.LEFT_KNEE, -0.05 * h, kneeY);
  put(POSE_LANDMARKS.RIGHT_KNEE, 0.05 * h, kneeY - lift);
  put(POSE_LANDMARKS.LEFT_ANKLE, -0.05 * h, GROUND_Y - both);
  put(POSE_LANDMARKS.RIGHT_ANKLE, 0.05 * h, GROUND_Y - lift - both);

  return { timestamp: t, landmarks };
}

function frames(count: number, opts: (i: number) => PoseOptions): PoseFrame[] {
  return Array.from({ length: count }, (_, i) =>
    makeFrame((i * 1000) / FPS, opts(i))
  );
}

async function violations(
  test: Parameters<typeof judge.judge>[0]['test'],
  fs: PoseFrame[]
): Promise<readonly string[]> {
  const r = await judge.judge({ test, frames: fs });
  if (!r.ok) throw new Error('hakem hata döndü');
  return r.value.protocolViolations;
}

describe('Kural hakemi — tek bacak denge', () => {
  // 7 cm'lik kaldırma: 150 cm boyundaki bir çocuk için boyunun ~%4.7'si.
  // Çocuklar dengede dururken ayağı genelde bu kadar kaldırır — "dizine
  // kadar kaldır" diye bir protokol yok.
  const MODEST_LIFT = 0.047;

  it.each([
    ['telefon (~2 m)', FILL_PHONE],
    ['laptop (~3 m)', FILL_LAPTOP],
  ])(
    '%s: ayağını 7 cm kaldıran çocuk GEÇERLİ sayılır',
    async (_label, fill) => {
      const fs = frames(90, () => ({ fill, rightAnkleLift: MODEST_LIFT }));
      expect(await violations('balance', fs)).toEqual([]);
    }
  );

  it.each([
    ['telefon (~2 m)', FILL_PHONE],
    ['laptop (~3 m)', FILL_LAPTOP],
  ])(
    '%s: arada sallanıp ayağı kısa süre değen çocuk GEÇERLİ sayılır',
    async (_label, fill) => {
      // Karelerin %15'inde ayak yere değiyor ama DAĞINIK — sürekli değil.
      // Bu bir denge salınımı, protokol ihlali değil. Ekran görüntüsündeki
      // "Havadaki ayağın yere değdi" reddi tam olarak buydu.
      const fs = frames(90, (i) => ({
        fill,
        rightAnkleLift: i % 7 === 0 ? 0 : MODEST_LIFT,
      }));
      expect(await violations('balance', fs)).toEqual([]);
    }
  );

  it('ayağı SÜREKLİ 1 sn yere basan çocuk hâlâ reddedilir', async () => {
    // Gevşetme aşırıya kaçmasın: gerçek bir temas epizodu yakalanmalı.
    const fs = frames(120, (i) => ({
      fill: FILL_PHONE,
      rightAnkleLift: i >= 40 && i < 70 ? 0 : 0.047,
    }));
    expect(await violations('balance', fs)).toContain('foot_touched_down');
  });

  it('iki ayağı da yerde duran çocuk hâlâ reddedilir', async () => {
    const fs = frames(90, () => ({ fill: FILL_PHONE, rightAnkleLift: 0 }));
    expect(await violations('balance', fs)).toContain('both_feet_down');
  });
});

describe('Kural hakemi — sıçrama', () => {
  it.each([
    ['telefon (~2 m)', FILL_PHONE],
    ['laptop (~3 m)', FILL_LAPTOP],
  ])('%s: 12 cm sıçrama uçuş fazı olarak görülür', async (_label, fill) => {
    // 12 cm, 150 cm boyundaki çocuk için boyunun %8'i — mütevazı ama gerçek
    // bir CMJ. Gövde ve ayak birlikte yükseliyor (rijit cisim).
    const fs = frames(60, (i) => {
      const airborne = i >= 30 && i < 42;
      const up = airborne ? 0.08 : 0;
      return { fill, bothAnklesLift: up, hipLift: up };
    });
    expect(await violations('jump', fs)).toEqual([]);
  });

  it('sadece topuk kaldırma hâlâ reddedilir', async () => {
    // Ayak kalkıyor, kalça yerinde — hakemin yakalaması gereken hile.
    const fs = frames(60, (i) => ({
      fill: FILL_PHONE,
      bothAnklesLift: i >= 30 && i < 42 ? 0.08 : 0,
    }));
    expect(await violations('jump', fs)).toContain('heel_raise_only');
  });
});

describe('Kural hakemi — yanal sıçrama', () => {
  it.each([
    ['telefon (~2 m)', FILL_PHONE],
    ['laptop (~3 m)', FILL_LAPTOP],
  ])('%s: 20 cm yana hoplama yeterli genlik sayılır', async (_label, fill) => {
    // 20 cm yanal, 150 cm çocuk için boyunun ~%13'ü.
    const fs = frames(90, (i) => {
      const phase = Math.floor(i / 8) % 2 === 0 ? -1 : 1;
      const airborne = i % 8 < 3;
      return {
        fill,
        lateralShift: phase * 0.065,
        bothAnklesLift: airborne ? 0.05 : 0,
        hipLift: airborne ? 0.05 : 0,
      };
    });
    expect(await violations('lateralHops', fs)).toEqual([]);
  });

  it('yerinde titreme hâlâ reddedilir', async () => {
    const fs = frames(90, (i) => ({
      fill: FILL_PHONE,
      lateralShift: (i % 2 === 0 ? 1 : -1) * 0.002,
    }));
    expect(await violations('lateralHops', fs)).toContain(
      'insufficient_amplitude'
    );
  });
});

describe('Kural hakemi — sıçrarken diz toplama (tuck)', () => {
  it('dizlerini toplayarak sıçrayan çocuk topuk-kaldırma sanılmaz', async () => {
    // Gerçek bir CMJ'de çocuklar sık sık havada dizlerini toplar. O anda ayak
    // bileği, gövdenin yükseldiğinden DAHA ÇOK yükselir; `heel_raise_only`
    // kuralı gövde/ayak oranına baktığı için bunu hile sanma riski var.
    const fs = frames(60, (i) => {
      const airborne = i >= 30 && i < 42;
      return {
        fill: FILL_PHONE,
        hipLift: airborne ? 0.08 : 0, // gövde 12 cm yükseldi
        bothAnklesLift: airborne ? 0.08 + 0.09 : 0, // ayak ek 13 cm toplandı
      };
    });
    expect(await violations('jump', fs)).toEqual([]);
  });
});
