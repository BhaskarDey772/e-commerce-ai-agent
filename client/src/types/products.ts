/**
 * Product-related types
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number | null;
  originalPrice?: number | null;
  image?: string;
  images?: string[];
  description?: string;
  rating?: number | null;
  brand?: string;
  specifications?: Record<string, unknown>;
  productUrl?: string;
  productRating?: number | null;
  overallRating?: number | null;
}

export interface ProductCardProps {
  product: Product;
  onClick: () => void;
  index?: number;
}

export interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      search?: string;
      sortBy?: string;
    };
  };
}
