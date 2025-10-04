import Link from 'next/link';
import { auth, signIn } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Landing() {
  const session = await auth();
  const isAuthed = !!session?.user;
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-3xl font-semibold mb-4">OpenMFA Portal</h1>
        <p className="text-gray-500 mb-8">Manage your merchant key and dashboard.</p>
        {isAuthed ? (
          <Link href="/dashboard" className="px-4 py-2 rounded bg-black text-white">Go to Dashboard</Link>
        ) : (
          <form action={async () => { 'use server'; await signIn('google'); }}>
            <button className="px-4 py-2 rounded bg-black text-white">Sign in with Google</button>
          </form>
        )}
      </div>
    </main>
  );
}
