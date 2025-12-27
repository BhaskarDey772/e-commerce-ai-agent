/**
 * Image cache types
 */

export interface CacheMetadata {
  url: string;
  contentType: string;
  cachedAt: number;
  productId?: string;
}
