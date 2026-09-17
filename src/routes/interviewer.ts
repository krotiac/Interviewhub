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

router.post('/:id/notes', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== 'INTERVIEWER') {
    return res.status(403).json({ error: 'Only interviewers can add notes' });
  }
  try {
    const note = await prisma.interviewNote.create({
      data: {
        interviewId: req.params.id,
        interviewerId: req.user.id,
        content: req.body.content
      }
    });
    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/evaluation', authMiddleware, async (req: any, res: any) => {
  if (req.user.role !== 'INTERVIEWER') {
    return res.status(403).json({ error: 'Only interviewers can evaluate' });
  }
  try {
    const { scores, feedback } = req.body;
    const evaluation = await prisma.interviewEvaluation.create({
      data: {
        interviewId: req.params.id,
        scores,
        feedback
      }
    });
    // Mark interview as completed
    await prisma.interview.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', endTime: new Date() }
    });
    res.status(201).json(evaluation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
