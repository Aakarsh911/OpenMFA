"use client";
import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

type Totals = Record<string, number>;

export default function ClientWidgets() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ _id: { hour: string; type: string }; count: number }>>([]);
  const [totals, setTotals] = useState<Totals>({});

  useEffect(() => {
    let mounted = true;
    let timer: any;
    async function load() {
      try {
        if (!mounted) return;
        setLoading(true);
        const r = await fetch('/api/merchant/analytics');
        if (!r.ok) throw new Error('Failed to load analytics');
        const j = await r.json();
        if (!mounted) return;
        setRows(j.rows || []);
        const t: Totals = {};
        for (const row of j.totals || []) t[row._id] = row.count;
        setTotals(t);
        setError(null);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Error');
      } finally {
        if (mounted) setLoading(false);
      }
      timer = setTimeout(load, 5000); // poll every 5s
    }
    load();
    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, []);

  const labels = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => set.add(r._id.hour));
    return Array.from(set).sort();
  }, [rows]);

  const typeSeries = useMemo(() => {
    const types = Array.from(new Set(rows.map(r => r._id.type)));
    const map: Record<string, number[]> = {};
    for (const t of types) map[t] = labels.map(() => 0);
    for (const r of rows) {
      const idx = labels.indexOf(r._id.hour);
      if (idx >= 0) map[r._id.type][idx] = r.count;
    }
    return map;
  }, [rows, labels]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Requests',
        data: labels.map((_, i) =>
          (typeSeries['otp_send']?.[i] || 0) + (typeSeries['webauthn_start']?.[i] || 0)
        ),
        borderColor: 'rgba(217, 70, 239, 0.8)',
        backgroundColor: 'rgba(217, 70, 239, 0.15)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Approvals',
        data: labels.map((_, i) => typeSeries['session_approved']?.[i] || 0),
        borderColor: 'rgba(16, 185, 129, 0.9)',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Denials',
        data: labels.map((_, i) => (typeSeries['session_denied_attempts']?.[i] || 0)),
        borderColor: 'rgba(244, 63, 94, 0.9)',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const cards = [
    { title: 'Requests (24h)', accent: 'from-fuchsia-500/30 to-cyan-500/30', value: (totals['otp_send'] || 0) + (totals['webauthn_start'] || 0) },
    { title: 'Approvals', accent: 'from-emerald-500/30 to-teal-500/30', value: totals['session_approved'] || 0 },
    { title: 'Denials', accent: 'from-rose-500/30 to-orange-500/30', value: totals['session_denied_attempts'] || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.title} className={`rounded-xl border border-white/10 bg-gradient-to-br ${c.accent} p-[1px]`}>
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
          <Line
            data={data}
            options={{
              responsive: true,
              plugins: { legend: { position: 'top' as const, labels: { color: '#E5E7EB' } } },
              scales: {
                x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.08)' } },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
