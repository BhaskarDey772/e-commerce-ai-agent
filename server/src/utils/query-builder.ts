/**
 * Query Builder Tool for AI
 * Parses natural language queries and builds product search queries
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "../utils/embeddings";
import { normalizeQuery } from "./query-normalizer";

export interface ProductQuery {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  searchText?: string;
  limit?: number;
  sortBy?: "price_asc" | "price_desc" | "rating_desc" | "name_asc" | "name_desc" | "newest";
}

export interface ProductSearchResult {
  id: string;
  name: string;
  productUrl?: string;
  category: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  description?: string;
  rating?: number;
  brand?: string;
  similarity?: number;
}

/**
 * Build a product query from natural language using LLM
 * Converts user message to structured JSON query
 */
async function buildProductQueryWithLLM(userQuery: string): Promise<ProductQuery> {
  const queryModel = openai("gpt-4o-mini");
  const normalizedQuery = normalizeQuery(userQuery);

  const result = await generateText({
    model: queryModel,
    messages: [
      {
        role: "system",
        content: `You are a query builder that converts natural language product search requests into structured JSON queries.

IMPORTANT - TYPO HANDLING:
- Users may have typos in their queries. Understand the INTENT, not just exact spelling.
- Common typos: "jewellary/jewelry" = jewellery, "moblie" = mobile, "shooes" = shoes, "laptoop" = laptop
- "jewellary", "jewelry", "jewlery", "jewellry" all mean "jewellery"
- "moblie", "phne" mean "mobile" or "phone"
- "shooes", "shose" mean "shoes" or "footwear"
- Always interpret the user's intent correctly despite spelling mistakes

Product Schema:
- category: string (optional) - e.g., "laptop", "mobile", "electronics", "clothing", "footwear", "watch", "camera", "tv", "headphone", "furniture", "jewellery"
- brand: string (optional) - e.g., "Samsung", "Apple", "Nike", "HP", "Dell"
- minPrice: number (optional) - minimum price in rupees
- maxPrice: number (optional) - maximum price in rupees
- minRating: number (optional) - minimum rating (0-5)
- searchText: string (optional) - text to search in product name or description
- sortBy: "price_asc" | "price_desc" | "rating_desc" | "name_asc" | "name_desc" | "newest" (default: "newest")

Rules:
- Extract price mentions (e.g., "under 20k" = maxPrice: 20000, "above 5k" = minPrice: 5000, "under 1000" = maxPrice: 1000)
- Extract category from keywords, handling typos intelligently (e.g., "jewellary" = "jewellery", "moblie" = "mobile", "shooes" = "footwear")
- Extract brand names if mentioned
- Set minRating to 4.0 if user asks for "best", "top", or "high rating"
- Set sortBy to "rating_desc" for best/top products, "price_asc" for cheapest, "price_desc" for most expensive
- For price-based queries (e.g., "under 1000"), set maxPrice appropriately
- Return ONLY valid JSON, no explanations

Examples:
User: "find me laptop under 20k"
Response: {"category": "laptop", "maxPrice": 20000, "sortBy": "newest"}

User: "find me good jewellary under 1000 rupees"
Response: {"category": "jewellery", "maxPrice": 1000, "minRating": 4.0, "sortBy": "rating_desc"}

User: "show me moblie phones"
Response: {"category": "mobile", "sortBy": "newest"}`,
      },
      {
        role: "user",
        content: normalizedQuery,
      },
    ],
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        limit: 20,
        sortBy: "newest",
        ...parsed,
      };
    }
  } catch (error) {
    console.error("Error parsing LLM query response:", error);
  }

  return buildProductQueryRegex(userQuery);
}

function buildProductQueryRegex(userQuery: string): ProductQuery {
  // Extract common patterns from user query
  const query: ProductQuery = {
    limit: 20,
    sortBy: "newest",
  };

  const lowerQuery = userQuery.toLowerCase();

  // Extract price range (e.g., "under 20k", "below 5000", "between 10k and 20k")
  const pricePatterns = [
    { pattern: /under\s+(\d+)\s*k/i, multiplier: 1000 },
    { pattern: /below\s+(\d+)\s*k/i, multiplier: 1000 },
    { pattern: /less\s+than\s+(\d+)\s*k/i, multiplier: 1000 },
    { pattern: /under\s+(\d+)/i, multiplier: 1 },
    { pattern: /below\s+(\d+)/i, multiplier: 1 },
    { pattern: /less\s+than\s+(\d+)/i, multiplier: 1 },
    { pattern: /(\d+)\s*k\s+rupees/i, multiplier: 1000 },
    { pattern: /(\d+)\s+rupees/i, multiplier: 1 },
    { pattern: /₹\s*(\d+)\s*k/i, multiplier: 1000 },
    { pattern: /₹\s*(\d+)/i, multiplier: 1 },
  ];

  for (const { pattern, multiplier } of pricePatterns) {
    const match = userQuery.match(pattern);
    if (match && match[1]) {
      query.maxPrice = parseInt(match[1], 10) * multiplier;
      break;
    }
  }

  // Extract minimum price
  const minPricePatterns = [
    { pattern: /above\s+(\d+)\s*k/i, multiplier: 1000 },
    { pattern: /more\s+than\s+(\d+)\s*k/i, multiplier: 1000 },
    { pattern: /above\s+(\d+)/i, multiplier: 1 },
    { pattern: /more\s+than\s+(\d+)/i, multiplier: 1 },
  ];

  for (const { pattern, multiplier } of minPricePatterns) {
    const match = userQuery.match(pattern);
    if (match && match[1]) {
      query.minPrice = parseInt(match[1], 10) * multiplier;
      break;
    }
  }

  // Extract price range
  const rangeMatch = userQuery.match(/(\d+)\s*k?\s*to\s*(\d+)\s*k/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    query.minPrice = parseInt(rangeMatch[1], 10) * (rangeMatch[1].includes("k") ? 1000 : 1);
    query.maxPrice = parseInt(rangeMatch[2], 10) * (rangeMatch[2].includes("k") ? 1000 : 1);
  }

  // Extract category keywords
  const categoryKeywords: Record<string, string[]> = {
    laptop: ["laptop", "notebook", "laptops"],
    mobile: ["mobile", "phone", "smartphone", "phones"],
    clothing: ["clothing", "clothes", "apparel", "wear"],
    electronics: ["electronics", "electronic", "device"],
    furniture: ["furniture", "sofa", "chair", "table"],
    footwear: ["footwear", "shoes", "sneakers", "boots"],
    watch: ["watch", "watches", "timepiece"],
    camera: ["camera", "cameras", "dslr"],
    tv: ["tv", "television", "televisions"],
    headphone: ["headphone", "headphones", "earphone", "earphones"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerQuery.includes(keyword))) {
      query.category = category;
      break;
    }
  }

  // Extract brand
  const commonBrands = [
    "samsung",
    "apple",
    "nike",
    "adidas",
    "sony",
    "lg",
    "hp",
    "dell",
    "canon",
    "nikon",
    "bose",
    "jbl",
    "philips",
    "panasonic",
    "whirlpool",
    "oneplus",
    "xiaomi",
    "realme",
    "oppo",
    "vivo",
    "motorola",
  ];

  for (const brand of commonBrands) {
    if (lowerQuery.includes(brand)) {
      query.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }

  // Extract rating requirements
  if (
    lowerQuery.includes("best") ||
    lowerQuery.includes("top") ||
    lowerQuery.includes("high rating")
  ) {
    query.minRating = 4.0;
    query.sortBy = "rating_desc";
  }

  // Extract search text (remove price/category/brand keywords)
  let searchText = userQuery;
  // Remove price patterns
  searchText = searchText.replace(/\d+\s*k?\s*(rupees|rs)?/gi, "");
  searchText = searchText.replace(/under|below|less\s+than|above|more\s+than/gi, "");
  searchText = searchText.replace(/best|top|high\s+rating/gi, "");
  searchText = searchText.trim();

  if (searchText.length > 3) {
    query.searchText = searchText;
  }

  return query;
}

/**
 * Build a product query from natural language
 * Uses LLM first, falls back to regex if needed
 */
export async function buildProductQuery(userQuery: string): Promise<ProductQuery> {
  return await buildProductQueryWithLLM(userQuery);
}

/**
 * Execute product query and return results
 */
export async function executeProductQuery(query: ProductQuery): Promise<ProductSearchResult[]> {
  const limit = query.limit || 20;

  // Build WHERE conditions
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (query.category) {
    conditions.push(`category ILIKE $${paramIndex}`);
    params.push(`%${query.category}%`);
    paramIndex++;
  }

  if (query.brand) {
    conditions.push(`brand ILIKE $${paramIndex}`);
    params.push(`%${query.brand}%`);
    paramIndex++;
  }

  if (query.minPrice !== undefined) {
    conditions.push(`"discountedPrice" >= $${paramIndex}`);
    params.push(query.minPrice);
    paramIndex++;
  }

  if (query.maxPrice !== undefined) {
    conditions.push(`"discountedPrice" <= $${paramIndex}`);
    params.push(query.maxPrice);
    paramIndex++;
  }

  if (query.minRating !== undefined) {
    conditions.push(`(COALESCE("productRating", "overallRating", 0) >= $${paramIndex})`);
    params.push(query.minRating);
    paramIndex++;
  }

  if (query.searchText) {
    conditions.push(`("productName" ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${query.searchText}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Build ORDER BY clause
  let orderBy = "";
  switch (query.sortBy) {
    case "price_asc":
      orderBy = `ORDER BY "discountedPrice" ASC NULLS LAST`;
      break;
    case "price_desc":
      orderBy = `ORDER BY "discountedPrice" DESC NULLS LAST`;
      break;
    case "rating_desc":
      orderBy = `ORDER BY COALESCE("productRating", "overallRating", 0) DESC NULLS LAST`;
      break;
    case "name_asc":
      orderBy = `ORDER BY "productName" ASC`;
      break;
    case "name_desc":
      orderBy = `ORDER BY "productName" DESC`;
      break;
    case "newest":
    default:
      orderBy = `ORDER BY "createdAt" DESC`;
      break;
  }

  // Execute query
  const productsQuery = `
    SELECT 
      id, "uniqId", "productName", category, "discountedPrice", "retailPrice",
      image, images, description, "productRating", "overallRating", brand, "productUrl"
    FROM "Product"
    ${whereClause}
    ${orderBy}
    LIMIT $${paramIndex}
  `;
  params.push(limit);

  const products = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      uniqId: string;
      productName: string;
      category: string;
      discountedPrice: number | null;
      retailPrice: number | null;
      image: string | null;
      images: string | null;
      description: string | null;
      productUrl: string | null;
      productRating: number | null;
      overallRating: number | null;
      brand: string | null;
    }>
  >(productsQuery, ...params);

  // Format results
  return products.map((product) => {
    let images: string[] = [];
    if (product.images) {
      try {
        images = JSON.parse(product.images);
      } catch {
        images = [];
      }
    }

    return {
      id: product.id,
      name: product.productName,
      category: product.category,
      price: product.discountedPrice || product.retailPrice || 0,
      originalPrice: product.retailPrice || undefined,
      image: product.image || images[0] || undefined,
      images,
      description: product.description || undefined,
      productUrl: product.productUrl || undefined,
      rating: product.productRating || product.overallRating || undefined,
      brand: product.brand || undefined,
    };
  });
}

/**
 * Create text representation of products for LLM analysis
 */
function createProductsText(products: ProductSearchResult[]): string {
  if (products.length === 0) {
    return "No products found matching the criteria.";
  }

  return products
    .map((product, index) => {
      const parts: (string | null)[] = [
        `${index + 1}. ${product.name}`,
        product.brand ? `Brand: ${product.brand}` : null,
        `Price: ₹${product.price.toLocaleString()}${product.originalPrice && product.originalPrice > product.price ? ` (Original: ₹${product.originalPrice.toLocaleString()})` : ""}`,
        product.rating ? `Rating: ${product.rating}/5` : null,
        `Category: ${product.category}`,
        product.description
          ? `Description: ${product.description.substring(0, 200)}${product.description.length > 200 ? "..." : ""}`
          : null,
      ];

      const filteredParts = parts.filter((part): part is string => part !== null);

      return filteredParts.join("\n");
    })
    .join("\n\n");
}

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Search products and prepare context for LLM
 * Flow:
 * 1. Call LLM to convert user message to JSON query
 * 2. Generate Prisma query from JSON
 * 3. Fetch products from DB (fetch more for filtering)
 * 4. Embed product descriptions + user message
 * 5. Compare embeddings with user request using cosine similarity
 * 6. Return filtered and ranked products
 */
export async function searchProductsForLLM(
  userQuery: string,
  limit: number = 7,
): Promise<{
  type: "product_response";
  summary: string;
  products: {
    id: string;
    name: string;
    price: number;
    brand: string | null;
    category: string;
    rating: number | null;
    description: string | null;
    productUrl: string | null;
  }[];
}> {
  // Step 1: Normalize and convert user message to JSON query
  const normalizedQuery = normalizeQuery(userQuery);
  const structuredQuery = await buildProductQuery(normalizedQuery);

  // Step 2: Generate Prisma query from JSON and fetch products (fetch more for filtering)
  const products = await executeProductQuery({ ...structuredQuery, limit: limit * 2 });

  if (products.length === 0) {
    return {
      type: "product_response",
      summary: "No products found matching your request.",
      products: [],
    };
  }

  // Step 3: Embed normalized user query
  const userQueryEmbedding = await generateEmbedding(normalizedQuery);

  // Step 4: Embed product descriptions and calculate similarity
  const productsWithSimilarity = await Promise.all(
    products.map(async (product) => {
      // Create text representation for embedding
      const productText = [
        product.name,
        product.brand || "",
        product.productUrl || "",
        product.category,
        product.description || "",
      ]
        .filter(Boolean)
        .join(" ");

      // Generate embedding for product
      const productEmbedding = await generateEmbedding(productText);

      // Calculate similarity
      const similarity = cosineSimilarity(userQueryEmbedding, productEmbedding);

      return {
        ...product,
        similarity,
      };
    }),
  );

  // Step 5: Sort by similarity and take top results
  const rankedProducts = productsWithSimilarity
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, limit);

  // Step 6: Return response
  return {
    type: "product_response",
    summary:
      rankedProducts.length === 0
        ? "No products found matching your request."
        : `Found ${rankedProducts.length} products matching your request.`,
    products: rankedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      brand: p.brand ?? null,
      category: p.category,
      rating: p.rating ?? null,
      description: p.description ?? null,
      productUrl: p.productUrl ?? null,
    })),
  };
}

/**
 * Search products (simple version for API endpoints)
 */
export async function searchProducts(
  userQuery: string,
  limit: number = 20,
): Promise<ProductSearchResult[]> {
  const structuredQuery = await buildProductQuery(userQuery);
  return await executeProductQuery({ ...structuredQuery, limit });
}
