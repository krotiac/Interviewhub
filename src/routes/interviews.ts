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

router.post('/', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== 'INTERVIEWER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only interviewers can create sessions' });
  }
  try {
    const { candidateId, questionId } = req.body;
    const interview = await prisma.interview.create({
      data: {
        interviewerId: req.user.id,
        candidateId,
        questionId,
        status: 'CREATED'
      }
    });
    res.status(201).json(interview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        question: true,
        submissions: true,
        messages: true,
      }
    });
    if (!interview) return res.status(404).json({ error: 'Not found' });
    
    // Auth check
    if (req.user.role !== 'ADMIN' && req.user.id !== interview.interviewerId && req.user.id !== interview.candidateId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json(interview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
