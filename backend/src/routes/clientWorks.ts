import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { clientId, status } = req.query;
  const where: any = {};
  if (clientId) where.clientId = Number(clientId);
  if (status) where.status = String(status);

  const works = await prisma.clientWork.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, phone: true, company: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(works);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const work = await prisma.clientWork.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      client: true,
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (!work) return res.status(404).json({ message: 'Not found' });
  res.json(work);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    data.clientId = Number(data.clientId);
    if (data.assignedToId) data.assignedToId = Number(data.assignedToId);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.actualStart) data.actualStart = new Date(data.actualStart);
    if (data.actualEnd) data.actualEnd = new Date(data.actualEnd);
    if (data.completionPercent) data.completionPercent = Number(data.completionPercent);

    // Auto-calculate duration if both dates given
    if (data.startDate && data.endDate) {
      const diff = new Date(data.endDate).getTime() - new Date(data.startDate).getTime();
      data.durationDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const work = await prisma.clientWork.create({
      data,
      include: {
        client: { select: { id: true, name: true, phone: true, company: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    res.json(work);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.clientId) data.clientId = Number(data.clientId);
    if (data.assignedToId) data.assignedToId = Number(data.assignedToId);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.actualStart) data.actualStart = new Date(data.actualStart);
    if (data.actualEnd) data.actualEnd = new Date(data.actualEnd);
    if (data.completionPercent !== undefined) data.completionPercent = Number(data.completionPercent);

    if (data.startDate && data.endDate) {
      const diff = new Date(data.endDate).getTime() - new Date(data.startDate).getTime();
      data.durationDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const work = await prisma.clientWork.update({
      where: { id: Number(req.params.id) },
      data,
      include: {
        client: { select: { id: true, name: true, phone: true, company: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    res.json(work);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.clientWork.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
