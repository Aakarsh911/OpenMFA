import Link from 'next/link';
import Image from 'next/image';
import { auth, signOut } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">OpenMFA</Link>
          <div className="flex items-center gap-3">
            {user?.image ? (
              <Image src={user.image} alt="avatar" width={32} height={32} className="rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200" />
            )}
            <a href="/api/auth/signout?callbackUrl=/" className="text-sm text-gray-600 hover:text-black">Sign out</a>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-4 py-2 flex gap-4 text-sm">
          <Link href="/dashboard" className="hover:underline">Overview</Link>
          <Link href="/dashboard/settings" className="hover:underline">Settings</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
