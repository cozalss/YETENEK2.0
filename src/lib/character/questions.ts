/**
 * Takım/karakter ölçeği — 14 maddelik 5'li Likert anketi.
 *
 * Hızlı Akış'ın 4. adımı olarak fiziksel testlerden sonra çocuğa sorulur.
 * Skor `teamAffinity` (0-100) olarak normalize edilir ve spor öneri
 * algoritmasında takım sporları (futbol, basketbol, voleybol) için
 * pozitif/negatif boost uygular.
 */

/**
 * 4 alt faktör — Multidimensional Sportspersonship + PABSS skalalarından
 * adapte. Her madde tek bir faktöre atanır, factor analysis simplifies.
 *
 *   cooperation   → takım güveni, sorumluluk, ortak çalışma (5 madde)
 *   encouragement → düşük performansı destekleme, dahil etme (3 madde)
 *   persistence   → vazgeçmeme, çaba sürdürme — grit (2 madde)
 *   fairPlay      → saygı, kibarlık, dürüstlük (4 madde)
 */
export type CharacterFactor =
  | 'cooperation'
  | 'encouragement'
  | 'persistence'
  | 'fairPlay';

export const CHARACTER_FACTOR_KEYS: readonly CharacterFactor[] = [
  'cooperation',
  'encouragement',
  'persistence',
  'fairPlay',
] as const;

export const CHARACTER_FACTOR_LABELS_TR: Record<CharacterFactor, string> = {
  cooperation: 'İşbirliği',
  encouragement: 'Destek',
  persistence: 'Azim',
  fairPlay: 'Fair Play',
};

export interface CharacterQuestion {
  id: number;
  text: string;
  /** Ters kodlu mu — örn. "dışlamak normaldir" → düşük puan = iyi. */
  reverseScored: boolean;
  /** Hangi alt faktöre katkı verir. */
  factor: CharacterFactor;
}

export const CHARACTER_QUESTIONS: readonly CharacterQuestion[] = [
  {
    id: 1,
    text: 'Takım arkadaşlarım benimle aynı fikirde olmasalar bile onlara saygılı davranırım.',
    reverseScored: false,
    factor: 'fairPlay',
  },
  {
    id: 2,
    text: 'Takımım kaybediyor olsa bile mücadele etmeye devam ederim.',
    reverseScored: false,
    factor: 'persistence',
  },
  {
    id: 3,
    text: 'Takım içerisindeki sorumluluklarımı yerine getirme konusunda güvenilir biriyimdir.',
    reverseScored: false,
    factor: 'cooperation',
  },
  {
    id: 4,
    text: 'Takım arkadaşlarıma güvenirim.',
    reverseScored: false,
    factor: 'cooperation',
  },
  {
    id: 5,
    text: 'Takım arkadaşlarımdan birini kırdığımda bunu telafi etmeye çalışırım.',
    reverseScored: false,
    factor: 'cooperation',
  },
  {
    id: 6,
    text: 'Takım arkadaşlarımla ilgilenir ve onları önemserim.',
    reverseScored: false,
    factor: 'cooperation',
  },
  {
    id: 7,
    text: 'Takım ortamında diğer insanlara karşı kibar davranırım.',
    reverseScored: false,
    factor: 'fairPlay',
  },
  {
    id: 8,
    text: 'Takımımız kaybediyor olsa bile takım arkadaşlarımı cesaretlendirmeye devam ederim.',
    reverseScored: false,
    factor: 'encouragement',
  },
  {
    id: 9,
    text: 'Takım ortamında bir kişinin haksız yere suçlandığını gördüğümde bunu engellemeye çalışırım.',
    reverseScored: false,
    factor: 'fairPlay',
  },
  {
    id: 10,
    text: 'Takım arkadaşlarımı ve performansı düşük olan sporcuları cesaretlendirmeye çalışırım.',
    reverseScored: false,
    factor: 'encouragement',
  },
  {
    id: 11,
    text: 'Takımda performansı düşük olan sporcuların dışlanmasının normal olduğunu düşünürüm.',
    reverseScored: true,
    factor: 'encouragement',
  },
  {
    id: 12,
    text: 'Takım arkadaşlarımla birlikte yeni beceriler geliştirmek için çalışırım.',
    reverseScored: false,
    factor: 'cooperation',
  },
  {
    id: 13,
    text: 'Takım arkadaşlarımın kazanmak için hile yapmasını çok önemsemem.',
    reverseScored: true,
    factor: 'fairPlay',
  },
  {
    id: 14,
    text: 'Takım içerisinde elimden gelen çabayı göstermeye çalışırım.',
    reverseScored: false,
    factor: 'persistence',
  },
] as const;

export const LIKERT_LABELS: readonly {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
}[] = [
  { value: 1, label: 'Tamamen Katılmıyorum' },
  { value: 2, label: 'Biraz Katılmıyorum' },
  { value: 3, label: 'Emin Değilim' },
  { value: 4, label: 'Biraz Katılıyorum' },
  { value: 5, label: 'Tamamen Katılıyorum' },
] as const;

export type LikertValue = 1 | 2 | 3 | 4 | 5;

/** Tek bir maddenin cevabı — undefined = henüz cevaplanmadı. */
export type CharacterAnswers = Partial<Record<number, LikertValue>>;
