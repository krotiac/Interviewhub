import { Server, Socket } from 'socket.io';
import prisma from '../lib/prisma';
import { Queue } from 'bullmq';
import { executeCode } from '../lib/executor';

const ENABLE_REDIS = process.env.ENABLE_REDIS === 'true';

let executionQueue: Queue | null = null;
if (ENABLE_REDIS) {
  executionQueue = new Queue('code-execution', {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }
  });
  executionQueue.on('error', (err) => {
    console.error('BullMQ Queue connection error:', err.message);
  });
}

export function setupWebSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join_interview', async ({ interviewId, userId }) => {
      try {
        const interview = await prisma.interview.findUnique({
          where: { id: interviewId },
          include: { interviewer: true, candidate: true }
        });
        if (!interview) {
          socket.emit('error', { message: 'Interview not found' });
          return;
        }
        
        socket.join(interviewId);
        socket.to(interviewId).emit('participant_joined', { userId });
      } catch (error) {
        console.error('Error joining interview:', error);
        socket.emit('error', { message: 'Internal server error while joining' });
      }
    });

    socket.on('code_update', ({ interviewId, code, language }) => {
      socket.to(interviewId).emit('code_updated', { code, language });
    });

    socket.on('send_message', async ({ interviewId, senderId, content }) => {
      try {
        const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
        const sender = await prisma.user.findUnique({ where: { id: senderId } });
        
        if (!interview || !sender) {
          socket.emit('error', { message: 'Invalid interview or sender ID' });
          return;
        }

        const message = await prisma.message.create({
          data: { interviewId, senderId, content }
        });
        io.to(interviewId).emit('new_message', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('run_code', async ({ interviewId, userId, code, language, stdin }) => {
      try {
        const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
        
        if (!interview) {
          socket.emit('execution_error', { message: 'Invalid interview session ID' });
          return;
        }

        const submission = await prisma.codeSubmission.create({
          data: {
            interviewId,
            code,
            language,
            status: 'QUEUED'
          }
        });
        
        io.to(interviewId).emit('execution_queued', { submissionId: submission.id });
        
        if (ENABLE_REDIS && executionQueue) {
          // PRODUCTION FLOW
          await executionQueue.add('execute', {
            submissionId: submission.id,
            code,
            language,
            interviewId,
            stdin
          }).catch(err => {
            console.warn('Execution queue failed (Is Redis running?):', err.message);
            io.to(interviewId).emit('execution_error', { message: 'Execution queue unavailable' });
          });
        } else {
          // LOCAL DEVELOPMENT FALLBACK FLOW
          console.log(`[WebSocket] Triggering local fallback execution for ${submission.id}`);
          executeCode(submission.id, code, language, stdin)
            .then((result) => {
              io.to(interviewId).emit('execution_completed', { submissionId: submission.id, result });
            })
            .catch((err) => {
              io.to(interviewId).emit('execution_error', { message: 'Local execution failed critically: ' + err.message });
            });
        }
      } catch (error) {
        console.error('Error queuing execution:', error);
        socket.emit('execution_error', { message: 'Failed to queue execution' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
