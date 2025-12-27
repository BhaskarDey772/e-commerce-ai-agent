const typoCorrections: Record<string, string> = {
  jewellary: "jewellery",
  jewelry: "jewellery",
  jewlery: "jewellery",
  jewellry: "jewellery",
  jewlry: "jewellery",

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

  cloths: "clothing",
  clothings: "clothing",
  footware: "footwear",
  electronis: "electronics",
  electronice: "electronics",
};

const categoryMappings: Record<string, string> = {
  jewellery: "jewellery",
  jewelry: "jewellery",
  jewellary: "jewellery",
  jewlery: "jewellery",
  jewellry: "jewellery",
  jewlry: "jewellery",

  laptop: "laptop",
  laptoop: "laptop",
  computer: "laptop",
  pc: "laptop",
  mobile: "mobile",
  moblie: "mobile",
  phone: "mobile",
  phne: "mobile",
  smartphone: "mobile",

  shoes: "footwear",
  shooes: "footwear",
  shose: "footwear",
  sneakers: "footwear",
  boots: "footwear",
  sandals: "footwear",

  watch: "watch",
  watchs: "watch",
  watches: "watch",
  wristwatch: "watch",

  headphone: "headphone",
  headfone: "headphone",
  headphones: "headphone",
  headfones: "headphone",
  earphone: "headphone",
  earphones: "headphone",
  earfone: "headphone",
  earfones: "headphone",

  camera: "camera",
  camra: "camera",
  cam: "camera",

  tv: "tv",
  television: "tv",
  tvs: "tv",
  televisions: "tv",

  clothing: "clothing",
  cloths: "clothing",
  clothings: "clothing",
  clothes: "clothing",

  footwear: "footwear",
  footware: "footwear",
};

export function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim();

  const words = normalized.split(/\s+/);
  const correctedWords = words.map((word) => {
    const cleanWord = word.replace(/[.,!?;:]/g, "");
    const corrected = typoCorrections[cleanWord] || cleanWord;

    if (word !== cleanWord) {
      return word.replace(cleanWord, corrected);
    }
    return corrected;
  });

  normalized = correctedWords.join(" ");

  return normalized;
}

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
