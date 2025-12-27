import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { imageAPI } from "./image-api";

/**
 * Get proxied image URL (server-side caching and HTTPS conversion)
 * @param url - The original image URL (can be HTTP or HTTPS)
 * @param productId - Optional product ID for better caching
 * @returns The proxied image URL served through the server
 */
export function getProxiedImageUrl(
  url: string | null | undefined,
  productId?: string | null,
): string {
  return imageAPI.getProxiedImageUrl(url, productId);
}

/**
 * @deprecated Use getProxiedImageUrl instead for better caching and HTTPS support
 * Convert HTTP URLs to HTTPS to fix mixed content issues
 * @param url - The URL to convert
 * @returns The URL with HTTPS protocol, or the original URL if it's not HTTP
 */
export function ensureHttps(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  return url;
}
