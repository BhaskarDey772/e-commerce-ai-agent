import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "../src/lib/prisma";
import { embeddingToVectorString, generateEmbedding } from "../src/utils/embeddings";

/**
 * Main seed script to ingest products and policies into the database
 * with vector embeddings for semantic search
 */

async function main() {
  console.log("🌱 Starting seed process...\n");

  try {
    // Clear existing knowledge base
    console.log("🗑️  Clearing existing knowledge base...");
    await prisma.$executeRaw`TRUNCATE TABLE "KnowledgeBase"`;
    console.log("✅ Cleared existing knowledge base\n");

    // Ingest policies
    await ingestPolicies();

    console.log("\n✅ Seed process completed successfully!");
  } catch (error) {
    console.error("❌ Error during seed process:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Ingest policy markdown files
 */
async function ingestPolicies() {
  console.log("📄 Ingesting policies...");

  const policiesDir = join(process.cwd(), "seed", "policies");
  const policyFiles = ["privacy.md", "shipping.md", "return.md"];

  for (const fileName of policyFiles) {
    try {
      const filePath = join(policiesDir, fileName);
      const content = await readFile(filePath, "utf-8");

      // Extract title from first line (usually # Title)
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace(".md", "");

      // Generate embedding for the entire policy
      console.log(`  📝 Processing ${fileName}...`);
      const embedding = await generateEmbedding(content);
      const embeddingVector = embeddingToVectorString(embedding);

      // Determine source type
      const sourceType = fileName.replace(".md", "");

      // Store in database using raw SQL for vector support
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeBase" (id, source, "sourceId", title, content, embedding, "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${"policy"},
          ${sourceType},
          ${title},
          ${content},
          ${embeddingVector}::vector,
          NOW()
        )
      `;

      console.log(`  ✅ Ingested ${fileName}`);
    } catch (error) {
      console.error(`  ❌ Error processing ${fileName}:`, error);
    }
  }

  console.log("✅ Policies ingested\n");
}

// Run the seed script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
