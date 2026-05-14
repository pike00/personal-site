# syntax=docker/dockerfile:1.7

# ---- builder ----
FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache bash

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG COMMIT_HASH=unknown
ENV COMMIT_HASH=$COMMIT_HASH

RUN npm run build:cv && npm run build

# ---- runtime ----
FROM caddy:2.11.2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv
EXPOSE 8080
