import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'tonyx_session';

/** Clears the wallet session cookie. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
