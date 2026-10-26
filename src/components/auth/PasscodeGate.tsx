'use client';

import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<{
    loading: boolean;
    authenticated: boolean;
    passcodeRequired: boolean;
  }>({
    loading: true,
    authenticated: true,
    passcodeRequired: false,
  });

  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        setStatus({
          loading: false,
          authenticated: data.authenticated,
          passcodeRequired: data.passcodeRequired,
        });
      })
      .catch(() => {
        setStatus({
          loading: false,
          authenticated: true,
          passcodeRequired: false,
        });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      if (!res.ok) {
        setError('Incorrect passcode. Please try again.');
        setSubmitting(false);
        return;
      }

      setStatus(prev => ({ ...prev, authenticated: true }));
    } catch {
      setError('Connection error verifying passcode.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status.loading) {
    return <>{children}</>;
  }

  if (status.passcodeRequired && !status.authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
        <div className="w-full max-w-sm bg-surface-elevated border border-surface-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mb-3 text-brand-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Song Radar Access</h2>
            <p className="text-xs text-text-muted mt-1 max-w-xs">
              Enter the shared team passcode to unlock the live Indian song radar feed.
            </p>
          </div>

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
                  className="w-full px-4 py-3 bg-surface rounded-xl border border-surface-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all pl-10"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5" />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !passcode.trim()}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20"
            >
              {submitting ? 'Verifying...' : 'Unlock Radar'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
