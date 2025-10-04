import { getDb } from '@/lib/mongodb';
import Link from 'next/link';
import Client from './ui-client';

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
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white border rounded p-6 space-y-4">
        <h1 className="text-lg font-semibold">Verify your purchase</h1>
        <p className="text-sm text-gray-600">We’ll verify by security key or email for {s.user?.email}.</p>
  <Client sessionId={s.sessionId} email={s.user?.email} state={s.state} />
      </div>
    </main>
  );
}
