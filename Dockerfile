# syntax=docker/dockerfile:1.7

# ---- builder ----
FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache bash && npm install -g corepack && corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG COMMIT_HASH=unknown
ENV COMMIT_HASH=$COMMIT_HASH

RUN pnpm build:cv && pnpm build

# ---- runtime ----
FROM caddy:2.11.2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv
EXPOSE 8080
