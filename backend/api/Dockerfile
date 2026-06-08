FROM node:20-slim
# ShinraFixture2026 API

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install && npm install tsconfig-paths

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx ts-node -r tsconfig-paths/register --transpile-only src/index.ts"]