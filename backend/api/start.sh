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
  echo "==> DB already has $TEAM_COUNT teams, checking friendly matches..."
  FRIENDLY_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.match.count({ where: { tournament: { type: 'FRIENDLY' } } })
  .then(c => { console.log(c); return p.\$disconnect(); })
  .catch(e => { console.error(e); process.exit(1); });
")
  if [ "$FRIENDLY_COUNT" = "0" ]; then
    echo "==> No friendly matches found — running seed to populate them..."
    node dist/seed.js
    echo "==> Seed complete!"
  else
    echo "==> $FRIENDLY_COUNT friendly matches already seeded, skipping."
  fi
fi

echo "==> Starting API server..."
exec node dist/index.js
