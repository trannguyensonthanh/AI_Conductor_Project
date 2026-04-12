import express, { Application, Request, Response } from 'express';
import cors from 'cors';

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: '*', // Cho phép mọi Frontend truy cập (Localhost)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }),
);
app.use(express.json());

// API Test đường truyền
app.get('/api/health', (req: Request, res: Response) => {
  res
    .status(200)
    .json({
      status: 'success',
      message: '🚀 AI Conductor Backend is running!',
    });
});


export default app;
