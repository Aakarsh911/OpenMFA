import { getDb } from './mongodb';
import { generateMerchantKey, hashSecret } from './crypto';
import type { ObjectId } from 'mongodb';

type MerchantDoc = {
  _id?: ObjectId;
  userId: string;
  merchantId: string;
  key: {
    prefix: string;
    lastFour: string;
    hash: string;
    createdAt: Date;
    rotatedAt?: Date;
  };
  createdAt: Date;
};

type MerchantPublic = {
  merchantId: string;
  key: { prefix: string; lastFour: string; createdAt: Date; rotatedAt?: Date };
};

export async function getOrCreateMerchantForUser(userId: string, env: 'test'|'live' = 'test') {
  const db = await getDb();
  const merchants = db.collection<MerchantDoc>('merchants');
  let m = await merchants.findOne({ userId });
  if (!m) {
    const raw = generateMerchantKey(env);
    const [prefix] = raw.split('_'); // mk
    const doc: MerchantDoc = {
      userId,
      merchantId: 'mch_' + Math.random().toString(36).slice(2, 10),
      key: {
        prefix: `${prefix}_${env}`,
        lastFour: raw.slice(-4),
        hash: await hashSecret(raw),
        createdAt: new Date()
      },
      createdAt: new Date()
    };
  await merchants.insertOne(doc);
  m = await merchants.findOne({ userId });
    return { merchant: sanitize(m!), rawKey: raw } as const; // show once
  }
  return { merchant: sanitize(m) } as const;
}

export async function rotateMerchantKey(userId: string, env: 'test'|'live' = 'test') {
  const db = await getDb();
  const merchants = db.collection<MerchantDoc>('merchants');
  const m = await merchants.findOne({ userId });
  if (!m) throw new Error('Merchant not found');
  const raw = generateMerchantKey(env);
  const [prefix] = raw.split('_');
  await merchants.updateOne(
    { _id: m._id! },
    {
      $set: {
        key: {
          prefix: `${prefix}_${env}`,
          lastFour: raw.slice(-4),
          hash: await hashSecret(raw),
          createdAt: new Date(),
          rotatedAt: new Date()
        }
      }
    }
  );
  const updated = await merchants.findOne({ _id: m._id! });
  return { merchant: sanitize(updated!), rawKey: raw } as const;
}

function sanitize(m: MerchantDoc): MerchantPublic {
  return {
    merchantId: m.merchantId,
    key: {
      prefix: m.key.prefix,
      lastFour: m.key.lastFour,
      createdAt: m.key.createdAt,
      rotatedAt: m.key.rotatedAt,
    },
  };
}
