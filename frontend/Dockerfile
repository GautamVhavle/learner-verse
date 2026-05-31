# ── Stage 1: Build ────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build-time env vars are baked into the static bundle.
# These can be overridden at build time via --build-arg.
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_SINGLE_USER_MODE=true
ARG VITE_AUTH0_DOMAIN=""
ARG VITE_AUTH0_CLIENT_ID=""
ARG VITE_AUTH0_AUDIENCE=""
ARG VITE_PAYMENT_GATEWAY_ENABLED=false

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SINGLE_USER_MODE=$VITE_SINGLE_USER_MODE
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE
ENV VITE_PAYMENT_GATEWAY_ENABLED=$VITE_PAYMENT_GATEWAY_ENABLED

# Vite uses envDir to look for .env - skip it for Docker builds
RUN npx vite build

# ── Stage 2: Serve with nginx ────────────────────────────
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
