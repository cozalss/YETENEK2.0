/**
 * Takım/karakter ölçeği — 14 maddelik 5'li Likert anketi.
 *
 * Hızlı Akış'ın 4. adımı olarak fiziksel testlerden sonra çocuğa sorulur.
 * Skor `teamAffinity` (0-100) olarak normalize edilir ve spor öneri
 * algoritmasında takım sporları (futbol, basketbol, voleybol) için
 * pozitif/negatif boost uygular.
 */

export interface CharacterQuestion {
  id: number;
  text: string;
  /** Ters kodlu mu — örn. "dışlamak normaldir" → düşük puan = iyi. */
  reverseScored: boolean;
}

export const CHARACTER_QUESTIONS: readonly CharacterQuestion[] = [
  {
    id: 1,
    text: 'Takım arkadaşlarım benimle aynı fikirde olmasalar bile onlara saygılı davranırım.',
    reverseScored: false,
  },
  {
    id: 2,
    text: 'Takımım kaybediyor olsa bile mücadele etmeye devam ederim.',
    reverseScored: false,
  },
  {
    id: 3,
    text: 'Takım içerisindeki sorumluluklarımı yerine getirme konusunda güvenilir biriyimdir.',
    reverseScored: false,
  },
  {
    id: 4,
    text: 'Takım arkadaşlarıma güvenirim.',
    reverseScored: false,
  },
  {
    id: 5,
    text: 'Takım arkadaşlarımdan birini kırdığımda bunu telafi etmeye çalışırım.',
    reverseScored: false,
  },
  {
    id: 6,
    text: 'Takım arkadaşlarımla ilgilenir ve onları önemserim.',
    reverseScored: false,
  },
  {
    id: 7,
    text: 'Takım ortamında diğer insanlara karşı kibar davranırım.',
    reverseScored: false,
  },
  {
    id: 8,
    text: 'Takımımız kaybediyor olsa bile takım arkadaşlarımı cesaretlendirmeye devam ederim.',
    reverseScored: false,
  },
  {
    id: 9,
    text: 'Takım ortamında bir kişinin haksız yere suçlandığını gördüğümde bunu engellemeye çalışırım.',
    reverseScored: false,
  },
  {
    id: 10,
    text: 'Takım arkadaşlarımı ve performansı düşük olan sporcuları cesaretlendirmeye çalışırım.',
    reverseScored: false,
  },
  {
    id: 11,
    text: 'Takımda performansı düşük olan sporcuların dışlanmasının normal olduğunu düşünürüm.',
    reverseScored: true,
  },
  {
    id: 12,
    text: 'Takım arkadaşlarımla birlikte yeni beceriler geliştirmek için çalışırım.',
    reverseScored: false,
  },
  {
    id: 13,
    text: 'Takım arkadaşlarımın kazanmak için hile yapmasını çok önemsemem.',
    reverseScored: true,
  },
  {
    id: 14,
    text: 'Takım içerisinde elimden gelen çabayı göstermeye çalışırım.',
    reverseScored: false,
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
