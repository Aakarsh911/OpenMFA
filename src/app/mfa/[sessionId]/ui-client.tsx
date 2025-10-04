"use client";
import { useState } from 'react';

export default function Client({ sessionId, email, state }: { sessionId: string; email: string; state: string }) {
  const [status, setStatus] = useState<'idle'|'sent'|'verifying'|'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function send() {
    setErr(null);
    setStatus('idle');
    const r = await fetch('/api/v1/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    if (!r.ok) { setErr('Failed to send code'); return; }
    const j = await r.json();
    setExpiresAt(j.expiresAt);
    setStatus('sent');
  }

  async function verify() {
    setErr(null);
    setStatus('verifying');
    const r = await fetch('/api/v1/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, code }) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.redirect) { setStatus('error'); setErr(j?.error || 'Invalid code'); return; }
    window.location.href = j.redirect;
  }

  return (
    <div className="space-y-3">
      <button onClick={send} className="w-full px-3 py-2 rounded border hover:bg-gray-50">Send code to {email}</button>
      {status === 'sent' && (
        <div className="space-y-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={6} className="w-full border rounded px-2 py-2" placeholder="Enter 6-digit code" />
          <button onClick={verify} disabled={code.length !== 6} className="w-full px-3 py-2 rounded bg-black text-white disabled:opacity-50">Verify</button>
          {expiresAt && <p className="text-xs text-gray-500">Code expires at {new Date(expiresAt).toLocaleTimeString()}</p>}
        </div>
      )}
      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}
