FROM node:22-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

RUN npm run build
RUN mkdir -p /usr/src/app/uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate && (node dist/seed.js || true) && node dist/index.js"]
