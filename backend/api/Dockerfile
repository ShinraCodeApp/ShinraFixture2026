FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npx tsc --project tsconfig.json --noEmitOnError false || true

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]