import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

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

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await Promise.all(
      texts.map((text) =>
        embed({
          model: embeddingModel,
          value: text,
        }),
      ),
    );

    return embeddings.map((result) => result.embedding);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
