#!/bin/sh
set -e

echo "==> prisma db push"
npx prisma db push --accept-data-loss

echo "==> Checking seed status..."
TEAM_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.team.count()
  .then(c => { console.log(c); return p.\$disconnect(); })
  .catch(e => { console.error(e); process.exit(1); });
")

if [ "$TEAM_COUNT" = "0" ]; then
  echo "==> DB empty — running seed..."
  node dist/seed.js
  echo "==> Seed complete!"
else
  echo "==> DB already has $TEAM_COUNT teams, skipping seed."
fi

echo "==> Starting API server..."
exec node dist/index.js
