# Use Node.js Alpine
FROM node:20-alpine AS base
WORKDIR /app

# Build application
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci && npm install tsx && npm cache clean --force
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Generate Prisma Client for production
RUN npx prisma generate

# Create cache directory
RUN mkdir -p /app/cache/images

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application with tsx
CMD ["npx", "tsx", "src/index.ts"]

