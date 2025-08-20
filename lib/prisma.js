// Mock Prisma Client for development when binaries are unavailable
let prisma

// Check if PrismaClient is available
try {
  const { PrismaClient } = require('@prisma/client')
  
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient()
  } else {
    // In development, use a global variable so the client is not recreated
    // every time due to Hot Module Replacement (HMR)
    if (!global.prisma) {
      global.prisma = new PrismaClient()
    }
    prisma = global.prisma
  }
} catch (error) {
  console.warn('Prisma client not available, using mock client:', error.message)
  // Mock Prisma client for development
  prisma = {
    user: {
      findUnique: async () => null,
      findFirst: async () => null,
      findMany: async () => [],
      create: async (data) => ({ id: 'mock-id', ...data.data }),
      update: async (data) => ({ id: data.where.id, ...data.data }),
      delete: async (data) => ({ id: data.where.id }),
    },
    chatSession: {
      findMany: async () => [],
      create: async (data) => ({ id: 'mock-session-id', ...data.data }),
      update: async (data) => ({ id: data.where.id, ...data.data }),
    },
    message: {
      findMany: async () => [],
      create: async (data) => ({ id: 'mock-message-id', ...data.data }),
    },
    checkin: {
      findMany: async () => [],
      create: async (data) => ({ id: 'mock-checkin-id', ...data.data }),
    },
    appointment: {
      findMany: async () => [],
      create: async (data) => ({ id: 'mock-appointment-id', ...data.data }),
    },
    voiceSessionSetup: {
      findMany: async () => [],
      create: async (data) => ({ id: 'mock-voice-id', ...data.data }),
    },
    $disconnect: async () => {},
  }
}

export default prisma