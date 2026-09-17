import { Worker } from 'bullmq';
import { executeCode } from '../lib/executor';

const ENABLE_REDIS = process.env.ENABLE_REDIS === 'true';

if (!ENABLE_REDIS) {
  console.log('Worker disabled (ENABLE_REDIS=false). Exiting gracefully.');
  process.exit(0);
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker('code-execution', async job => {
  const { submissionId, code, language, stdin } = job.data;
  
  // Reuse the unified execution logic
  const result = await executeCode(submissionId, code, language, stdin);
  
  return result;
}, { connection });

worker.on('error', err => {
  console.error('Worker connection error:', err.message);
});

worker.on('completed', job => {
  console.log(`Job ${job.id} completed! Status: ${job.returnvalue.status}`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with ${err.message}`);
});
