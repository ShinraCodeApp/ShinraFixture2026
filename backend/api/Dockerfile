FROM node:20-slim
# ShinraFixture2026 API — build 2026-06-18

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

# Build API server (esbuild resolves @config, @services path aliases)
RUN npx esbuild src/index.ts --bundle --platform=node --target=node20 \
  --outfile=dist/index.js --packages=external --tsconfig=tsconfig.json \
  && echo "==> dist/index.js OK" && ls -lh dist/index.js

# Build seed script
RUN npx esbuild prisma/seed.ts --bundle --platform=node --target=node20 \
  --outfile=dist/seed.js --packages=external --tsconfig=tsconfig.json \
  && echo "==> dist/seed.js OK"

RUN chmod +x start.sh

EXPOSE 4000

CMD ["sh", "start.sh"]
