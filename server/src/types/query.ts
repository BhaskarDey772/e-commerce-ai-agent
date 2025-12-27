/**
 * Query builder types
 */

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
  brand?: string | null;
  similarity?: number;
}
