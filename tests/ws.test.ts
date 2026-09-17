import { createServer } from 'http';
import { Server } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { setupWebSockets } from '../src/websockets';
import prisma from '../src/lib/prisma';

// Define environment as testing and disable redis
process.env.ENABLE_REDIS = 'false';

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue(true),
      on: jest.fn()
    }))
  };
});

describe('WebSockets P2003 Failure Cases and Fallbacks', () => {
  let io: Server, serverSocket: any, clientSocket: ClientSocket;
  const PORT = 4011;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    setupWebSockets(io);
    httpServer.listen(PORT, () => {
      clientSocket = Client(`http://localhost:${PORT}`);
      clientSocket.on('connect', done);
    });
  });

  afterAll((done) => {
    io.close();
    clientSocket.disconnect();
    done();
  });

  it('should gracefully return an execution_error when interviewId does not exist', (done) => {
    clientSocket.on('execution_error', (data: any) => {
      expect(data.message).toBe('Invalid interview session ID');
      clientSocket.off('execution_error');
      done();
    });

    clientSocket.emit('run_code', {
      interviewId: 'fake-invalid-id-12345',
      userId: 'test-user',
      code: 'console.log(1)',
      language: 'javascript'
    });
  });

  it('should return controlled fallback message for valid seeded test-room when REDIS is disabled', (done) => {
    clientSocket.on('execution_error', async (data: any) => {
      expect(data.message).toContain('Execution unavailable');
      clientSocket.off('execution_error');
      done();
    });

    clientSocket.emit('join_interview', { interviewId: 'test-room', userId: 'test-user' });
    
    setTimeout(() => {
      clientSocket.emit('run_code', {
        interviewId: 'test-room',
        userId: 'test-user',
        code: 'console.log(1)',
        language: 'javascript'
      });
    }, 100);
  });
});
