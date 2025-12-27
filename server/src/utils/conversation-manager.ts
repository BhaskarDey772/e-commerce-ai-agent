import { AppError, prisma } from "@/lib";
import { getOrCreateSession, updateSessionGuestId } from "./session-manager";

async function handleExistingConversation(
  conversationId: string,
  guestId: string,
): Promise<{ conversation: any; sessionId: string }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { session: true },
  });

  if (!conversation) {
    throw AppError.NotFound("Conversation not found");
  }

  if (!conversation.sessionId) {
    const sessionId = await getOrCreateSession(guestId);
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { sessionId },
    });
    return { conversation: updatedConversation, sessionId };
  }

  await updateSessionGuestId(conversation.sessionId, guestId);
  return { conversation, sessionId: conversation.sessionId };
}

async function handleNewConversation(
  sessionId: string | undefined,
  guestId: string,
): Promise<{ conversation: any; sessionId: string }> {
  let finalSessionId: string;

  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw AppError.NotFound("Invalid session ID");
    }

    finalSessionId = session.id;
    await updateSessionGuestId(finalSessionId, guestId);
  } else {
    finalSessionId = await getOrCreateSession(guestId);
  }

  const conversation = await prisma.conversation.create({
    data: { sessionId: finalSessionId },
  });

  return { conversation, sessionId: finalSessionId };
}

export async function getOrCreateConversation(
  conversationId: string | undefined,
  sessionId: string | undefined,
  guestId: string,
) {
  if (conversationId) {
    return handleExistingConversation(conversationId, guestId);
  }

  return handleNewConversation(sessionId, guestId);
}
