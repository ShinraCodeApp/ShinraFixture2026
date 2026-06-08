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
  echo "==> DB empty — running full seed..."
  node dist/seed.js
  echo "==> Seed complete!"
else
  echo "==> DB has $TEAM_COUNT teams — refreshing friendly matches..."
  node dist/seed.js --friendlies-only
  echo "==> Friendly matches refreshed!"
fi

echo "==> Starting API server..."
exec node dist/index.js
