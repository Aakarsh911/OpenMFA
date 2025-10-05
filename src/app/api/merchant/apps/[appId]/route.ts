import { NextRequest, NextResponse } from 'next/server';
import { auth, getUserIdFromSession } from '@/lib/auth';
import { getOrCreateMerchantForUser } from '@/lib/merchants';
import { getAppById, updateApp, deleteApp } from '@/lib/apps';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const app = await getAppById(appId);
  if (!app || app.merchantId !== merchant.merchantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const patch = await req.json().catch(() => ({}));
  const updated = await updateApp(appId, patch);
  return NextResponse.json({ app: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const app = await getAppById(appId);
  if (!app || app.merchantId !== merchant.merchantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ok = await deleteApp(appId);
  return NextResponse.json({ deleted: ok });
}
