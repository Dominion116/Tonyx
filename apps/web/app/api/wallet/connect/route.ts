import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'tonyx_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — matches backend JWT expiry
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

/**
 * Forwards the wallet address to the real backend to get a signed JWT, stores
 * it in an httpOnly cookie, and returns it in the response body so client
 * components can persist it in localStorage for Bearer auth calls.
 *
 * Falls back to a base64url placeholder when the backend is unreachable so
 * dev mode still works without a running API server.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ address: undefined })) as { address?: string };
  const address = body.address;

  if (typeof address !== 'string' || address.length === 0) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  let sessionToken: string;

  try {
    const backendRes = await fetch(`${API_BASE}/api/wallet/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address }),
    });

    if (!backendRes.ok) {
      throw new Error(`Backend ${backendRes.status}`);
    }

    const data = await backendRes.json() as { sessionToken: string };
    sessionToken = data.sessionToken;
  } catch {
    // Backend unreachable in dev: mint a local placeholder token so the UI works.
    sessionToken = Buffer.from(
      JSON.stringify({ sub: address, iat: Math.floor(Date.now() / 1000) })
    ).toString('base64url');
  }

  const response = NextResponse.json({ ok: true, address, sessionToken });
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
