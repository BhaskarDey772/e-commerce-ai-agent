export { createChatTools } from "./chat-tools";
export type { ProductToolResult, PolicyToolResult } from "@/types";

export { getOrCreateConversation } from "./conversation-manager";

export {
  embeddingToVectorString,
  generateEmbedding,
  generateEmbeddings,
} from "./embeddings";

export { getGuestId, getOrCreateGuestId } from "./guest-id";

export { searchKnowledge } from "./knowledge";

export {
  getCachedBrands,
  getCachedCategories,
  getCachedProductDetail,
  getCachedProducts,
  invalidateProductCache,
  setCachedBrands,
  setCachedCategories,
  setCachedProductDetail,
  setCachedProducts,
} from "./product-cache";

export {
  executeProductQuery,
  searchProducts,
  searchProductsForLLM,
} from "./query-builder";
export type { ProductQuery, ProductSearchResult } from "@/types";

export { extractCategory, normalizeQuery } from "./query-normalizer";

export { parseLLMResponse } from "./response-parser";

export { extractPolicyAnswer } from "./policy-extractor";

export { getOrCreateSession, updateSessionGuestId } from "./session-manager";

export { parseSpecifications } from "./spec-parser";

export { jsonToToon, messagesToToon, productsToToon } from "./toon-converter";
