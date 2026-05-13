/**
 * Public content repository — sports, badges_metadata, science_references,
 * training_programs+exercises, lesson_instructions.
 *
 * Bu tablolar `public_read` RLS politikasıyla anonim erişime açık; auth
 * gerekmez. Server Component'ler bu adapter'ı çağırır.
 *
 * Cache stratejisi: `unstable_cache` ile route segment cache + revalidate.
 * Admin DB'de bir row güncelse, max `revalidate` saniye sonra UI güncel.
 */

import 'server-only';
import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/public';
import { logger } from '@/shared/logger/logger';
import type { Badge, BadgeCategory } from '@/lib/gamification/badges';
import type { SportInfo } from '@/lib/content/sports';
import type { ScienceReference } from '@/lib/content/bibliography';
import type { TrainingExercise, TrainingProgram } from '@/lib/training/programs';
import type { DimensionKey } from '@/lib/matching/sportProfiles';

const log = logger.child('supabase-content');

const REVALIDATE_SECONDS = 600; // 10 dakika — içerik nadiren değişir

// ============================================================
// SPORTS
// ============================================================

interface SportRow {
  slug: string;
  name: string;
  emoji: string | null;
  description: string;
  start_age: string | null;
  equipment: string | null;
  federation_name: string | null;
  federation_url: string | null;
  highlights: string[];
  turkey_context: string | null;
  season: string | null;
  monthly_cost: string | null;
  display_order: number;
}

function rowToSport(r: SportRow): SportInfo {
  return {
    slug: r.slug,
    name: r.name,
    emoji: r.emoji ?? '',
    description: r.description,
    startAge: r.start_age ?? '',
    equipment: r.equipment ?? '',
    federation: {
      name: r.federation_name ?? '',
      url: r.federation_url ?? '',
    },
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    turkeyContext: r.turkey_context ?? '',
    season: r.season ?? '',
    monthlyCost: r.monthly_cost ?? '',
  };
}

async function fetchAllSports(): Promise<readonly SportInfo[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('sports')
    .select(
      'slug, name, emoji, description, start_age, equipment, federation_name, federation_url, highlights, turkey_context, season, monthly_cost, display_order',
    )
    .order('display_order', { ascending: true });

  if (error) {
    log.warn('sports fetch başarısız', { cause: error.message });
    return [];
  }
  return (data ?? []).map((row) => rowToSport(row as SportRow));
}

export const getAllSports = unstable_cache(fetchAllSports, ['content', 'sports'], {
  revalidate: REVALIDATE_SECONDS,
  tags: ['content:sports'],
});

export async function getSportBySlug(slug: string): Promise<SportInfo | null> {
  const all = await getAllSports();
  return all.find((s) => s.slug === slug) ?? null;
}

// ============================================================
// BADGES METADATA
// ============================================================

interface BadgeMetadataRow {
  id: string;
  category: BadgeCategory;
  emoji: string;
  name: string;
  description: string;
  earned_for: string;
  display_order: number;
}

function rowToBadge(r: BadgeMetadataRow): Badge {
  return {
    id: r.id,
    category: r.category,
    emoji: r.emoji,
    name: r.name,
    description: r.description,
    earnedFor: r.earned_for,
  };
}

async function fetchAllBadgesMetadata(): Promise<readonly Badge[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('badges_metadata')
    .select('id, category, emoji, name, description, earned_for, display_order')
    .order('display_order', { ascending: true });

  if (error) {
    log.warn('badges_metadata fetch başarısız', { cause: error.message });
    return [];
  }
  return (data ?? []).map((row) => rowToBadge(row as BadgeMetadataRow));
}

const getAllBadgesMetadataCached = unstable_cache(
  fetchAllBadgesMetadata,
  ['content', 'badges_metadata'],
  { revalidate: REVALIDATE_SECONDS, tags: ['content:badges'] },
);

export async function getBadgesMetadata(): Promise<ReadonlyMap<string, Badge>> {
  const list = await getAllBadgesMetadataCached();
  const map = new Map<string, Badge>();
  for (const b of list) map.set(b.id, b);
  return map;
}

// ============================================================
// SCIENCE REFERENCES
// ============================================================

interface ScienceReferenceRow {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  tags: ScienceReference['tags'];
  url: string | null;
  display_order: number;
}

function rowToReference(r: ScienceReferenceRow): ScienceReference {
  return {
    id: r.id,
    authors: r.authors,
    year: r.year,
    title: r.title,
    journal: r.journal,
    tags: Array.isArray(r.tags) ? r.tags : [],
    url: r.url ?? undefined,
  };
}

async function fetchAllReferences(): Promise<readonly ScienceReference[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('science_references')
    .select('id, authors, year, title, journal, tags, url, display_order')
    .order('display_order', { ascending: true });

  if (error) {
    log.warn('science_references fetch başarısız', { cause: error.message });
    return [];
  }
  return (data ?? []).map((row) => rowToReference(row as ScienceReferenceRow));
}

export const getAllReferences = unstable_cache(
  fetchAllReferences,
  ['content', 'references'],
  { revalidate: REVALIDATE_SECONDS, tags: ['content:references'] },
);

export async function getReferencesByTag(
  tag: ScienceReference['tags'][number],
): Promise<readonly ScienceReference[]> {
  const all = await getAllReferences();
  return all.filter((r) => r.tags.includes(tag));
}

// ============================================================
// TRAINING PROGRAMS + EXERCISES
// ============================================================

interface TrainingProgramRow {
  dimension: DimensionKey;
  title: string;
  tagline: string | null;
  description: string;
  frequency: string;
  duration: string;
  benefits_for: string[];
  safety_note: string;
  display_order: number;
}

interface TrainingExerciseRow {
  dimension: DimensionKey;
  name: string;
  emoji: string | null;
  prescription: string;
  description: string;
  display_order: number;
}

async function fetchAllTrainingPrograms(): Promise<readonly TrainingProgram[]> {
  const supabase = getPublicClient();
  const [{ data: progs, error: progErr }, { data: exs, error: exErr }] =
    await Promise.all([
      supabase
        .from('training_programs')
        .select(
          'dimension, title, tagline, description, frequency, duration, benefits_for, safety_note, display_order',
        )
        .order('display_order', { ascending: true }),
      supabase
        .from('training_exercises')
        .select('dimension, name, emoji, prescription, description, display_order')
        .order('display_order', { ascending: true }),
    ]);

  if (progErr || exErr) {
    log.warn('training fetch başarısız', {
      cause: progErr?.message ?? exErr?.message,
    });
    return [];
  }

  // Egzersizleri dimension'a göre grupla
  const exByDim: Record<string, TrainingExercise[]> = {};
  for (const row of (exs ?? []) as TrainingExerciseRow[]) {
    if (!exByDim[row.dimension]) exByDim[row.dimension] = [];
    exByDim[row.dimension].push({
      name: row.name,
      emoji: row.emoji ?? undefined,
      prescription: row.prescription,
      description: row.description,
    });
  }

  return (progs ?? []).map((row) => {
    const r = row as TrainingProgramRow;
    return {
      dimension: r.dimension,
      title: r.title,
      tagline: r.tagline ?? '',
      description: r.description,
      frequency: r.frequency,
      duration: r.duration,
      benefitsFor: Array.isArray(r.benefits_for) ? r.benefits_for : [],
      safetyNote: r.safety_note,
      exercises: exByDim[r.dimension] ?? [],
    };
  });
}

const getAllTrainingProgramsCached = unstable_cache(
  fetchAllTrainingPrograms,
  ['content', 'training'],
  { revalidate: REVALIDATE_SECONDS, tags: ['content:training'] },
);

export async function getAllTrainingPrograms(): Promise<
  ReadonlyMap<DimensionKey, TrainingProgram>
> {
  const list = await getAllTrainingProgramsCached();
  const map = new Map<DimensionKey, TrainingProgram>();
  for (const p of list) map.set(p.dimension, p);
  return map;
}

export async function getTrainingProgram(
  dimension: DimensionKey,
): Promise<TrainingProgram | null> {
  const list = await getAllTrainingProgramsCached();
  return list.find((p) => p.dimension === dimension) ?? null;
}

// ============================================================
// LESSON INSTRUCTIONS
// ============================================================

interface LessonInstructionRow {
  id: string;
  sport_slug: string;
  display_order: number;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
}

export interface LessonInstruction {
  id: string;
  sportSlug: string;
  order: number;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: readonly string[];
}

function rowToLesson(r: LessonInstructionRow): LessonInstruction {
  return {
    id: r.id,
    sportSlug: r.sport_slug,
    order: r.display_order,
    name: r.name,
    description: r.description,
    difficulty: r.difficulty,
    instructions: Array.isArray(r.instructions) ? r.instructions : [],
  };
}

async function fetchAllLessonInstructions(): Promise<readonly LessonInstruction[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('lesson_instructions')
    .select(
      'id, sport_slug, display_order, name, description, difficulty, instructions',
    )
    .order('sport_slug', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    log.warn('lesson_instructions fetch başarısız', { cause: error.message });
    return [];
  }
  return (data ?? []).map((row) => rowToLesson(row as LessonInstructionRow));
}

const getAllLessonInstructionsCached = unstable_cache(
  fetchAllLessonInstructions,
  ['content', 'lesson_instructions'],
  { revalidate: REVALIDATE_SECONDS, tags: ['content:lessons'] },
);

export async function getLessonInstructions(): Promise<
  ReadonlyMap<string, LessonInstruction>
> {
  const list = await getAllLessonInstructionsCached();
  const map = new Map<string, LessonInstruction>();
  for (const l of list) map.set(l.id, l);
  return map;
}

export async function getLessonInstruction(
  id: string,
): Promise<LessonInstruction | null> {
  const list = await getAllLessonInstructionsCached();
  return list.find((l) => l.id === id) ?? null;
}
