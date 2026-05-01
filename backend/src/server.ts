import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import transactionRoutes from './routes/transactions';
import healthRoutes from './routes/health';
import analyticsRoutes from './routes/analytics';

// Import socket handlers
import { setupSocketHandlers } from './socket/socketHandlers';

const app: Express = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow all origins in development for easier testing
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      // In production, check against FRONTEND_URL
      const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'TollingLLM Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      transactions: {
        list: 'GET /api/transactions',
        import: 'POST /api/transactions/import/csv',
        export: 'GET /api/transactions/export/csv',
      },
      chat: 'WebSocket: ws://localhost:5000',
    },
  });
});

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.API_PORT || 5000;

(server as any).listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TollingLLM Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📄 API Docs: http://0.0.0.0:${PORT}/api/docs`);
  console.log(`💬 WebSocket: ws://0.0.0.0:${PORT}`);
});

export { app, io };
