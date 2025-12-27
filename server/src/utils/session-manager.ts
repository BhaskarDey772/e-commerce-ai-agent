import { prisma } from "@/lib";

export async function getOrCreateSession(guestId: string): Promise<string> {
  let session = await prisma.session.findFirst({
    where: { guestId } as any,
  });

  if (!session) {
    session = await prisma.session.create({
      data: { guestId } as any,
    });
  }
  return session.id;
}

export async function updateSessionGuestId(sessionId: string, guestId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (session && !(session as any).guestId) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { guestId } as any,
    });
  }
}
