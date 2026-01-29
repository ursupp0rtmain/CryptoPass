# CryptoPass Frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Increase Node memory for Angular build
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

ARG CERAMIC_NODE_URL=http://localhost:7007
ARG ENABLE_PAYMENTS=false

ENV CERAMIC_NODE_URL=$CERAMIC_NODE_URL
ENV CERAMIC_NODE_URL_PROD=$CERAMIC_NODE_URL
ENV ENABLE_PAYMENTS=$ENABLE_PAYMENTS

# Generate env files and build (separate steps for better error visibility)
RUN node set-env.js
RUN npx ng build --configuration=production

# Production
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/crypto-pass.user-app/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
