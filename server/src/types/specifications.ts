/**
 * Specification-related types
 */

export interface SpecificationItem {
  key?: string;
  value?: string;
}

export interface ParsedSpecifications {
  product_specification?: SpecificationItem[];
  raw?: string;
  [key: string]: unknown;
}
