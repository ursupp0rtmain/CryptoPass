# CryptoPass Frontend - Multi-stage Dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment configuration
ARG CERAMIC_NODE_URL=http://localhost:7007
ARG ENABLE_PAYMENTS=false

# Set environment variables for build
ENV CERAMIC_NODE_URL=$CERAMIC_NODE_URL
ENV CERAMIC_NODE_URL_PROD=$CERAMIC_NODE_URL
ENV ENABLE_PAYMENTS=$ENABLE_PAYMENTS

# Generate environment files and build
RUN node set-env.ts && npm run build

# Stage 2: Production with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/dist/crypto-pass.user-app/browser /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
