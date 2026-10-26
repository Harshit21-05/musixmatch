'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Languages,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { TaskColumn, TaskItem } from '@/types';
import { Button } from '@/components/atomic/Button';
import { LanguageChip } from '@/components/atomic/LanguageChip';

export const KANBAN_COLUMNS: {
  id: TaskColumn;
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    id: 'todo',
    label: 'To Do',
    color: 'border-slate-500/40 text-slate-400',
    badgeBg: 'bg-slate-500/10',
    badgeText: 'text-slate-300',
  },
  {
    id: 'lyrics_found',
    label: 'Lyrics Found',
    color: 'border-blue-500/40 text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-300',
  },
  {
    id: 'translating',
    label: 'Translating',
    color: 'border-amber-500/40 text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-300',
  },
  {
    id: 'synced',
    label: 'Synced',
    color: 'border-indigo-500/40 text-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-300',
  },
  {
    id: 'submitted',
    label: 'Submitted',
    color: 'border-purple-500/40 text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-300',
  },
  {
    id: 'done',
    label: 'Done',
    color: 'border-emerald-500/40 text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-300',
  },
];

export function KanbanDesktop() {
  const { tasks, moveTask, updateTaskNotes, addTask, deleteTask } = useData();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesBuffer, setNotesBuffer] = useState<string>('');

  // Quick add state
  const [newTaskCol, setNewTaskCol] = useState<TaskColumn | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCol: TaskColumn) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      moveTask(taskId, targetCol);
    }
    setDraggedTaskId(null);
  };

  // Move task via keyboard/click across column order
  const handleMoveStep = (task: TaskItem, direction: 'prev' | 'next') => {
    const colOrder: TaskColumn[] = ['todo', 'lyrics_found', 'translating', 'synced', 'submitted', 'done'];
    const currentCol = task.column || (task.status as TaskColumn) || 'todo';
    const currentIndex = colOrder.indexOf(currentCol);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < colOrder.length) {
      moveTask(task.id, colOrder[targetIndex]);
    }
  };

  const handleCreateTask = async (col: TaskColumn) => {
    if (!newTaskTitle.trim()) return;
    await addTask({
      title: newTaskTitle.trim(),
      column: col,
      priority: 'medium',
      tags: ['Manual'],
    });
    setNewTaskTitle('');
    setNewTaskCol(null);
  };

  const startEditingNotes = (task: TaskItem) => {
    setEditingNotesId(task.id);
    setNotesBuffer(task.notes || '');
  };

  const saveNotes = async (taskId: string) => {
    await updateTaskNotes(taskId, notesBuffer);
    setEditingNotesId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Top Header */}
      <div className="bg-surface border-b border-surface-border px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>Personal Pipeline</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {tasks.length} Active Tasks
            </span>
          </h1>
          <p className="text-xs text-text-muted">
            Drag cards, use keyboard arrows, or tap next/prev to progress across stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() => setNewTaskCol('todo')}
            className="text-xs"
          >
            New Task
          </Button>
        </div>
      </div>

      {/* 6-Column Kanban Board */}
      <div className="flex-1 p-4 overflow-x-auto overflow-y-hidden flex gap-3.5">
        {KANBAN_COLUMNS.map((col, colIdx) => {
          const colTasks = tasks.filter(t => (t.column || t.status) === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
              className="w-72 shrink-0 bg-surface rounded-xl border border-surface-border flex flex-col overflow-hidden"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-surface-border flex items-center justify-between bg-surface-elevated/40">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full border ${col.color}`} />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {col.label}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText}`}
                  >
                    {colTasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewTaskCol(col.id)}
                    className="p-1 hover:text-foreground text-text-muted rounded hover:bg-surface"
                    title={`Add task to ${col.label}`}
                    aria-label={`Add task to ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column Tasks List */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                {/* Quick Add Form */}
                {newTaskCol === col.id && (
                  <div className="p-3 bg-surface-elevated rounded-xl border border-brand-500 space-y-2 shadow-lg animate-in fade-in">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="Task description..."
                      className="w-full text-xs px-2.5 py-1.5 bg-surface rounded-lg border border-surface-border text-foreground focus:outline-none focus:border-brand-500"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateTask(col.id);
                        if (e.key === 'Escape') setNewTaskCol(null);
                      }}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setNewTaskCol(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => handleCreateTask(col.id)}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {colTasks.length === 0 && newTaskCol !== col.id && (
                  <div className="text-center py-10 text-[11px] text-text-muted border border-dashed border-surface-border/60 rounded-xl p-4">
                    No tasks in {col.label.toLowerCase()}
                  </div>
                )}

                {colTasks.map(task => {
                  const isBeingEdited = editingNotesId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          handleMoveStep(task, 'next');
                        } else if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          handleMoveStep(task, 'prev');
                        }
                      }}
                      className="p-3 rounded-xl bg-surface-elevated border border-surface-border hover:border-brand-500/50 transition-all shadow-sm cursor-grab active:cursor-grabbing group focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {/* Task Header & Quick Move Buttons */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            task.priority === 'high'
                              ? 'bg-rose-500/15 text-rose-400'
                              : task.priority === 'medium'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-blue-500/15 text-blue-400'
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Keyboard-accessible move buttons */}
                        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {colIdx > 0 && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleMoveStep(task, 'prev');
                              }}
                              className="p-1 hover:bg-surface rounded text-text-muted hover:text-foreground"
                              title="Move to previous stage (Left Arrow)"
                              aria-label="Move to previous stage"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {colIdx < KANBAN_COLUMNS.length - 1 && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleMoveStep(task, 'next');
                              }}
                              className="p-1 hover:bg-surface rounded text-text-muted hover:text-foreground"
                              title="Move to next stage (Right Arrow)"
                              aria-label="Move to next stage"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-bold text-foreground leading-snug">
                        {task.title}
                      </h3>

                      {/* Associated Event Info */}
                      {task.eventMovieTitle && (
                        <p className="text-[11px] text-text-muted truncate mt-1">
                          {task.eventMovieTitle}
                        </p>
                      )}

                      {/* Notes Section */}
                      <div className="mt-2.5 pt-2 border-t border-surface-border/60">
                        {isBeingEdited ? (
                          <div className="space-y-1.5">
                            <textarea
                              value={notesBuffer}
                              onChange={e => setNotesBuffer(e.target.value)}
                              placeholder="Add workflow notes / lyrics link..."
                              rows={2}
                              className="w-full text-[11px] p-2 bg-surface rounded border border-surface-border text-foreground focus:outline-none focus:border-brand-500 resize-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingNotesId(null)}
                                className="px-2 py-0.5 rounded text-[10px] text-text-muted hover:text-foreground"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveNotes(task.id)}
                                className="px-2 py-0.5 rounded text-[10px] bg-brand-600 text-white font-bold"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={e => {
                              e.stopPropagation();
                              startEditingNotes(task);
                            }}
                            className="cursor-pointer group/notes flex items-start gap-1.5 text-[10px] text-text-muted hover:text-foreground"
                            title="Click to edit notes"
                          >
                            <FileText className="w-3 h-3 text-brand-400 mt-0.5 shrink-0" />
                            <span className="truncate flex-1">
                              {task.notes ? task.notes : 'Click to add notes...'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Delete Task action */}
                      <div className="mt-2 pt-1.5 flex items-center justify-between text-[10px] text-text-muted border-t border-surface-border/40">
                        <span className="font-mono">{task.dueDate || 'Active'}</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          className="p-1 hover:text-rose-400 text-text-muted rounded"
                          title="Delete task"
                          aria-label="Delete task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
