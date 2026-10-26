'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  LayoutGrid,
  Download,
  CheckSquare,
  ArrowUpDown,
  Eye,
  Columns3,
  Search,
  ExternalLink,
  Copy,
  Zap,
  Clock,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { StateBadge, DemoBadge } from '@/components/atomic/Badge';
import { LanguageChip } from '@/components/atomic/LanguageChip';
import { TierBadge } from '@/components/atomic/TierBadge';
import { Button } from '@/components/atomic/Button';
import { ContextMenu } from '@/components/atomic/ContextMenu';
import { exportEventsToCSV, exportEventsToJSON } from '@/utils/export';
import { MusicEvent, Language, Tier, SCRIPT_CONFIGS } from '@/types';
import { formatIST, formatRelativeIST } from '@/utils/date';

type SortColumn = 'releaseTime' | 'songTitle' | 'movieTitle' | 'language' | 'tier' | 'confidence';

export function DenseTableDesktop() {
  const { events, setActiveEventId, bulkAddEventsToTasks, showToast } = useData();

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<SortColumn>('releaseTime');
  const [sortAsc, setSortAsc] = useState(false);

  // Column visibility
  const [visibleCols, setVisibleCols] = useState({
    time: true,
    song: true,
    movie: true,
    language: true,
    tier: true,
    state: true,
    confidence: true,
    actions: true,
  });

  const [colMenuOpen, setColMenuOpen] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    event: MusicEvent | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    event: null,
  });

  const releasedEvents = useMemo(() => {
    return events.filter(
      e => e.state === 'released' || e.state === 'unannounced_drop' || e.state === 'live_on_dsp'
    );
  }, [events]);

  const filteredAndSorted = useMemo(() => {
    let result = releasedEvents.filter(
      e =>
        e.songTitle.toLowerCase().includes(search.toLowerCase()) ||
        (e.movieTitle || e.movie_or_artist || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.composer || e.music_director || '').toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortCol === 'releaseTime') {
        const timeA = new Date(a.date_time_ist || a.releaseTime).getTime();
        const timeB = new Date(b.date_time_ist || b.releaseTime).getTime();
        return sortAsc ? timeA - timeB : timeB - timeA;
      }

      let aVal = a[sortCol];
      let bVal = b[sortCol];

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal as string);
        return sortAsc ? cmp : -cmp;
      }
      if (typeof aVal === 'number') {
        return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
      return 0;
    });

    return result;
  }, [releasedEvents, search, sortCol, sortAsc]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAndSorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSorted.map(e => e.id));
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortAsc(prev => !prev);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const handleBulkAddToTasks = () => {
    bulkAddEventsToTasks(selectedIds);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const subset = events.filter(e => selectedIds.includes(e.id));
    exportEventsToCSV(subset.length > 0 ? subset : releasedEvents);
    showToast(`Exported ${subset.length > 0 ? subset.length : releasedEvents.length} items to CSV`);
  };

  const handleExportJSON = () => {
    const subset = events.filter(e => selectedIds.includes(e.id));
    exportEventsToJSON(subset.length > 0 ? subset : releasedEvents);
    showToast(`Exported ${subset.length > 0 ? subset.length : releasedEvents.length} items to JSON`);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Top Toolbar */}
      <div className="bg-surface border-b border-surface-border px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search released catalog..."
              className="w-full pl-9 pr-3 py-1.5 bg-surface-elevated text-xs text-foreground placeholder:text-text-muted rounded-lg border border-surface-border focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-brand-500/15 border border-brand-500/40 px-3 py-1 rounded-lg text-xs font-semibold text-brand-300 animate-in fade-in">
              <span>{selectedIds.length} selected</span>
              <Button size="sm" variant="primary" onClick={handleBulkAddToTasks} icon={CheckSquare}>
                Add to Tasks
              </Button>
            </div>
          )}

          {/* Export Dropdown */}
          <Button size="sm" variant="outline" onClick={handleExportCSV} icon={Download}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportJSON}>
            Export JSON
          </Button>

          {/* Column Visibility Menu */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              icon={Columns3}
              onClick={() => setColMenuOpen(prev => !prev)}
            >
              Columns
            </Button>
            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-surface-border rounded-lg shadow-xl p-3 z-30 space-y-2 text-xs">
                <div className="font-bold text-text-muted uppercase text-[10px] pb-1 border-b border-surface-border">
                  Toggle Columns
                </div>
                {Object.keys(visibleCols).map(k => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer capitalize">
                    <input
                      type="checkbox"
                      checked={visibleCols[k as keyof typeof visibleCols]}
                      onChange={e =>
                        setVisibleCols(prev => ({ ...prev, [k]: e.target.checked }))
                      }
                      className="rounded border-surface-border accent-brand-500"
                    />
                    <span>{k}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Table vs Cards */}
          <div className="flex items-center rounded-lg border border-surface-border bg-surface-elevated p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-foreground'}`}
              title="Dense Table View"
              aria-label="Dense Table View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-foreground'}`}
              title="Card Grid View"
              aria-label="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Table or Cards */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'table' ? (
          <table className="w-full text-left border-collapse text-xs">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-20 bg-surface-elevated border-b border-surface-border text-text-muted select-none">
              <tr>
                <th className="py-2.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length > 0 && selectedIds.length === filteredAndSorted.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-surface-border accent-brand-500 cursor-pointer"
                    aria-label="Select all rows"
                  />
                </th>
                {visibleCols.time && (
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('releaseTime')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Release Time</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleCols.song && (
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('songTitle')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Song Title</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleCols.movie && (
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('movieTitle')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Movie & Composer</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleCols.language && (
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('language')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Language</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleCols.tier && (
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('tier')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tier</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleCols.state && (
                  <th className="py-2.5 px-4 font-semibold">State</th>
                )}
                {visibleCols.confidence && (
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('confidence')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Confidence</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleCols.actions && (
                  <th className="py-2.5 px-4 text-right font-semibold">Quick Actions</th>
                )}
              </tr>
            </thead>

            {/* Table Body with Hover States & Right Click */}
            <tbody className="divide-y divide-surface-border/50 text-foreground">
              {filteredAndSorted.map(event => {
                const isSelected = selectedIds.includes(event.id);
                const eventTime = event.date_time_ist || event.releaseTime;
                const isSurpriseDrop = event.isNewDrop || event.state === 'unannounced_drop';

                return (
                  <tr
                    key={event.id}
                    onClick={() => setActiveEventId(event.id)}
                    onContextMenu={e => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        event,
                      });
                    }}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-500/10'
                        : 'hover:bg-surface-elevated/70'
                    }`}
                  >
                    <td className="py-2.5 px-4" onClick={e => handleSelectRow(event.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-surface-border accent-brand-500 cursor-pointer"
                        aria-label={`Select ${event.songTitle}`}
                      />
                    </td>

                    {visibleCols.time && (
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground text-xs">
                          {formatRelativeIST(eventTime)}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {formatIST(eventTime)}
                        </div>
                      </td>
                    )}

                    {visibleCols.song && (
                      <td className="py-2.5 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.thumbnail}
                            alt=""
                            className="w-7 h-7 rounded object-cover shrink-0"
                          />
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate max-w-[180px]">{event.songTitle}</span>
                            {isSurpriseDrop && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                                <Zap className="w-2.5 h-2.5 fill-rose-300" />
                                Surprise Drop
                              </span>
                            )}
                            {event.is_demo && <DemoBadge size="sm" />}
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleCols.movie && (
                      <td className="py-2.5 px-4 text-text-secondary">
                        <div className="truncate max-w-[180px]">
                          {event.movieTitle || event.movie_or_artist} • <span className="text-text-muted">{event.composer || event.music_director}</span>
                        </div>
                      </td>
                    )}

                    {visibleCols.language && (
                      <td className="py-2.5 px-4">
                        <LanguageChip language={event.language} showNative={true} size="sm" />
                      </td>
                    )}

                    {visibleCols.tier && (
                      <td className="py-2.5 px-4">
                        <TierBadge tier={event.tier} size="sm" />
                      </td>
                    )}

                    {visibleCols.state && (
                      <td className="py-2.5 px-4">
                        <StateBadge state={event.state} size="sm" pulse={false} />
                      </td>
                    )}

                    {visibleCols.confidence && (
                      <td className="py-2.5 px-4 font-semibold text-emerald-400">
                        {typeof event.confidence === 'number' ? `${event.confidence}%` : event.confidence}
                      </td>
                    )}

                    {visibleCols.actions && (
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              const url = event.youtubeUrl || event.link;
                              if (url) window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="p-1 hover:text-brand-400 text-text-muted rounded"
                            title="Open YouTube"
                            aria-label="Open YouTube"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              const langName = SCRIPT_CONFIGS[event.language]?.name || event.language;
                              const meta = [
                                `Title: ${event.songTitle}`,
                                `Movie / Artist: ${event.movieTitle || event.movie_or_artist}`,
                                `Language: ${langName}`,
                                `Singers: ${event.singers?.length ? event.singers.join(', ') : 'TBA'}`,
                                `Music Director: ${event.composer || event.music_director || 'TBA'}`,
                                `Lyricist: ${event.lyricist || 'TBA'}`,
                                `Release Date / Time (IST): ${formatIST(eventTime)}`,
                                `State: ${event.state.toUpperCase()}`,
                                `Links: ${event.youtubeUrl || event.link || 'TBA'}`,
                              ].join('\n');
                              navigator.clipboard.writeText(meta);
                              showToast('Copied metadata block');
                            }}
                            className="p-1 hover:text-cyan-400 text-text-muted rounded"
                            title="Copy Metadata"
                            aria-label="Copy Metadata"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Card Grid Alternative View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSorted.map(event => {
              const eventTime = event.date_time_ist || event.releaseTime;
              const isSurpriseDrop = event.isNewDrop || event.state === 'unannounced_drop';

              return (
                <div
                  key={event.id}
                  onClick={() => setActiveEventId(event.id)}
                  className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 hover:border-brand-500/50 transition-all cursor-pointer shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="w-full h-36 rounded-lg overflow-hidden bg-surface-subtle mb-3 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.thumbnail} alt={event.songTitle} className="w-full h-full object-cover" />
                      {isSurpriseDrop && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/90 text-white shadow-md backdrop-blur-sm">
                          <Zap className="w-3 h-3 fill-white" />
                          Surprise Drop
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <StateBadge state={event.state} size="sm" pulse={false} />
                      <LanguageChip language={event.language} showNative={false} size="sm" />
                      <TierBadge tier={event.tier} size="sm" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground truncate">{event.songTitle}</h3>
                    <p className="text-xs text-text-secondary truncate">{event.movieTitle || event.movie_or_artist} • {event.composer || event.music_director}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-surface-border/60 flex items-center justify-between text-xs text-text-muted">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                      <Clock className="w-3 h-3 text-brand-400" />
                      {formatRelativeIST(eventTime)}
                    </span>
                    <span className="text-[10px] font-mono">{formatIST(eventTime).split(',')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          event={contextMenu.event}
          onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}
