import prisma from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth-helpers';
import MembersClient from '@/components/dashboard/MembersClient';

function parseMetadata(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function MembersPage() {
  const userId = await requireUserOrRedirect();

  const members = await prisma.member.findMany({
    where: { userId, deletedAt: null },
    orderBy: { joinedAt: 'desc' },
  });

  const initialMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    className: m.className,
    metadata: parseMetadata(m.metadata),
    joinedAt: m.joinedAt.toISOString(),
  }));

  return <MembersClient initialMembers={initialMembers} />;
}
