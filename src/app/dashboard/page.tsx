export const dynamic = 'force-dynamic';

export default function Overview() {
  const cards = [
    { title: 'Requests (24h)', accent: 'from-fuchsia-500/30 to-cyan-500/30' },
    { title: 'Approvals', accent: 'from-emerald-500/30 to-teal-500/30' },
    { title: 'Denials', accent: 'from-rose-500/30 to-orange-500/30' },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="text-slate-300 text-sm">Quick glance at activity</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className={`rounded-xl border border-white/10 bg-gradient-to-br ${c.accent} p-[1px]`}
          >
            <div className="rounded-[10px] bg-slate-900/80 backdrop-blur p-4">
              <div className="text-sm text-slate-300">{c.title}</div>
              <div className="text-3xl font-semibold mt-2 text-white">0</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
