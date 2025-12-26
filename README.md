# Spur - AI-Powered E-Commerce Platform

Spur is a modern e-commerce platform featuring an intelligent AI assistant that helps users discover products and get answers about store policies using natural language queries. The platform leverages OpenAI's GPT models for conversational AI, vector embeddings for semantic search, and a robust full-stack architecture.

## ✨ Features

### 🤖 AI-Powered Chat Assistant
- **Intelligent Product Search**: Natural language queries to find products (e.g., "find me good jewellery under 1000 rupees")
- **Typo Tolerance**: Automatically corrects common spelling mistakes (e.g., "jewellary" → "jewellery", "moblie" → "mobile")
- **Policy Information**: Answers questions about shipping, returns, privacy policies, and more
- **Conversation History**: Persistent chat history with session management
- **Context-Aware Responses**: Understands user intent and provides personalized recommendations

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

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Client-side routing
- **React Markdown** - Markdown rendering
- **Biome** - Code formatting and linting

### Backend
- **Bun** - Runtime and package manager
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM for database
- **PostgreSQL** - Primary database
- **pgvector** - Vector extension for embeddings
- **Redis** - Caching (optional)
- **OpenAI SDK** - AI/LLM integration
- **AI SDK** - Tool calling and agentic behavior
- **Zod** - Schema validation
- **Biome** - Code formatting and linting

### AI/ML
- **OpenAI GPT-4o-mini** - Query understanding and response generation
- **OpenAI text-embedding-3-small** - Vector embeddings (1536 dimensions)
- **Cosine Similarity** - Product ranking and relevance scoring

## 📁 Project Structure

```
Spur/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── StructuredResponse.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── ChatPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   └── NotFound.tsx
│   │   ├── lib/            # Utilities and config
│   │   └── hooks/          # Custom React hooks
│   ├── public/             # Static assets
│   └── package.json
│
├── server/                 # Backend Express application
│   ├── src/
│   │   ├── routes/         # API routes
│   │   │   ├── chat.ts     # Chat/conversation endpoints
│   │   │   └── products.ts # Product endpoints
│   │   ├── utils/          # Utility functions
│   │   │   ├── query-builder.ts      # LLM-based query generation
│   │   │   ├── query-normalizer.ts   # Typo correction
│   │   │   ├── embeddings.ts         # OpenAI embeddings
│   │   │   ├── knowledge.ts          # Policy search
│   │   │   └── chat.ts               # Chat utilities
│   │   ├── lib/            # Core libraries
│   │   │   ├── prisma.ts   # Prisma client
│   │   │   ├── redis.ts    # Redis client
│   │   │   ├── error.ts    # Error handling
│   │   │   └── response.ts # Response utilities
│   │   └── index.ts        # Express app entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── seed/               # Database seeding scripts
│   │   ├── ingest.ts       # Main seed script
│   │   ├── policies/       # Policy markdown files
│   │   └── products/       # Product data
│   └── package.json
│
└── README.md               # This file
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
```

**Frontend** (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:3000
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

The server will start on `http://localhost:3000`

**Start the frontend development server:**
```bash
cd client
npm run dev
```

The frontend will start on `http://localhost:5173`

## 📡 API Endpoints

### Chat Endpoints

- `POST /chat/conversation/new` - Create a new conversation
- `GET /chat/conversations?sessionId=<id>` - Get all conversations (optionally filtered by session)
- `POST /chat/message` - Send a message and get AI response
  ```json
  {
    "conversationId": "uuid",
    "message": "find me good jewellery under 1000 rupees"
  }
  ```

### Product Endpoints

- `GET /products` - Get all products with pagination and filters
  - Query params: `page`, `limit`, `category`, `brand`, `minPrice`, `maxPrice`, `minRating`, `search`
- `GET /products/:id` - Get product by ID

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

### AI Chat Flow

1. **User sends a message** → Normalized for typos (e.g., "jewellary" → "jewellery")
2. **Intent Detection** → AI determines if query is about products or policies
3. **Tool Selection**:
   - **Product Query**: 
     - LLM converts natural language to structured JSON query
     - PostgreSQL query generated and executed
     - Products fetched and embedded
     - User query embedded
     - Cosine similarity calculated for ranking
     - Top products selected and analyzed by LLM
   - **Policy Query**:
     - Semantic search in knowledge base
     - Relevant policy documents retrieved
     - LLM formats response conversationally
4. **Response Generation** → Structured JSON response with conversational message
5. **Storage** → Message and response saved to database

### Product Search Architecture

- **Query Builder**: LLM-based natural language to SQL query conversion
- **Vector Embeddings**: Product descriptions and user queries embedded using OpenAI
- **Similarity Ranking**: Cosine similarity for relevance scoring
- **Hybrid Search**: Combines structured SQL queries with semantic similarity

## 🚢 Deployment

### Frontend (Netlify)

The frontend is configured for Netlify deployment:

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. Deploy to Netlify:
   - Connect your repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - The `_redirects` file handles SPA routing

### Backend

Deploy the backend to any Node.js/Bun-compatible hosting service (e.g., Railway, Render, Fly.io):

1. Build the backend:
   ```bash
   cd server
   bun run build
   ```

2. Set environment variables on your hosting platform

3. Run migrations:
   ```bash
   bun run db:migrate:deploy
   ```


---

Built with ❤️ using React, Express, and OpenAI

