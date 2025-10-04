import { MongoClient } from 'mongodb';

let clientPromise: Promise<MongoClient> | undefined;
let hasLogged = false;

declare global {
  // Using var to extend NodeJS global
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDb() {
  if (!global._mongoClientPromise) {
    const uri = process.env.MONGODB_URI as string | undefined;
    if (!uri) {
      throw new Error('MONGODB_URI is not set');
    }
    if (!hasLogged) {
      console.log('[mongo] connecting to cluster...');
      hasLogged = true;
    }
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect().then((c) => {
      console.log('[mongo] connected');
      return c;
    });
  }
  clientPromise = global._mongoClientPromise;
  const client = await clientPromise!;
  const dbName = (process.env.MONGODB_DB || '').trim() || 'openmfa';
  return client.db(dbName);
}
