/**
 * Çocuk profillerini localStorage'da tutan offline-first adapter.
 *
 * Supabase yapılandırılmamışsa veya kullanıcı login değilse bu adapter
 * devreye girer. UI hep aynı port arayüzünü görür. Migration: Supabase
 * gelince `migrateLocalChildrenToRemote()` ile bulut'a aktarılabilir.
 *
 * KVKK: Tüm veri tarayıcıda; sunucuya hiç gitmez. Tarayıcı temizlenirse
 * silinir.
 */

import { childInputSchema, childRecordSchema } from '@/core/schemas/child.schema';
import type { ChildInput, ChildRecord } from '@/core/schemas/child.schema';
import type { ChildRepository, ChildError } from '@/core/ports/child-repository';
import { generateChildId, type ChildId } from '@/core/types/branded';
import type { Result } from '@/core/types/result';
import { logger } from '@/shared/logger/logger';

// Result tipi `Result<T, AppError>` default; ChildError için inline
// helper'lar — `err()` constructor sadece AppError extend ediyor.
function ok<T>(value: T): Result<T, ChildError> {
  return { ok: true, value };
}
function fail(error: ChildError): Result<never, ChildError> {
  return { ok: false, error };
}

const STORAGE_KEY = 'yetenek:children:v1';
const log = logger.child('local-child-repo');

function readAll(): ChildRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ChildRecord[] = [];
    for (const item of parsed) {
      const p = childRecordSchema.safeParse(item);
      if (p.success) out.push(p.data);
    }
    return out;
  } catch (e) {
    log.warn('children parse hatası', {
      cause: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

function writeAll(records: ChildRecord[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    log.warn('children yazma başarısız', {
      cause: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

function unauthorized(): { kind: 'unauthorized' } {
  return { kind: 'unauthorized' };
}

export const localChildRepository: ChildRepository = {
  async list(): Promise<Result<ReadonlyArray<ChildRecord>, ChildError>> {
    return ok(readAll());
  },

  async get(id: ChildId): Promise<Result<ChildRecord, ChildError>> {
    const found = readAll().find((c) => c.id === id);
    if (!found) return fail({ kind: 'not-found', childId: id });
    return ok(found);
  },

  async create(input: ChildInput): Promise<Result<ChildRecord, ChildError>> {
    const parsed = childInputSchema.safeParse(input);
    if (!parsed.success) {
      return fail({
        kind: 'validation',
        message: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
    }
    const records = readAll();
    const record: ChildRecord = {
      ...parsed.data,
      id: generateChildId(),
      createdAt: new Date().toISOString(),
      sessionCount: 0,
    };
    records.unshift(record);
    if (!writeAll(records)) {
      return fail({ kind: 'storage', message: 'localStorage yazılamadı.' });
    }
    return ok(record);
  },

  async update(
    id: ChildId,
    patch: Partial<ChildInput>,
  ): Promise<Result<ChildRecord, ChildError>> {
    const records = readAll();
    const idx = records.findIndex((c) => c.id === id);
    if (idx === -1) return fail({ kind: 'not-found', childId: id });
    const merged = { ...records[idx], ...patch };
    const parsed = childRecordSchema.safeParse(merged);
    if (!parsed.success) {
      return fail({
        kind: 'validation',
        message: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
    }
    records[idx] = parsed.data;
    if (!writeAll(records)) {
      return fail({ kind: 'storage', message: 'localStorage yazılamadı.' });
    }
    return ok(parsed.data);
  },

  async remove(id: ChildId): Promise<Result<void, ChildError>> {
    const records = readAll();
    const filtered = records.filter((c) => c.id !== id);
    if (filtered.length === records.length) {
      return fail({ kind: 'not-found', childId: id });
    }
    if (!writeAll(filtered)) {
      return fail({ kind: 'storage', message: 'localStorage yazılamadı.' });
    }
    return ok(undefined);
  },
};

/** Auth zorunlu uygulama akışı için unauth user'da çağrılırsa kullanılan no-op. */
export const unauthorizedChildRepository: ChildRepository = {
  list: async () => fail(unauthorized()),
  get: async () => fail(unauthorized()),
  create: async () => fail(unauthorized()),
  update: async () => fail(unauthorized()),
  remove: async () => fail(unauthorized()),
};

/** Helper: lokal kayıtları döndürür (auth sonrası Supabase'e migrate için). */
export function readLocalChildren(): ChildRecord[] {
  return readAll();
}
