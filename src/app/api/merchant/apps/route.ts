import { NextRequest, NextResponse } from 'next/server';
import { auth, getUserIdFromSession } from '@/lib/auth';
import { getOrCreateMerchantForUser } from '@/lib/merchants';
import { createApp, listAppsForMerchant } from '@/lib/apps';

export async function GET() {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const apps = await listAppsForMerchant(merchant.merchantId);
  return NextResponse.json({ apps });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const body = await req.json().catch(() => ({}));
  const name = (body.name || 'My App').toString();
  const rules = Array.isArray(body.rules) ? body.rules : [];
  const strategy = body.strategy === 'all-required' ? 'all-required' : 'first-available';
  const app = await createApp(merchant.merchantId, name, rules, strategy);
  return NextResponse.json({ app });
}
