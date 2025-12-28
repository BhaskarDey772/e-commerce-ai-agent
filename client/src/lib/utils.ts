import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { api } from "./api";

/**
 * Get the full image URL from a partial path
 * @param url - The image URL (can be partial like /image/... or full URL)
 * @returns The full image URL with CDN domain if needed
 */
export function getImageUrl(url: string | null | undefined): string {
  return api.getImageUrl(url);
}

/**
 * Truncates text to a meaningful word length, cutting at word boundaries
 * @param text - The text to truncate
 * @param maxLength - Maximum character length (default: 40)
 * @param maxWords - Maximum number of words (default: 6)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateToWords(
  text: string,
  maxLength: number = 40,
  maxWords: number = 6,
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // First, try to truncate by word count
  const words = text.trim().split(/\s+/);
  if (words.length > maxWords) {
    const truncated = words.slice(0, maxWords).join(" ");
    return truncated.length <= maxLength
      ? `${truncated}...`
      : truncateByLength(truncated, maxLength);
  }

  // If word count is fine, truncate by character length at word boundary
  return truncateByLength(text, maxLength);
}

/**
 * Truncates text at the last word boundary before maxLength
 */
function truncateByLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  // If we found a space and it's not too close to the start, cut there
  if (lastSpace > maxLength * 0.5) {
    return `${truncated.substring(0, lastSpace)}...`;
  }

  // Otherwise, just cut at maxLength
  return `${truncated}...`;
}
