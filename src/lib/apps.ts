import { getDb } from './mongodb';
import type { ObjectId, WithId } from 'mongodb';

export type AppRuleMethod = 'webauthn' | 'email_otp';

export type AppRule = {
  method: AppRuleMethod;
  minAmountCents?: number; // trigger at or above this amount
  required?: boolean; // if true, must satisfy this factor (step-up)
};

export type AppDoc = {
  _id?: ObjectId;
  appId: string; // public id
  merchantId: string;
  name: string;
  rules: AppRule[]; // ordered by priority
  strategy: 'first-available' | 'all-required';
  allowedOrigins?: string[]; // per-app redirect origins
  createdAt: Date;
  updatedAt: Date;
};

export type AppPublic = Pick<AppDoc, 'appId' | 'merchantId' | 'name' | 'rules' | 'strategy' | 'allowedOrigins' | 'createdAt' | 'updatedAt'>;

export async function listAppsForMerchant(merchantId: string): Promise<AppPublic[]> {
  const db = await getDb();
  const apps = await db.collection<AppDoc>('apps').find({ merchantId }).sort({ createdAt: 1 }).toArray();
  return apps.map(sanitizeApp);
}

export async function getAppById(appId: string): Promise<AppDoc | null> {
  const db = await getDb();
  return db.collection<AppDoc>('apps').findOne({ appId });
}

export async function createApp(merchantId: string, name: string, rules: AppRule[], strategy: AppDoc['strategy'] = 'first-available'): Promise<AppPublic> {
  const db = await getDb();
  const appId = 'app_' + Math.random().toString(36).slice(2, 10);
  const now = new Date();
  const doc: AppDoc = { appId, merchantId, name, rules, strategy, allowedOrigins: [], createdAt: now, updatedAt: now };
  await db.collection<AppDoc>('apps').insertOne(doc);
  return sanitizeApp(doc);
}

export async function updateApp(appId: string, patch: Partial<Pick<AppDoc, 'name' | 'rules' | 'strategy' | 'allowedOrigins'>>): Promise<AppPublic | null> {
  const db = await getDb();
  await db.collection<AppDoc>('apps').updateOne({ appId }, { $set: { ...patch, updatedAt: new Date() } });
  const updated = await getAppById(appId);
  return updated ? sanitizeApp(updated) : null;
}

export async function deleteApp(appId: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.collection<AppDoc>('apps').deleteOne({ appId });
  return res.deletedCount === 1;
}

export function sanitizeApp(app: WithId<AppDoc> | AppDoc): AppPublic {
  const { appId, merchantId, name, strategy, createdAt, updatedAt } = app as AppDoc;
  const rawRules = (app as any).rules;
  const rules = Array.isArray(rawRules) ? rawRules : [];
  const allowedOrigins = Array.isArray((app as any).allowedOrigins) ? (app as any).allowedOrigins : [];
  return { appId, merchantId, name, rules, strategy, allowedOrigins, createdAt, updatedAt };
}

export function resolveMfaMethodsForAmount(app: AppDoc | AppPublic, amount?: number, currency?: string): AppRuleMethod[] {
  const cents = toCents(amount, currency);
  const active = (app.rules || []).filter(r => (r.minAmountCents ?? 0) <= cents);
  // Unique by method preserving order
  const methods: AppRuleMethod[] = [];
  for (const r of active) {
    if (!methods.includes(r.method)) methods.push(r.method);
  }
  return methods;
}

function toCents(amount?: number, currency?: string): number {
  if (!amount || amount <= 0) return 0;
  // Simplify: assume 2 decimals except JPY
  const zeroDecimal = ['JPY', 'KRW'];
  const cur = (currency || 'USD').toUpperCase();
  return zeroDecimal.includes(cur) ? Math.round(amount) : Math.round(amount * 100);
}
