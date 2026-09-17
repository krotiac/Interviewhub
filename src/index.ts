import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import interviewRoutes from './routes/interviews';
import questionRoutes from './routes/questions';
import interviewerRoutes from './routes/interviewer';
import { setupWebSockets } from './websockets';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/interviews', interviewerRoutes); // Mounts /:id/notes and /:id/evaluation
app.use('/api/questions', questionRoutes);

// WebSocket setup
setupWebSockets(io);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
