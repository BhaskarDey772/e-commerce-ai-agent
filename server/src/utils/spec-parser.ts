/**
 * Parse Ruby hash format specifications to JSON
 * Handles format like: {"key"=>"value", "key2"=>"value2"}
 */

export function parseSpecifications(specStr: string | null): any {
  if (!specStr) return null;

  try {
    // Try parsing as JSON first
    return JSON.parse(specStr);
  } catch {
    // If not JSON, try parsing Ruby hash format
    try {
      // Ruby hash format: {"key"=>"value", "key2"=>"value2"}
      // We need to convert => to : and handle quotes properly

      let jsonStr = specStr.trim();

      // Replace => with :
      jsonStr = jsonStr.replace(/=>/g, ":");

      // Handle unquoted keys - add quotes around word characters before :
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      // Handle single quotes - convert to double quotes (but be careful with content)
      // First, replace single quotes around keys and simple values
      jsonStr = jsonStr.replace(/'([^']*)'/g, '"$1"');

      // Try to parse
      const parsed = JSON.parse(jsonStr);

      // If it has product_specification array, normalize it
      if (parsed.product_specification && Array.isArray(parsed.product_specification)) {
        return {
          product_specification: parsed.product_specification
            .map((item: any) => {
              // Handle both {key: value} and {value: "..."} formats
              if (item.key && item.value !== undefined) {
                return { key: item.key, value: String(item.value) };
              } else if (item.value !== undefined) {
                return { value: String(item.value) };
              }
              // Try to extract key-value pairs from the object
              const entries = Object.entries(item);
              if (entries.length === 1) {
                const [key, value] = entries[0];
                return { key: String(key), value: String(value) };
              }
              return item;
            })
            .filter((item: any) => item && (item.key || item.value)),
        };
      }

      return parsed;
    } catch (parseError) {
      // If all parsing fails, try a more aggressive approach
      try {
        // Extract product_specification array using regex
        const specMatch = specStr.match(/product_specification.*?=>\s*\[(.*?)\]/s);
        if (specMatch) {
          const arrayContent = specMatch[1];
          // Extract key-value pairs
          const items: any[] = [];
          const itemPattern = /\{([^}]+)\}/g;
          let match;

          while ((match = itemPattern.exec(arrayContent)) !== null) {
            const itemStr = match[1];
            // Try to extract key and value
            const keyMatch = itemStr.match(/"key"\s*=>\s*"([^"]+)"/);
            const valueMatch = itemStr.match(/"value"\s*=>\s*"([^"]+)"/);

            if (keyMatch && valueMatch) {
              items.push({ key: keyMatch[1], value: valueMatch[1] });
            } else if (valueMatch) {
              items.push({ value: valueMatch[1] });
            }
          }

          if (items.length > 0) {
            return { product_specification: items };
          }
        }
      } catch {
        // Fall through to raw
      }

      // If all parsing fails, return as raw
      return { raw: specStr };
    }
  }
}
