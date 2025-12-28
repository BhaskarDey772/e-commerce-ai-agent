import { encode } from "@toon-format/toon";

export function jsonToToon(data: unknown): string {
  try {
    return encode(data);
  } catch (error) {
    console.error("Error converting JSON to TOON, falling back to JSON:", error);
    return JSON.stringify(data);
  }
}

export function productsToToon(products: Array<Record<string, unknown>>): string {
  try {
    return encode({ products });
  } catch (error) {
    console.error("Error converting products to TOON, falling back to JSON:", error);
    return JSON.stringify({ products });
  }
}
