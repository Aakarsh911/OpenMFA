"use client";
"use client";
import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type OverviewResp = {
  totals: {
    totalAuthentications: number;
    failedAttempts: number;
    successRate: number; // 0..1
    activeApps: number;
  };
  methods: Array<{ method: string; count: number }>;
};

export default function ClientWidgets() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewResp | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/merchant/analytics/overview', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load overview');
        const j = (await res.json()) as OverviewResp;
        if (!mounted) return;
        setData(j);
        setError(null);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const methodLabels = useMemo(() => (data?.methods || []).map(m => labelForMethod(m.method)), [data]);
  const methodCounts = useMemo(() => (data?.methods || []).map(m => m.count), [data]);

  const barData = {
    labels: methodLabels,
    datasets: [
      {
        label: 'Authentications',
        data: methodCounts,
        backgroundColor: ['#22c55e', '#f59e0b', '#6366f1', '#ef4444', '#06b6d4'],
      },
    ],
  };

  const cards = [
    { title: 'Total Authentications', value: data?.totals.totalAuthentications ?? 0 },
    { title: 'Success Rate', value: formatPct(data?.totals.successRate) },
    { title: 'Failed Authentications', value: data?.totals.failedAttempts ?? 0 },
    { title: 'Active Apps', value: data?.totals.activeApps ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.title} className={`rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-[1px]`}>
            <div className="rounded-[10px] bg-slate-900/80 backdrop-blur p-4">
              <div className="text-sm text-slate-300">{c.title}</div>
              <div className="text-3xl font-semibold mt-2 text-white">{loading ? '—' : c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {error && <div className="text-sm text-red-300">{error}</div>}
        {!error && (
          <Bar
            data={barData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.08)' }, beginAtZero: true },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}

function labelForMethod(m?: string) {
  if (!m) return 'Unknown';
  if (m === 'webauthn') return 'WebAuthn';
  if (m === 'email_otp') return 'Email OTP';
  return m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatPct(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '0%';
  return `${Math.round(v * 1000) / 10}%`;
}
