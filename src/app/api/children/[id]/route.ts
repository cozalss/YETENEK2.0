/**
 * GET /api/children/[id] — auth'lı kullanıcının çocuk detayı.
 *
 * Client side test sayfası bu endpoint'i çağırarak child bilgisini alır
 * ve sessionStore'u başlatır. RLS sayesinde kullanıcı sadece kendi
 * çocuğunu okuyabilir; yanlış id 404 döner.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { supabaseChildRepository } from '@/infrastructure/storage/supabase-child-repository';
import { makeChildId } from '@/core/types/branded';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const result = await supabaseChildRepository.get(makeChildId(id));

  if (!result.ok) {
    if (result.error.kind === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (result.error.kind === 'not-found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ child: result.value });
}
