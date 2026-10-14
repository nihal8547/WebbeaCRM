import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { type, userId } = req.query;
  const where: any = {};
  if (type) where.type = String(type);
  if (req.user?.roleName === 'employee') {
    where.userId = req.user.id;
  } else if (userId) {
    where.userId = Number(userId);
  }

  const reports = await prisma.workReport.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { reportDate: 'desc' },
  });
  res.json(reports);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, userId: req.user!.id };
    if (data.reportDate) data.reportDate = new Date(data.reportDate);
    if (data.hoursWorked) data.hoursWorked = Number(data.hoursWorked);
    const report = await prisma.workReport.create({
      data,
      include: { user: { select: { id: true, name: true } } },
    });
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.reportDate) data.reportDate = new Date(data.reportDate);
    if (data.hoursWorked) data.hoursWorked = Number(data.hoursWorked);
    const report = await prisma.workReport.update({
      where: { id: Number(req.params.id) },
      data,
      include: { user: { select: { id: true, name: true } } },
    });
    res.json(report);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.workReport.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
