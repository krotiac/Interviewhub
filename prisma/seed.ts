import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB Seed...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Upsert Interviewer
  const interviewer = await prisma.user.upsert({
    where: { id: 'test-interviewer' },
    update: {},
    create: {
      id: 'test-interviewer',
      email: 'interviewer@test.com',
      name: 'Test Interviewer',
      passwordHash,
      role: 'INTERVIEWER'
    }
  });

  // Upsert Candidate (test-user is used by the frontend)
  const candidate = await prisma.user.upsert({
    where: { id: 'test-user' },
    update: {},
    create: {
      id: 'test-user',
      email: 'candidate@test.com',
      name: 'Test Candidate',
      passwordHash,
      role: 'CANDIDATE'
    }
  });

  // Upsert Question
  const question = await prisma.question.upsert({
    where: { id: 'test-question' },
    update: {},
    create: {
      id: 'test-question',
      title: 'Two Sum',
      description: 'Return indices of the two numbers such that they add up to target.',
      difficulty: 'EASY',
      starterCode: '{}',
      testCases: '{}'
    }
  });

  // Upsert Interview Session (test-room is used by frontend URL)
  const interview = await prisma.interview.upsert({
    where: { id: 'test-room' },
    update: {},
    create: {
      id: 'test-room',
      interviewerId: interviewer.id,
      candidateId: candidate.id,
      questionId: question.id,
      status: 'ACTIVE'
    }
  });

  console.log('DB Seed complete! Generated:');
  console.log({
    interviewerId: interviewer.id,
    candidateId: candidate.id,
    questionId: question.id,
    interviewId: interview.id
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
