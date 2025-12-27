/**
 * Chat response types
 */

export interface ProductItem {
  id: string | number;
  name: string;
  price: number;
  brand: string | null;
  category: string;
  rating: number | null;
  productUrl?: string | null;
}

export interface NewResponseFormat {
  message: string;
  data: {
    products?: ProductItem[];
  } | null;
}

export interface ProductResponse {
  type: "product_response";
  summary: string;
  products: ProductItem[];
  message: string;
}

export interface PolicyResponse {
  type: "policy_response";
  answer: string;
  message: string;
}

export interface RefusalResponse {
  type: "refusal";
  reason: string;
  message: string;
}

export type StructuredResponse =
  | NewResponseFormat
  | ProductResponse
  | PolicyResponse
  | RefusalResponse;

export interface StructuredResponseProps {
  response: StructuredResponse;
}

export interface ProductListProps {
  products: ProductItem[];
}

export interface ParsedMessageProps {
  content: string;
}
