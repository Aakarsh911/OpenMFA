"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppPublic, AppRule } from '@/lib/apps';
import { Fingerprint, Mail } from 'lucide-react';

export default function EditAppModal({ app }: { app: AppPublic }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rules = Array.isArray(app.rules) ? app.rules : [];
  const [enableWebauthn, setEnableWebauthn] = useState<boolean>(rules.some(r => r.method === 'webauthn'));
  const [webauthnMin, setWebauthnMin] = useState<number>(rules.find(r => r.method === 'webauthn')?.minAmountCents ?? 0);
  const [enableEmail, setEnableEmail] = useState<boolean>(rules.some(r => r.method === 'email_otp'));
  const [emailMin, setEmailMin] = useState<number>(rules.find(r => r.method === 'email_otp')?.minAmountCents ?? 0);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      if (!enableWebauthn && !enableEmail) {
        setError('Select at least one MFA method to enable');
        setSaving(false);
        return;
      }
      const nextRules: AppRule[] = [];
      if (enableWebauthn) nextRules.push({ method: 'webauthn', minAmountCents: Math.max(0, Math.floor(Number(webauthnMin) || 0)) });
      if (enableEmail) nextRules.push({ method: 'email_otp', minAmountCents: Math.max(0, Math.floor(Number(emailMin) || 0)) });
      const strategy = nextRules.length > 1 ? 'all-required' : 'first-available';
      const res = await fetch(`/api/merchant/apps/${app.appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: nextRules, strategy }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Save failed (${res.status})`);
      }
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (saving) return;
    if (!confirm('Delete this app? This cannot be undone.')) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/merchant/apps/${app.appId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError('Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs rounded-lg border border-white/20 px-2 py-1 hover:bg-white/10 text-slate-200">Edit</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => !saving && setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-white">Edit {app.name}</h3>
              <button onClick={() => !saving && setOpen(false)} className="text-slate-300 hover:text-white text-sm">Close</button>
            </div>
            <div className="space-y-5 max-h-[70vh] overflow-auto pr-1">
              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Methods</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center"><Fingerprint size={16} /></div>
                      <div className="text-slate-200 text-sm">Passkey</div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={enableWebauthn} onChange={(e) => setEnableWebauthn(e.target.checked)} /> Enable
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center"><Mail size={16} /></div>
                      <div className="text-slate-200 text-sm">Email OTP</div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={enableEmail} onChange={(e) => setEnableEmail(e.target.checked)} /> Enable
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Thresholds (min amount in cents)</label>
                <div className="space-y-2">
                  {enableWebauthn && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded-md border border-white/20 px-2 py-1 bg-white/5 text-slate-200">Passkey</span>
                      <input
                        type="number"
                        min={0}
                        value={webauthnMin}
                        onChange={(e) => setWebauthnMin(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="w-32 rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-slate-100"
                      />
                    </div>
                  )}
                  {enableEmail && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded-md border border-white/20 px-2 py-1 bg-white/5 text-slate-200">Email OTP</span>
                      <input
                        type="number"
                        min={0}
                        value={emailMin}
                        onChange={(e) => setEmailMin(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="w-32 rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-slate-100"
                      />
                    </div>
                  )}
                  {!enableWebauthn && !enableEmail && (
                    <div className="text-xs text-slate-400">Select at least one method above.</div>
                  )}
                </div>
              </div>
              {error && <div className="rounded-md border border-red-300/30 bg-red-500/10 text-red-200 text-sm px-3 py-2">{error}</div>}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={onDelete} className="text-sm text-red-300 hover:text-red-200">Delete</button>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} disabled={saving} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50 text-slate-200">Cancel</button>
                <button onClick={onSave} disabled={saving} className="rounded-lg bg-white/90 text-slate-900 px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
