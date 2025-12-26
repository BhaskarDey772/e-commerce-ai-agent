/**
 * Query Normalizer
 * Handles typos, variations, and normalizes user queries for better understanding
 */

const typoCorrections: Record<string, string> = {
  // Common spelling variations
  jewellary: "jewellery",
  jewelry: "jewellery",
  jewlery: "jewellery",
  jewellry: "jewellery",
  jewlry: "jewellery",

  // Other common typos
  laptoop: "laptop",
  moblie: "mobile",
  phne: "phone",
  shooes: "shoes",
  shose: "shoes",
  watchs: "watches",
  headfone: "headphone",
  headfones: "headphones",
  earfone: "earphone",
  earfones: "earphones",
  camra: "camera",
  tv: "television",
  tvs: "televisions",

  // Category variations
  cloths: "clothing",
  clothings: "clothing",
  footware: "footwear",
  electronis: "electronics",
  electronice: "electronics",
};

const categoryMappings: Record<string, string> = {
  // Jewellery variations
  jewellery: "jewellery",
  jewelry: "jewellery",
  jewellary: "jewellery",
  jewlery: "jewellery",
  jewellry: "jewellery",
  jewlry: "jewellery",

  // Electronics
  laptop: "laptop",
  laptoop: "laptop",
  computer: "laptop",
  pc: "laptop",
  mobile: "mobile",
  moblie: "mobile",
  phone: "mobile",
  phne: "mobile",
  smartphone: "mobile",

  // Footwear
  shoes: "footwear",
  shooes: "footwear",
  shose: "footwear",
  sneakers: "footwear",
  boots: "footwear",
  sandals: "footwear",

  // Watches
  watch: "watch",
  watchs: "watch",
  watches: "watch",
  wristwatch: "watch",

  // Audio
  headphone: "headphone",
  headfone: "headphone",
  headphones: "headphone",
  headfones: "headphone",
  earphone: "headphone",
  earphones: "headphone",
  earfone: "headphone",
  earfones: "headphone",

  // Camera
  camera: "camera",
  camra: "camera",
  cam: "camera",

  // TV
  tv: "tv",
  television: "tv",
  tvs: "tv",
  televisions: "tv",

  // Clothing
  clothing: "clothing",
  cloths: "clothing",
  clothings: "clothing",
  clothes: "clothing",

  // Footwear
  footwear: "footwear",
  footware: "footwear",
};

/**
 * Normalize user query by fixing common typos and variations
 */
export function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim();

  // Fix common typos word by word
  const words = normalized.split(/\s+/);
  const correctedWords = words.map((word) => {
    // Remove punctuation for matching
    const cleanWord = word.replace(/[.,!?;:]/g, "");
    const corrected = typoCorrections[cleanWord] || cleanWord;

    // Preserve original punctuation
    if (word !== cleanWord) {
      return word.replace(cleanWord, corrected);
    }
    return corrected;
  });

  normalized = correctedWords.join(" ");

  return normalized;
}

/**
 * Extract and normalize category from query
 */
export function extractCategory(query: string): string | undefined {
  const normalized = normalizeQuery(query);
  const words = normalized.split(/\s+/);

  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:]/g, "");
    if (categoryMappings[cleanWord]) {
      return categoryMappings[cleanWord];
    }
  }

  return undefined;
}
