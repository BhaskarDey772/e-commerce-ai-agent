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

/**
 * Converts conversation history (array of messages) to TOON format
 * for token-efficient LLM communication
 */
export function messagesToToon(messages: Array<{ role: string; content: string }>): string {
  try {
    return encode({ messages });
  } catch (error) {
    console.error("Error converting messages to TOON, falling back to JSON:", error);
    return JSON.stringify({ messages });
  }
}
