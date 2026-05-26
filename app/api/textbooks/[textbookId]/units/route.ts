import { NextResponse } from 'next/server';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    units: [],
    _note: 'Placeholder. Textbook unit data is not yet available.',
  });
}
