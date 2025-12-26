import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "../src/lib/prisma";
import { parseCSV } from "./utils/csv-parser";

/**
 * Seed products from CSV file
 */

interface CSVProduct {
  uniq_id: string;
  crawl_timestamp?: string;
  product_url?: string;
  product_name: string;
  product_category_tree?: string;
  pid?: string;
  retail_price?: string;
  discounted_price?: string;
  image?: string;
  is_FK_Advantage_product?: string;
  description?: string;
  product_rating?: string;
  overall_rating?: string;
  brand?: string;
  product_specifications?: string;
}

async function main() {
  console.log("🌱 Starting CSV seed process...\n");

  try {
    // Read CSV file
    const csvPath = join(process.cwd(), "seed", "flipkart_com-ecommerce_sample.csv");
    console.log(`📖 Reading CSV file: ${csvPath}`);
    const csvContent = await readFile(csvPath, "utf-8");

    // Parse CSV
    console.log("📊 Parsing CSV...");
    const rows = parseCSV(csvContent);
    console.log(`✅ Parsed ${rows.length} rows\n`);

    // Clear existing products
    console.log("🗑️  Clearing existing products...");
    await prisma.$executeRaw`TRUNCATE TABLE "Product" CASCADE`;
    console.log("✅ Cleared existing products\n");

    // Process products in batches
    const batchSize = 10;
    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(rows.length / batchSize);

      console.log(
        `📦 Processing batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, rows.length)} of ${rows.length})...`,
      );

      await Promise.all(
        batch.map(async (row) => {
          const csvRow = row as unknown as CSVProduct;
          try {
            // Skip if missing required fields
            if (!csvRow.uniq_id || !csvRow.product_name) {
              skipped++;
              return;
            }

            // Parse and validate retail price - REQUIRED
            const retailPriceStr = (csvRow.retail_price || "").trim();
            const retailPrice = retailPriceStr ? parseFloat(retailPriceStr) : null;

            // Skip if retail price is missing or invalid
            if (!retailPrice || isNaN(retailPrice) || retailPrice <= 0) {
              skipped++;
              return;
            }

            // Parse discounted price (optional)
            const discountedPriceStr = (csvRow.discounted_price || "").trim();
            const discountedPrice = discountedPriceStr ? parseFloat(discountedPriceStr) : null;
            // If discounted price is invalid, use retail price
            const finalDiscountedPrice =
              discountedPrice && !isNaN(discountedPrice) && discountedPrice > 0
                ? discountedPrice
                : retailPrice;

            // Parse ratings
            const productRatingStr = (csvRow.product_rating || "").trim();
            const overallRatingStr = (csvRow.overall_rating || "").trim();
            const productRating =
              productRatingStr && productRatingStr !== "No rating available"
                ? parseFloat(productRatingStr)
                : null;
            const overallRating =
              overallRatingStr && overallRatingStr !== "No rating available"
                ? parseFloat(overallRatingStr)
                : null;

            // Parse and validate category - REQUIRED
            let category = "";
            if (csvRow.product_category_tree) {
              try {
                const categoryTree = JSON.parse(csvRow.product_category_tree);
                if (Array.isArray(categoryTree) && categoryTree.length > 0) {
                  const categories = categoryTree[0]
                    .split(">>")
                    .map((c: string) => c.trim())
                    .filter(Boolean);
                  category = categories[0] || "";
                }
              } catch {
                // If not JSON, try direct split
                const categories = csvRow.product_category_tree
                  .split(">>")
                  .map((c) => c.trim())
                  .filter(Boolean);
                category = categories[0] || "";
              }
            }

            // Skip if category is missing or invalid
            if (!category || category.length < 2) {
              skipped++;
              return;
            }

            // Parse and validate brand - REQUIRED
            let brand = (csvRow.brand || "").trim();

            // Clean up brand - remove invalid characters and normalize
            brand = brand
              .replace(/[{}[\]"]/g, "") // Remove brackets and quotes
              .replace(/^["']|["']$/g, "") // Remove leading/trailing quotes
              .trim();

            // Skip if brand is missing or invalid (too short or contains only special chars)
            if (!brand || brand.length < 2 || /^[^a-zA-Z0-9]+$/.test(brand)) {
              skipped++;
              return;
            }

            // Clean product name
            const productName = (csvRow.product_name || "").trim();
            if (!productName || productName.length < 2) {
              skipped++;
              return;
            }

            // Parse images
            let images: string[] = [];
            if (csvRow.image) {
              try {
                images = JSON.parse(csvRow.image);
              } catch {
                if (csvRow.image) {
                  images = [csvRow.image];
                }
              }
            }

            // Parse crawl timestamp
            let crawlTimestamp: Date | null = null;
            if (csvRow.crawl_timestamp) {
              try {
                crawlTimestamp = new Date(csvRow.crawl_timestamp);
                if (isNaN(crawlTimestamp.getTime())) {
                  crawlTimestamp = null;
                }
              } catch {
                crawlTimestamp = null;
              }
            }

            // Clean description - limit length and remove invalid characters
            let description = (csvRow.description || "").trim();
            if (description.length > 5000) {
              description = description.substring(0, 5000) + "...";
            }

            // Insert product (no embeddings during seeding)
            // Use ON CONFLICT to skip duplicates
            await prisma.$executeRaw`
              INSERT INTO "Product" (
                id, "uniqId", pid, "productName", "productUrl", category, "categoryTree",
                "retailPrice", "discountedPrice", image, images, description,
                "productRating", "overallRating", brand, specifications,
                "isFKAdvantage", "crawlTimestamp", "createdAt", "updatedAt"
              )
              VALUES (
                gen_random_uuid()::text,
                ${csvRow.uniq_id.trim()},
                ${csvRow.pid ? csvRow.pid.trim() : null},
                ${productName},
                ${csvRow.product_url ? csvRow.product_url.trim() : null},
                ${category},
                ${csvRow.product_category_tree ? csvRow.product_category_tree.trim() : null},
                ${retailPrice},
                ${finalDiscountedPrice},
                ${images[0] || null},
                ${JSON.stringify(images)},
                ${description || null},
                ${productRating},
                ${overallRating},
                ${brand},
                ${csvRow.product_specifications ? csvRow.product_specifications.trim() : null},
                ${csvRow.is_FK_Advantage_product === "true" || csvRow.is_FK_Advantage_product === "True"},
                ${crawlTimestamp},
                NOW(),
                NOW()
              )
              ON CONFLICT ("uniqId") DO NOTHING
            `;

            processed++;
          } catch (error) {
            console.error(`  ❌ Error processing row ${i}:`, error);
            skipped++;
          }
        }),
      );

      // Small delay between batches
      if (i + batchSize < rows.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ CSV seed completed!`);
    console.log(`   Processed: ${processed} products`);
    console.log(`   Skipped: ${skipped} rows`);
  } catch (error) {
    console.error("❌ Error during CSV seed process:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
