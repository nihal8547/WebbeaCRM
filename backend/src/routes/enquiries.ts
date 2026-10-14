import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;
  const where: any = status ? { status: String(status) } : {};
  if (search) where.OR = [
    { name: { contains: String(search), mode: 'insensitive' } },
    { subject: { contains: String(search), mode: 'insensitive' } },
    { phone: { contains: String(search), mode: 'insensitive' } },
  ];
  const enquiries = await prisma.enquiry.findMany({
    where,
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(enquiries);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.followUpDate) data.followUpDate = new Date(data.followUpDate);
    const enquiry = await prisma.enquiry.create({ data, include: { client: true } });
    res.json(enquiry);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.followUpDate) data.followUpDate = new Date(data.followUpDate);
    const enquiry = await prisma.enquiry.update({
      where: { id: Number(req.params.id) },
      data,
      include: { client: true },
    });
    res.json(enquiry);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.enquiry.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
