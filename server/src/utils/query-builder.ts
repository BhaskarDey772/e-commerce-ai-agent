import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { prisma } from "@/lib";
import type { ProductQuery, ProductSearchResult } from "@/types";
import { QUERY_BUILDER_SYSTEM_PROMPT } from "@/prompts/query-builder-prompt";
import { generateEmbedding } from "./embeddings";
import { normalizeQuery } from "./query-normalizer";

async function buildProductQueryWithLLM(userQuery: string): Promise<ProductQuery> {
  const queryModel = openai("gpt-4o-mini");
  const normalizedQuery = normalizeQuery(userQuery);

  const result = await generateText({
    model: queryModel,
    messages: [
      {
        role: "system",
        content: QUERY_BUILDER_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: normalizedQuery,
      },
    ],
  });

  try {
    let jsonText = result.text.trim();

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Find JSON object - use non-greedy match to get first complete object
    const jsonMatch = jsonText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];

      // Try to fix common JSON issues
      // Remove trailing commas before closing braces/brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");

      // Fix unquoted keys
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      // Try parsing
      try {
        const parsed = JSON.parse(jsonStr);
        // Validate parsed object has expected structure
        if (typeof parsed === "object" && parsed !== null) {
          return {
            limit: 20,
            sortBy: "newest",
            ...parsed,
          };
        }
      } catch (parseError) {
        console.error("Error parsing JSON, attempting fallback:", parseError);
      }
    }
  } catch (error) {
    console.error("Error parsing LLM query response:", error);
  }

  return buildProductQueryRegex(userQuery);
}

function buildProductQueryRegex(userQuery: string): ProductQuery {
  const query: ProductQuery = {
    limit: 20,
    sortBy: "newest",
  };

  const lowerQuery = userQuery.toLowerCase();

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

  const rangeMatch = userQuery.match(/(\d+)\s*k?\s*to\s*(\d+)\s*k/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    query.minPrice = parseInt(rangeMatch[1], 10) * (rangeMatch[1].includes("k") ? 1000 : 1);
    query.maxPrice = parseInt(rangeMatch[2], 10) * (rangeMatch[2].includes("k") ? 1000 : 1);
  }

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

  if (
    lowerQuery.includes("best") ||
    lowerQuery.includes("top") ||
    lowerQuery.includes("high rating")
  ) {
    query.minRating = 4.0;
    query.sortBy = "rating_desc";
  }

  let searchText = userQuery;

  // Remove price patterns but keep the rest
  searchText = searchText.replace(/\d+\s*k?\s*(rupees|rs)?/gi, "");
  searchText = searchText.replace(/under|below|less\s+than|above|more\s+than/gi, "");
  searchText = searchText.replace(/best|top|high\s+rating/gi, "");

  // Preserve gender and descriptive terms
  // Keep words like: man, men, woman, women, boy, girl, kids, children, etc.
  // Also keep "for" when followed by these terms
  searchText = searchText.replace(/\s+/g, " ").trim();

  if (searchText.length > 2) {
    query.searchText = searchText;
  }

  return query;
}

function buildWhereClause(query: ProductQuery): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
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

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function buildOrderBy(sortBy?: string): string {
  const orderByMap: Record<string, string> = {
    price_asc: `ORDER BY "discountedPrice" ASC NULLS LAST`,
    price_desc: `ORDER BY "discountedPrice" DESC NULLS LAST`,
    rating_desc: `ORDER BY COALESCE("productRating", "overallRating", 0) DESC NULLS LAST`,
    name_asc: `ORDER BY "productName" ASC`,
    name_desc: `ORDER BY "productName" DESC`,
    newest: `ORDER BY "createdAt" DESC`,
  };

  const defaultOrder = `ORDER BY "createdAt" DESC`;
  return orderByMap[sortBy || "newest"] ?? defaultOrder;
}

function formatProductResult(product: {
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
}): ProductSearchResult {
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
}

export async function executeProductQuery(query: ProductQuery): Promise<ProductSearchResult[]> {
  const limit = query.limit || 20;
  const { clause: whereClause, params: whereParams } = buildWhereClause(query);
  const orderBy = buildOrderBy(query.sortBy);

  const productsQuery = `
    SELECT 
      id, "uniqId", "productName", category, "discountedPrice", "retailPrice",
      image, images, description, "productRating", "overallRating", brand, "productUrl"
    FROM "Product"
    ${whereClause}
    ${orderBy}
    LIMIT $${whereParams.length + 1}
  `;
  whereParams.push(limit);

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
  >(productsQuery, ...whereParams);

  return products.map(formatProductResult);
}

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
    image: string | null;
    productUrl: string | null;
  }[];
}> {
  const normalizedQuery = normalizeQuery(userQuery);
  const structuredQuery = await buildProductQueryWithLLM(normalizedQuery);
  const products = await executeProductQuery({ ...structuredQuery, limit: limit * 2 });

  if (products.length === 0) {
    return {
      type: "product_response",
      summary: "No products found matching your request.",
      products: [],
    };
  }

  const userQueryEmbedding = await generateEmbedding(normalizedQuery);

  const productsWithSimilarity = await Promise.all(
    products.map(async (product) => {
      const productText = [
        product.name,
        product.brand || "",
        product.productUrl || "",
        product.category,
        product.description || "",
      ]
        .filter(Boolean)
        .join(" ");

      const productEmbedding = await generateEmbedding(productText);
      const similarity = cosineSimilarity(userQueryEmbedding, productEmbedding);

      return {
        ...product,
        similarity,
      };
    }),
  );

  const rankedProducts = productsWithSimilarity
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, limit);

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
      image: p.image ?? null,
      rating: p.rating ?? null,
      description: p.description ?? null,
      productUrl: p.productUrl ?? null,
    })),
  };
}

export async function searchProducts(
  userQuery: string,
  limit: number = 20,
): Promise<ProductSearchResult[]> {
  const structuredQuery = await buildProductQueryWithLLM(userQuery);
  return await executeProductQuery({ ...structuredQuery, limit });
}
