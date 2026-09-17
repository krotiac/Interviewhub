import { Router } from 'express';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'secret';

const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const questions = await prisma.question.findMany();
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'INTERVIEWER') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const { title, description, difficulty, starterCode, testCases } = req.body;
    const question = await prisma.question.create({
      data: { title, description, difficulty, starterCode, testCases }
    });
    res.status(201).json(question);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
