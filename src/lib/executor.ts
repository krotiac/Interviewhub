import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import prisma from './prisma';

const execAsync = util.promisify(exec);

export interface ExecutionResult {
  status: string;
  output: string;
  executionTime: number;
}

/**
 * LOCAL DEVELOPMENT FALLBACK EXECUTOR
 * Used when ENABLE_REDIS=false to run code in-process for local dev.
 */
export async function executeCode(
  submissionId: string,
  code: string,
  language: string,
  stdin?: string
): Promise<ExecutionResult> {
  console.log(`[LOCAL EXECUTOR] Starting execution for ${submissionId} (${language})`);
  
  await prisma.codeSubmission.update({
    where: { id: submissionId },
    data: { status: 'RUNNING' }
  });

  const tempDir = path.join(__dirname, '../../../temp');
  await fs.mkdir(tempDir, { recursive: true }).catch(() => {});

  let output = '';
  let status = 'PASSED';
  let executionTime = 0;
  const startTime = Date.now();

  try {
    if (language === 'javascript') {
      const filePath = path.join(tempDir, `${submissionId}.js`);
      await fs.writeFile(filePath, code);
      try {
        let runCmd = `node "${filePath}"`;
        if (stdin) {
          const inPath = path.join(tempDir, `${submissionId}.in`);
          await fs.writeFile(inPath, stdin);
          runCmd = `node "${filePath}" < "${inPath}"`;
        }
        const { stdout, stderr } = await execAsync(runCmd, { timeout: 5000 });
        output = stdout || stderr;
      } catch (err: any) {
        status = err.killed ? 'TIMEOUT' : 'RUNTIME_ERROR';
        output = err.stderr || err.stdout || err.message;
      }
      await fs.unlink(filePath).catch(() => {});
      if (stdin) await fs.unlink(path.join(tempDir, `${submissionId}.in`)).catch(() => {});
      
    } else if (language === 'cpp' || language === 'c++') {
      const filePath = path.join(tempDir, `${submissionId}.cpp`);
      const outPath = path.join(tempDir, `${submissionId}.exe`);
      await fs.writeFile(filePath, code);
      
      try {
        // Compile
        await execAsync(`g++ "${filePath}" -o "${outPath}"`);
        
        // Execute
        let runCmd = `"${outPath}"`;
        if (stdin) {
          const inPath = path.join(tempDir, `${submissionId}.in`);
          await fs.writeFile(inPath, stdin);
          runCmd = `"${outPath}" < "${inPath}"`;
        }
        
        const { stdout, stderr } = await execAsync(runCmd, { timeout: 5000 });
        output = stdout || stderr;
      } catch (err: any) {
        if (err.cmd && err.cmd.includes('g++')) {
           status = 'COMPILE_ERROR';
        } else {
           status = err.killed ? 'TIMEOUT' : 'RUNTIME_ERROR';
        }
        output = err.stderr || err.stdout || err.message;
      }
      // Cleanup
      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(outPath).catch(() => {});
      if (stdin) await fs.unlink(path.join(tempDir, `${submissionId}.in`)).catch(() => {});
      
    } else {
      status = 'COMPILE_ERROR';
      output = `Language ${language} not supported by local fallback.`;
    }
  } catch (fatalError: any) {
     status = 'RUNTIME_ERROR';
     output = fatalError.message;
  }

  executionTime = Date.now() - startTime;

  await prisma.codeSubmission.update({
    where: { id: submissionId },
    data: { status, output, executionTime }
  });

  return { status, output, executionTime };
}
