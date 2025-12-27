/**
 * Chat-related types and DTOs
 */

export interface ProductToolResult {
  type: "product_response";
  summary: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
    brand: string | null;
    category: string;
    image: string | null;
    rating: number | null;
    description: string | null;
    productUrl: string | null;
  }>;
}

export interface PolicyToolResult {
  type: "policy_response";
  answer: string;
  sources?: Array<{
    title: string | null;
    source: string;
  }>;
}
