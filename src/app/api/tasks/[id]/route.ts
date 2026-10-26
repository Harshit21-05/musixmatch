import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireServerAuth } from '@/lib/auth';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Server-side Authentication Guard
  const authError = requireServerAuth(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const body = await req.json();
    const { status, notes, priority, title } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const validStatuses = ['todo', 'lyrics_found', 'translating', 'synced', 'submitted', 'done'];
    if (status && validStatuses.includes(status)) {
      updates.status = status;
    }
    if (typeof notes === 'string') updates.notes = notes;
    if (priority) updates.priority = priority;
    if (title) updates.title = title;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json(data, { headers: noStoreHeaders });
        }
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({ id, ...updates, success: true }, { headers: noStoreHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error updating task' },
      { status: 400, headers: noStoreHeaders }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Server-side Authentication Guard
  const authError = requireServerAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('tasks').delete().eq('id', id);
    } catch {
      // Fallback
    }
  }

  return NextResponse.json({ success: true, id }, { headers: noStoreHeaders });
}
