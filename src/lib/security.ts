import { randomBytes, createHash } from 'crypto';

export function makeState() {
  return base64url(randomBytes(16));
}

export function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function ensureAllowedOrigin(urlStr: string, allowed: string[]) {
  try {
    const u = new URL(urlStr);
    const origin = `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
    return allowed.includes(origin);
  } catch {
    return false;
  }
}

export function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}
