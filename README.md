# Spur - AI-Powered E-Commerce Platform

Spur is a modern e-commerce platform featuring an intelligent AI assistant that helps users discover products and get answers about store policies using natural language queries. The platform leverages OpenAI's GPT models for conversational AI, vector embeddings for semantic search, and a robust full-stack architecture with token-efficient data formats.

## ✨ Features

### 🤖 AI-Powered Chat Assistant (Widget)
- **Floating Chat Widget**: Modern, responsive chat widget accessible from any page
- **Intelligent Product Search**: Natural language queries to find products (e.g., "find me good jewellery under 1000 rupees")
- **Typo Tolerance**: Automatically corrects common spelling mistakes (e.g., "jewellary" → "jewellery", "moblie" → "mobile")
- **Policy Information**: Answers questions about shipping, returns, privacy policies, and general FAQs
- **Conversation Management**: 
  - Multiple conversation threads with session-based organization
  - Conversation history persists across page reloads
  - Smart caching to minimize API calls
  - New chat creation with empty conversation prevention
- **Context-Aware Responses**: Understands user intent and provides personalized recommendations
- **Loading States**: Smooth loading animations while fetching conversations and messages
- **Message Caching**: Module-level cache prevents redundant API calls when switching conversations
- **Token Optimization**: Uses TOON (Token-Oriented Object Notation) format for 30-60% token reduction

### 🛍️ Product Discovery
- **Advanced Search**: Filter products by category, brand, price range, and ratings
- **Semantic Search**: Vector embeddings for intelligent product matching
- **Product Details**: Rich product information with images, specifications, and ratings
- **Price Filtering**: Find products within specific price ranges

### 🎨 Modern UI/UX
- **Responsive Design**: Beautiful, modern interface built with React and Tailwind CSS
- **Component Library**: shadcn/ui components for consistent design
- **Real-time Updates**: Instant feedback and smooth interactions
- **Markdown Rendering**: Rich text formatting in AI responses
- **HTTPS Image Support**: Automatic HTTP to HTTPS conversion for secure image loading
- **Product Image Carousel**: Interactive image gallery with thumbnail navigation
- **Structured Responses**: Rich product cards, policy information, and formatted messages

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Client-side routing
- **React Markdown** - Markdown rendering
- **Axios** - HTTP client (unified API instance)
- **Biome** - Code formatting and linting

### Backend
- **Node.js** - Runtime (Alpine for Docker)
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM for database
- **PostgreSQL** - Primary database (Neon DB cloud)
- **pgvector** - Vector extension for embeddings
- **Redis** - Caching and session management
- **AI SDK** (`@ai-sdk/openai`, `ai`) - Tool calling, embeddings, and agentic behavior
- **TOON Format** (`@toon-format/toon`) - Token-efficient data format for LLMs
- **Zod** - Schema validation
- **Biome** - Code formatting and linting
- **Docker** - Containerization for deployment

### AI/ML
- **OpenAI GPT-4o-mini** - Query understanding and response generation
- **OpenAI text-embedding-3-small** - Vector embeddings (1536 dimensions)
- **Cosine Similarity** - Product ranking and relevance scoring
- **TOON Format** - 30-60% token reduction for structured data

## 📁 Project Structure

```
Spur/
├── client/                             # Frontend React application
│   ├── src/
│   │   ├── components/                 # React components
│   │   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── ChatWidget.tsx          # Floating chat widget
│   │   │   ├── ChatMessage.tsx         # Message component
│   │   │   ├── ProductCard.tsx         # Product card component
│   │   │   └── StructuredResponse.tsx  # AI response renderer
│   │   ├── pages/                      # Page components
│   │   │   └── ProductsPage.tsx        # Main products page
│   │   ├── lib/                        # Utilities and config
│   │   │   ├── api.ts                  # Unified API client (products, chat, images)
│   │   │   ├── config.ts               # API configuration
│   │   │   ├── utils.ts                # Utilities (image proxying, etc.)
│   │   │   └── chat-helpers.ts         # Chat-related helper types
│   │   ├── types/                      # TypeScript type definitions
│   │   │   ├── chat.ts                 # Chat-related types
│   │   │   ├── products.ts             # Product-related types
│   │   │   ├── chat-response.ts        # Chat response types
│   │   │   └── index.ts                # Type exports
│   │   └── hooks/                      # Custom React hooks
│   ├── public/                         # Static assets
│   │   └── _redirects                  # Netlify SPA routing
│   ├── netlify.toml                    # Netlify configuration
│   └── package.json
│
├── server/                             # Backend Express application
│   ├── src/
│   │   ├── routes/                     # API routes
│   │   │   ├── chat.ts                 # Chat/conversation endpoints
│   │   │   ├── products.ts             # Product endpoints
│   │   │   └── images.ts               # Image proxy endpoints
│   │   ├── utils/                      # Utility functions
│   │   │   ├── chat-tools.ts           # AI tool definitions
│   │   │   ├── conversation-manager.ts # Conversation logic
│   │   │   ├── session-manager.ts      # Session management
│   │   │   ├── query-builder.ts        # LLM-based query generation
│   │   │   ├── query-normalizer.ts     # Typo correction
│   │   │   ├── embeddings.ts           # AI SDK embeddings
│   │   │   ├── knowledge.ts            # Policy/FAQ search
│   │   │   ├── product-cache.ts        # Redis product caching
│   │   │   ├── image-cache.ts          # Image caching
│   │   │   ├── spec-parser.ts          # Product spec parsing
│   │   │   ├── response-parser.ts      # LLM response parsing
│   │   │   ├── toon-converter.ts       # JSON to TOON conversion
│   │   │   └── index.ts                # Utility exports
│   │   ├── prompts/                    # AI system prompts
│   │   │   ├── system-prompt.ts        # Main chat system prompt
│   │   │   └── query-builder-prompt.ts # Query builder prompt
│   │   ├── types/                      # TypeScript type definitions
│   │   │   ├── chat.ts                 # Chat tool result types
│   │   │   ├── products.ts             # Product types
│   │   │   ├── query.ts                # Query builder types
│   │   │   ├── specifications.ts       # Spec parsing types
│   │   │   ├── image-cache.ts          # Image cache types
│   │   │   ├── response.ts             # API response types
│   │   │   └── index.ts                # Type exports
│   │   ├── lib/                        # Core libraries
│   │   │   ├── prisma.ts               # Prisma client
│   │   │   ├── redis.ts                # Redis client
│   │   │   ├── error.ts                # Error handling
│   │   │   ├── response.ts             # Response utilities
│   │   │   └── index.ts                # Library exports
│   │   ├── env.ts                      # Environment variable validation
│   │   └── index.ts                    # Express app entry point
│   ├── prisma/
│   │   └── schema.prisma               # Database schema
│   ├── seed/                           # Database seeding scripts
│   │   ├── ingest.ts                   # Main seed script
│   │   ├── policies/                   # Policy markdown files
│   │   ├── faq/                        # FAQ markdown files
│   │   └── utils/                      # Seed utilities
│   ├── Dockerfile                      # Docker configuration
│   ├── docker-compose.yml              # Docker Compose setup
│   └── package.json
│
└── README.md                           # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ or **Bun** (recommended)
- **PostgreSQL** 14+ with `pgvector` extension
- **Redis** (optional, for caching)
- **OpenAI API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Spur
   ```

2. **Install dependencies**

   **Backend:**
   ```bash
   cd server
   bun install
   # or
   npm install
   ```

   **Frontend:**
   ```bash
   cd client
   npm install
   ```

### Environment Variables

**Backend** (`server/.env`):
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spur?schema=public

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Limits
MAX_PRODUCT_ITEMS=7
MAX_KNOWLEDGE_BASE_SEARCH_ITEMS=5

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:3001
```

### Database Setup

1. **Enable pgvector extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Run Prisma migrations**
   ```bash
   cd server
   bun run db:generate
   bun run db:push
   # or
   npm run db:generate
   npm run db:push
   ```

3. **Seed the database**
   ```bash
   # Seed policies
   bun run seed:policies
   
   # Seed products (if you have product data)
   bun run seed:csv
   ```

### Running the Application

**Start the backend server:**
```bash
cd server
bun run dev
# or
npm run dev
```

The server will start on `http://localhost:3001`

**Start the frontend development server:**
```bash
cd client
npm run dev
```

The frontend will start on `http://localhost:5173`

## 📡 API Endpoints

### Chat Endpoints

- `POST /chat/conversation/new` - Create a new conversation
  - Returns: `{ conversationId: string, isExisting: boolean }`
  - If empty conversation exists, returns existing one with `isExisting: true`
  
- `GET /chat/conversations` - Get all conversations
  - Returns conversations ordered by `updatedAt` descending
  - Includes `messageCount` and `preview` for each conversation
  
- `GET /chat/conversation/:id` - Get conversation with messages
  - Returns: `{ conversationId: string, sessionId: string | null, messages: Message[] }`
  
- `POST /chat/message` - Send a message and get AI response
  ```json
  {
    "conversationId": "uuid",  // optional
    "message": "find me good jewellery under 1000 rupees"
  }
  ```
  - If `conversationId` provided: Uses existing conversation
  - If no `conversationId`: Creates new session and conversation
  - Returns: `{ reply: string, sessionId: string, conversationId: string }`
  - Product data is returned in TOON format for token efficiency

### Product Endpoints

- `GET /products` - Get all products with pagination and filters
  - Query params: `page`, `limit`, `category`, `brand`, `minPrice`, `maxPrice`, `minRating`, `search`, `sortBy`
- `GET /products/:id` - Get product by ID
- `GET /products/categories/list` - Get all categories
- `GET /products/brands/list` - Get all brands

### Image Endpoints

- `GET /api/images/proxy` - Proxy and cache images
  - Query params: `url` (required), `productId` (optional)
  - Converts HTTP to HTTPS and caches images server-side

### Health Check

- `GET /health` - Server health status

## 🔧 Development

### Code Formatting & Linting

Both frontend and backend use **Biome** for formatting and linting:

```bash
# Format code
bun run format
npm run format

# Lint code
bun run lint
npm run lint

# Format and lint with auto-fix
bun run check
npm run check
```

### Database Management

```bash
# Generate Prisma Client
bun run db:generate

# Push schema changes to database
bun run db:push

# Run migrations
bun run db:migrate

# Open Prisma Studio (database GUI)
bun run db:studio
```

## 🎯 How It Works

### Architecture Overview

#### Frontend Architecture
- **Unified API Client**: Single `api.ts` file handles all API calls (products, chat, images)
- **Type Safety**: Centralized type definitions in `types/` folder
- **Component-Based**: Modular React components with shadcn/ui
- **State Management**: React hooks with module-level caching for conversations

#### Backend Architecture
- **Modular Structure**: Separated into `routes/`, `utils/`, `prompts/`, `types/`, and `lib/`
- **Barrel Exports**: Centralized exports via `index.ts` files
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Token Optimization**: TOON format for LLM communication (30-60% token reduction)

### Chat Widget Flow

#### Frontend (Widget)
1. **Widget Initialization**:
   - User clicks chat button to open widget
   - Widget fetches all conversations (only once, cached)
   - If conversations exist, loads the most recent one
   - Shows loading animations while fetching data

2. **Conversation Management**:
   - **New Chat**: Creates empty conversation (session assigned on first message)
   - **Conversation Switching**: Uses cached messages if available, otherwise fetches
   - **Message Caching**: Module-level cache persists across widget open/close
   - **Empty Conversation Prevention**: Can't create new chat if empty conversation exists

3. **Sending Messages**:
   - User types message and clicks send
   - Input disabled while loading
   - Temporary message shown immediately
   - API call to `/chat/message` via unified `api` client
   - Response received and displayed
   - Conversation list updated
   - Messages cached for future access

4. **Caching Strategy**:
   - **Conversations**: Loaded once, cached until page reload
   - **Messages**: Cached per conversation ID
   - **Session IDs**: Cached per conversation
   - **Benefits**: No redundant API calls when switching conversations

#### Backend (AI Processing)
1. **User sends a message** → Normalized for typos (e.g., "jewellary" → "jewellery")
2. **Session & Conversation Management**:
   - If `conversationId` provided: Uses existing conversation, creates session if missing
   - If no `conversationId`: Creates new session and conversation
   - Session ID returned for future requests
3. **Intent Detection** → AI determines if query is about products, policies, or general FAQs
4. **Tool Selection**:
   - **Product Query**: 
     - LLM converts natural language to structured JSON query
     - PostgreSQL query generated and executed
     - Products fetched (with `productUrl` included)
     - Products and user query embedded using AI SDK
     - Cosine similarity calculated for ranking
     - Top products selected and formatted
     - **Product data converted to TOON format** (30-60% token reduction)
   - **Policy/FAQ Query**:
     - Semantic search in knowledge base (policies + FAQs)
     - Relevant documents retrieved
     - LLM formats response conversationally
5. **Response Generation** → Structured JSON response:
   ```json
   {
     "message": "Conversational text (may include markdown)",
     "data": {
       "products": [...] // if product query (returned in TOON format)
       // or null for policy/general queries
     }
   }
   ```
6. **Storage** → User message and AI response saved to database

### Product Search Architecture

- **Query Builder**: LLM-based natural language to SQL query conversion
- **Vector Embeddings**: Product descriptions and user queries embedded using OpenAI
- **Similarity Ranking**: Cosine similarity for relevance scoring
- **Hybrid Search**: Combines structured SQL queries with semantic similarity
- **TOON Format**: Product results converted to TOON before sending to LLM

### Token Optimization (TOON)

The platform uses **TOON (Token-Oriented Object Notation)** format to reduce token usage by 30-60%:

- **When**: Product search results are converted to TOON before being sent to the LLM
- **Why**: Every `{}`, `[]`, and `"` in JSON counts as tokens. TOON eliminates this overhead
- **How**: The `toon-converter.ts` utility converts JSON to TOON format automatically
- **Fallback**: If TOON conversion fails, falls back to JSON
- **Best For**: Flat, tabular data structures (perfect for product arrays)

Example:
```json
// JSON (more tokens)
{
  "products": [
    { "id": 1, "name": "Product A", "price": 100 },
    { "id": 2, "name": "Product B", "price": 200 }
  ]
}
```

```toon
// TOON (fewer tokens)
products[2]{id,name,price}:
  1,Product A,100
  2,Product B,200
```

## 🚢 Deployment

### Frontend (Netlify)

The frontend is configured for Netlify deployment:

1. **Environment Variables**:
   Create `client/.env`:
   ```env
   VITE_API_BASE_URL=https://your-backend-url.com
   ```

2. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

3. Deploy to Netlify:
   - Connect your repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - The `public/_redirects` file handles SPA routing (`/* /index.html 200`)
   - Images automatically converted from HTTP to HTTPS

### Backend (Docker)

The backend includes Docker configuration for easy deployment:

1. **Environment Variables**:
   Create `server/.env`:
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://...  # Neon DB connection string
   REDIS_HOST=redis
   REDIS_PORT=6379
   OPENAI_API_KEY=your_key_here
   FRONTEND_URL=https://your-frontend-url.com
   MAX_PRODUCT_ITEMS=7
   MAX_KNOWLEDGE_BASE_SEARCH_ITEMS=5
   ```

2. **Using Docker Compose**:
   ```bash
   cd server
   docker-compose up -d
   ```
   - Starts server on port 3001
   - Starts Redis service
   - Runs Prisma migrations automatically

3. **Using Dockerfile**:
   ```bash
   cd server
   docker build -t spur-server .
   docker run -p 3001:3001 --env-file .env spur-server
   ```

4. **Manual Deployment**:
   - Deploy to any Node.js-compatible hosting (Railway, Render, Fly.io)
   - Uses Node.js Alpine for lightweight containers
   - Ensure PostgreSQL (Neon DB) and Redis are accessible

---

Built with ❤️ using React, Express, AI SDK, OpenAI, and TOON Format
