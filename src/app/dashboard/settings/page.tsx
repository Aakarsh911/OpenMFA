"use client";
import { useEffect, useState } from 'react';
import { Copy, RefreshCcw, Shield, KeyRound } from 'lucide-react';

type Merchant = {
  merchantId: string;
  key: { prefix: string; lastFour: string; createdAt: string; rotatedAt?: string };
};

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [showOnceKey, setShowOnceKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/merchant');
        if (!res.ok) {
          if (res.status === 401) setError('Please sign in to view settings.');
          else setError('Failed to load merchant settings.');
          return;
        }
        const data = await res.json();
        if (data.merchant) setMerchant(data.merchant);
        if (data.showOnce && data.merchantKey) setShowOnceKey(data.merchantKey);
      } catch {
        setError('Failed to load merchant settings.');
      }
    })();
  }, []);

  async function rotate() {
    setLoading(true);
    try {
  const res = await fetch('/api/merchant/rotate', { method: 'POST' });
  if (!res.ok) return;
  const data = await res.json();
  if (data.merchant) setMerchant(data.merchant);
  if (data.merchantKey) setShowOnceKey(data.merchantKey);
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="text-emerald-300" size={18} />
        <h2 className="text-xl font-semibold text-white">Settings</h2>
      </div>
      {error && (
        <div className="rounded-lg border border-red-300/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</div>
      )}
      {!merchant && !error ? (
        <div className="text-slate-300">Loading...</div>
      ) : merchant ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-300">Merchant ID</div>
              <KeyRound size={16} className="text-slate-300" />
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-white/10 text-slate-100">{merchant.merchantId}</code>
              <button className="p-1 rounded border border-white/20 hover:bg-white/10 text-slate-200" onClick={() => copy(merchant.merchantId)} title="Copy">
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="text-sm text-slate-300 mb-2">Merchant Key</div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-white/10 text-slate-100">
                {merchant.key.prefix}_****{merchant.key.lastFour}
              </code>
              <button className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50 text-slate-200" onClick={rotate} disabled={loading}>
                <RefreshCcw size={14} /> Rotate
              </button>
            </div>
            <div className="text-xs text-slate-400 mt-2">Created {new Date(merchant.key.createdAt).toLocaleString()}</div>
            {merchant.key.rotatedAt && (
              <div className="text-xs text-slate-400">Rotated {new Date(merchant.key.rotatedAt).toLocaleString()}</div>
            )}
          </div>
        </div>
      ) : null}

      {showOnceKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-2 text-white">Copy your Merchant Key</h3>
            <p className="text-sm text-slate-300 mb-4">This key is shown only once. Store it securely now.</p>
            <div className="flex items-center gap-2 mb-4">
              <code className="px-2 py-1 bg-white/10 rounded break-all flex-1 text-slate-100">{showOnceKey}</code>
              <button className="p-1 rounded border border-white/20 hover:bg-white/10 text-slate-200" onClick={() => copy(showOnceKey)} title="Copy">
                <Copy size={16} />
              </button>
            </div>
            <div className="flex justify-end">
              <button className="px-3 py-1.5 rounded bg-white/90 text-slate-900" onClick={() => setShowOnceKey(null)}>I’ve saved it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
