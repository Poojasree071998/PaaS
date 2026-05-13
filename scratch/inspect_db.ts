import prisma from '../apps/api/src/config/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users:', users.map(u => ({ id: u.id, email: u.email })));

  const teams = await prisma.team.findMany();
  console.log('Teams:', teams.map(t => ({ id: t.id, name: t.name })));

  const projects = await prisma.project.findMany({
    include: { team: true }
  });
  console.log('Projects:', projects.map(p => ({ id: p.id, name: p.name, teamId: p.teamId })));

  const members = await prisma.teamMember.findMany();
  console.log('Team Members:', members.map(m => ({ teamId: m.teamId, userId: m.userId, inviteAccepted: m.inviteAccepted })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
