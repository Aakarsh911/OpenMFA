import { getDb } from '@/lib/mongodb';
import Link from 'next/link';
import Client from '@/app/mfa/[sessionId]/ui-client';

export const dynamic = 'force-dynamic';

async function getSession(sessionId: string) {
  const db = await getDb();
  return db.collection('mfa_sessions').findOne({ sessionId });
}

export default async function MFAHosted({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const s = await getSession(sessionId);
  if (!s) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Session not found</h1>
          <p className="text-gray-500">The link may be invalid or expired.</p>
        </div>
      </main>
    );
  }
  const expired = new Date(s.expiresAt).getTime() < Date.now();
  if (expired) {
    const url = new URL(s.failureUrl);
    url.searchParams.set('state', s.state);
    url.searchParams.set('reason', 'expired');
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Session expired</h1>
          <Link href={url.toString()} className="underline">Return</Link>
        </div>
      </main>
    );
  }
  const methods: string[] = s.methods || ['email_otp'];
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur p-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Confirm transaction</h1>
          <span className="text-xs text-slate-300">Session {s.sessionId.slice(-6)}</span>
        </div>
        <p className="text-sm text-slate-300 mb-6">Amount: <span className="font-medium text-slate-100">{s.amount} {s.currency}</span> • {s.user?.email}</p>
        <Client sessionId={s.sessionId} email={s.user?.email} state={s.state} methods={methods as any} />
      </div>
    </main>
  );
}
