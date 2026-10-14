import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(clients);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const client = await prisma.client.findUnique({
    where: { id: Number(req.params.id) },
    include: { enquiries: true, quotations: true, payments: true },
  });
  if (!client) return res.status(404).json({ message: 'Not found' });
  res.json(client);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.json(client);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(client);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.client.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Deleted' });
});

export default router;
