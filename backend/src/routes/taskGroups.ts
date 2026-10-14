import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const groups = await prisma.taskGroup.findMany({
    include: {
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(groups);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const group = await prisma.taskGroup.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!group) return res.status(404).json({ message: 'Not found' });
  res.json(group);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const group = await prisma.taskGroup.create({ data: { name, description } });
    res.json(group);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, status } = req.body;
    const group = await prisma.taskGroup.update({
      where: { id: Number(req.params.id) },
      data: { name, description, status },
    });
    res.json(group);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.taskGroup.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
