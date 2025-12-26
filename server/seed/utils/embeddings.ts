import OpenAI from "openai";
import { env } from "../../src/env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate embedding for text using OpenAI's text-embedding-3-small model
 * Returns a vector of 1536 dimensions (matching PostgreSQL vector(1536))
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
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
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Convert embedding array to PostgreSQL vector format string
 */
export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
