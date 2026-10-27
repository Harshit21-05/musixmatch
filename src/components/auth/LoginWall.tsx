'use client';

import React, { useState } from 'react';
import { Lock, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';

interface LoginWallProps {
  failClosed?: boolean;
}

export function LoginWall({ failClosed = false }: LoginWallProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (failClosed || !passcode.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Incorrect passcode. Please try again.');
        setSubmitting(false);
        return;
      }

      // Reload page so server validates the new cookie and renders the application
      window.location.reload();
    } catch {
      setError('Connection error verifying passcode. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 select-none">
      <div className="w-full max-w-sm bg-surface-elevated border border-surface-border rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
              failClosed
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                : 'bg-brand-500/10 border border-brand-500/30 text-brand-400 shadow-brand-500/10'
            }`}
          >
            {failClosed ? <ShieldAlert className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            {failClosed ? 'Song Radar Access Locked' : 'Song Radar Access'}
          </h2>
          <p className="text-xs text-text-muted mt-1.5 max-w-xs leading-relaxed">
            {failClosed
              ? 'Production security error: Passcode is not configured.'
              : 'Enter the shared team passcode to unlock the live Indian song radar feed.'}
          </p>
        </div>

        {failClosed ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Security Lockdown</span>
            </div>
            <p className="leading-relaxed">
              The <code className="bg-rose-950/60 px-1 py-0.5 rounded font-mono text-[11px] text-rose-200">SONG_RADAR_PASSCODE</code> environment variable is missing in production. For strict data protection, access remains closed.
            </p>
            <p className="text-[11px] text-text-muted">
              Add the variable in your Vercel Project Settings &gt; Environment Variables and redeploy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={e => {
                    setPasscode(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter passcode..."
                  className="w-full px-4 py-3 bg-surface rounded-xl border border-surface-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-text-muted"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !passcode.trim()}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 active:scale-[0.98]"
            >
              <span>{submitting ? 'Verifying...' : 'Unlock Radar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-text-muted">
                Authorized team &amp; scout operators only
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
