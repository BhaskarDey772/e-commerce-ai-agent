import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(process.cwd(), "cache", "images");
const MAX_CACHE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generate a cache key from URL
 */
function getCacheKey(url: string): string {
  return createHash("md5").update(url).digest("hex");
}

/**
 * Get cache file path
 */
function getCachePath(url: string): string {
  const key = getCacheKey(url);
  return join(CACHE_DIR, `${key}.cache`);
}

/**
 * Get cache metadata path
 */
function getMetadataPath(url: string): string {
  const key = getCacheKey(url);
  return join(CACHE_DIR, `${key}.meta`);
}

interface CacheMetadata {
  url: string;
  contentType: string;
  cachedAt: number;
  productId?: string;
}

/**
 * Check if image is cached and valid
 */
export function isCached(url: string): boolean {
  const cachePath = getCachePath(url);
  const metadataPath = getMetadataPath(url);

  if (!existsSync(cachePath) || !existsSync(metadataPath)) {
    return false;
  }

  try {
    const metadata: CacheMetadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
    const age = Date.now() - metadata.cachedAt;

    // Check if cache is expired
    if (age > MAX_CACHE_AGE) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get cached image buffer
 */
export function getCachedImage(url: string): { buffer: Buffer; contentType: string } | null {
  if (!isCached(url)) {
    return null;
  }

  try {
    const cachePath = getCachePath(url);
    const metadataPath = getMetadataPath(url);
    const metadata: CacheMetadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
    const buffer = readFileSync(cachePath);

    return {
      buffer,
      contentType: metadata.contentType || "image/jpeg",
    };
  } catch (error) {
    console.error("Error reading cached image:", error);
    return null;
  }
}

/**
 * Generate a visible placeholder image (SVG as data URI, converted to buffer)
 */
function generatePlaceholderImage(): Buffer {
  // Create a simple SVG placeholder (200x200 gray square)
  const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#e5e7eb"/>
    <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text>
  </svg>`;
  return Buffer.from(svg, "utf-8");
}

/**
 * Download and cache image
 */
export async function downloadAndCacheImage(
  url: string,
  productId?: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  // Try original URL first (HTTP), then HTTPS, then return placeholder
  const urlsToTry = [
    url, // Original URL (usually HTTP)
    url.startsWith("http://") ? url.replace("http://", "https://") : url, // HTTPS version
  ];

  for (const tryUrl of urlsToTry) {
    try {
      // Download image with better headers to avoid 403
      // Try original HTTP URL first (most images are HTTP)
      const response = await fetch(tryUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.flipkart.com/",
        },
        redirect: "follow",
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get("content-type") || "image/jpeg";

        // Validate it's actually an image (check buffer size and content type)
        if (buffer.length === 0) {
          throw new Error("Empty image response");
        }

        // Cache the image
        const cachePath = getCachePath(url);
        const metadataPath = getMetadataPath(url);
        const metadata: CacheMetadata = {
          url,
          contentType,
          cachedAt: Date.now(),
          productId,
        };

        writeFileSync(cachePath, buffer);
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        return { buffer, contentType };
      } else {
        // Log the status for debugging
        console.warn(
          `Image download failed: ${response.status} ${response.statusText} for ${tryUrl}`,
        );
      }
    } catch (error) {
      // Continue to next URL or fallback
      console.warn(
        `Failed to download from ${tryUrl}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  // If all attempts fail, return placeholder and cache it
  console.warn(`All download attempts failed for ${url}, using placeholder`);
  const placeholder = generatePlaceholderImage();
  const cachePath = getCachePath(url);
  const metadataPath = getMetadataPath(url);
  const metadata: CacheMetadata = {
    url,
    contentType: "image/svg+xml",
    cachedAt: Date.now(),
    productId,
  };

  writeFileSync(cachePath, placeholder);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return { buffer: placeholder, contentType: "image/svg+xml" };
}

/**
 * Get or download image (with caching)
 */
export async function getImage(
  url: string,
  productId?: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  // Check cache first
  const cached = getCachedImage(url);
  if (cached) {
    return cached;
  }

  // Download and cache
  return downloadAndCacheImage(url, productId);
}

/**
 * Convert HTTP image URL to proxied HTTPS URL
 */
export function getProxiedImageUrl(originalUrl: string, productId?: string): string {
  if (!originalUrl) return "";
  // Encode the URL for use in query parameter
  const encodedUrl = encodeURIComponent(originalUrl);
  const productParam = productId ? `&productId=${productId}` : "";
  return `/api/images/proxy?url=${encodedUrl}${productParam}`;
}
