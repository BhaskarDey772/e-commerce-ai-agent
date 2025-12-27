/**
 * Product-related types and DTOs
 */

export interface ProductRow {
  id: string;
  uniqId: string;
  pid: string | null;
  productName: string;
  productUrl: string | null;
  category: string;
  categoryTree: string | null;
  retailPrice: number | null;
  discountedPrice: number | null;
  image: string | null;
  images: string | null;
  description: string | null;
  productRating: number | null;
  overallRating: number | null;
  brand: string | null;
  specifications: string | null;
  isFKAdvantage: boolean;
  crawlTimestamp: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchProductRow {
  id: string;
  uniqId: string;
  productName: string;
  category: string;
  discountedPrice: number | null;
  retailPrice: number | null;
  image: string | null;
  images: string | null;
  description: string | null;
  productRating: number | null;
  overallRating: number | null;
  brand: string | null;
}

export interface FormattedProduct {
  id: string;
  uniqId: string;
  pid: string | null;
  name: string;
  productUrl: string | null;
  category: string;
  categoryTree: string | null;
  retailPrice: number | null;
  price: number | null;
  originalPrice: number | null;
  image: string | null;
  images: string[];
  description: string | null;
  rating: number | null;
  productRating: number | null;
  overallRating: number | null;
  brand: string | null;
  specifications: unknown;
  isFKAdvantage: boolean;
  crawlTimestamp: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
