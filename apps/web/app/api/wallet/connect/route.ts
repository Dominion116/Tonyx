import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'tonyx_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Establishes a wallet session. Once the backend is live this should forward to
 * POST /api/wallet/connect to exchange the address for a signed JWT; for now it
 * mints a placeholder token and stores it in an httpOnly cookie.
 */
export async function POST(request: Request) {
  const { address } = await request.json().catch(() => ({ address: undefined }));

  if (typeof address !== 'string' || address.length === 0) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  const token = Buffer.from(
    JSON.stringify({ address, iat: Date.now() })
  ).toString('base64url');

  const response = NextResponse.json({ ok: true, address });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
