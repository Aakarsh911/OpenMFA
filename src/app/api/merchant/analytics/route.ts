import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { auth, getUserIdFromSession } from '@/lib/auth';
import { getOrCreateMerchantForUser } from '@/lib/merchants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { merchant } = await getOrCreateMerchantForUser(userId);
  const db = await getDb();

  const since = Number(req.nextUrl.searchParams.get('since')) || Date.now() - 24 * 60 * 60 * 1000;
  const from = new Date(since);

  // Aggregate counts in the last 24h by hour
  const pipeline = [
    { $match: { merchantId: merchant.merchantId, ts: { $gte: from } } },
    { $project: { type: 1, hour: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$ts' } } } },
    { $group: { _id: { hour: '$hour', type: '$type' }, count: { $sum: 1 } } },
  ];
  const rows = await db.collection('analytics_events').aggregate(pipeline).toArray();

  // Also compute totals for cards
  const totals = await db.collection('analytics_events').aggregate([
    { $match: { merchantId: merchant.merchantId, ts: { $gte: from } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]).toArray();

  return NextResponse.json({ rows, totals });
}
