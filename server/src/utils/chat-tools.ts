import { dynamicTool } from "ai";
import { z } from "zod";
import type { PolicyToolResult, ProductToolResult } from "@/types";
import { normalizeQuery } from "./query-normalizer";
import { searchKnowledge } from "./knowledge";
import { searchProductsForLLM } from "./query-builder";
import { env } from "@/env";
import { jsonToToon } from "./toon-converter";
import { extractPolicyAnswer } from "./policy-extractor";

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
      description:
        "Use for ALL policy questions, FAQs, and general store information. This includes: shipping, returns, refunds, privacy, order tracking, account help, payment methods, store hours, contact info, how-to questions, and any non-product questions. ALWAYS use this tool when user asks about store policies, FAQs, or general help.",
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async (input: unknown) => {
        const { query } = input as { query: string };
        const normalizedQuery = normalizeQuery(query);
        try {
          const knowledge = await searchKnowledge(normalizedQuery, 5);

          const topResult = knowledge[0];

          if (!topResult) {
            const errorResult: PolicyToolResult = {
              type: "policy_response",
              answer:
                "I don't have information about that policy. Please contact customer support for more details.",
              sources: [],
            };
            policyToolResultRef.value = errorResult;
            return jsonToToon(errorResult);
          }

          const extractedAnswer = await extractPolicyAnswer(normalizedQuery, topResult.content);

          const policyResult: PolicyToolResult = {
            type: "policy_response",
            answer: extractedAnswer,
            sources: [
              {
                title: topResult.title,
                source: topResult.source,
              },
            ],
          };

          policyToolResultRef.value = policyResult;
          return jsonToToon(policyResult);
        } catch (error) {
          console.error("Error in search_policies tool:", error);
          const errorResult: PolicyToolResult = {
            type: "policy_response",
            answer:
              "I encountered an error while searching for policy information. Please try again or contact customer support.",
          };
          policyToolResultRef.value = errorResult;
          return jsonToToon(errorResult);
        }
      },
    }),
  };
}
