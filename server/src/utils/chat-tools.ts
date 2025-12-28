import { dynamicTool } from "ai";
import { z } from "zod";
import type { PolicyToolResult, ProductToolResult } from "@/types";
import { normalizeQuery } from "./query-normalizer";
import { searchKnowledge } from "./knowledge";
import { searchProductsForLLM } from "./query-builder";
import { env } from "@/env";
import { jsonToToon } from "./toon-converter";

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

        return jsonToToon(result);
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
            env.MAX_KNOWLEDGE_BASE_SEARCH_ITEMS, // Keep this, but only use top result
          );
    
          // ✅ Use ONLY the most relevant result (first one)
          const topResult = knowledge[0];
          
          if (!topResult) {
            const errorResult: PolicyToolResult = {
              type: "policy_response",
              answer:
                "I don't have information about that policy. Please contact customer support for more details.",
              sources: [],
            };
            policyToolResultRef.value = errorResult;
            return JSON.stringify(errorResult);
          }
    
          // ✅ Extract the answer from the top result
          // Truncate to max ~60 words to give room for formatting
          const maxWords = 60;
          const words = topResult.content.split(/\s+/);
          const truncatedContent = words.slice(0, maxWords).join(" ");
          const answer = words.length > maxWords 
            ? truncatedContent + "..." 
            : topResult.content;
    
          const policyResult: PolicyToolResult = {
            type: "policy_response",
            answer: answer,
            sources: [
              {
                title: topResult.title,
                source: topResult.source,
              },
            ],
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
