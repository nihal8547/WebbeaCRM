FROM node:22-alpine

WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

RUN npm run build
RUN mkdir -p /usr/src/app/uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate && (node dist/seed.js || true) && node dist/index.js"]
