// src/utils/knowledge.ts

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { prisma } from "@/lib";

const embeddingModel = openai.embedding("text-embedding-3-small");

export async function searchKnowledge(query: string, limit: number) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
  });

  const results = await prisma.$queryRawUnsafe<
    { content: string; source: string; title: string | null }[]
  >(
    `
    SELECT content, source, title
    FROM "KnowledgeBase"
    ORDER BY embedding <-> '[${embedding.join(",")}]'
    LIMIT $1
    `,
    limit,
  );

  return results;
}
