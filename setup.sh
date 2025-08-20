#!/bin/bash

echo "🚀 Setting up EchoNest AI Therapy Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
if npm install; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Set up environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Setting up environment file..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local from .env.example"
        echo "⚠️  Please edit .env.local with your API keys before starting the app"
    else
        echo "❌ .env.example not found"
    fi
else
    echo "✅ .env.local already exists"
fi

# Try to set up database (optional)
echo "🗄️ Setting up database (optional)..."
if npm run db:setup 2>/dev/null; then
    echo "✅ Database setup successful"
else
    echo "⚠️  Database setup failed, but the app can still run with mock data"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "📖 Don't forget to:"
echo "  1. Edit .env.local with your API keys"
echo "  2. Set up your database if needed"
echo ""