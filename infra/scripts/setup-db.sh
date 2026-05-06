#!/usr/bin/env bash
# infra/scripts/setup-db.sh

echo "Initializing database..."
cd packages/db
npx prisma generate
npx prisma db push
echo "Database initialized successfully."
