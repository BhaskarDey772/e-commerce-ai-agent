import type { ParsedSpecifications, SpecificationItem } from "@/types";

export function parseSpecifications(specStr: string | null): ParsedSpecifications | null {
  if (!specStr) return null;

  try {
    return JSON.parse(specStr);
  } catch {
    return parseRubyHashFormat(specStr);
  }
}

function parseRubyHashFormat(specStr: string): ParsedSpecifications {
  try {
    const jsonStr = convertRubyHashToJson(specStr);
    const parsed = JSON.parse(jsonStr);

    if (parsed.product_specification && Array.isArray(parsed.product_specification)) {
      return {
        product_specification: normalizeSpecificationArray(parsed.product_specification),
      };
    }

    return parsed;
  } catch {
    return extractWithRegex(specStr);
  }
}

function convertRubyHashToJson(rubyStr: string): string {
  let jsonStr = rubyStr.trim();
  jsonStr = jsonStr.replace(/=>/g, ":");
  jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  jsonStr = jsonStr.replace(/'([^']*)'/g, '"$1"');
  return jsonStr;
}

function normalizeSpecificationArray(items: unknown[]): SpecificationItem[] {
  return items
    .map((item: any) => {
      if (item.key && item.value !== undefined) {
        return { key: item.key, value: String(item.value) };
      }

      if (item.value !== undefined) {
        return { value: String(item.value) };
      }

      const entries = Object.entries(item);
      if (entries.length === 1) {
        const entry = entries[0];
        if (entry) {
          const [key, value] = entry;
          return { key: String(key), value: String(value) };
        }
      }

      return item;
    })
    .filter((item: any) => item && (item.key || item.value));
}

function extractWithRegex(specStr: string): ParsedSpecifications {
  try {
    const specMatch = specStr.match(/product_specification.*?=>\s*\[(.*?)\]/s);
    if (!specMatch || !specMatch[1]) {
      return { raw: specStr };
    }

    const arrayContent = specMatch[1];
    const items: SpecificationItem[] = [];
    const itemPattern = /\{([^}]+)\}/g;
    let match;

    while ((match = itemPattern.exec(arrayContent)) !== null) {
      const itemStr = match[1];
      if (!itemStr) continue;

      const keyMatch = itemStr.match(/"key"\s*=>\s*"([^"]+)"/);
      const valueMatch = itemStr.match(/"value"\s*=>\s*"([^"]+)"/);

      if (keyMatch && valueMatch) {
        items.push({ key: keyMatch[1], value: valueMatch[1] });
      } else if (valueMatch) {
        items.push({ value: valueMatch[1] });
      }
    }

    return items.length > 0 ? { product_specification: items } : { raw: specStr };
  } catch {
    return { raw: specStr };
  }
}
