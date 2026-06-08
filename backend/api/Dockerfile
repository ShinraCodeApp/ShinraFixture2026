FROM node:20-slim
# ShinraFixture2026 API

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

# Compile: esbuild bundles all local TS and resolves path aliases; node_modules stay external
RUN npx esbuild src/index.ts --bundle --platform=node --target=node20 \
  --outfile=dist/index.js --packages=external --tsconfig=tsconfig.json \
  && echo "Build OK: dist/index.js created" \
  && ls -la dist/index.js

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
