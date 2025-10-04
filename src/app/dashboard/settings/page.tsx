"use client";
import { useEffect, useState } from 'react';
import { Copy, RefreshCcw } from 'lucide-react';

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
      <h2 className="text-xl font-semibold">Settings</h2>
      {error && (
        <div className="rounded border bg-white p-4 text-red-600">{error}</div>
      )}
      {!merchant && !error ? (
        <div>Loading...</div>
      ) : merchant ? (
        <div className="space-y-4">
          <div className="rounded border bg-white p-4">
            <div className="text-sm text-gray-500 mb-1">Merchant ID</div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-gray-100 rounded">{merchant.merchantId}</code>
              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => copy(merchant.merchantId)} title="Copy">
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div className="rounded border bg-white p-4">
            <div className="text-sm text-gray-500 mb-1">Merchant Key</div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-gray-100 rounded">
                {merchant.key.prefix}_****{merchant.key.lastFour}
              </code>
              <button className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50" onClick={rotate} disabled={loading}>
                <RefreshCcw size={14} /> Rotate
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2">Created {new Date(merchant.key.createdAt).toLocaleString()}</div>
            {merchant.key.rotatedAt && (
              <div className="text-xs text-gray-400">Rotated {new Date(merchant.key.rotatedAt).toLocaleString()}</div>
            )}
          </div>
        </div>
  ) : null}

      {showOnceKey && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Copy your Merchant Key</h3>
            <p className="text-sm text-gray-600 mb-4">This key is shown only once. Store it securely now.</p>
            <div className="flex items-center gap-2 mb-4">
              <code className="px-2 py-1 bg-gray-100 rounded break-all flex-1">{showOnceKey}</code>
              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => copy(showOnceKey)} title="Copy">
                <Copy size={16} />
              </button>
            </div>
            <div className="flex justify-end">
              <button className="px-3 py-1.5 rounded bg-black text-white" onClick={() => setShowOnceKey(null)}>I’ve saved it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
