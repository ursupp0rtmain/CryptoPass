# CryptoPass Frontend - Pre-built approach
# Build locally first: npm run build
# Then: docker build -t cryptopass-frontend .

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/crypto-pass.user-app/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
