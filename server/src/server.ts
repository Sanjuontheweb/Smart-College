import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { askCampusAssistant } from './gemini';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // Allows requests from React Native mobile client
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Smart Campus AI Assistant Server',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')),
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, userRole, userName, department } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const response = await askCampusAssistant({
      message: message.trim(),
      history,
      userRole,
      userName,
      department
    });

    return res.json(response);
  } catch (error: any) {
    console.error('[Server Error in /api/chat]:', error);
    return res.status(500).json({
      error: 'Failed to process AI assistant request.',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 Smart Campus AI Assistant Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Chat:   http://localhost:${PORT}/api/chat`);
  console.log(`   Gemini Key: ${process.env.GEMINI_API_KEY ? 'Configured ✅' : 'Demo Mode Active ⚠️'}`);
  console.log(`=======================================================`);
});
