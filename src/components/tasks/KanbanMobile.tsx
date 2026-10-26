'use client';

import React, { useState } from 'react';
import {
  Plus,
  CheckSquare,
  FileText,
  ChevronRight,
  Trash2,
  X,
  Languages,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { TaskColumn, TaskItem } from '@/types';
import { BottomSheet } from '@/components/atomic/BottomSheet';
import { Button } from '@/components/atomic/Button';
import { KANBAN_COLUMNS } from './KanbanDesktop';

export function KanbanMobile() {
  const { tasks, moveTask, updateTaskNotes, addTask, deleteTask } = useData();
  const [activeCol, setActiveCol] = useState<TaskColumn>('todo');
  const [statusPickerTask, setStatusPickerTask] = useState<TaskItem | null>(null);
  const [notesModalTask, setNotesModalTask] = useState<TaskItem | null>(null);
  const [notesBuffer, setNotesBuffer] = useState('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const currentColumnTasks = tasks.filter(t => (t.column || t.status) === activeCol);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle.trim(),
      column: activeCol,
      priority: 'medium',
      tags: ['Manual'],
    });
    setNewTitle('');
    setNewTaskOpen(false);
  };

  const handleStatusChange = async (targetCol: TaskColumn) => {
    if (!statusPickerTask) return;
    await moveTask(statusPickerTask.id, targetCol);
    setStatusPickerTask(null);
  };

  const openNotesModal = (task: TaskItem) => {
    setNotesModalTask(task);
    setNotesBuffer(task.notes || '');
  };

  const saveNotesModal = async () => {
    if (!notesModalTask) return;
    await updateTaskNotes(notesModalTask.id, notesBuffer);
    setNotesModalTask(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-foreground">Pipeline Tasks</h1>
          <p className="text-xs text-text-muted">Single Column View</p>
        </div>

        <button
          type="button"
          onClick={() => setNewTaskOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold min-h-[44px] shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Swipeable 6-Column Tabs Row */}
      <div className="flex items-center gap-1 p-2 bg-surface border-b border-surface-border overflow-x-auto no-scrollbar">
        {KANBAN_COLUMNS.map(col => {
          const count = tasks.filter(t => (t.column || t.status) === col.id).length;
          const isActive = activeCol === col.id;

          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveCol(col.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-surface-elevated text-text-muted hover:text-foreground border border-surface-border'
              }`}
            >
              <span>{col.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-white/25 text-white' : 'bg-surface text-text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Column Tasks Feed */}
      <div className="p-4 space-y-3">
        {currentColumnTasks.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-xs bg-surface-elevated/40 rounded-xl border border-dashed border-surface-border p-6">
            No tasks in this stage. Tap &quot;+ Add Task&quot; to queue a new one.
          </div>
        ) : (
          currentColumnTasks.map(task => (
            <div
              key={task.id}
              className="bg-surface-elevated border border-surface-border rounded-xl p-3.5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    task.priority === 'high'
                      ? 'bg-rose-500/15 text-rose-400'
                      : task.priority === 'medium'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-blue-500/15 text-blue-400'
                  }`}
                >
                  {task.priority}
                </span>

                <button
                  type="button"
                  onClick={() => setStatusPickerTask(task)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs font-semibold text-brand-400 min-h-[36px]"
                >
                  <span>Change Status</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-sm font-bold text-foreground">{task.title}</h3>

              {task.eventMovieTitle && (
                <p className="text-xs text-text-muted">{task.eventMovieTitle}</p>
              )}

              {/* Notes Preview & Editor Button */}
              <div
                onClick={() => openNotesModal(task)}
                className="p-2.5 rounded-lg bg-surface border border-surface-border/60 text-xs text-text-secondary cursor-pointer flex items-start gap-2 hover:border-brand-500/50"
              >
                <FileText className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <p className="truncate flex-1">
                  {task.notes ? task.notes : 'Tap to add notes, lyrics, or translation cues...'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-surface-border/40 text-xs text-text-muted">
                <span className="font-mono text-[11px]">{task.dueDate || 'Active'}</span>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="p-2 text-text-muted hover:text-rose-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Picker Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(statusPickerTask)}
        onClose={() => setStatusPickerTask(null)}
        title="Move Task Stage"
      >
        <div className="space-y-2 p-1">
          <p className="text-xs text-text-muted mb-3 truncate">
            Moving: <strong className="text-foreground">{statusPickerTask?.title}</strong>
          </p>
          {KANBAN_COLUMNS.map(col => {
            const isCurrent = (statusPickerTask?.column || statusPickerTask?.status) === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleStatusChange(col.id)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between min-h-[48px] ${
                  isCurrent
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface text-foreground hover:bg-surface-subtle'
                }`}
              >
                <span>{col.label}</span>
                {isCurrent && <span className="text-xs">Current</span>}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Notes Editor Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(notesModalTask)}
        onClose={() => setNotesModalTask(null)}
        title="Task Notes"
      >
        <div className="space-y-3 p-1">
          <p className="text-xs text-text-muted">
            Workflow notes and lyrics reference for:{' '}
            <strong className="text-foreground">{notesModalTask?.title}</strong>
          </p>
          <textarea
            value={notesBuffer}
            onChange={e => setNotesBuffer(e.target.value)}
            placeholder="Enter notes, verification timestamps, or translation drafts..."
            rows={4}
            className="w-full text-xs p-3 bg-surface rounded-xl border border-surface-border text-foreground focus:outline-none focus:border-brand-500 resize-none"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px]"
              onClick={() => setNotesModalTask(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 min-h-[44px]"
              onClick={saveNotesModal}
            >
              Save Notes
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Add Task Bottom Sheet */}
      <BottomSheet
        isOpen={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        title={`Add Task in ${KANBAN_COLUMNS.find(c => c.id === activeCol)?.label}`}
      >
        <form onSubmit={handleCreateTask} className="space-y-3 p-1">
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1 block">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Find official lyrics for Daavudi"
              className="w-full px-3 py-2 bg-surface border border-surface-border rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500 min-h-[44px]"
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-[44px]"
              onClick={() => setNewTaskOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1 min-h-[44px]">
              Create
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
