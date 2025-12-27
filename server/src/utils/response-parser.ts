import type { PolicyToolResult, ProductToolResult } from "@/types";

export function parseLLMResponse(
  llmText: string | null | undefined,
  productToolResult: ProductToolResult | null,
  policyToolResult: PolicyToolResult | null,
): string {
  if (!llmText || llmText.trim().length === 0) {
    return constructFallbackResponse(productToolResult, policyToolResult);
  }

  try {
    const parsed = JSON.parse(llmText);

    if (parsed.message !== undefined && parsed.data !== undefined) {
      if (
        parsed.data &&
        parsed.data.products &&
        Array.isArray(parsed.data.products) &&
        productToolResult &&
        productToolResult.products
      ) {
        parsed.data.products = parsed.data.products.map((p: any, idx: number) => ({
          ...p,
          productUrl: productToolResult.products[idx]?.productUrl ?? p.productUrl ?? null,
        }));
      }
      return JSON.stringify(parsed);
    }

    if (productToolResult && productToolResult.products) {
      return JSON.stringify({
        message: parsed.message || parsed.summary || "Found products matching your request.",
        data: {
          products: (parsed.products || productToolResult.products).map((p: any, idx: number) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            brand: p.brand,
            category: p.category,
            rating: p.rating,
            productUrl: productToolResult.products[idx]?.productUrl ?? p.productUrl ?? null,
          })),
        },
      });
    }

    if (policyToolResult && policyToolResult.type === "policy_response") {
      return JSON.stringify({
        message:
          parsed.message || policyToolResult.answer || "Here is the information you requested.",
        data: null,
      });
    }

    return JSON.stringify(parsed);
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    console.error("Raw response:", llmText);
    return constructFallbackResponse(productToolResult, policyToolResult);
  }
}

function constructFallbackResponse(
  productToolResult: ProductToolResult | null,
  policyToolResult: PolicyToolResult | null,
): string {
  if (productToolResult && productToolResult.products && productToolResult.products.length > 0) {
    return JSON.stringify({
      message: `Found ${productToolResult.products.length} products matching your request.`,
      data: {
        products: productToolResult.products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          brand: p.brand,
          category: p.category,
          rating: p.rating,
          productUrl: p.productUrl,
        })),
      },
    });
  }

  if (policyToolResult && policyToolResult.type === "policy_response") {
    return JSON.stringify({
      message: policyToolResult.answer,
      data: null,
    });
  }

  return JSON.stringify({
    message: "Unable to process the request. Please try again.",
    data: null,
  });
}
