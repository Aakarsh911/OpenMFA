import { SignJWT, importPKCS8, exportJWK, type JWK, type JWTPayload } from 'jose';
import { createPublicKey } from 'crypto';
type KeyLike = any;
import { randomBytes } from 'crypto';
import { sha256Hex } from './security';

let privateKey: KeyLike | null = null;
let publicJwk: JWK | null = null;
let normalizedPemCache: string | null = null;

function getNormalizedPrivatePem(): string {
  if (normalizedPemCache) return normalizedPemCache;
  const raw = process.env.OPENMFA_JWT_PRIVATE_KEY_PEM;
  if (!raw) throw new Error('OPENMFA_JWT_PRIVATE_KEY_PEM not set');
  const pem = raw.includes('\n') ? raw.replace(/\\n/g, '\n').trim() : raw.trim();
  if (/-----BEGIN RSA PRIVATE KEY-----/.test(pem) && !/-----BEGIN PRIVATE KEY-----/.test(pem)) {
    throw new Error('OPENMFA_JWT_PRIVATE_KEY_PEM must be PKCS#8 (BEGIN PRIVATE KEY). Convert from PKCS#1 (BEGIN RSA PRIVATE KEY) using: openssl pkcs8 -topk8 -inform PEM -in rsa_key.pem -out private_key.pem -nocrypt');
  }
  if (!/-----BEGIN PRIVATE KEY-----[\s\S]*-----END PRIVATE KEY-----/.test(pem)) {
    throw new Error('OPENMFA_JWT_PRIVATE_KEY_PEM is not a valid PKCS#8 PEM. It should include the lines BEGIN PRIVATE KEY/END PRIVATE KEY and the base64 body.');
  }
  normalizedPemCache = pem;
  return pem;
}

export async function getPrivateKey(): Promise<KeyLike> {
  if (privateKey) return privateKey;
  const pem = getNormalizedPrivatePem();
  privateKey = await importPKCS8(pem, 'RS256');
  return privateKey;
}

export async function getPublicJwk(): Promise<JWK> {
  if (publicJwk) return publicJwk;
  const pem = getNormalizedPrivatePem();
  // Derive public key from the private PEM with Node crypto to avoid extractability issues
  const pubKeyObj = createPublicKey(pem);
  const jwk = await exportJWK(pubKeyObj);
  const pubOnly: JWK = {
    kty: jwk.kty,
    n: (jwk as any).n,
    e: (jwk as any).e,
    kid: process.env.OPENMFA_JWT_KID || 'openmfa-kid',
    alg: 'RS256',
    use: 'sig',
  } as JWK;
  publicJwk = pubOnly;
  return pubOnly;
}

export async function signApprovalToken(params: {
  merchantId: string;
  amount: number;
  currency: string;
  metadata?: any;
  challengeId: string;
}): Promise<{ jwt: string; jti: string; exp: number }> {
  const key = await getPrivateKey();
  const kid = process.env.OPENMFA_JWT_KID || 'openmfa-kid';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 5 * 60; // 5 minutes
  const jti = base64url(randomBytes(12));
  const metadataHash = sha256Hex(JSON.stringify(params.metadata || {})).slice(0, 32);
  const jwt = await new SignJWT({
    kid,
    sub: params.challengeId,
    merchantId: params.merchantId,
    amount: params.amount,
    currency: params.currency,
    metadataHash,
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(process.env.NEXTAUTH_URL!)
    .setAudience('merchant')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(key);
  return { jwt, jti, exp };
}

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
