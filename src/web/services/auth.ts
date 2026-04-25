import * as crypto from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const SESSION_COOKIE = 'musicbot_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface Session {
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export function getAdminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw === 'changeme') return null;
  return pw;
}

export function isPasswordSet(): boolean {
  return getAdminPassword() !== null;
}

export function login(submitted: string): string | null {
  const expected = getAdminPassword();
  if (!expected) return null;
  if (!safeEqual(submitted, expected)) return null;

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function logout(token: string | undefined): void {
  if (token) sessions.delete(token);
}

export function isAuthenticated(token: string | undefined): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!isPasswordSet()) {
    // No password configured → portal is unprotected. The UI surfaces a warning.
    return;
  }
  const token = request.cookies?.[SESSION_COOKIE];
  if (!isAuthenticated(token)) {
    reply.code(401).send({ error: 'Authentication required' });
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
