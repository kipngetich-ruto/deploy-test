#!/bin/bash

# Setup script for rootless Docker development

echo "Setting up rootless Docker environment..."

# Export current user UID and GID
export UID=$(id -u)
export GID=$(id -g)

# Create .env file for docker-compose
cat > .env << EOF
UID=$UID
GID=$GID
EOF

# Create necessary directories with proper permissions
mkdir -p apps/scanner/__pycache__

# Set ownership
chown -R $UID:$GID apps/scanner/

echo "✅ Rootless Docker setup complete!"
echo "UID: $UID"
echo "GID: $GID"
echo ""
echo "Next steps:"
echo "1. Copy environment files:"
echo "   cp .env.example .env"
echo "   cp apps/web/.env.local apps/web/.env.local"
echo ""
echo "2. Start Docker services:"
echo "   npm run docker:up"
echo ""
echo "3. In a new terminal, start Next.js:"
echo "   npm run web:dev"