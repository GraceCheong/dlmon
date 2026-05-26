import { NextResponse } from 'next/server';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

// MVP placeholder — real textbook DB integration is not yet defined.
// Returns mock data so the UI shell can render without a real source.
export async function GET() {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    textbooks: [
      { id: 'placeholder-1', title: '신 HSK 표준 교과서 1급', publisher: '북경대학교 출판사', hskLevel: 'HSK1', available: false },
      { id: 'placeholder-2', title: '신 HSK 표준 교과서 2급', publisher: '북경대학교 출판사', hskLevel: 'HSK2', available: false },
      { id: 'placeholder-3', title: '신 HSK 표준 교과서 3급', publisher: '북경대학교 출판사', hskLevel: 'HSK3', available: false },
    ],
    _note: 'Placeholder data. Real textbook DB integration is not yet available.',
  });
}
