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

function sanitizeTask(body: any) {
  const d = { ...body };
  // Convert empty-string integers to null
  d.groupId      = d.groupId      ? Number(d.groupId)      : null;
  d.assignedToId = d.assignedToId ? Number(d.assignedToId) : null;
  // Convert empty-string dates to null
  d.startDate    = d.startDate    ? new Date(d.startDate)   : null;
  d.dueDate      = d.dueDate      ? new Date(d.dueDate)     : null;
  d.completedAt  = d.completedAt  ? new Date(d.completedAt) : undefined;
  // Remove unexpected fields Prisma doesn't know
  delete d.assignedTo;
  delete d.createdBy;
  delete d.group;
  delete d.id;
  delete d.createdAt;
  delete d.updatedAt;
  return d;
}

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...sanitizeTask(req.body), createdById: req.user!.id };
    const task = await prisma.task.create({
      data,
      include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    });
    res.json(task);
  } catch (err: any) {
    console.error('[tasks POST]', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = sanitizeTask(req.body);
    if (data.status === 'completed' && !data.completedAt) data.completedAt = new Date();
    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data,
      include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    });
    res.json(task);
  } catch (err: any) {
    console.error('[tasks PUT]', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.task.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
