import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export function base64url(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateMerchantKey(env: 'test' | 'live' = 'test') {
  const secret = base64url(randomBytes(32));
  const raw = `mk_${env}_${secret}`;
  return raw;
}

export async function hashSecret(raw: string) {
  return bcrypt.hash(raw, 12);
}
