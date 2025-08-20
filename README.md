# EchoNest - AI-Powered Therapy Platform

A Next.js-based AI-powered therapy application that provides 24/7 mental health support through personalized conversations.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL database (for production) or SQLite (for development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Yasalkhan99/AI-powered-therapy-app.git
cd AI-powered-therapy-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your API keys:
- `OPENAI_API_KEY`: Your OpenAI API key for AI chat functionality
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key for voice functionality  
- `PINECONE_API_KEY` & `PINECONE_INDEX`: Your Pinecone credentials for knowledge base
- `DATABASE_URL`: Your database connection string

5. Set up the database (optional for development):
```bash
npm run db:setup
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

- `npm install` - Install all dependencies
- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run db:setup` - Generate Prisma client and push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset the database
- `npm run init-kb` - Initialize the knowledge base

## 🛠 Environment Setup

The application requires several API keys to function fully:

### Required for Core Functionality:
- **OPENAI_API_KEY**: OpenAI API key for AI chat responses
- **DATABASE_URL**: Database connection string
- **NEXTAUTH_URL**: Your app URL (http://localhost:3000 for development)
- **NEXTAUTH_SECRET**: A secure secret for NextAuth

### Optional Services:
- **ELEVENLABS_API_KEY**: For voice/speech functionality
- **PINECONE_API_KEY & PINECONE_INDEX**: For enhanced knowledge base/RAG
- **Email settings**: For notifications and password reset

### Development Notes:
- The app will start with mock data if database setup fails
- SQLite is used by default for development
- Some features may be limited without proper API keys

## 🏗 Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL/SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: OpenAI GPT API
- **Voice**: ElevenLabs API
- **Knowledge Base**: Pinecone vector database

## 📁 Project Structure

```
├── components/          # Reusable React components
├── pages/              # Next.js pages and API routes
│   ├── api/           # Backend API endpoints
│   └── ...            # Frontend pages
├── prisma/            # Database schema and migrations
├── public/            # Static assets
├── scripts/           # Utility scripts
├── styles/            # CSS and styling
├── utils/             # Utility functions
└── lib/               # Shared libraries
```

## 🔧 Troubleshooting

### Common Issues:

1. **Prisma binary download fails**: 
   - The app includes fallback mechanisms
   - Try: `npm run db:setup` after installation

2. **Database connection errors**:
   - Ensure DATABASE_URL is correct in .env.local
   - For development, SQLite is used by default

3. **API key errors**:
   - Check that all required environment variables are set
   - The app will show mock responses if keys are missing

### Getting Help:

If you encounter issues:
1. Check the console for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed with `npm install`

## 📄 License

This project is licensed under the MIT License.