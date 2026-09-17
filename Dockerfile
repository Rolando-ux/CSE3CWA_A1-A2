# --------- Stage 1: Build ---------

FROM node:lts-alpine AS builder

# python3/make/g++ are needed to compile the native SQLite binding used by
# @prisma/adapter-better-sqlite3 - Alpine's base image doesn't include them.
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build


# --------- Stage 2: Production ---------

FROM node:lts-alpine

# Install tini for proper signal handling

RUN apk add --no-cache tini

ENV NODE_ENV=production
ENV DATABASE_URL=file:./dev.db

WORKDIR /app

# Copy only the output we need

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Prisma schema, migrations and seed data, plus the generated client and
# app source, so `prisma migrate deploy` / `db:seed` can run at container
# startup and produce a fresh, reproducible database every time.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=builder /app/app ./app

# Use tini as entrypoint

ENTRYPOINT ["/sbin/tini", "--"]

# Expose Next.js port

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && npm start"]
