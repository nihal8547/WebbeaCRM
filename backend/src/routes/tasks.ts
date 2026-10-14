import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { type, status, assignedTo, search } = req.query;
  const where: any = {};
  if (type) where.type = String(type);
  if (status) where.status = String(status);
  if (assignedTo) where.assignedToId = Number(assignedTo);
  if (search) where.OR = [
    { title: { contains: String(search), mode: 'insensitive' } },
    { description: { contains: String(search), mode: 'insensitive' } },
  ];

  if (req.user?.roleName === 'employee') {
    where.assignedToId = req.user.id;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tasks);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, createdById: req.user!.id };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    const task = await prisma.task.create({
      data,
      include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    });
    res.json(task);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.status === 'completed' && !data.completedAt) data.completedAt = new Date();
    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data,
      include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    });
    res.json(task);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.task.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
