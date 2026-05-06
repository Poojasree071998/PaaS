FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --filter=web

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
