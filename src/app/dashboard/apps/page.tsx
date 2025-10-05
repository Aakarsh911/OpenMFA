import { auth, getUserIdFromSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getOrCreateMerchantForUser } from '@/lib/merchants';
import { createApp, listAppsForMerchant, updateApp, deleteApp, type AppRule } from '@/lib/apps';
import Link from 'next/link';
import EditAppModal from './EditAppModal';
import { Fingerprint, Mail, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getAppsForUser() {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return [];
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const apps = await listAppsForMerchant(merchant.merchantId);
  return apps;
}

export default async function AppsPage() {
  await auth();
  const apps = await getAppsForUser();
  return (
  <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Apps</h1>
      <p className="text-sm text-slate-300">Define MFA methods and thresholds per application.</p>
        </div>
        <form action="/api/merchant/apps" method="post">
          <input type="hidden" name="json" value="{}" />
        </form>
      </div>
      <CreateAppForm />
      {apps.length === 0 ? (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 p-[1px]">
          <div className="rounded-[10px] bg-slate-900/80 backdrop-blur p-6 text-center text-sm text-slate-300">
          No apps yet. Create one to define MFA policies.
          </div>
        </div>
      ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apps.map((a) => (
      <div key={a.appId} className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-[1px] shadow-sm">
              <div className="rounded-[10px] bg-slate-900/80 backdrop-blur p-5 h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
          <h3 className="font-medium text-white"><Link href={`/dashboard/apps/${a.appId}`} className="hover:underline">{a.name}</Link></h3>
          <p className="text-xs text-slate-400">{a.appId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <EditAppModal app={a as any} />
                  <form action={async () => {
                    'use server';
                    const session = await auth();
                    const userId = getUserIdFromSession(session);
                    if (!userId) return;
                    await deleteApp(a.appId);
                    revalidatePath('/dashboard/apps');
                  }}>
                    <button type="submit" className="text-xs rounded-lg border border-red-400/20 px-2 py-1 hover:bg-red-500/10 text-red-300 flex items-center gap-1"><Trash2 size={14}/>Delete</button>
                  </form>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-200 min-h-[64px]">
                {Array.isArray(a.rules) ? a.rules.map((r: any, i: number) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {r.method === 'webauthn' ? <Fingerprint size={14} className="text-emerald-300"/> : <Mail size={14} className="text-indigo-300"/>}
                      {r.method === 'webauthn' ? 'Passkey' : 'Email OTP'}
                    </span>
                    <span className="text-slate-400">{r.minAmountCents ? `≥ $${(r.minAmountCents/100).toFixed(2)}` : 'any amount'}</span>
                  </li>
                )) : null}
              </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAppForm() {
  async function create(data: FormData) {
    'use server';
    const session = await auth();
    const userId = getUserIdFromSession(session);
    if (!userId) return;
    const { merchant } = await getOrCreateMerchantForUser(userId);
    const name = (data.get('name') as string) || 'My App';
    const rules: AppRule[] = [
      { method: 'webauthn', minAmountCents: 0 },
      { method: 'email_otp', minAmountCents: 5000 },
    ];
    await createApp(merchant.merchantId, name, rules, 'first-available');
    revalidatePath('/dashboard/apps');
  }
  return (
    <form action={create} className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-[1px] flex items-end gap-3 shadow-sm">
      <div className="rounded-[10px] bg-slate-900/80 backdrop-blur p-4 flex-1 flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-sm text-slate-300">App name</label>
        <input name="name" placeholder="e.g. Checkout" className="mt-1 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 outline-none placeholder:text-slate-400 text-slate-100" />
      </div>
      <button type="submit" className="rounded-lg bg-white/90 text-slate-900 px-4 py-2 hover:bg-white">Create</button>
      </div>
    </form>
  );
}
