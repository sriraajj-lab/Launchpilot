#!/bin/bash
# Deploy Launch Pilot to Vercel
# Run this from your local machine after setting env vars

# Push database schema
echo "=== Pushing database schema to Supabase ==="
DATABASE_URL="$DATABASE_URL" npx prisma db push

# Deploy to Vercel
echo "=== Deploying to Vercel ==="
npx vercel --prod --yes

echo "=== Done! ==="
