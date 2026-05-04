import prisma from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth-helpers';
import MembersClient from '@/components/dashboard/MembersClient';

export default async function MembersPage() {
  const userId = await requireUserOrRedirect();

  const members = await prisma.member.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
  });

  const initialMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
  }));

  return <MembersClient initialMembers={initialMembers} />;
}
