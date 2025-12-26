/**
 * Product caching utilities using Redis
 */

import { redis } from "@/lib/redis";

// Cache TTL: 5 minutes (in seconds)
const PRODUCT_CACHE_TTL = 5 * 60;

// Cache key generators
const PRODUCTS_LIST_KEY = (params: string) => `products:list:${params}`;
const PRODUCT_DETAIL_KEY = (id: string) => `product:detail:${id}`;
const CATEGORIES_KEY = "products:categories";
const BRANDS_KEY = "products:brands";

/**
 * Generate cache key from query parameters
 */
function generateCacheKey(queryParams: Record<string, any>): string {
  const sortedParams = Object.keys(queryParams)
    .sort()
    .map((key) => `${key}=${queryParams[key]}`)
    .join("&");
  return sortedParams;
}

/**
 * Get cached products list
 */
export async function getCachedProducts(queryParams: Record<string, any>) {
  const cacheKey = generateCacheKey(queryParams);
  const key = PRODUCTS_LIST_KEY(cacheKey);

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Error reading from cache:", error);
  }

  return null;
}

/**
 * Cache products list
 */
export async function setCachedProducts(queryParams: Record<string, any>, data: any) {
  const cacheKey = generateCacheKey(queryParams);
  const key = PRODUCTS_LIST_KEY(cacheKey);

  try {
    await redis.setex(key, PRODUCT_CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

/**
 * Get cached product detail
 */
export async function getCachedProductDetail(id: string) {
  const key = PRODUCT_DETAIL_KEY(id);

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Error reading from cache:", error);
  }

  return null;
}

/**
 * Cache product detail
 */
export async function setCachedProductDetail(id: string, data: any) {
  const key = PRODUCT_DETAIL_KEY(id);

  try {
    await redis.setex(key, PRODUCT_CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

/**
 * Get cached categories
 */
export async function getCachedCategories() {
  try {
    const cached = await redis.get(CATEGORIES_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Error reading from cache:", error);
  }

  return null;
}

/**
 * Cache categories (stores the full response structure)
 */
export async function setCachedCategories(response: any) {
  try {
    await redis.setex(CATEGORIES_KEY, PRODUCT_CACHE_TTL, JSON.stringify(response));
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

/**
 * Get cached brands
 */
export async function getCachedBrands() {
  try {
    const cached = await redis.get(BRANDS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Error reading from cache:", error);
  }

  return null;
}

/**
 * Cache brands (stores the full response structure)
 */
export async function setCachedBrands(response: any) {
  try {
    await redis.setex(BRANDS_KEY, PRODUCT_CACHE_TTL, JSON.stringify(response));
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

/**
 * Invalidate product caches (call when products are updated)
 */
export async function invalidateProductCache() {
  try {
    const keys = await redis.keys("products:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Error invalidating cache:", error);
  }
}
