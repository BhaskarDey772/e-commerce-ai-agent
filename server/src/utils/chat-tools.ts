import { dynamicTool } from "ai";
import { z } from "zod";
import type { PolicyToolResult, ProductToolResult } from "@/types";
import { normalizeQuery } from "./query-normalizer";
import { searchKnowledge } from "./knowledge";
import { searchProductsForLLM } from "./query-builder";
import { env } from "@/env";

export function createChatTools(
  productToolResultRef: { value: ProductToolResult | null },
  policyToolResultRef: { value: PolicyToolResult | null },
) {
  return {
    search_products: dynamicTool({
      description: "Use ONLY for product discovery, comparison, or recommendations. Read-only.",
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async (input: unknown) => {
        const { query } = input as { query: string };
        const normalizedQuery = normalizeQuery(query);
        const result = await searchProductsForLLM(normalizedQuery, env.MAX_PRODUCT_ITEMS);

        productToolResultRef.value = result as ProductToolResult;

        return JSON.stringify(result);
      },
    }),

    search_policies: dynamicTool({
      description: "Use ONLY for store policies: shipping, returns, privacy, etc.",
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async (input: unknown) => {
        const { query } = input as { query: string };
        const normalizedQuery = normalizeQuery(query);
        try {
          const knowledge = await searchKnowledge(
            normalizedQuery,
            env.MAX_KNOWLEDGE_BASE_SEARCH_ITEMS,
          );
          const policyResult: PolicyToolResult = {
            type: "policy_response",
            answer:
              knowledge.length > 0
                ? knowledge.map((k) => k.content).join("\n\n")
                : "I don't have information about that policy. Please contact customer support for more details.",
            sources: knowledge.map((k) => ({
              title: k.title,
              source: k.source,
            })),
          };

          policyToolResultRef.value = policyResult;

          return JSON.stringify(policyResult);
        } catch (error) {
          console.error("Error in search_policies tool:", error);
          const errorResult: PolicyToolResult = {
            type: "policy_response",
            answer:
              "I encountered an error while searching for policy information. Please try again or contact customer support.",
          };
          policyToolResultRef.value = errorResult;
          return JSON.stringify(errorResult);
        }
      },
    }),
  };
}
