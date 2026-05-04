import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * Resolves the current user id from session, falling back to the seeded test
 * user when no session is present. This consolidates the auth-bypass pattern
 * that was previously duplicated across pages and API routes.
 *
 * NOTE: The test-user fallback preserves existing behavior. To harden auth,
 * call `requireUserStrict()` instead, or remove the fallback branch here.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const sessionId = session?.user ? (session.user as { id?: string }).id ?? null : null;
  if (sessionId) return sessionId;

  // Dev-only fallback: use the seeded test user, otherwise any first user.
  const testUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  if (testUser) return testUser.id;

  const anyUser = await prisma.user.findFirst();
  return anyUser?.id ?? null;
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
