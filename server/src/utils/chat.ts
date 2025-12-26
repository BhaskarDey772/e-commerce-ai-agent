import { openai } from "@ai-sdk/openai";
import type { MessageSender } from "@prisma/client";
import { generateText } from "ai";
import { AppError } from "@/lib/error";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { searchKnowledge } from "./knowledge";

const chatModel = openai("gpt-4o-mini");

// Cache TTL: 5 minutes (in seconds for Redis)
const CACHE_TTL = 5 * 60;

// Redis key prefixes
const CONVERSATION_CACHE_KEY = (conversationId: string) =>
  `conversation:${conversationId}:messages`;
const SESSION_CONVERSATION_KEY = (sessionId: string) => `session:${sessionId}:latest_conversation`;

/**
 * Get or create the latest conversation for a session
 */
export async function getOrCreateLatestConversation(sessionId: string): Promise<string> {
  // Check Redis cache first
  const cachedConversationId = await redis.get(SESSION_CONVERSATION_KEY(sessionId));

  if (cachedConversationId) {
    // Verify it still exists in DB
    const exists = await prisma.conversation.findUnique({
      where: { id: cachedConversationId },
      select: { id: true },
    });

    if (exists) {
      return cachedConversationId;
    }
  }

  // Find the most recent conversation in DB
  const latestConversation = await prisma.conversation.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (latestConversation) {
    // Cache it
    await redis.setex(SESSION_CONVERSATION_KEY(sessionId), CACHE_TTL, latestConversation.id);
    return latestConversation.id;
  }

  // Create new conversation
  const newConversation = await prisma.conversation.create({
    data: {
      sessionId,
    },
  });

  // Cache it
  await redis.setex(SESSION_CONVERSATION_KEY(sessionId), CACHE_TTL, newConversation.id);

  return newConversation.id;
}

/**
 * Get conversation with messages (with Redis caching)
 */
export async function getConversationWithMessages(conversationId: string) {
  // Check Redis cache first
  const cacheKey = CONVERSATION_CACHE_KEY(conversationId);
  const cached = await redis.get(cacheKey);

  if (cached) {
    try {
      const messages = JSON.parse(cached);
      return {
        id: conversationId,
        messages: messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        })),
      };
    } catch (error) {
      // If parsing fails, fall through to DB
      console.error("Failed to parse cached messages:", error);
    }
  }

  // Fetch from database
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

  // Update Redis cache
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(conversation.messages));

  return conversation;
}

/**
 * Add message to conversation (with Redis caching)
 */
export async function addMessage(conversationId: string, sender: MessageSender, content: string) {
  // Validate conversation exists
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw AppError.NotFound("Conversation not found");
  }

  // Create message in database
  const message = await prisma.message.create({
    data: {
      conversationId,
      sender,
      content,
    },
  });

  // Update Redis cache
  const cacheKey = CONVERSATION_CACHE_KEY(conversationId);
  const cached = await redis.get(cacheKey);

  if (cached) {
    try {
      const messages = JSON.parse(cached);
      messages.push({
        id: message.id,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      });
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(messages));
    } catch (error) {
      // If cache is corrupted, invalidate it
      await redis.del(cacheKey);
    }
  } else {
    // If no cache, fetch all messages and cache them
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (conversation) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(conversation.messages));
    }
  }

  return message;
}

/**
 * Get all conversations for a session
 */
export async function getSessionConversations(sessionId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1, // Just get the first message for preview
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  return conversations;
}

/**
 * Get all messages for a session (for reload/history)
 */
export async function getSessionMessages(sessionId: string) {
  // Get the latest conversation for this session
  const conversationId = await getOrCreateLatestConversation(sessionId);

  // Get all messages for this conversation
  const conversation = await getConversationWithMessages(conversationId);

  return conversation.messages;
}

/**
 * Clear cache for a conversation (useful after bulk operations)
 */
export async function clearConversationCache(conversationId: string) {
  await redis.del(CONVERSATION_CACHE_KEY(conversationId));
}

/**
 * Clear cache for a session
 */
export async function clearSessionCache(sessionId: string) {
  const conversationId = await redis.get(SESSION_CONVERSATION_KEY(sessionId));
  if (conversationId) {
    await redis.del(CONVERSATION_CACHE_KEY(conversationId));
  }
  await redis.del(SESSION_CONVERSATION_KEY(sessionId));
}

/**
 * Clear all caches (useful for maintenance)
 */
export async function clearAllCaches() {
  // Note: This is a simple implementation. In production, you might want
  // to use SCAN to find all keys with the prefix and delete them
  const keys = await redis.keys("conversation:*");
  const sessionKeys = await redis.keys("session:*");
  if (keys.length > 0) await redis.del(...keys);
  if (sessionKeys.length > 0) await redis.del(...sessionKeys);
}

export async function generateReply(
  userMessage: string,
  conversationHistory: { sender: "USER" | "AI"; content: string }[],
) {
  // 1. Retrieve relevant knowledge
  const knowledge = await searchKnowledge(userMessage);

  const context = knowledge.map((k) => `- ${k.content}`).join("\n");

  // 2. Build messages
  const messages = [
    {
      role: "system" as const,
      content: `
You are a helpful customer support agent for an e-commerce store.

Use the following store knowledge to answer accurately.
If the information is not present, say you are unsure.

When users ask about products:
- Analyze the product details provided
- Compare products based on price, rating, features, and specifications
- Provide recommendations based on user requirements
- Highlight key features and benefits
- Be concise but informative

If product details are provided in the conversation, analyze them thoroughly and give personalized recommendations.

Store knowledge:
${context}
      `.trim(),
    },
    ...conversationHistory.map((m) => ({
      role: m.sender === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  // 3. Generate response
  const result = await generateText({
    model: chatModel,
    messages,
  });

  return result.text;
}
