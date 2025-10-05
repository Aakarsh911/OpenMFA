"use client";
import { useEffect, useMemo, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { ShieldCheck, Fingerprint, Mail } from 'lucide-react';

type Method = 'webauthn' | 'email_otp';

export default function Client({ sessionId, email, methods, state }: { sessionId: string; email: string; methods: Method[]; state: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [hasDevice, setHasDevice] = useState<boolean | null>(null);
  const [partial, setPartial] = useState<Method[]>([]);

  const supportsWebAuthn = typeof window !== 'undefined' && !!window.PublicKeyCredential;
  const showWebAuthn = supportsWebAuthn && methods.includes('webauthn');

  useEffect(() => {
    // Probe if device credential exists by requesting allowCredentials (server will return list)
    if (!showWebAuthn) return;
    (async () => {
      setErr(null);
      const r = await fetch('/api/v1/webauthn/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      if (!r.ok) { setHasDevice(false); return; }
      const { publicKey } = await r.json();
      setHasDevice((publicKey.allowCredentials || []).length > 0);
    })();
  }, [sessionId, showWebAuthn]);

  async function doWebAuthnAuth() {
    try {
      setLoading(true);
      setErr(null);
      const optRes = await fetch('/api/v1/webauthn/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      const { publicKey } = await optRes.json();
      const assertion = await startAuthentication(publicKey);
      const fin = await fetch('/api/v1/webauthn/finish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, assertion }) });
  const j = await fin.json();
  if (!fin.ok) throw new Error(j?.error || 'Failed');
  if (j.status === 'partial') { setPartial(prev => Array.from(new Set([...prev, 'webauthn']))); return; }
  window.location.href = j.redirect;
    } catch (e: any) {
      setErr(e?.message || 'Passkey failed');
    } finally {
      setLoading(false);
    }
  }

  async function doWebAuthnRegister() {
    try {
      setLoading(true);
      setErr(null);
      const optRes = await fetch('/api/v1/webauthn/register/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      const { publicKey } = await optRes.json();
      const attestation = await startRegistration(publicKey);
      const fin = await fetch('/api/v1/webauthn/register/finish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, attestation }) });
      const j = await fin.json();
      if (!fin.ok) throw new Error(j?.error || 'Registration failed');
      // After save, immediately authenticate to approve session
      await doWebAuthnAuth();
    } catch (e: any) {
      setErr(e?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function sendCode() {
    setErr(null);
    const r = await fetch('/api/v1/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    if (!r.ok) { const j = await r.json().catch(() => null); setErr(j?.error || 'Failed to send code'); return; }
    const j = await r.json();
    setExpiresAt(j.expiresAt);
  }

  async function verifyCode() {
    setErr(null);
  const r = await fetch('/api/v1/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, code }) });
  const j = await r.json().catch(() => null);
  // If server provides a redirect (e.g., lockout after 3 attempts), honor it regardless of status
  if (j?.redirect) { window.location.href = j.redirect; return; }
  if (!r.ok) {
    const remaining = typeof j?.remaining === 'number' ? j.remaining : undefined;
    setErr(remaining !== undefined ? `${j?.error || 'Invalid code'} • ${remaining} attempt${remaining === 1 ? '' : 's'} remaining` : (j?.error || 'Invalid code'));
    return;
  }
  if (j.status === 'partial') { setPartial(prev => Array.from(new Set([...prev, 'email_otp']))); return; }
  window.location.href = j.redirect;
  }

  return (
    <div className="space-y-6">
      {showWebAuthn && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <Fingerprint size={18} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Passkey</h3>
              <p className="text-sm text-slate-300">Use Touch ID / Face ID or a security key.</p>
              <div className="mt-3 flex gap-2">
                {hasDevice ? (
                  <button onClick={doWebAuthnAuth} disabled={loading} className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-900 hover:bg-emerald-400 disabled:opacity-50">Approve with Passkey</button>
                ) : (
                  <button onClick={doWebAuthnRegister} disabled={loading} className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-900 hover:bg-emerald-400 disabled:opacity-50">Set up Passkey</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {methods.includes('email_otp') && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
              <Mail size={18} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Email code</h3>
              <p className="text-sm text-slate-300">We’ll send a 6-digit code to {email}.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={sendCode} className="px-3 py-2 rounded-lg bg-indigo-500 text-slate-900 hover:bg-indigo-400">Send code</button>
              </div>
              <div className="mt-3 flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={6} className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2 outline-none placeholder:text-slate-400" placeholder="Enter 6-digit code" />
                <button onClick={verifyCode} disabled={code.length !== 6} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-900 disabled:opacity-50">Verify</button>
              </div>
              {expiresAt && <p className="mt-2 text-xs text-slate-400">Code expires at {new Date(expiresAt).toLocaleTimeString()}</p>}
            </div>
          </div>
        </div>
      )}

      {(partial.length > 0) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Additional verification required. Completed: {partial.join(', ')}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck size={14} />
        <span>Phishing-resistant when using passkeys. We never see your biometrics.</span>
      </div>
    </div>
  );
}
