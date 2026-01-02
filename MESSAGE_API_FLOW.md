# `/message` API Flow - Step-by-Step Analysis

## Example Query
**User Input:** `"find me good jewellary under 1000 rupees"`

---

## STEP 1: Request Validation & Initial Normalization
**File:** `server/src/routes/chat.ts` (Line 30-33)

**Input:**
```json
{
  "message": "find me good jewellary under 1000 rupees",
  "conversationId": "abc-123-uuid" // optional
}
```

**Process:**
1. Zod schema validation (`sendMessageSchema.parse()`)
2. First normalization: `normalizeQuery(body.message)`

**Query Evolution:**
```
Original:  "find me good jewellary under 1000 rupees"
           ↓ normalizeQuery()
Normalized: "find me good jewellery under 1000 rupees"
            (typo fixed: "jewellary" → "jewellery")
```

**Code:**
```typescript
const body = sendMessageSchema.parse(req.body);
const normalizedMessage = normalizeQuery(body.message);
// normalizedMessage = "find me good jewellery under 1000 rupees"
```

---

## STEP 2: Session & Conversation Management
**File:** `server/src/routes/chat.ts` (Line 35-41)

**Process:**
1. Get or create `guestId` from cookie
2. Get or create conversation (new or existing)

**Query State:**
```
Query: "find me good jewellery under 1000 rupees" (unchanged)
Conversation ID: "abc-123-uuid"
Session ID: "session-456-uuid" (created if new)
```

**Code:**
```typescript
const guestId = getOrCreateGuestId(req, res);
const { conversation, sessionId } = await getOrCreateConversation(
  body.conversationId,
  body.sessionId,
  guestId,
);
```

---

## STEP 3: Load Message History
**File:** `server/src/routes/chat.ts` (Line 43-46)

**Process:**
1. Fetch all previous messages in conversation
2. Order by `createdAt` ascending

**Query State:**
```
Query: "find me good jewellery under 1000 rupees" (unchanged)
Previous Messages: [
  { role: "user", content: "hello" },
  { role: "assistant", content: "Hi! How can I help?" }
]
```

**Code:**
```typescript
const dbMessages = await prisma.message.findMany({
  where: { conversationId: conversation.id },
  orderBy: { createdAt: "asc" },
});
```

---

## STEP 4: Save User Message to Database
**File:** `server/src/routes/chat.ts` (Line 48-54)

**Process:**
1. Store original (non-normalized) message in DB

**Query State:**
```
Original (saved to DB): "find me good jewellary under 1000 rupees"
Normalized (for processing): "find me good jewellery under 1000 rupees"
```

**Code:**
```typescript
await prisma.message.create({
  data: {
    conversationId: conversation.id,
    sender: "USER",
    content: body.message, // Original, not normalized
  },
});
```

---

## STEP 5: Create AI Tools
**File:** `server/src/routes/chat.ts` (Line 56-59)

**Process:**
1. Create tool result references (for storing results)
2. Create tools: `search_products`, `search_policies`

**Query State:**
```
Query: "find me good jewellery under 1000 rupees" (unchanged)
Tools Available:
  - search_products(query: string)
  - search_policies(query: string)
```

**Code:**
```typescript
const productToolResultRef: { value: ProductToolResult | null } = { value: null };
const policyToolResultRef: { value: PolicyToolResult | null } = { value: null };
const tools = createChatTools(productToolResultRef, policyToolResultRef);
```

---

## STEP 6: Build AI Messages Array
**File:** `server/src/routes/chat.ts` (Line 61-71)

**Process:**
1. System prompt (defines AI behavior)
2. Previous messages (conversation history)
3. Current normalized message

**Query Evolution:**
```
Messages Array:
[
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: "hello" },
  { role: "assistant", content: "Hi! How can I help?" },
  { role: "user", content: "find me good jewellery under 1000 rupees" }
]
```

**Code:**
```typescript
const aiMessages = [
  { role: "system", content: SYSTEM_PROMPT },
  ...dbMessages.map((m) => ({
    role: (m.sender === "USER" ? "user" : "assistant"),
    content: m.content,
  })),
  { role: "user", content: normalizedMessage },
];
```

---

## STEP 7: LLM Call with Tools
**File:** `server/src/routes/chat.ts` (Line 73-77)

**Process:**
1. LLM analyzes query and conversation history
2. LLM decides which tool to call (or responds directly)
3. For product queries, LLM calls `search_products` tool

**Query Evolution:**
```
LLM Analysis:
  Intent: Product search
  Tool Selected: search_products
  Tool Input: "find me good jewellery under 1000 rupees"
             (LLM may modify query, e.g., "jewellery under 1000")
```

**Code:**
```typescript
const result = await generateText({
  model: chatModel, // gpt-4o-mini
  messages: aiMessages,
  tools,
});
// LLM decides to call: search_products({ query: "jewellery under 1000" })
```

---

## STEP 8: Tool Execution - search_products
**File:** `server/src/utils/chat-tools.ts` (Line 21-29)

**Process:**
1. Tool receives query from LLM (may be modified)
2. Normalize query again (LLM may have modified it)
3. Call `searchProductsForLLM()`

**Query Evolution:**
```
Tool Input (from LLM): "jewellery under 1000"
                      ↓ normalizeQuery() (in tool)
Normalized: "jewellery under 1000"
            (already normalized, no changes)
```

**Code:**
```typescript
execute: async (input: unknown) => {
  const { query } = input as { query: string };
  const normalizedQuery = normalizeQuery(query); // Second normalization
  const result = await searchProductsForLLM(normalizedQuery, env.MAX_PRODUCT_ITEMS);
  // env.MAX_PRODUCT_ITEMS = 7
}
```

---

## STEP 9: Query Builder - LLM-based Query Generation
**File:** `server/src/utils/query-builder.ts` (Line 9-61)

**Process:**
1. Pass normalized query to LLM query builder
2. LLM converts natural language to structured JSON
3. Fallback to regex if LLM fails

**Query Evolution:**
```
Input: "jewellery under 1000"
       ↓ buildProductQueryWithLLM()
       ↓ LLM converts to structured query
Structured Query:
{
  category: "jewellery",
  maxPrice: 1000,
  minRating: undefined,
  limit: 14,  // fetchLimit = 7 * 2
  sortBy: "newest"
}
```

**Code:**
```typescript
const fetchLimit = limit * 2; // 7 * 2 = 14
const structuredQuery = await buildProductQueryWithLLM(normalizedQuery, fetchLimit);
// Returns: { category: "jewellery", maxPrice: 1000, limit: 14, ... }
```

**LLM Query Builder Process:**
```
LLM Input: "jewellery under 1000"
LLM Output (JSON):
{
  "category": "jewellery",
  "maxPrice": 1000,
  "limit": 14,
  "sortBy": "newest"
}
```

---

## STEP 10: Execute Database Query
**File:** `server/src/utils/query-builder.ts` (Line 296-331)

**Process:**
1. Build SQL WHERE clause from structured query
2. Execute PostgreSQL query
3. Fetch 14 products (fetchLimit)

**Query Evolution:**
```
Structured Query:
{
  category: "jewellery",
  maxPrice: 1000,
  limit: 14
}
       ↓ executeProductQuery()
       ↓ Build SQL
SQL Query:
SELECT * FROM "Product"
WHERE category ILIKE '%jewellery%'
  AND "discountedPrice" <= 1000
ORDER BY "createdAt" DESC
LIMIT 14

Result: 14 products fetched from database
```

**Code:**
```typescript
const products = await executeProductQuery({ ...structuredQuery, limit: fetchLimit });
// Returns: Array of 14 ProductSearchResult objects
```

---

## STEP 11: Generate Embeddings & Rank Products (BATCH)
**File:** `server/src/utils/query-builder.ts` (Line 377-403)

**Process:**
1. Prepare all texts (1 user query + N products)
2. Generate all embeddings in **single API call** using `embedMany`
3. Calculate cosine similarity for each product
4. Sort by similarity and take top 7

**Query Evolution:**
```
User Query: "jewellery under 1000"
14 Products: ["Gold Necklace XYZ...", "Silver Ring ABC...", ...]

       ↓ generateEmbeddings([userQuery, ...productTexts])
       ↓ SINGLE API CALL (15 texts at once)

All Embeddings Returned:
  [0]: User Query Embedding [0.123, -0.456, ...] (1536 dimensions)
  [1]: Product 1 Embedding [0.234, -0.567, ...]
  [2]: Product 2 Embedding [0.345, -0.678, ...]
  ...
  [14]: Product 14 Embedding [0.456, -0.789, ...]

       ↓ cosineSimilarity(userEmbedding, productEmbedding)

Ranked Products (by similarity):
  1. Product A (similarity: 0.92)
  2. Product B (similarity: 0.89)
  3. Product C (similarity: 0.85)
  ...
  14. Product N (similarity: 0.45)

       ↓ slice(0, 7)
Top 7 Products Selected
```

**Performance Improvement:**
```
Before: 15 API calls (1 user + 14 products) = ~1500ms
After:  1 API call (batch of 15 texts)      = ~200ms
Speedup: ~7.5x faster
```

**Code:**
```typescript
// Prepare all texts for batch embedding
const productTexts = products.map((product) =>
  [product.name, product.brand, product.category, product.description].join(" ")
);

// Single API call for all embeddings (user query + all products)
const allTexts = [normalizedQuery, ...productTexts];
const allEmbeddings = await generateEmbeddings(allTexts);

const userQueryEmbedding = allEmbeddings[0];
const productEmbeddings = allEmbeddings.slice(1);

// Calculate similarity for each product
const productsWithSimilarity = products.map((product, index) => {
  const similarity = cosineSimilarity(userQueryEmbedding, productEmbeddings[index]);
  return { ...product, similarity };
});

const rankedProducts = productsWithSimilarity
  .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
  .slice(0, limit); // Top 7
```

---

## STEP 12: Format Product Results
**File:** `server/src/utils/query-builder.ts` (Line 405-422)

**Process:**
1. Format top 7 products into response structure
2. Return structured result

**Query Evolution:**
```
Ranked Products (7 items)
       ↓ Format
Product Tool Result:
{
  type: "product_response",
  summary: "Found 7 products matching your request.",
  products: [
    {
      id: "prod-1",
      name: "Gold Necklace",
      price: 899,
      brand: "XYZ",
      category: "jewellery",
      rating: 4.5,
      ...
    },
    ... (6 more products)
  ]
}
```

**Code:**
```typescript
return {
  type: "product_response",
  summary: `Found ${rankedProducts.length} products matching your request.`,
  products: rankedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    brand: p.brand ?? null,
    category: p.category,
    image: p.image ?? null,
    rating: p.rating ?? null,
    description: p.description ?? null,
    productUrl: p.productUrl ?? null,
  })),
};
```

---

## STEP 13: Convert to TOON Format
**File:** `server/src/utils/chat-tools.ts` (Line 28)

**Process:**
1. Convert product results to TOON format (token-efficient)
2. Return TOON string to LLM

**Query Evolution:**
```
Product Result (JSON):
{
  "type": "product_response",
  "summary": "Found 7 products...",
  "products": [
    {"id": "1", "name": "Gold Necklace", "price": 899, ...},
    ...
  ]
}
       ↓ jsonToToon()
TOON Format (30-60% fewer tokens):
products[7]{id,name,price,brand,category,rating,image,productUrl}:
  1,Gold Necklace,899,XYZ,jewellery,4.5,/image/necklace.jpg,https://...
  2,Silver Ring,750,ABC,jewellery,4.2,/image/ring.jpg,https://...
  ...
```

**Code:**
```typescript
productToolResultRef.value = result as ProductToolResult;
return jsonToToon(result); // Returns TOON string to LLM
```

---

## STEP 14: LLM Generates Final Response
**File:** `server/src/routes/chat.ts` (Line 73-77)

**Process:**
1. LLM receives TOON-formatted product data
2. LLM generates conversational response
3. LLM formats response as JSON

**Query Evolution:**
```
LLM Receives:
  - Tool result (TOON format)
  - Conversation history
  - System prompt

LLM Generates:
{
  "message": "I found 7 beautiful jewellery pieces under ₹1000! Here are some great options:\n\n1. **Gold Necklace** - ₹899 (4.5⭐)\n2. **Silver Ring** - ₹750 (4.2⭐)\n...",
  "data": {
    "products": [...] // Reference to tool result
  }
}
```

**Code:**
```typescript
const result = await generateText({
  model: chatModel,
  messages: aiMessages,
  tools,
});
// result.text contains LLM's JSON response
```

---

## STEP 15: Parse & Merge LLM Response
**File:** `server/src/utils/response-parser.ts` (Line 3-64)

**Process:**
1. Parse LLM's JSON response
2. Merge with tool results (ensure productUrl is included)
3. Format final response

**Query Evolution:**
```
LLM Response:
{
  "message": "I found 7 beautiful jewellery pieces...",
  "data": {
    "products": [...] // May be incomplete
  }
}
       ↓ parseLLMResponse()
       ↓ Merge with tool results
Final Response:
{
  "message": "I found 7 beautiful jewellery pieces under ₹1000! Here are some great options:\n\n1. **Gold Necklace** - ₹899 (4.5⭐)\n2. **Silver Ring** - ₹750 (4.2⭐)\n...",
  "data": {
    "products": [
      {
        "id": "prod-1",
        "name": "Gold Necklace",
        "price": 899,
        "brand": "XYZ",
        "category": "jewellery",
        "rating": 4.5,
        "image": "/image/necklace.jpg",
        "productUrl": "https://...", // Ensured from tool result
        ...
      },
      ... (6 more products)
    ]
  }
}
```

**Code:**
```typescript
const finalResponse = parseLLMResponse(
  result.text,
  productToolResultRef.value,
  policyToolResultRef.value,
);
```

---

## STEP 16: Save AI Response to Database
**File:** `server/src/routes/chat.ts` (Line 85-91)

**Process:**
1. Store final response in database

**Query State:**
```
Final Response (saved to DB):
{
  "message": "I found 7 beautiful jewellery pieces...",
  "data": { "products": [...] }
}
```

**Code:**
```typescript
await prisma.message.create({
  data: {
    conversationId: conversation.id,
    sender: "AI",
    content: finalResponse, // JSON string
  },
});
```

---

## STEP 17: Return Response to Client
**File:** `server/src/routes/chat.ts` (Line 93-99)

**Process:**
1. Return success response with final reply

**Final Response:**
```json
{
  "success": true,
  "data": {
    "reply": "{\"message\":\"I found 7 beautiful jewellery pieces under ₹1000!...\",\"data\":{\"products\":[...]}}",
    "sessionId": "session-456-uuid",
    "conversationId": "abc-123-uuid"
  }
}
```

**Code:**
```typescript
return res.json(
  successResponse({
    reply: finalResponse,
    sessionId,
    conversationId: conversation.id,
  }),
);
```

---

## Summary: Query Evolution Timeline

```
1. User Input:        "find me good jewellary under 1000 rupees"
2. Normalized:       "find me good jewellery under 1000 rupees" (typo fixed)
3. Saved to DB:      "find me good jewellary under 1000 rupees" (original)
4. LLM Tool Call:    "jewellery under 1000" (LLM may modify)
5. Tool Normalized:  "jewellery under 1000" (re-normalized)
6. Structured Query: { category: "jewellery", maxPrice: 1000, limit: 14 }
7. SQL Query:        SELECT ... WHERE category ILIKE '%jewellery%' AND price <= 1000 LIMIT 14
8. Products Fetched: 14 products from database
9. Embeddings:       User query + 14 product embeddings generated
10. Ranked:          Top 7 products by similarity
11. TOON Format:     products[7]{...}: 1,Gold Necklace,899,...
12. LLM Response:    "I found 7 beautiful jewellery pieces..."
13. Final JSON:      { message: "...", data: { products: [...] } }
14. Saved to DB:     Final JSON string
15. Client Response: { success: true, data: { reply: "...", ... } }
```

---

## Key Points

1. **Normalization happens 2 times:**
   - Once in `chat.ts` for LLM context
   - Once in `chat-tools.ts` for tool input (LLM may modify query)

2. **Limit flow:**
   - `MAX_PRODUCT_ITEMS = 7` (final result)
   - Fetch `7 * 2 = 14` products
   - Rank by similarity
   - Return top 7

3. **Query transformations:**
   - Natural language → Structured JSON → SQL → Results → Embeddings → Ranked → TOON → LLM → Final JSON

4. **Data flow:**
   - User query → Normalized → LLM → Tool → Query Builder → SQL → Products → Embeddings → Ranking → TOON → LLM → Final Response


