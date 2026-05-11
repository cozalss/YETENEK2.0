/**
 * Child repository port — domain'in çocuk verisi sözleşmesi.
 *
 * Adapter olarak Supabase (online auth'lı kullanıcı) veya localStorage
 * (anonim demo) kullanılabilir. UI bu port'la konuşur, hangi adapter
 * olduğunu bilmez.
 */

import type { ChildId } from '@/core/types/branded';
import type { ChildInput, ChildRecord } from '@/core/schemas/child.schema';
import type { Result } from '@/core/types/result';

export type ChildError =
  | { kind: 'not-found'; childId: ChildId }
  | { kind: 'unauthorized' }
  | { kind: 'validation'; message: string }
  | { kind: 'storage'; message: string };

export interface ChildRepository {
  list(): Promise<Result<ReadonlyArray<ChildRecord>, ChildError>>;
  get(id: ChildId): Promise<Result<ChildRecord, ChildError>>;
  create(input: ChildInput): Promise<Result<ChildRecord, ChildError>>;
  update(
    id: ChildId,
    patch: Partial<ChildInput>,
  ): Promise<Result<ChildRecord, ChildError>>;
  remove(id: ChildId): Promise<Result<void, ChildError>>;
}
