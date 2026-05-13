-- Yetenek 2.0 — Migration 0008: science_references
--
-- 26 bilimsel kaynak DB'ye. /about, /privacy, /training sayfaları ve
-- PDF rapor buradan referans çeker. Researcher yeni kaynak eklerse SQL
-- update yeterli, deploy bekletmez.

create table if not exists public.science_references (
  id text primary key check (char_length(id) between 1 and 80),
  authors text not null,
  year int not null check (year between 1900 and 2100),
  title text not null,
  journal text not null,
  tags jsonb not null default '[]'::jsonb,
  url text,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists science_references_tags_idx on public.science_references using gin(tags);
create index if not exists science_references_order_idx on public.science_references(display_order, year desc);

drop trigger if exists science_references_set_updated_at on public.science_references;
create trigger science_references_set_updated_at
  before update on public.science_references
  for each row execute function public.set_updated_at();

alter table public.science_references enable row level security;

drop policy if exists "science_references_public_read" on public.science_references;
create policy "science_references_public_read" on public.science_references for select using (true);

-- ─── SEED — 26 kaynak ──────────────────────────────────────────────────
insert into public.science_references (id, authors, year, title, journal, tags, url, display_order) values
  ('tomkinson-2018', 'Tomkinson GR, Carver KD, Atkinson F, et al.', 2018,
    'European normative values for physical fitness in children and adolescents aged 9–17 years',
    'Br J Sports Med 52:1445–1456',
    '["jump","broadJump","agility"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/29191931/', 10),

  ('thomas-2020', 'Thomas E, Petrigna L, Tabacchi G, et al.', 2020,
    'Percentile values of the standing broad jump in children and adolescence aged 6–18 years',
    'Eur J Transl Myol 30(2):9050',
    '["broadJump"]'::jsonb, null, 20),

  ('ramirez-2017', 'Ramírez-Vélez R, Morales O, Peña-Ibagon JC, et al.', 2017,
    'Normative Reference of Standing Long Jump for Colombian Schoolchildren 9–17.9 Years (FUPRECOL)',
    'Nutrients 9(10):1167',
    '["broadJump"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/27642854/', 30),

  ('temfemo-2009', 'Temfemo A, Hugues J, Chouchana K, et al.', 2009,
    'Effects of age, sex and activity level on counter-movement jump performance',
    'Eur J Appl Physiol',
    '["jump"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/24050469/', 40),

  ('bosco-1983', 'Bosco C, Luhtanen P, Komi PV', 1983,
    'A simple method for measurement of mechanical power in jumping',
    'Eur J Appl Physiol Occup Physiol 50(2):273–282',
    '["jump"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/6681758/', 50),

  ('castro-pinero-2010', 'Castro-Piñero J, Ortega FB, Artero EG, et al.', 2010,
    'Assessing muscular strength in youth: usefulness of standing long jump as a general index of muscular fitness',
    'J Strength Cond Res 24(7):1810–1817',
    '["jump","broadJump"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/19996785/', 60),

  ('croisier-2008', 'Croisier JL, Ganteaume S, Binet J, et al.', 2008,
    'Strength Imbalances and Prevention of Hamstring Injury in Professional Soccer Players',
    'Am J Sports Med 36(8):1469–1475',
    '["balance","safety"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/18448578/', 70),

  ('hewett-2005', 'Hewett TE, Myer GD, Ford KR, et al.', 2005,
    'Biomechanical Measures of Neuromuscular Control and Valgus Loading Predict ACL Injury Risk',
    'Am J Sports Med 33(4):492–501',
    '["balance","safety"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/15722287/', 80),

  ('munro-2011', 'Munro AG, Herrington LC', 2011,
    'Between-Session Reliability of Four Hop Tests and the Agility T-Test',
    'J Strength Cond Res 25(5):1470–1477',
    '["agility"]'::jsonb, null, 90),

  ('larsen-2022', 'Larsen JB, Mosler AB, et al.', 2022,
    'Reference data for hop tests used in pediatric ACL injury rehabilitation',
    'Translational Sports Medicine',
    '["agility"]'::jsonb,
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC8453553/', 100),

  ('flowers-2010', 'Flowers KA, Hudson J, Pring T', 2010,
    'Age, handedness, and sex contribute to fine motor behavior in children',
    'J Neurosci Methods',
    '["coordination"]'::jsonb,
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC3019285/', 110),

  ('mueller-2014', 'Mueller ST, Piper BJ', 2014,
    'The Psychology Experiment Building Language (PEBL) and PEBL Test Battery',
    'J Neurosci Methods 222:250–259',
    '["coordination"]'::jsonb, null, 120),

  ('podstawski-2019', 'Podstawski R, et al.', 2019,
    'International Standards for the 3-Minute Burpee Test',
    'J Hum Kinet 70:129–138',
    '["endurance"]'::jsonb,
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC6815084/', 130),

  ('lange-kuttner-2012', 'Lange-Küttner C, et al.', 2012,
    'The Importance of Reaction Times for Developmental Science',
    'Int J Dev Sci 6(1–2):51–55',
    '["reaction"]'::jsonb, null, 140),

  ('bompa-2000', 'Bompa TO', 2000,
    'Total Training for Young Champions',
    'Human Kinetics',
    '["sport"]'::jsonb, null, 150),

  ('williams-reilly-2000', 'Williams AM, Reilly T', 2000,
    'Talent identification and development in soccer',
    'J Sports Sci 18(9):657–667',
    '["sport"]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/11043892/', 160),

  ('mancha-2023', 'Mancha-Triguero D, et al.', 2023,
    'Basketball talent identification: a systematic review and meta-analysis',
    'Front Sports Act Living',
    '["sport"]'::jsonb,
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC10686286/', 170),

  ('pion-2015', 'Pion JA, Hohmann A, Liu T, et al.', 2015,
    'Stature and Jumping Height Required in Female Volleyball, but Motor Coordination is Key for Future Elite Success',
    'J Strength Cond Res 29(6):1480–1485',
    '["sport","anthro"]'::jsonb, null, 180),

  ('sands-2003', 'Sands WA, Caine DJ, Borms J (eds)', 2003,
    'Scientific Aspects of Women''s Gymnastics',
    'Karger',
    '["sport"]'::jsonb, null, 190),

  ('franchini-2011', 'Franchini E, Del Vecchio FB, Matsushigue KA, Artioli GG', 2011,
    'Physiological profiles of elite judo athletes',
    'Sports Med 41(2):147–166',
    '["sport"]'::jsonb, null, 200),

  ('bridge-2014', 'Bridge CA, Ferreira da Silva Santos J, Chaabène H, et al.', 2014,
    'Physical and physiological profiles of taekwondo athletes',
    'Sports Med 44(6):713–733',
    '["sport"]'::jsonb, null, 210),

  ('chaabene-2015', 'Chaabène H, Tabben M, et al.', 2015,
    'Amateur boxing: physical and physiological attributes',
    'Sports Med 45(3):337–352',
    '["sport"]'::jsonb, null, 220),

  ('kovacs-2007', 'Kovacs MS', 2007,
    'Tennis physiology',
    'Sports Med 37(3):189–198',
    '["sport"]'::jsonb, null, 230),

  ('phomsoupha-2015', 'Phomsoupha M, Laffaye G', 2015,
    'The science of badminton',
    'Sports Med 45(4):473–495',
    '["sport"]'::jsonb, null, 240),

  ('norton-olds-2001', 'Norton K, Olds T (eds)', 2001,
    'Anthropometrica',
    'UNSW Press',
    '["anthro"]'::jsonb, null, 250),

  ('fitnessgram-2017', 'Cooper Institute', 2017,
    'FitnessGram Test Administration Manual, 4th ed.',
    'Human Kinetics',
    '["endurance"]'::jsonb, null, 260)
on conflict (id) do update set
  authors = excluded.authors,
  year = excluded.year,
  title = excluded.title,
  journal = excluded.journal,
  tags = excluded.tags,
  url = excluded.url,
  display_order = excluded.display_order,
  updated_at = now();
