import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * Resolves the current user id from session. In local development only, an
 * explicit TEST_USER_ID can be used for script-driven QA without opening a
 * broad unauthenticated fallback.
 *
 * Do not add implicit database fallbacks here. Every API that uses this helper
 * inherits its behavior.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const sessionId = session?.user ? (session.user as { id?: string }).id ?? null : null;
  if (sessionId) return sessionId;

  if (process.env.NODE_ENV === 'development' && process.env.TEST_USER_ID) {
    const testUser = await prisma.user.findUnique({ where: { id: process.env.TEST_USER_ID } });
    return testUser?.id ?? null;
  }

  return null;
}

/**
 * For server components: returns userId or redirects to /login.
 * Use in `page.tsx` server components.
 */
export async function requireUserOrRedirect(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    // Lazily import to avoid pulling next/navigation into client bundles.
    const { redirect } = await import('next/navigation');
    return redirect('/login');
  }
  return userId;
}

/**
 * For API route handlers: returns userId or a 401 NextResponse.
 * Caller must check `if (result instanceof NextResponse) return result;`
 */
export async function requireUserOrUnauthorized(): Promise<string | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return userId;
}
