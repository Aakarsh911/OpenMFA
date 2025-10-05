import { auth, getUserIdFromSession } from '@/lib/auth';
import { getOrCreateMerchantForUser } from '@/lib/merchants';
import { getAppById, updateApp, type AppRule } from '@/lib/apps';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getAppForUser(appId: string) {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return { error: 'unauth' as const };
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const app = await getAppById(appId);
  if (!app || app.merchantId !== merchant.merchantId) return { error: 'notfound' as const };
  return { app } as const;
}

export default async function AppConfigPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const res = await getAppForUser(appId);
  if ('error' in res) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">App</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6">{res.error === 'unauth' ? 'Unauthorized' : 'Not found'}</div>
      </div>
    );
  }
  const { app } = res;

  async function save(data: FormData) {
    'use server';
    const session = await auth();
    const userId = getUserIdFromSession(session);
    if (!userId) return;
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const existing = await getAppById(app.appId);
  if (!existing || existing.merchantId !== merchant.merchantId) return;
    const name = (data.get('name') as string) || app.name;
  const ruleCount = Number(data.get('ruleCount') || 0);
    const rules: AppRule[] = [];
    for (let i = 0; i < ruleCount; i++) {
      const method = (data.get(`method_${i}`) as 'webauthn' | 'email_otp') || 'webauthn';
      const minAmountCents = Number(data.get(`min_${i}`) || 0);
      rules.push({ method, minAmountCents: isFinite(minAmountCents) ? minAmountCents : 0 });
    }
    const methodSet = new Set(rules.map(r => r.method));
    const strategy: 'first-available' | 'all-required' = methodSet.size > 1 ? 'all-required' : 'first-available';
    const originsRaw = (data.get('allowedOrigins') as string | null) || '';
    const allowedOrigins = originsRaw
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(Boolean);
    await updateApp(app.appId, { name, strategy, rules, allowedOrigins });
    revalidatePath(`/dashboard/apps/${app.appId}`);
  }

  async function addRule() {
    'use server';
    const current = await getAppById(app.appId);
    const nextRules: AppRule[] = Array.isArray(current?.rules) ? [...current!.rules] : [];
    nextRules.push({ method: 'webauthn', minAmountCents: 0 });
    await updateApp(app.appId, { rules: nextRules });
    revalidatePath(`/dashboard/apps/${app.appId}`);
  }

  async function removeRule(data: FormData) {
    'use server';
    const idx = Number(data.get('idx') || -1);
    const current = await getAppById(app.appId);
    const nextRules: AppRule[] = (Array.isArray(current?.rules) ? current!.rules : []).filter((_, i) => i !== idx);
    await updateApp(app.appId, { rules: nextRules });
    revalidatePath(`/dashboard/apps/${app.appId}`);
  }

  const rules = Array.isArray(app.rules) ? app.rules : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Configure app</h1>
          <p className="text-sm text-slate-300">{app.appId}</p>
        </div>
        <Link href="/dashboard/apps" className="text-sm text-slate-300 hover:text-white">Back to apps</Link>
      </div>

      <form action={save} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300">Name</label>
            <input name="name" defaultValue={app.name} className="mt-1 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 outline-none text-slate-100 placeholder:text-slate-400" />
          </div>
          {/* Strategy is derived automatically from selected MFA methods. */}
        </div>

  <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-white">Rules</h2>
            <button formAction={addRule} className="text-sm rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10 text-slate-200">Add rule</button>
          </div>
          <input type="hidden" name="ruleCount" value={rules.length} />
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <select name={`method_${i}`} defaultValue={r.method} className="rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-slate-100">
                  <option value="webauthn">Passkey (webauthn)</option>
                  <option value="email_otp">Email OTP</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-300">Min amount (cents)</label>
                  <input name={`min_${i}`} defaultValue={r.minAmountCents ?? 0} type="number" min={0} className="w-32 rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-slate-100" />
                </div>
                <input type="hidden" name="idx" value={i} />
                <button formAction={removeRule} className="text-sm text-red-300 hover:underline" type="submit">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300">Allowed redirect origins (one per line)</label>
          <textarea name="allowedOrigins" defaultValue={(app.allowedOrigins || []).join('\n')} rows={4} className="mt-1 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 outline-none text-slate-100" />
          <p className="mt-1 text-xs text-slate-400">Sessions API will only accept successUrl/failureUrl matching these origins. Leave empty to use merchant-level defaults.</p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="rounded-lg bg-white/90 text-slate-900 px-4 py-2 hover:bg-white">Save changes</button>
        </div>
      </form>
    </div>
  );
}
