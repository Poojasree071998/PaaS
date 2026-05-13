# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json turbo.json ./
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npm run prisma:generate --workspace=api

# Build the API
RUN npm run build --workspace=api

# Production Stage
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy build artifacts and dependencies
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "apps/api/dist/server.js"]
