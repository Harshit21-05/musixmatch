'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  MusicEvent,
  TaskItem,
  WatchlistItem,
  CollectorHealth,
  TaskColumn,
  Tier,
  EventState,
  Language,
} from '@/types';
import { soundManager } from '@/utils/sound';
import { triggerHaptic } from '@/utils/haptics';
import { getSupabaseClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-client';
import {
  INITIAL_EVENTS,
  INITIAL_TASKS,
  INITIAL_WATCHLIST,
  INITIAL_COLLECTORS,
} from '@/data/mock-data';

interface FilterState {
  search: string;
  languages: Language[];
  tiers: Tier[];
  states: EventState[];
}

interface DataContextValue {
  events: MusicEvent[];
  rawEvents: MusicEvent[];
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
  activeEvent: MusicEvent | null;
  tasks: TaskItem[];
  moveTask: (taskId: string, targetColumn: TaskColumn) => Promise<void>;
  updateTaskNotes: (taskId: string, notes: string) => Promise<void>;
  addTask: (task: Omit<TaskItem, 'id'>) => Promise<void>;
  addEventToTasks: (event: MusicEvent) => void;
  bulkAddEventsToTasks: (eventIds: string[]) => void;
  deleteTask: (taskId: string) => Promise<void>;
  watchlist: WatchlistItem[];
  toggleWatchlistAlert: (id: string) => void;
  collectors: CollectorHealth[];
  refreshCollector: (id: string) => void;
  nextUpEvent: MusicEvent | null;
  triggerSimulatedDrop: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  newDropEventId: string | null;
  hideDemo: boolean;
  setHideDemo: (hide: boolean) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [rawEvents, setEvents] = useState<MusicEvent[]>(INITIAL_EVENTS);
  const [activeEventId, setActiveEventId] = useState<string | null>('evt-1');
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(INITIAL_WATCHLIST);
  const [collectors, setCollectors] = useState<CollectorHealth[]>(INITIAL_COLLECTORS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newDropEventId, setNewDropEventId] = useState<string | null>(null);
  const [hideDemo, setHideDemoState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mxm_hide_demo') === 'true';
    }
    return false;
  });

  const setHideDemo = (val: boolean) => {
    setHideDemoState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mxm_hide_demo', String(val));
    }
  };

  const events = useMemo(() => {
    if (!hideDemo) return rawEvents;
    return rawEvents.filter(e => !e.is_demo);
  }, [rawEvents, hideDemo]);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    languages: [],
    tiers: [],
    states: [],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    triggerHaptic('light');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to format backend DB/Ingest rows into MusicEvent
  const formatDbRowToMusicEvent = (row: Record<string, unknown>): MusicEvent => {
    const rawConf = row.confidence;
    const numConf =
      typeof rawConf === 'number'
        ? rawConf
        : rawConf === 'high'
        ? 95
        : rawConf === 'medium'
        ? 75
        : 45;

    return {
      id: String(row.id),
      dedup_key: String(row.dedup_key || ''),
      songTitle: String(row.song_title || row.songTitle || 'Untitled Track'),
      movieTitle: String(row.movie_or_artist || row.movieTitle || 'Independent'),
      language: (row.language as Language) || 'en',
      tier: (Number(row.tier) || 2) as Tier,
      state: (row.state as EventState) || 'announced',
      releaseTime: String(row.date_time_ist || row.releaseTime || new Date().toISOString()),
      date_time_ist: row.date_time_ist ? String(row.date_time_ist) : null,
      confidence: numConf,
      youtubeUrl: String(row.link || row.youtubeUrl || 'https://youtube.com'),
      thumbnail: String(
        row.thumbnail ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'
      ),
      singers: Array.isArray(row.singers) ? (row.singers as string[]) : [],
      composer: String(row.music_director || row.composer || 'TBA'),
      lyricist: String(row.lyricist || 'TBA'),
      recordLabel: String(row.source || row.recordLabel || 'Official Channel'),
      hypeScore: Number(row.hype_score || row.hypeScore || 85),
      isNewDrop: Boolean(row.is_new_drop || row.isNewDrop || row.state === 'unannounced_drop'),
      timeline: (row.timeline as any) || [
        { time: 'Initial', label: 'Detected by radar automation', status: 'done' },
      ],
      sources: (row.sources as any) || [
        {
          source: String(row.source || 'Scout'),
          source_url: String(row.source_url || ''),
          confidence: 'high',
          updated: 'Recently',
        },
      ],
      description: String(row.raw_note || row.description || ''),
    };
  };

  // Wire Supabase Realtime + 30s Polling Fallback
  useEffect(() => {
    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const res = await apiFetch('/api/events');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const formatted = data.map(formatDbRowToMusicEvent);
            setEvents(prev => {
              const map = new Map<string, MusicEvent>();
              prev.forEach(e => map.set(e.dedup_key || e.id, e));
              formatted.forEach(e => map.set(e.dedup_key || e.id, e));
              return Array.from(map.values());
            });
          }
        }
      } catch {
        // Fallback gracefully to memory
      }
    };

    fetchEvents();

    // Supabase Realtime on song_events table
    const supabase = getSupabaseClient();
    let channel: any = null;

    if (supabase) {
      channel = supabase
        .channel('realtime_song_events')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'song_events' },
          (payload: any) => {
            const row = payload.new || payload.old;
            if (!row) return;

            const formatted = formatDbRowToMusicEvent(row);

            setEvents(prev => {
              const existingIdx = prev.findIndex(
                e => e.id === formatted.id || (formatted.dedup_key && e.dedup_key === formatted.dedup_key)
              );
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = { ...next[existingIdx], ...formatted };
                return next;
              }
              return [formatted, ...prev];
            });

            if (payload.eventType === 'INSERT' || formatted.state === 'unannounced_drop') {
              setNewDropEventId(formatted.id);
              setActiveEventId(formatted.id);
              soundManager.playDropChime();
              triggerHaptic('heavy');
              showToast(`🚨 NEW SONG DROP: ${formatted.songTitle}!`);
              setTimeout(() => setNewDropEventId(null), 5000);
            }
          }
        )
        .subscribe();
    }

    // 30-second polling fallback
    const pollInterval = setInterval(fetchEvents, 30000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const activeEvent = useMemo(() => {
    if (!activeEventId) return null;
    return events.find(e => e.id === activeEventId) || null;
  }, [events, activeEventId]);

  const nextUpEvent = useMemo(() => {
    const upcomingEvents = events
      .filter(e => e.state === 'upcoming' || e.state === 'scheduled')
      .sort((a, b) => new Date(a.releaseTime).getTime() - new Date(b.releaseTime).getTime());
    return upcomingEvents[0] || null;
  }, [events]);

  const moveTask = async (taskId: string, targetColumn: TaskColumn) => {
    const previous = tasks.find(t => t.id === taskId);
    if (!previous) return;
    const oldCol = previous.column;

    // Optimistic update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, column: targetColumn, status: targetColumn } : t))
    );
    triggerHaptic('medium');
    showToast(`Task moved to ${targetColumn.replace('_', ' ')}`);

    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetColumn }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback on server failure
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, column: oldCol, status: oldCol } : t))
      );
      triggerHaptic('error');
      showToast('Server update failed. Rolled back task move.');
    }
  };

  const updateTaskNotes = async (taskId: string, notes: string) => {
    const previous = tasks.find(t => t.id === taskId);
    const oldNotes = previous?.notes || '';

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, notes } : t))
    );

    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      showToast('Task notes saved');
    } catch {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, notes: oldNotes } : t))
      );
      showToast('Failed to save notes. Rolled back.');
    }
  };

  const addTask = async (task: Omit<TaskItem, 'id'>) => {
    const tempId = `tsk-${Date.now()}`;
    const newTask: TaskItem = {
      ...task,
      id: tempId,
    };
    setTasks(prev => [newTask, ...prev]);
    triggerHaptic('success');
    showToast('Task added');

    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          status: task.column,
          priority: task.priority,
          notes: task.notes || '',
          event_id: task.associatedEventId,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks(prev => prev.map(t => (t.id === tempId ? { ...t, id: created.id } : t)));
      }
    } catch {
      // Keep optimistic entry locally
    }
  };

  const addEventToTasks = (event: MusicEvent) => {
    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      title: `Verify lyrics & sync: ${event.songTitle}`,
      column: 'todo',
      status: 'todo',
      priority: event.tier === 1 ? 'high' : 'medium',
      associatedEventId: event.id,
      eventSongTitle: event.songTitle,
      eventMovieTitle: event.movieTitle || event.movie_or_artist,
      language: event.language,
      assignedTo: 'Harsh',
      dueDate: 'Today',
      notes: `Movie: ${event.movieTitle || event.movie_or_artist}\nComposer: ${event.composer || event.music_director}\nSingers: ${(event.singers || []).join(', ')}`,
      tags: [event.movieTitle || event.movie_or_artist || 'General', 'Radar'],
    };
    setTasks(prev => [newTask, ...prev]);
    triggerHaptic('success');
    showToast(`Added "${event.songTitle}" to Tasks`);

    apiFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTask.title,
        status: 'todo',
        priority: newTask.priority,
        notes: newTask.notes,
        event_id: event.id,
      }),
    }).catch(() => {});
  };

  const bulkAddEventsToTasks = (eventIds: string[]) => {
    const eventsToAdd = events.filter(e => eventIds.includes(e.id));
    const newTasks: TaskItem[] = eventsToAdd.map((event, idx) => ({
      id: `tsk-${Date.now()}-${idx}`,
      title: `Track release: ${event.songTitle}`,
      column: 'todo',
      status: 'todo',
      priority: event.tier === 1 ? 'high' : 'medium',
      associatedEventId: event.id,
      eventSongTitle: event.songTitle,
      eventMovieTitle: event.movieTitle || event.movie_or_artist,
      language: event.language,
      tags: ['Bulk Ingestion', event.movieTitle || event.movie_or_artist || 'General'],
    }));

    setTasks(prev => [...newTasks, ...prev]);
    triggerHaptic('success');
    showToast(`Added ${eventsToAdd.length} events to Tasks`);
  };

  const deleteTask = async (taskId: string) => {
    const deletedTask = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    triggerHaptic('light');
    showToast('Task removed');

    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch {
      if (deletedTask) {
        setTasks(prev => [deletedTask, ...prev]);
        showToast('Failed to delete task. Rolled back.');
      }
    }
  };

  const toggleWatchlistAlert = (id: string) => {
    setWatchlist(prev =>
      prev.map(w => (w.id === id ? { ...w, alertEnabled: !w.alertEnabled } : w))
    );
    triggerHaptic('light');
  };

  const refreshCollector = (id: string) => {
    setCollectors(prev =>
      prev.map(c =>
        c.id === id
          ? {
              ...c,
              lastSync: 'Just now',
              status: 'healthy',
              itemsIngested: c.itemsIngested + Math.floor(Math.random() * 5) + 1,
            }
          : c
      )
    );
    triggerHaptic('success');
    showToast('Collector sync re-triggered');
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      languages: [],
      tiers: [],
      states: [],
    });
  };

  // STRICTLY CLIENT-SIDE ONLY: Simulated live drop trigger for Wall Mode & local preview.
  // NEVER sends network requests, NEVER calls Supabase, and NEVER writes to the database.
  const triggerSimulatedDrop = () => {
    const id = `test-drop-${Date.now()}`;
    const sampleDrops = [
      {
        song: 'Pushpa Pushpa (Reloaded)',
        movie: 'Pushpa 2: The Rule',
        native: 'పుష్ప పుష్ప',
        lang: 'te' as Language,
        composer: 'Devi Sri Prasad',
        singers: ['Nakash Aziz', 'Deepak Blue'],
      },
      {
        song: 'Golden Sparrow',
        movie: 'Nilavuku En Mel Ennadi Kobam',
        native: 'கோல்டன் ஸ்பாரோ',
        lang: 'ta' as Language,
        composer: 'GV Prakash Kumar',
        singers: ['Dhanush', 'Sublahshini'],
      },
      {
        song: 'Angaaron (The Couple Song)',
        movie: 'Pushpa 2: The Rule',
        native: 'अंगारों',
        lang: 'hi' as Language,
        composer: 'Devi Sri Prasad',
        singers: ['Shreya Ghoshal'],
      },
    ];

    const pick = sampleDrops[Math.floor(Math.random() * sampleDrops.length)];
    const newEvent: MusicEvent = {
      id,
      songTitle: `[TEST] ${pick.song}`,
      movieTitle: pick.movie,
      nativeTitle: pick.native,
      language: pick.lang,
      tier: 1,
      state: 'live',
      releaseTime: new Date().toISOString(),
      confidence: 100,
      youtubeUrl: 'https://www.youtube.com',
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      singers: pick.singers,
      composer: pick.composer,
      lyricist: 'Special Premiere',
      recordLabel: 'T-Series',
      hypeScore: 100,
      isNewDrop: true,
      is_demo: true,
      description: `⚡ [TEST SIMULATION] ${pick.song} simulated event. Local memory only.`,
      timeline: [
        { time: 'Just now', label: 'Local test drop triggered', status: 'done' },
        { time: 'Pending', label: 'Client-only state simulation', status: 'active' },
      ],
      sources: [
        { name: 'Local Test Simulator (No DB)', url: 'https://youtube.com', confidence: 100, updated: 'Just now' },
      ],
    };

    setEvents(prev => [newEvent, ...prev]);
    setActiveEventId(id);
    setNewDropEventId(id);
    soundManager.playDropChime();
    triggerHaptic('heavy');
    showToast(`🚨 [TEST SIMULATION] Dropped: ${newEvent.songTitle}`);

    // Reset drop highlight flash after 4 seconds
    setTimeout(() => {
      setNewDropEventId(null);
    }, 4000);
  };

  return (
    <DataContext.Provider
      value={{
        events,
        rawEvents,
        activeEventId,
        setActiveEventId,
        activeEvent,
        tasks,
        moveTask,
        updateTaskNotes,
        addTask,
        addEventToTasks,
        bulkAddEventsToTasks,
        deleteTask,
        watchlist,
        toggleWatchlistAlert,
        collectors,
        refreshCollector,
        nextUpEvent,
        triggerSimulatedDrop,
        filters,
        setFilters,
        resetFilters,
        toastMessage,
        showToast,
        newDropEventId,
        hideDemo,
        setHideDemo,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
