# Seed Data Setup

This folder contains scripts and data for seeding the database with products and policies, including vector embeddings for semantic search.

## Structure

```
seed/
├── ingest.ts              # Main seed script
├── products/
│   ├── normalize.ts       # Product normalization utilities
│   └── sample-products.json  # Sample product data (Flipkart format)
├── policies/
│   ├── privacy.md         # Privacy policy document
│   ├── shipping.md        # Shipping policy document
│   └── return.md          # Return & refund policy document
├── faq/
│   ├── general.md         # General FAQ (orders, payments, shipping, etc.)
│   ├── products.md        # Product-related FAQ
│   └── account.md         # Account & profile FAQ
└── utils/
    └── embeddings.ts      # OpenAI embedding utilities
```

## Prerequisites

1. **PostgreSQL with pgvector extension**
   - Ensure your PostgreSQL database has the `pgvector` extension enabled
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

2. **OpenAI API Key**
   - Add `OPENAI_API_KEY` to your `.env` file

3. **Database Schema**
   - Run `npm run db:push` or `npm run db:migrate` to ensure the schema is up to date

## Running the Seed Script

```bash
# From the server directory
npm run seed
# or
bun run seed/ingest.ts
```

The script will:
1. Clear existing knowledge base entries
2. Ingest all policy markdown files with embeddings
3. Ingest all FAQ markdown files with embeddings
4. Ingest all products from `sample-products.json` with embeddings (if using seed-csv.ts)
5. Store everything in the `KnowledgeBase` table with vector embeddings

## Adding Your Own Data

### Adding Products

1. **Using Flipkart Dataset Format:**
   - Download the Flipkart products dataset from Kaggle
   - Convert to JSON format matching the structure in `sample-products.json`
   - Replace or append to `sample-products.json`

2. **Product Data Format:**
   ```json
   {
     "product_name": "Product Name",
     "retail_price": "₹12999",
     "discounted_price": "₹9999",
     "product_category_tree": "[\"Category > Subcategory\"]",
     "description": "Product description",
     "product_rating": "4.5",
     "brand": "Brand Name",
     "product_specifications": "{\"key\": \"value\"}",
     "image": "https://example.com/image.jpg"
   }
   ```

### Adding Policies

1. Create a new markdown file in `policies/` folder
2. The file will be automatically ingested when you run the seed script
3. The filename (without .md) will be used as the `sourceId` in the database

### Adding FAQs

1. Create a new markdown file in `faq/` folder
2. The file will be automatically ingested when you run the seed script
3. FAQs are organized by topic:
   - `general.md` - General questions about orders, payments, shipping, returns, customer support
   - `products.md` - Product-related questions (specifications, availability, quality, warranty)
   - `account.md` - Account and profile management questions
4. The filename (without .md) will be used as the `sourceId` in the database
5. FAQs are searchable through the AI chat assistant using the `search_policies` tool

## Vector Embeddings

- **Model**: OpenAI `text-embedding-3-small`
- **Dimensions**: 1536 (matches PostgreSQL `vector(1536)`)
- **Usage**: Embeddings are used for semantic search across products, policies, and FAQs

## Notes

- The seed script processes products in batches of 5 to respect OpenAI rate limits
- Each product and policy gets a unique embedding generated
- Embeddings are stored as PostgreSQL vector types for efficient similarity search

