import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { INITIAL_TASKS } from '@/data/mock-data';
import { requireServerAuth } from '@/lib/auth';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// In-memory fallback if Supabase credentials are not connected
let memoryTasks = [...INITIAL_TASKS];

export async function GET(req: NextRequest) {
  // 1. Server-side Authentication Guard
  const authError = requireServerAuth(req);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          event_id,
          title,
          status,
          priority,
          notes,
          due_date,
          created_at,
          updated_at,
          song_events (
            id,
            song_title,
            movie_or_artist,
            language,
            thumbnail,
            link
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          column: t.status,
          priority: t.priority,
          notes: t.notes || '',
          associatedEventId: t.event_id,
          eventSongTitle: t.song_events?.song_title,
          eventMovieTitle: t.song_events?.movie_or_artist,
          language: t.song_events?.language,
          dueDate: t.due_date,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        return NextResponse.json(formatted, { headers: noStoreHeaders });
      }
    } catch {
      // Fallback
    }
  }

  return NextResponse.json(memoryTasks, { headers: noStoreHeaders });
}

export async function POST(req: NextRequest) {
  // 1. Server-side Authentication Guard
  const authError = requireServerAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { title, status = 'todo', priority = 'medium', notes = '', event_id } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const validStatuses = ['todo', 'lyrics_found', 'translating', 'synced', 'submitted', 'done'];
    const taskStatus = validStatuses.includes(status) ? status : 'todo';

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title,
            event_id: event_id || null,
            status: taskStatus,
            priority,
            notes,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json(data, { status: 201, headers: noStoreHeaders });
        }
      } catch {
        // Fallback to memory
      }
    }

    const newTask = {
      id: `tsk-${Date.now()}`,
      title,
      column: taskStatus as any,
      status: taskStatus as any,
      priority: priority as any,
      notes,
      associatedEventId: event_id,
      dueDate: 'Today',
      tags: [],
    };
    memoryTasks = [newTask, ...memoryTasks];
    return NextResponse.json(newTask, { status: 201, headers: noStoreHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Invalid task body' },
      { status: 400, headers: noStoreHeaders }
    );
  }
}
