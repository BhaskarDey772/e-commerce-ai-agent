import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { api } from "./api";


export function getImageUrl(url: string | null | undefined): string {
  return api.getImageUrl(url);
}

export function truncateToWords(
  text: string,
  maxLength: number = 40,
  maxWords: number = 6,
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  const words = text.trim().split(/\s+/);
  if (words.length > maxWords) {
    const truncated = words.slice(0, maxWords).join(" ");
    return truncated.length <= maxLength
      ? `${truncated}...`
      : truncateByLength(truncated, maxLength);
  }

  return truncateByLength(text, maxLength);
}

function truncateByLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.5) {
    return `${truncated.substring(0, lastSpace)}...`;
  }
 return `${truncated}...`;
}
