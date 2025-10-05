// Client analytics widgets
import ClientWidgets from './widgets';

export const dynamic = 'force-dynamic';

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="text-slate-300 text-sm">Quick glance at activity</p>
        </div>
      </div>
      <AnalyticsWidgets />
    </div>
  );
}

function AnalyticsWidgets() {
  return <ClientWidgets />;
}
