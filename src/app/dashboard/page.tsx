export const dynamic = 'force-dynamic';

export default function Overview() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {['Requests (24h)', 'Approvals', 'Denials'].map((t) => (
        <div key={t} className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">{t}</div>
          <div className="text-2xl font-semibold mt-2">0</div>
        </div>
      ))}
    </div>
  );
}
