try {
  require('dotenv').config();
  const { initializeKnowledgeBase } = require('../utils/rag');

  async function init() {
    try {
      await initializeKnowledgeBase();
      console.log('Knowledge base initialized successfully');
    } catch (error) {
      console.error('Error initializing knowledge base:', error);
      if (error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  init();
} catch (err) {
  console.error('Top-level error during script startup:', err);
  if (err && err.stack) {
    console.error('Stack trace:', err.stack);
  }
}