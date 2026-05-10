/**
 * Bilim referansları — paylaşılan kütüphane (footer, about, privacy, training).
 *
 * Sport science research agentı tarafından doğrulanmış 31 kaynaktan kritik 24'ü.
 * Her kaynak: tag (test/spor/kvkk), kısa açıklama, link.
 */

export interface ScienceReference {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  /** Kaynak hangi modüle dayanak — UI'da grupla */
  tags: ('jump' | 'broadJump' | 'balance' | 'reaction' | 'agility' | 'coordination' | 'endurance' | 'sport' | 'anthro' | 'safety')[];
  url?: string;
}

export const REFERENCES: ScienceReference[] = [
  {
    id: 'tomkinson-2018',
    authors: 'Tomkinson GR, Carver KD, Atkinson F, et al.',
    year: 2018,
    title:
      'European normative values for physical fitness in children and adolescents aged 9–17 years',
    journal: 'Br J Sports Med 52:1445–1456',
    tags: ['jump', 'broadJump', 'agility'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/29191931/',
  },
  {
    id: 'thomas-2020',
    authors: 'Thomas E, Petrigna L, Tabacchi G, et al.',
    year: 2020,
    title:
      'Percentile values of the standing broad jump in children and adolescence aged 6–18 years',
    journal: 'Eur J Transl Myol 30(2):9050',
    tags: ['broadJump'],
  },
  {
    id: 'ramirez-2017',
    authors: 'Ramírez-Vélez R, Morales O, Peña-Ibagon JC, et al.',
    year: 2017,
    title:
      'Normative Reference of Standing Long Jump for Colombian Schoolchildren 9–17.9 Years (FUPRECOL)',
    journal: 'Nutrients 9(10):1167',
    tags: ['broadJump'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/27642854/',
  },
  {
    id: 'temfemo-2009',
    authors: 'Temfemo A, Hugues J, Chouchana K, et al.',
    year: 2009,
    title:
      'Effects of age, sex and activity level on counter-movement jump performance',
    journal: 'Eur J Appl Physiol',
    tags: ['jump'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/24050469/',
  },
  {
    id: 'bosco-1983',
    authors: 'Bosco C, Luhtanen P, Komi PV',
    year: 1983,
    title:
      'A simple method for measurement of mechanical power in jumping',
    journal: 'Eur J Appl Physiol Occup Physiol 50(2):273–282',
    tags: ['jump'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/6681758/',
  },
  {
    id: 'castro-pinero-2010',
    authors: 'Castro-Piñero J, Ortega FB, Artero EG, et al.',
    year: 2010,
    title:
      'Assessing muscular strength in youth: usefulness of standing long jump as a general index of muscular fitness',
    journal: 'J Strength Cond Res 24(7):1810–1817',
    tags: ['jump', 'broadJump'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/19996785/',
  },
  {
    id: 'croisier-2008',
    authors: 'Croisier JL, Ganteaume S, Binet J, et al.',
    year: 2008,
    title:
      'Strength Imbalances and Prevention of Hamstring Injury in Professional Soccer Players',
    journal: 'Am J Sports Med 36(8):1469–1475',
    tags: ['balance', 'safety'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/18448578/',
  },
  {
    id: 'hewett-2005',
    authors: 'Hewett TE, Myer GD, Ford KR, et al.',
    year: 2005,
    title:
      'Biomechanical Measures of Neuromuscular Control and Valgus Loading Predict ACL Injury Risk',
    journal: 'Am J Sports Med 33(4):492–501',
    tags: ['balance', 'safety'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/15722287/',
  },
  {
    id: 'munro-2011',
    authors: 'Munro AG, Herrington LC',
    year: 2011,
    title:
      'Between-Session Reliability of Four Hop Tests and the Agility T-Test',
    journal: 'J Strength Cond Res 25(5):1470–1477',
    tags: ['agility'],
  },
  {
    id: 'larsen-2022',
    authors: 'Larsen JB, Mosler AB, et al.',
    year: 2022,
    title:
      'Reference data for hop tests used in pediatric ACL injury rehabilitation',
    journal: 'Translational Sports Medicine',
    tags: ['agility'],
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8453553/',
  },
  {
    id: 'flowers-2010',
    authors: 'Flowers KA, Hudson J, Pring T',
    year: 2010,
    title:
      'Age, handedness, and sex contribute to fine motor behavior in children',
    journal: 'J Neurosci Methods',
    tags: ['coordination'],
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3019285/',
  },
  {
    id: 'mueller-2014',
    authors: 'Mueller ST, Piper BJ',
    year: 2014,
    title:
      'The Psychology Experiment Building Language (PEBL) and PEBL Test Battery',
    journal: 'J Neurosci Methods 222:250–259',
    tags: ['coordination'],
  },
  {
    id: 'podstawski-2019',
    authors: 'Podstawski R, et al.',
    year: 2019,
    title: 'International Standards for the 3-Minute Burpee Test',
    journal: 'J Hum Kinet 70:129–138',
    tags: ['endurance'],
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6815084/',
  },
  {
    id: 'lange-kuttner-2012',
    authors: 'Lange-Küttner C, et al.',
    year: 2012,
    title:
      'The Importance of Reaction Times for Developmental Science',
    journal: 'Int J Dev Sci 6(1–2):51–55',
    tags: ['reaction'],
  },
  {
    id: 'bompa-2000',
    authors: 'Bompa TO',
    year: 2000,
    title: 'Total Training for Young Champions',
    journal: 'Human Kinetics',
    tags: ['sport'],
  },
  {
    id: 'williams-reilly-2000',
    authors: 'Williams AM, Reilly T',
    year: 2000,
    title: 'Talent identification and development in soccer',
    journal: 'J Sports Sci 18(9):657–667',
    tags: ['sport'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/11043892/',
  },
  {
    id: 'mancha-2023',
    authors: 'Mancha-Triguero D, et al.',
    year: 2023,
    title:
      'Basketball talent identification: a systematic review and meta-analysis',
    journal: 'Front Sports Act Living',
    tags: ['sport'],
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10686286/',
  },
  {
    id: 'pion-2015',
    authors: 'Pion JA, Hohmann A, Liu T, et al.',
    year: 2015,
    title:
      'Stature and Jumping Height Required in Female Volleyball, but Motor Coordination is Key for Future Elite Success',
    journal: 'J Strength Cond Res 29(6):1480–1485',
    tags: ['sport', 'anthro'],
  },
  {
    id: 'sands-2003',
    authors: 'Sands WA, Caine DJ, Borms J (eds)',
    year: 2003,
    title: 'Scientific Aspects of Women\'s Gymnastics',
    journal: 'Karger',
    tags: ['sport'],
  },
  {
    id: 'franchini-2011',
    authors: 'Franchini E, Del Vecchio FB, Matsushigue KA, Artioli GG',
    year: 2011,
    title: 'Physiological profiles of elite judo athletes',
    journal: 'Sports Med 41(2):147–166',
    tags: ['sport'],
  },
  {
    id: 'bridge-2014',
    authors: 'Bridge CA, Ferreira da Silva Santos J, Chaabène H, et al.',
    year: 2014,
    title: 'Physical and physiological profiles of taekwondo athletes',
    journal: 'Sports Med 44(6):713–733',
    tags: ['sport'],
  },
  {
    id: 'chaabene-2015',
    authors: 'Chaabène H, Tabben M, et al.',
    year: 2015,
    title: 'Amateur boxing: physical and physiological attributes',
    journal: 'Sports Med 45(3):337–352',
    tags: ['sport'],
  },
  {
    id: 'kovacs-2007',
    authors: 'Kovacs MS',
    year: 2007,
    title: 'Tennis physiology',
    journal: 'Sports Med 37(3):189–198',
    tags: ['sport'],
  },
  {
    id: 'phomsoupha-2015',
    authors: 'Phomsoupha M, Laffaye G',
    year: 2015,
    title: 'The science of badminton',
    journal: 'Sports Med 45(4):473–495',
    tags: ['sport'],
  },
  {
    id: 'norton-olds-2001',
    authors: 'Norton K, Olds T (eds)',
    year: 2001,
    title: 'Anthropometrica',
    journal: 'UNSW Press',
    tags: ['anthro'],
  },
  {
    id: 'fitnessgram-2017',
    authors: 'Cooper Institute',
    year: 2017,
    title: 'FitnessGram Test Administration Manual, 4th ed.',
    journal: 'Human Kinetics',
    tags: ['endurance'],
  },
];

/**
 * Verili tag'lere göre filtreleme — UI'da grupla.
 */
export function filterReferences(
  tag: ScienceReference['tags'][number]
): ScienceReference[] {
  return REFERENCES.filter((ref) => ref.tags.includes(tag));
}
