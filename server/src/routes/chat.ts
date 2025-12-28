import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { AppError, errorResponse, prisma, successResponse } from "@/lib";
import { SYSTEM_PROMPT } from "@/prompts/system-prompt";
import type { PolicyToolResult, ProductToolResult } from "@/types";
import {
  createChatTools,
  getOrCreateConversation,
  getOrCreateGuestId,
  normalizeQuery,
  parseLLMResponse,
} from "@/utils";

const router = Router();
const chatModel = openai("gpt-4o-mini");

const sendMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message is too long (max 10000 characters)")
    .trim()
    .refine((val) => val.length > 0, "Message cannot be empty or only whitespace"),
  sessionId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
});

router.post("/message", async (req: Request, res: Response) => {
  try {
    const body = sendMessageSchema.parse(req.body);
    const normalizedMessage = normalizeQuery(body.message);

    const guestId = getOrCreateGuestId(req, res);

    const { conversation, sessionId } = await getOrCreateConversation(
      body.conversationId,
      body.sessionId,
      guestId,
    );

    const dbMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "USER",
        content: body.message,
      },
    });

    const productToolResultRef: { value: ProductToolResult | null } = { value: null };
    const policyToolResultRef: { value: PolicyToolResult | null } = { value: null };

    const tools = createChatTools(productToolResultRef, policyToolResultRef);

    const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...dbMessages.map((m) => ({
        role: (m.sender === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: normalizedMessage },
    ];

    const result = await generateText({
      model: chatModel,
      messages: aiMessages,
      tools,
    });

    const finalResponse = parseLLMResponse(
      result.text,
      productToolResultRef.value,
      policyToolResultRef.value,
    );

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "AI",
        content: finalResponse,
      },
    });

    return res.json(
      successResponse({
        reply: finalResponse,
        sessionId,
        conversationId: conversation.id,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const errorMessage =
        firstError?.message ||
        (firstError?.path.length
          ? `${firstError.path.join(".")} is invalid`
          : "Invalid request body");
      const appError = AppError.BadRequest(errorMessage);
      return res.status(appError.statusCode).json(errorResponse(appError));
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

router.post("/conversation/new", async (req: Request, res: Response) => {
  try {
    const guestId = getOrCreateGuestId(req, res);

    const session = await prisma.session.findFirst({
      where: { guestId } as any,
      include: {
        conversations: {
          where: {
            messages: {
              none: {},
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (session && session.conversations && session.conversations.length > 0) {
      const firstConversation = session.conversations[0];
      if (firstConversation) {
        return res.json(
          successResponse({
            conversationId: firstConversation.id,
            createdAt: firstConversation.createdAt,
            isExisting: true,
          }),
        );
      }
    }

    const result = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>`
      INSERT INTO "Conversation" (id, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), NOW(), NOW())
      RETURNING id, "createdAt"
    `;

    const conversation = result[0];

    if (!conversation) {
      throw AppError.InternalServerError("Failed to create conversation");
    }

    return res.json(
      successResponse({
        conversationId: conversation.id,
        createdAt: conversation.createdAt,
        isExisting: false,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const guestId = getOrCreateGuestId(req, res);

    const session = await prisma.session.findFirst({
      where: { guestId } as any,
    });

    if (!session) {
      return res.json(
        successResponse({
          conversations: [],
        }),
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: { sessionId: session.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1, // First message for preview
        },
        _count: {
          select: { messages: true },
        },
        session: {
          select: {
            id: true,
            guestId: true as any,
            createdAt: true,
          } as any,
        },
      },
    });

    return res.json(
      successResponse({
        conversations: conversations.map((conv) => ({
          id: conv.id,
          sessionId: conv.sessionId,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messageCount: conv._count.messages,
          preview: conv.messages[0]?.content || "New conversation",
        })),
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error));
    }
    throw error;
  }
});

router.get("/conversation/:id", async (req: Request, res: Response) => {
  const conversationId = req.params.id;
  const sessionId = req.query.sessionId as string | undefined;

  if (!conversationId) {
    throw AppError.BadRequest("Conversation ID is required");
  }

  // Get conversation with messages
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    throw AppError.NotFound("Conversation not found");
  }

  if (sessionId && conversation.sessionId !== sessionId) {
    throw AppError.NotFound("Conversation not found");
  }

  return res.json(
    successResponse({
      conversationId: conversation.id,
      sessionId: conversation.sessionId,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    }),
  );
});

export default router;
