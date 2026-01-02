import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

const embeddingModel = openai.embedding("text-embedding-3-small");

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: embeddingModel,
      value: text,
    });

    if (!embedding || embedding.length === 0) {
      throw new Error("No embedding data returned from OpenAI");
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * Much more efficient than calling generateEmbedding() multiple times.
 * Single API call vs N API calls.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  if (texts.length === 1) {
    const embedding = await generateEmbedding(texts[0] as string);
    return [embedding];
  }

  try {
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: texts,
    });

    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error("Mismatch in embedding count from OpenAI");
    }

    return embeddings;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
